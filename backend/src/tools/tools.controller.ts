import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ToolsService } from './tools.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  list() {
    return this.tools.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tools.get(id);
  }

  @Patch(':id/enable')
  enable(@Param('id') id: string, @Body() body: { enabled?: boolean }) {
    return this.tools.enable(id, body.enabled ?? true);
  }

  @Post(':id/test')
  test(@Param('id') id: string) {
    return this.tools.test(id);
  }
}
