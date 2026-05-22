import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  exports: [AiModule],
})
export class RagModule {}
