import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(':tenantId/:provider')
  ingest(@Param('tenantId') tenantId: string, @Param('provider') provider: string, @Body() payload: unknown) {
    return this.webhooks.ingest(tenantId, provider, payload);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('events')
  events(@CurrentUserDecorator() user: CurrentUser) {
    return this.webhooks.events(user.tenantId!);
  }
}
