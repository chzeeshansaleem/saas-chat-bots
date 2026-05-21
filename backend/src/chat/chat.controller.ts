import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ChatService } from './chat.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiBearerAuth()
@ApiTags('chat')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('sessions')
  sessions(@CurrentUserDecorator() user: CurrentUser) {
    return this.chat.listSessions(user.tenantId!, user.sub);
  }

  @Post('sessions')
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateChatSessionDto) {
    return this.chat.createSession(user.tenantId!, user.sub, dto);
  }

  @Patch('sessions/:id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: CreateChatSessionDto) {
    return this.chat.updateSession(user.tenantId!, user.sub, id, dto);
  }

  @Delete('sessions/:id')
  delete(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.deleteSession(user.tenantId!, user.sub, id);
  }

  @Get('sessions/:id/messages')
  messages(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.getMessages(user.tenantId!, user.sub, id);
  }

  @Delete('sessions/:id/messages')
  clearMessages(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.clearMessages(user.tenantId!, user.sub, id);
  }

  @Post('messages')
  send(@CurrentUserDecorator() user: CurrentUser, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(user.tenantId!, user.sub, dto.sessionId, dto.message);
  }
}
