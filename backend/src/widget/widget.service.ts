import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { AiService, RagHistoryMessage } from '../ai/ai.service';
import { ActionExecutorService } from '../action-executor/action-executor.service';
import { TokenCryptoService } from '../integrations/token-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWidgetSessionDto } from './dto/create-widget-session.dto';
import { WidgetChatDto } from './dto/widget-chat.dto';

@Injectable()
export class WidgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: ActionExecutorService,
    private readonly crypto: TokenCryptoService,
  ) {}

  async config(botId: string, origin?: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, status: 'ACTIVE' },
      include: { domains: { where: { enabled: true } } },
    });
    if (!bot) throw new NotFoundException('Bot not found.');
    assertOriginAllowed(bot.domains.map((domain) => domain.domain), origin);
    return {
      tenantId: bot.tenantId,
      botId: bot.id,
      name: bot.name,
      avatarUrl: bot.avatarUrl,
      welcomeMessage: bot.welcomeMessage,
      placeholder: bot.placeholder,
      themeColor: bot.themeColor,
      position: bot.position,
      zIndex: bot.zIndex,
      suggestedQuestions: bot.suggestedQuestions,
      requireSignedIdentity: bot.requireSignedIdentity,
      allowAnonymous: bot.allowAnonymous,
    };
  }

  async createSession(dto: CreateWidgetSessionDto, origin?: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: dto.botId, tenantId: dto.tenantId, status: 'ACTIVE' },
      include: { domains: { where: { enabled: true } } },
    });
    if (!bot) throw new NotFoundException('Bot not found.');
    assertOriginAllowed(bot.domains.map((domain) => domain.domain), origin);
    this.assertIdentity(bot, dto.user);

    if (!bot.allowAnonymous && !dto.user?.id && !dto.user?.email) {
      throw new ForbiddenException('Identified user is required for this bot.');
    }

    const widgetUser = await this.upsertWidgetUser(bot.tenantId, dto.user);
    const token = randomBytes(32).toString('hex');
    const session = await this.prisma.widgetSession.create({
      data: {
        tenantId: bot.tenantId,
        botId: bot.id,
        widgetUserId: widgetUser.id,
        sessionTokenHash: hashToken(token),
        origin,
        metadata: this.buildSessionMetadata(dto.user, origin),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
    const chat = await this.prisma.chatSession.create({
      data: {
        tenantId: bot.tenantId,
        botId: bot.id,
        widgetSessionId: session.id,
        userId: widgetUser.id,
        title: 'Widget Chat',
      },
    });
    return { sessionToken: token, widgetSessionId: session.id, chatSessionId: chat.id, user: widgetUser };
  }

  async chat(dto: WidgetChatDto, origin?: string) {
    const session = await this.assertSession(dto.sessionToken, origin);
    let chatSessionId = dto.chatSessionId;
    if (!chatSessionId) {
      const chat = await this.prisma.chatSession.create({
        data: {
          tenantId: session.tenantId,
          botId: session.botId,
          widgetSessionId: session.id,
          userId: session.widgetUserId,
          title: 'Widget Chat',
        },
      });
      chatSessionId = chat.id;
    }
    await this.assertChat(session.id, chatSessionId);
    const message = dto.message.replace(/\u0000/g, '').trim();
    if (!message) throw new BadRequestException('Message is required.');

    await this.prisma.chatMessage.create({
      data: { tenantId: session.tenantId, chatSessionId, userId: session.widgetUserId, role: 'USER', content: message },
    });

    const routedTool = await this.matchTool(session.tenantId, message);
    if (routedTool) {
      const input = extractInput(message, routedTool.inputSchema as Record<string, unknown>);
      if (missingRequired(input, routedTool.inputSchema as Record<string, unknown>).length) {
        const assistant = `Please provide: ${missingRequired(input, routedTool.inputSchema as Record<string, unknown>).join(', ')}.`;
        await this.saveAssistant(session.tenantId, chatSessionId, assistant, []);
        return { type: 'message', chatSessionId, message: assistant };
      }

      if (routedTool.confirmationRequired || routedTool.method !== 'GET') {
        const confirmation = await this.executor.prepare(routedTool.id, input, {
          tenantId: session.tenantId,
          botId: session.botId,
          widgetUserId: session.widgetUserId,
          chatSessionId,
          authContext: this.sessionAuthContext(session),
        });
        const assistant = `I am going to run ${routedTool.name}. Please confirm to continue.`;
        await this.saveAssistant(session.tenantId, chatSessionId, assistant, [{ type: 'action_confirmation', id: confirmation.id }]);
        return { type: 'action_confirmation', chatSessionId, message: assistant, confirmation };
      }

      const result = await this.executor.executeEndpoint(routedTool.id, input, {
        tenantId: session.tenantId,
        botId: session.botId,
        widgetUserId: session.widgetUserId,
        chatSessionId,
        authContext: this.sessionAuthContext(session),
      });
      const assistant = summarizeToolResult(routedTool.name, result.result);
      await this.saveAssistant(session.tenantId, chatSessionId, assistant, []);
      return { type: 'tool_result', chatSessionId, message: assistant, result };
    }

    const history = await this.recentHistory(session.tenantId, chatSessionId);
    let answer = '';
    let sources: unknown[] = [];
    for await (const chunk of this.ai.streamRagAnswer(session.tenantId, message, history.slice(0, -1))) {
      if (chunk.type === 'delta') answer += chunk.delta;
      if (chunk.type === 'sources') sources = chunk.sources;
    }
    await this.saveAssistant(session.tenantId, chatSessionId, answer, sources);
    return { type: 'message', chatSessionId, message: answer, sources };
  }

  async confirmAction(sessionToken: string, confirmationId: string, origin?: string) {
    const session = await this.assertSession(sessionToken, origin);
    return this.executor.confirm(confirmationId, {
      tenantId: session.tenantId,
      botId: session.botId,
      widgetUserId: session.widgetUserId,
      authContext: this.sessionAuthContext(session),
    });
  }

  async cancelAction(sessionToken: string, confirmationId: string, origin?: string) {
    const session = await this.assertSession(sessionToken, origin);
    return this.executor.cancel(confirmationId, {
      tenantId: session.tenantId,
      botId: session.botId,
      widgetUserId: session.widgetUserId,
    });
  }

  async sessions(sessionToken: string, origin?: string) {
    const session = await this.assertSession(sessionToken, origin);
    return this.prisma.chatSession.findMany({
      where: { tenantId: session.tenantId, widgetSessionId: session.id, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async messages(sessionToken: string, chatSessionId: string, origin?: string) {
    const session = await this.assertSession(sessionToken, origin);
    await this.assertChat(session.id, chatSessionId);
    return this.prisma.chatMessage.findMany({ where: { chatSessionId }, orderBy: { createdAt: 'asc' } });
  }

  private async upsertWidgetUser(tenantId: string, user?: CreateWidgetSessionDto['user']) {
    const externalUserId = user?.id || user?.email || `anonymous:${randomBytes(8).toString('hex')}`;
    const existing = await this.prisma.widgetUser.findFirst({ where: { tenantId, externalUserId } });
    if (existing) {
      return this.prisma.widgetUser.update({
        where: { id: existing.id },
        data: { email: user?.email, name: user?.name },
      });
    }
    return this.prisma.widgetUser.create({
      data: {
        tenantId,
        externalUserId,
        email: user?.email,
        name: user?.name,
        authMode: user?.signature ? 'signed' : user?.jwt ? 'jwt_passthrough' : user?.id || user?.email ? 'identified' : 'anonymous',
      },
    });
  }

  private assertIdentity(bot: { requireSignedIdentity: boolean; identitySecretEncrypted: string | null }, user?: CreateWidgetSessionDto['user']) {
    if (!bot.requireSignedIdentity) return;
    if (!user?.id || !user.email || !user.signature || !bot.identitySecretEncrypted) {
      throw new ForbiddenException('Signed identity is required.');
    }
    const secret = this.crypto.decrypt(bot.identitySecretEncrypted);
    if (!secret) throw new ForbiddenException('Signed identity is not configured.');
    const expected = createHmac('sha256', secret).update(`${user.id}${user.email}`).digest('hex');
    if (!safeEqual(expected, user.signature)) throw new ForbiddenException('Invalid user signature.');
  }

  private async assertSession(sessionToken: string, origin?: string) {
    const session = await this.prisma.widgetSession.findUnique({
      where: { sessionTokenHash: hashToken(sessionToken) },
      include: { bot: { include: { domains: { where: { enabled: true } } } } },
    });
    if (!session || session.status !== 'ACTIVE') throw new ForbiddenException('Invalid widget session.');
    assertOriginAllowed(session.bot.domains.map((domain) => domain.domain), origin);
    if (session.expiresAt && session.expiresAt < new Date()) throw new ForbiddenException('Widget session expired.');
    await this.prisma.widgetSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    return session;
  }

  private async assertChat(widgetSessionId: string, chatSessionId: string) {
    const chat = await this.prisma.chatSession.findFirst({ where: { id: chatSessionId, widgetSessionId, status: 'ACTIVE' } });
    if (!chat) throw new ForbiddenException('Chat session does not belong to this widget session.');
  }

  private async matchTool(tenantId: string, message: string) {
    const tools = await this.prisma.apiEndpoint.findMany({
      where: { enabled: true, connector: { tenantId, enabled: true } },
      include: { connector: true },
      take: 50,
    });
    const normalized = message.toLowerCase();
    return tools.find((tool) => {
      const haystack = `${tool.toolKey} ${tool.name} ${tool.description}`.toLowerCase();
      const keyParts = tool.toolKey.toLowerCase().split(/[._-]/g);
      return keyParts.every((part) => normalized.includes(part)) || haystack.split(/\s+/).some((word) => word.length > 4 && normalized.includes(word));
    });
  }

  private async recentHistory(tenantId: string, chatSessionId: string): Promise<RagHistoryMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { tenantId, chatSessionId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    return messages.reverse().map((message) => ({ role: message.role, content: message.content }));
  }

  private async saveAssistant(tenantId: string, chatSessionId: string, content: string, sources: unknown[]) {
    await this.prisma.chatMessage.create({
      data: {
        tenantId,
        chatSessionId,
        role: 'ASSISTANT',
        content,
        sources: sources as Prisma.InputJsonValue,
      },
    });
    await this.prisma.chatSession.update({ where: { id: chatSessionId }, data: { lastMessageAt: new Date(), updatedAt: new Date() } });
  }

  private buildSessionMetadata(user: CreateWidgetSessionDto['user'], origin?: string): Prisma.InputJsonValue {
    const bearerToken = normalizeBearerToken(user?.jwt);
    return {
      userAgentOrigin: origin || null,
      authMode: bearerToken ? 'jwt_passthrough' : null,
      jwtEncrypted: bearerToken ? this.crypto.encrypt(bearerToken) : null,
    };
  }

  private sessionAuthContext(session: { metadata: Prisma.JsonValue; tenantId: string; botId: string; widgetUserId: string }) {
    const metadata = session.metadata && typeof session.metadata === 'object' && !Array.isArray(session.metadata) ? session.metadata as Record<string, unknown> : {};
    const encryptedToken = typeof metadata.jwtEncrypted === 'string' ? metadata.jwtEncrypted : '';
    const bearerToken = encryptedToken ? normalizeBearerToken(this.crypto.decrypt(encryptedToken)) : '';
    return {
      tenantId: session.tenantId,
      botId: session.botId,
      widgetUserId: session.widgetUserId,
      jwt: bearerToken,
      bearerToken,
      accessToken: bearerToken,
    };
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeBearerToken(value?: string | null) {
  return value?.replace(/^Bearer\s+/i, '').trim() || '';
}

function safeEqual(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function assertOriginAllowed(domains: string[], origin?: string) {
  if (!domains.length) return;
  if (!origin) throw new ForbiddenException('Origin is required.');
  const hostname = new URL(origin).hostname.toLowerCase();
  const allowed = domains.some((domain) => {
    const normalized = normalizeDomain(domain);
    return normalized.startsWith('*.') ? hostname.endsWith(normalized.slice(1)) : hostname === normalized;
  });
  if (!allowed) throw new ForbiddenException('This domain is not allowed to load the widget.');
}

function normalizeDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  try {
    return new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}

function missingRequired(input: Record<string, unknown>, schema: Record<string, unknown>) {
  const fields = schema.properties && typeof schema.properties === 'object' ? Object.keys(schema.properties as Record<string, unknown>) : [];
  const required = Array.isArray(schema.required) ? schema.required.map(String) : fields.filter((field) => String((schema as Record<string, unknown>)[field]).includes('required'));
  return required.filter((field) => !input[field]);
}

function extractInput(message: string, schema: Record<string, unknown>) {
  const fields = schema.properties && typeof schema.properties === 'object' ? Object.keys(schema.properties as Record<string, unknown>) : [];
  if (!fields.length) return { query: message };
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    const pattern = new RegExp(`${field}\\s*[:=]\\s*([^\\n,]+)`, 'i');
    const match = message.match(pattern);
    if (match) input[field] = match[1].trim();
  }
  if (fields.includes('title') && !input.title) input.title = message.replace(/^(create|add|make)\s+(an?\s+)?(idea|challenge|task|record)\s*(for|called|named)?/i, '').trim();
  if (fields.includes('description') && !input.description) input.description = input.title || message;
  return input;
}

function summarizeToolResult(toolName: string, result: unknown) {
  const output = result && typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
  return `${toolName} completed successfully.\n\n${output}`;
}
