import { Module } from '@nestjs/common';
import { ActionRouterService } from './action-router.service';

@Module({
  providers: [ActionRouterService],
  exports: [ActionRouterService],
})
export class ActionRouterModule {}
