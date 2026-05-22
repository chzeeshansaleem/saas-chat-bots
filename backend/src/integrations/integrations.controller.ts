import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { IntegrationsService } from './integrations.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('providers')
  providers() {
    return this.integrations.providers();
  }

  @Get('connected')
  connected(@CurrentUserDecorator() user: CurrentUser) {
    return this.integrations.connected(user.tenantId!);
  }

  @Post(':provider/connect')
  connect(@CurrentUserDecorator() user: CurrentUser, @Param('provider') provider: string) {
    return this.integrations.startConnect(provider, user.tenantId!, user.sub);
  }

  @Get(':provider/callback')
  callback(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('provider') provider: string,
    @Query('code') code: string,
  ) {
    return this.integrations.handleCallback(provider, user.tenantId!, user.sub, code);
  }

  @Delete(':id/disconnect')
  disconnect(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.integrations.disconnect(user.tenantId!, id);
  }
}
