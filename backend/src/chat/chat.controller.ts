import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { ListChatSessionsDto } from './dto/list-chat-sessions.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';

@ApiBearerAuth()
@ApiTags('chat')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('sessions')
  sessions(@CurrentUserDecorator() user: CurrentUser, @Query() query: ListChatSessionsDto) {
    return this.chat.listSessions(user.tenantId!, user.sub, query);
  }

  @Post('sessions')
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateChatSessionDto) {
    return this.chat.createSession(user.tenantId!, user.sub, dto);
  }

  @Get('sessions/:id')
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.getSession(user.tenantId!, user.sub, id);
  }

  @Patch('sessions/:id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateChatSessionDto) {
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

  @Post('sessions/:id/messages')
  sendToSession(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: CreateChatMessageDto) {
    return this.chat.sendMessage(user.tenantId!, user.sub, id, dto.message);
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

@ApiBearerAuth()
@ApiTags('chat-sessions')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('chat-sessions')
export class ChatSessionsController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateChatSessionDto) {
    return this.chat.createSession(user.tenantId!, user.sub, dto);
  }

  @Get()
  list(@CurrentUserDecorator() user: CurrentUser, @Query() query: ListChatSessionsDto) {
    return this.chat.listSessions(user.tenantId!, user.sub, query);
  }

  @Get('search')
  search(@CurrentUserDecorator() user: CurrentUser, @Query('q') q?: string) {
    return this.chat.searchSessions(user.tenantId!, user.sub, q);
  }

  @Get(':id')
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.getSession(user.tenantId!, user.sub, id);
  }

  @Patch(':id')
  update(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateChatSessionDto) {
    return this.chat.updateSession(user.tenantId!, user.sub, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.deleteSession(user.tenantId!, user.sub, id);
  }

  @Post(':id/archive')
  archive(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.archiveSession(user.tenantId!, user.sub, id);
  }

  @Post(':id/restore')
  restore(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.restoreSession(user.tenantId!, user.sub, id);
  }

  @Get(':id/messages')
  messages(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.getMessages(user.tenantId!, user.sub, id);
  }

  @Post(':id/messages')
  send(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: CreateChatMessageDto) {
    return this.chat.sendMessage(user.tenantId!, user.sub, id, dto.message);
  }

  @Delete(':id/messages')
  clear(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.clearMessages(user.tenantId!, user.sub, id);
  }

  @Post(':id/generate-title')
  generateTitle(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.chat.queueTitleGeneration(user.tenantId!, id);
  }

  @Patch(':id/title')
  rename(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateChatSessionDto) {
    return this.chat.renameSession(user.tenantId!, user.sub, id, dto);
  }
}
