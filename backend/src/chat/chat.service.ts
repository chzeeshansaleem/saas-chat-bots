import { InjectQueue } from '@nestjs/bullmq';
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { AiService, RagAnswerChunk, RagHistoryMessage } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queues/queue.constants';
import { ChatEventsService } from './chat-events.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { ListChatSessionsDto } from './dto/list-chat-sessions.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    @InjectQueue(QUEUES.chatTitle) private readonly chatTitleQueue: Queue,
    private readonly events: ChatEventsService,
  ) {}

  listSessions(tenantId: string, userId: string, query: ListChatSessionsDto = {}) {
    const status = query.status && query.status !== 'ALL' ? query.status : undefined;
    return this.prisma.chatSession.findMany({
      where: {
        tenantId,
        userId,
        status: status || { not: 'DELETED' },
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { messages: { some: { content: { contains: query.q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
  }

  searchSessions(tenantId: string, userId: string, q?: string) {
    return this.listSessions(tenantId, userId, { q, status: 'ALL' });
  }

  async createSession(tenantId: string, userId: string, dto: CreateChatSessionDto) {
    const session = await this.prisma.chatSession.create({
      data: { tenantId, userId, title: dto.title || 'New Chat', titleManuallyEdited: Boolean(dto.title) },
    });
    this.events.emitSessionCreated({ tenantId, sessionId: session.id, title: session.title });
    return session;
  }

  async getSession(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId, true);
    return this.prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async updateSession(tenantId: string, userId: string, sessionId: string, dto: UpdateChatSessionDto) {
    await this.assertSessionAccess(tenantId, userId, sessionId, true);
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: dto.title || 'New Chat', titleManuallyEdited: true },
    });
  }

  renameSession(tenantId: string, userId: string, sessionId: string, dto: UpdateChatSessionDto) {
    return this.updateSession(tenantId, userId, sessionId, dto);
  }

  async deleteSession(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId, true);
    await this.prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'DELETED' } });
    this.events.emitSessionDeleted({ tenantId, sessionId });
    return { deleted: true };
  }

  async archiveSession(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId, true);
    const session = await this.prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'ARCHIVED' } });
    this.events.emitSessionArchived({ tenantId, sessionId });
    return session;
  }

  async restoreSession(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId, true);
    return this.prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'ACTIVE' } });
  }

  async getMessages(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId);
    return this.prisma.chatMessage.findMany({
      where: { tenantId, chatSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearMessages(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId, true);
    await this.prisma.chatMessage.deleteMany({ where: { tenantId, chatSessionId: sessionId } });
    await this.prisma.chatSession.update({ where: { id: sessionId }, data: { lastMessageAt: null } });
    return { deleted: true };
  }

  async sendMessage(tenantId: string, userId: string, sessionId: string, message: string) {
    this.logger.log(
      `Chat message requested ${JSON.stringify({ tenantId, userId, sessionId, messageLength: message.length, transport: 'http' })}`,
    );
    await this.assertSessionAccess(tenantId, userId, sessionId);
    await this.saveUserMessage(tenantId, userId, sessionId, message);
    const history = (await this.getRecentHistory(tenantId, sessionId)).slice(0, -1);
    let answer = '';
    let sources: unknown[] = [];
    for await (const chunk of this.ai.streamRagAnswer(tenantId, message, history)) {
      if (chunk.type === 'delta') answer += chunk.delta;
      if (chunk.type === 'sources') sources = chunk.sources;
    }
    const saved = await this.saveAssistantMessage(tenantId, sessionId, answer, sources);
    await this.queueTitleGeneration(tenantId, sessionId);
    return saved;
  }

  async *streamAndPersist(tenantId: string, userId: string, sessionId: string, message: string): AsyncGenerator<RagAnswerChunk> {
    this.logger.log(
      `Chat stream requested ${JSON.stringify({ tenantId, userId, sessionId, messageLength: message.length, transport: 'websocket' })}`,
    );
    await this.assertSessionAccess(tenantId, userId, sessionId);
    await this.saveUserMessage(tenantId, userId, sessionId, message);
    const history = (await this.getRecentHistory(tenantId, sessionId)).slice(0, -1);
    let answer = '';
    let sources: unknown[] = [];

    for await (const chunk of this.ai.streamRagAnswer(tenantId, message, history)) {
      if (chunk.type === 'delta') answer += chunk.delta;
      if (chunk.type === 'sources') sources = chunk.sources;
      yield chunk;
    }

    await this.saveAssistantMessage(tenantId, sessionId, answer, sources);
    await this.queueTitleGeneration(tenantId, sessionId);
    this.logger.log(
      `Chat stream completed ${JSON.stringify({ tenantId, userId, sessionId, answerLength: answer.length, sources: sources.length })}`,
    );
  }

  async queueTitleGeneration(tenantId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session || session.titleManuallyEdited || session.title !== 'New Chat' || session.status !== 'ACTIVE') return;

    const messageCount = await this.prisma.chatMessage.count({ where: { tenantId, chatSessionId: sessionId } });
    if (messageCount < 2 || messageCount > 6) return;

    const titleJob = await this.prisma.chatTitleJob.create({
      data: { tenantId, chatSessionId: sessionId, status: 'PENDING' },
    });
    await this.chatTitleQueue.add('generate-chat-title', { tenantId, sessionId, titleJobId: titleJob.id });
  }

  private async saveUserMessage(tenantId: string, userId: string, sessionId: string, content: string) {
    const sanitized = sanitizeMessage(content);
    await this.prisma.chatMessage.create({
      data: { tenantId, chatSessionId: sessionId, userId, role: 'USER', content: sanitized },
    });
    await this.touchSession(sessionId);
  }

  private async saveAssistantMessage(tenantId: string, sessionId: string, content: string, sources: unknown[]) {
    const saved = await this.prisma.chatMessage.create({
      data: {
        tenantId,
        chatSessionId: sessionId,
        role: 'ASSISTANT',
        content: sanitizeMessage(content),
        sources: sources as Prisma.InputJsonValue,
      },
    });
    await this.touchSession(sessionId);
    return saved;
  }

  private async touchSession(sessionId: string) {
    await this.prisma.chatSession.update({ where: { id: sessionId }, data: { lastMessageAt: new Date(), updatedAt: new Date() } });
  }

  private async getRecentHistory(tenantId: string, sessionId: string): Promise<RagHistoryMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { tenantId, chatSessionId: sessionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return messages.reverse().map((message) => ({ role: message.role, content: message.content }));
  }

  private async assertSessionAccess(tenantId: string, userId: string, sessionId: string, allowArchivedOrDeleted = false) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Chat session not found.');
    if (session.tenantId !== tenantId || session.userId !== userId) throw new ForbiddenException('No access to this chat session.');
    if (!allowArchivedOrDeleted && session.status !== 'ACTIVE') throw new ForbiddenException('Chat session is not active.');
  }
}

function sanitizeMessage(value: string) {
  return value.replace(/\u0000/g, '').trim();
}
