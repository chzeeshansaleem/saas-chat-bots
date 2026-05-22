import { Module } from '@nestjs/common';
import { WidgetModule } from '../widget/widget.module';

@Module({
  imports: [WidgetModule],
  exports: [WidgetModule],
})
export class WidgetSessionsModule {}
