import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiBearerAuth()
@ApiTags('tenants')
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@CurrentUserDecorator() user: { sub: string }) {
    return this.tenants.listForUser(user.sub);
  }

  @Post()
  create(@CurrentUserDecorator() user: { sub: string }, @Body() dto: CreateTenantDto) {
    return this.tenants.create(user.sub, dto);
  }

  @Get(':id')
  get(@CurrentUserDecorator() user: { sub: string }, @Param('id') id: string) {
    return this.tenants.getForUser(user.sub, id);
  }

  @Patch(':id')
  update(@CurrentUserDecorator() user: { sub: string }, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(user.sub, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUserDecorator() user: { sub: string }, @Param('id') id: string) {
    return this.tenants.delete(user.sub, id);
  }

  @Get(':id/members')
  members(@CurrentUserDecorator() user: { sub: string }, @Param('id') id: string) {
    return this.tenants.members(user.sub, id);
  }
}
