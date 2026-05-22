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
      {
        name: QUEUES.chatTitle,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      },
      { name: QUEUES.integrationSync, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } } },
      { name: QUEUES.webhookProcessing, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } } },
      { name: QUEUES.actionExecution, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } },
      { name: QUEUES.tokenRefresh, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 5000 } } },
      { name: QUEUES.externalResourceCache, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } } },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
