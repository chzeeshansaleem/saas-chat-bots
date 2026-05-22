import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CustomApiService } from './custom-api.service';
import { CreateCustomApiConnectorDto } from './dto/create-custom-api-connector.dto';
import { CreateCustomApiEndpointDto } from './dto/create-custom-api-endpoint.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('custom-api')
export class CustomApiController {
  constructor(private readonly customApi: CustomApiService) {}

  @Post('connectors')
  createConnector(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateCustomApiConnectorDto) {
    return this.customApi.createConnector(user.tenantId!, dto);
  }

  @Get('connectors')
  connectors(@CurrentUserDecorator() user: CurrentUser) {
    return this.customApi.connectors(user.tenantId!);
  }

  @Patch('connectors/:id')
  updateConnector(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: Partial<CreateCustomApiConnectorDto>) {
    return this.customApi.updateConnector(user.tenantId!, id, dto);
  }

  @Delete('connectors/:id')
  deleteConnector(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.customApi.deleteConnector(user.tenantId!, id);
  }

  @Post('connectors/:id/endpoints')
  createEndpoint(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: CreateCustomApiEndpointDto) {
    return this.customApi.createEndpoint(user.tenantId!, id, dto);
  }

  @Get('connectors/:id/endpoints')
  endpoints(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.customApi.endpoints(user.tenantId!, id);
  }

  @Patch('endpoints/:id')
  updateEndpoint(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: Partial<CreateCustomApiEndpointDto>) {
    return this.customApi.updateEndpoint(user.tenantId!, id, dto);
  }

  @Delete('endpoints/:id')
  deleteEndpoint(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.customApi.deleteEndpoint(user.tenantId!, id);
  }

  @Post('endpoints/:id/test')
  testEndpoint(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.customApi.testEndpoint(user.tenantId!, id);
  }
}
