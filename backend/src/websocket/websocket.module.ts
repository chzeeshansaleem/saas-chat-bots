import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [AuthModule, ChatModule],
  providers: [ChatGateway],
})
export class WebsocketModule {}
