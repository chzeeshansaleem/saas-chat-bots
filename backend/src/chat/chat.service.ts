import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiService, RagAnswerChunk } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  listSessions(tenantId: string, userId: string) {
    return this.prisma.chatSession.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
  }

  createSession(tenantId: string, userId: string, dto: CreateChatSessionDto) {
    return this.prisma.chatSession.create({
      data: { tenantId, userId, title: dto.title || 'New conversation' },
    });
  }

  async updateSession(tenantId: string, userId: string, sessionId: string, dto: CreateChatSessionDto) {
    await this.assertSessionAccess(tenantId, userId, sessionId);
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: dto.title || 'New conversation' },
    });
  }

  async deleteSession(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId);
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
    return { deleted: true };
  }

  async getMessages(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId);
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearMessages(tenantId: string, userId: string, sessionId: string) {
    await this.assertSessionAccess(tenantId, userId, sessionId);
    await this.prisma.chatMessage.deleteMany({ where: { sessionId } });
    return { deleted: true };
  }

  async sendMessage(tenantId: string, userId: string, sessionId: string, message: string) {
    this.logger.log(
      `Chat message requested ${JSON.stringify({
        tenantId,
        userId,
        sessionId,
        messageLength: message.length,
        transport: 'http',
      })}`,
    );
    await this.assertSessionAccess(tenantId, userId, sessionId);
    await this.prisma.chatMessage.create({ data: { sessionId, role: 'USER', content: message } });
    let answer = '';
    let sources: unknown[] = [];
    for await (const chunk of this.streamAssistantAnswer(tenantId, message)) {
      if (chunk.type === 'delta') answer += chunk.delta;
      if (chunk.type === 'sources') sources = chunk.sources;
    }
    const saved = await this.prisma.chatMessage.create({
      data: { sessionId, role: 'ASSISTANT', content: answer, sources: sources as object[] },
    });
    this.logger.log(
      `Chat message completed ${JSON.stringify({
        tenantId,
        userId,
        sessionId,
        answerLength: answer.length,
        sources: sources.length,
        transport: 'http',
      })}`,
    );
    return saved;
  }

  async *streamAndPersist(tenantId: string, userId: string, sessionId: string, message: string): AsyncGenerator<RagAnswerChunk> {
    this.logger.log(
      `Chat stream requested ${JSON.stringify({
        tenantId,
        userId,
        sessionId,
        messageLength: message.length,
        transport: 'websocket',
      })}`,
    );
    await this.assertSessionAccess(tenantId, userId, sessionId);
    await this.prisma.chatMessage.create({ data: { sessionId, role: 'USER', content: message } });
    let answer = '';
    let sources: unknown[] = [];

    for await (const chunk of this.streamAssistantAnswer(tenantId, message)) {
      if (chunk.type === 'delta') answer += chunk.delta;
      if (chunk.type === 'sources') sources = chunk.sources;
      yield chunk;
    }

    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'ASSISTANT', content: answer, sources: sources as object[] },
    });
    await this.prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    this.logger.log(
      `Chat stream completed ${JSON.stringify({
        tenantId,
        userId,
        sessionId,
        answerLength: answer.length,
        sources: sources.length,
        transport: 'websocket',
      })}`,
    );
  }

  private streamAssistantAnswer(tenantId: string, message: string) {
    return this.ai.streamRagAnswer(tenantId, message);
  }

  private async assertSessionAccess(tenantId: string, userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Chat session not found.');
    if (session.tenantId !== tenantId || session.userId !== userId) throw new ForbiddenException('No access to this chat session.');
  }
}
