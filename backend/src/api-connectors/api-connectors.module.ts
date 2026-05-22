import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ApiConnectorsController } from './api-connectors.controller';
import { ApiConnectorsService } from './api-connectors.service';

@Module({
  imports: [IntegrationsModule],
  controllers: [ApiConnectorsController],
  providers: [ApiConnectorsService],
  exports: [ApiConnectorsService],
})
export class ApiConnectorsModule {}
