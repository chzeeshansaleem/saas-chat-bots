import { Module } from '@nestjs/common';
import { ActionsModule } from '../actions/actions.module';
import { ActionLogsController } from './action-logs.controller';

@Module({
  imports: [ActionsModule],
  controllers: [ActionLogsController],
})
export class ActionLogsModule {}
