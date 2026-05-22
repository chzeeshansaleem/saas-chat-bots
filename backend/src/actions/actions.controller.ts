import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActionsService } from './actions.service';
import { PrepareActionDto } from './dto/prepare-action.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('actions')
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Post('prepare')
  prepare(@CurrentUserDecorator() user: CurrentUser, @Body() dto: PrepareActionDto) {
    return this.actions.prepare(user.tenantId!, user.sub, user.role, dto);
  }

  @Post(':id/confirm')
  confirm(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.actions.confirm(user.tenantId!, user.sub, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.actions.cancel(user.tenantId!, user.sub, id);
  }

  @Get('logs')
  logs(@CurrentUserDecorator() user: CurrentUser) {
    return this.actions.logs(user.tenantId!);
  }

  @Get(':id')
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.actions.get(user.tenantId!, id);
  }
}
