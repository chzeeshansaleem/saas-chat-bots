import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActionsService } from '../actions/actions.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('action-logs')
export class ActionLogsController {
  constructor(private readonly actions: ActionsService) {}

  @Get()
  logs(@CurrentUserDecorator() user: CurrentUser) {
    return this.actions.logs(user.tenantId!);
  }
}
