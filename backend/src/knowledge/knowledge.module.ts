import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { QUEUES } from '../queues/queue.constants';
import { KnowledgeController } from './knowledge.controller';
import {
  CrawlerPhase2Controller,
  DocumentsPhase2Controller,
  EmbeddingsPhase2Controller,
  KnowledgeSourcesPhase2Controller,
  PdfPhase2Controller,
} from './phase2.controller';
import { KnowledgeRepository } from './knowledge.repository';
import { KnowledgeService } from './knowledge.service';
import { FileProcessingProcessor } from './file-processing.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.crawler }, { name: QUEUES.fileProcessing }, { name: QUEUES.embeddings }),
    EmbeddingsModule,
  ],
  controllers: [
    KnowledgeController,
    KnowledgeSourcesPhase2Controller,
    CrawlerPhase2Controller,
    DocumentsPhase2Controller,
    PdfPhase2Controller,
    EmbeddingsPhase2Controller,
  ],
  providers: [KnowledgeService, KnowledgeRepository, FileProcessingProcessor, RolesGuard],
  exports: [KnowledgeService, KnowledgeRepository],
})
export class KnowledgeModule {}
