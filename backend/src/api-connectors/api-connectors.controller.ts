import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ApiConnectorsService } from './api-connectors.service';
import { CreateApiConnectorDto } from './dto/create-api-connector.dto';
import { CreateApiToolDto } from './dto/create-api-tool.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class ApiConnectorsController {
  constructor(private readonly apiConnectors: ApiConnectorsService) {}

  @Post('api-connectors')
  createConnector(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateApiConnectorDto) {
    return this.apiConnectors.createConnector(user.tenantId!, dto);
  }

  @Get('api-connectors')
  connectors(@CurrentUserDecorator() user: CurrentUser) {
    return this.apiConnectors.connectors(user.tenantId!);
  }

  @Get('api-connectors/:id')
  getConnector(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.apiConnectors.getConnector(user.tenantId!, id);
  }

  @Patch('api-connectors/:id')
  updateConnector(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: Partial<CreateApiConnectorDto>) {
    return this.apiConnectors.updateConnector(user.tenantId!, id, dto);
  }

  @Delete('api-connectors/:id')
  deleteConnector(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.apiConnectors.deleteConnector(user.tenantId!, id);
  }

  @Post('api-connectors/:id/test')
  testConnector(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.apiConnectors.testConnector(user.tenantId!, id);
  }

  @Post('api-connectors/:id/tools')
  createTool(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: CreateApiToolDto) {
    return this.apiConnectors.createTool(user.tenantId!, id, dto);
  }

  @Get('api-tools')
  tools(@CurrentUserDecorator() user: CurrentUser) {
    return this.apiConnectors.tools(user.tenantId!);
  }

  @Get('api-tools/:id')
  getTool(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.apiConnectors.getTool(user.tenantId!, id);
  }

  @Patch('api-tools/:id')
  updateTool(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: Partial<CreateApiToolDto> & { enabled?: boolean }) {
    return this.apiConnectors.updateTool(user.tenantId!, id, dto);
  }

  @Delete('api-tools/:id')
  deleteTool(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.apiConnectors.deleteTool(user.tenantId!, id);
  }

  @Post('api-tools/:id/test')
  testTool(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.apiConnectors.testTool(user.tenantId!, id);
  }
}
