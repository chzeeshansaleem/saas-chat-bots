import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { QUEUES } from '../queues/queue.constants';
import { CrawlerProcessor } from './crawler.processor';
import { CrawlerService } from './crawler.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.crawler }, { name: QUEUES.embeddings }), EmbeddingsModule],
  providers: [CrawlerService, CrawlerProcessor],
})
export class CrawlerModule {}
