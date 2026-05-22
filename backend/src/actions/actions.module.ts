import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';

@Module({
  imports: [IntegrationsModule, PermissionsModule],
  controllers: [ActionsController],
  providers: [ActionsService],
  exports: [ActionsService],
})
export class ActionsModule {}
