import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ActionExecutorModule } from '../action-executor/action-executor.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';

@Module({
  imports: [AiModule, ActionExecutorModule, IntegrationsModule],
  controllers: [WidgetController],
  providers: [WidgetService],
  exports: [WidgetService],
})
export class WidgetModule {}
