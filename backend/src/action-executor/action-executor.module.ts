import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ActionExecutorService } from './action-executor.service';

@Module({
  imports: [IntegrationsModule],
  providers: [ActionExecutorService],
  exports: [ActionExecutorService],
})
export class ActionExecutorModule {}
