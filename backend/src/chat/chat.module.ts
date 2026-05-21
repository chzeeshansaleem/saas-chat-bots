import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { QUEUES } from '../queues/queue.constants';
import { ChatController, ChatSessionsController } from './chat.controller';
import { ChatEventsService } from './chat-events.service';
import { ChatService } from './chat.service';
import { ChatTitleProcessor } from './chat-title.processor';

@Module({
  imports: [AiModule, BullModule.registerQueue({ name: QUEUES.chatTitle })],
  controllers: [ChatController, ChatSessionsController],
  providers: [ChatService, ChatEventsService, ChatTitleProcessor],
  exports: [ChatService, ChatEventsService],
})
export class ChatModule {}
