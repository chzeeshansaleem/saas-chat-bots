import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CustomApiController } from './custom-api.controller';
import { CustomApiService } from './custom-api.service';

@Module({
  imports: [IntegrationsModule],
  controllers: [CustomApiController],
  providers: [CustomApiService],
})
export class CustomApiModule {}
