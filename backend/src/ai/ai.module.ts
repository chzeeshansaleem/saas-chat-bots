import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectorSearchModule } from '../vector-search/vector-search.module';
import { AiService } from './ai.service';

@Module({
  imports: [EmbeddingsModule, VectorSearchModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
