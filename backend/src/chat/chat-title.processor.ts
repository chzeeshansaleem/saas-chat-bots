import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService, RagHistoryMessage } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queues/queue.constants';
import { ChatEventsService } from './chat-events.service';

type ChatTitleJobData = {
  tenantId: string;
  sessionId: string;
  titleJobId: string;
};

@Processor(QUEUES.chatTitle, { concurrency: 1, lockDuration: 120_000 })
export class ChatTitleProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatTitleProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly events: ChatEventsService,
  ) {
    super();
  }

  async process(job: Job<ChatTitleJobData>) {
    const { tenantId, sessionId, titleJobId } = job.data;
    await this.prisma.chatTitleJob.update({ where: { id: titleJobId }, data: { status: 'PROCESSING' } });

    try {
      const session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, tenantId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 6 } },
      });

      if (!session || session.titleManuallyEdited || session.title !== 'New Chat' || session.status !== 'ACTIVE') {
        await this.prisma.chatTitleJob.update({
          where: { id: titleJobId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        return;
      }

      const title = await this.ai.generateChatTitle(
        session.messages.map((message): RagHistoryMessage => ({ role: message.role, content: message.content })),
      );

      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title },
      });
      await this.prisma.chatTitleJob.update({
        where: { id: titleJobId },
        data: { status: 'COMPLETED', generatedTitle: title, completedAt: new Date() },
      });
      this.events.emitTitleUpdated({ tenantId, sessionId, title });

      this.logger.log(`Chat title generated ${JSON.stringify({ tenantId, sessionId, title })}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.chatTitleJob.update({
        where: { id: titleJobId },
        data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
      });
      this.logger.error(
        `Chat title generation failed ${JSON.stringify({ tenantId, sessionId, titleJobId, message })}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
