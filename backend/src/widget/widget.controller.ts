import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { WidgetService } from './widget.service';
import { CreateWidgetSessionDto } from './dto/create-widget-session.dto';
import { WidgetChatDto } from './dto/widget-chat.dto';

@Controller('widget')
export class WidgetController {
  constructor(private readonly widget: WidgetService) {}

  @Get('config/:botId')
  config(@Param('botId') botId: string, @Headers('origin') origin?: string, @Headers('referer') referer?: string) {
    return this.widget.config(botId, origin || originFromReferer(referer));
  }

  @Post('session')
  session(@Body() dto: CreateWidgetSessionDto, @Headers('origin') origin?: string, @Headers('referer') referer?: string) {
    return this.widget.createSession(dto, origin || originFromReferer(referer));
  }

  @Post('chat')
  chat(@Body() dto: WidgetChatDto, @Headers('origin') origin?: string, @Headers('referer') referer?: string) {
    return this.widget.chat(dto, origin || originFromReferer(referer));
  }

  @Get('chat-sessions')
  sessions(@Query('sessionToken') sessionToken: string, @Headers('origin') origin?: string, @Headers('referer') referer?: string) {
    return this.widget.sessions(sessionToken, origin || originFromReferer(referer));
  }

  @Get('chat-sessions/:id/messages')
  messages(@Query('sessionToken') sessionToken: string, @Param('id') id: string, @Headers('origin') origin?: string, @Headers('referer') referer?: string) {
    return this.widget.messages(sessionToken, id, origin || originFromReferer(referer));
  }

  @Post('actions/:id/confirm')
  confirm(@Param('id') id: string, @Body('sessionToken') sessionToken: string, @Headers('origin') origin?: string, @Headers('referer') referer?: string) {
    return this.widget.confirmAction(sessionToken, id, origin || originFromReferer(referer));
  }

  @Post('actions/:id/cancel')
  cancel(@Param('id') id: string, @Body('sessionToken') sessionToken: string, @Headers('origin') origin?: string, @Headers('referer') referer?: string) {
    return this.widget.cancelAction(sessionToken, id, origin || originFromReferer(referer));
  }
}

function originFromReferer(referer?: string) {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
