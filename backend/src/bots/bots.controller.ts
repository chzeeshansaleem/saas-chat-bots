import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { BotsService } from './bots.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('bots')
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateBotDto) {
    return this.bots.create(user.tenantId!, dto);
  }

  @Get()
  list(@CurrentUserDecorator() user: CurrentUser) {
    return this.bots.list(user.tenantId!);
  }

  @Get(':id')
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.bots.get(user.tenantId!, id);
  }

  @Patch(':id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateBotDto) {
    return this.bots.update(user.tenantId!, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.bots.delete(user.tenantId!, id);
  }

  @Get(':id/embed-code')
  embedCode(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.bots.embedCode(user.tenantId!, id);
  }
}
