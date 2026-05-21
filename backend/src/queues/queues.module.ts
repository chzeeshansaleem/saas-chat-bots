import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.crawler },
      { name: QUEUES.fileProcessing },
      {
        name: QUEUES.embeddings,
        defaultJobOptions: {
          attempts: 8,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
