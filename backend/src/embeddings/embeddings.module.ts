import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../queues/queue.constants';
import { EmbeddingsProcessor } from './embeddings.processor';
import { EmbeddingsService } from './embeddings.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.embeddings })],
  providers: [EmbeddingsService, EmbeddingsProcessor],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
