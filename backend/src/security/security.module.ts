import { Module } from '@nestjs/common';
import { WidgetIdentityService } from './widget-identity.service';

@Module({
  providers: [WidgetIdentityService],
  exports: [WidgetIdentityService],
})
export class SecurityModule {}
