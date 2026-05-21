import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatEventsService } from '../chat/chat-events.service';
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';

type SocketUser = { sub: string; email: string; tenantId: string };

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly events: ChatEventsService,
  ) {}

  afterInit() {
    this.events.on('chat.title.updated', (event) => this.server.to(tenantRoom(event.tenantId)).emit('chat.title.updated', event));
    this.events.on('chat.session.created', (event) => this.server.to(tenantRoom(event.tenantId)).emit('chat.session.created', event));
    this.events.on('chat.session.deleted', (event) => this.server.to(tenantRoom(event.tenantId)).emit('chat.session.deleted', event));
    this.events.on('chat.session.archived', (event) => this.server.to(tenantRoom(event.tenantId)).emit('chat.session.archived', event));
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    const tenantId = client.handshake.auth?.tenantId;
    if (!token || !tenantId) {
      this.logger.warn(`Socket rejected missing auth ${JSON.stringify({ socketId: client.id, hasToken: Boolean(token), hasTenantId: Boolean(tenantId) })}`);
      return client.disconnect(true);
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
      const membership = await this.prisma.membership.findUnique({ where: { userId_tenantId: { userId: payload.sub, tenantId } } });
      if (!membership) {
        this.logger.warn(`Socket rejected missing tenant membership ${JSON.stringify({ socketId: client.id, userId: payload.sub, tenantId })}`);
        return client.disconnect(true);
      }
      client.data.user = { ...payload, tenantId } satisfies SocketUser;
      client.join(tenantRoom(tenantId));
      this.logger.log(`Socket connected ${JSON.stringify({ socketId: client.id, userId: payload.sub, tenantId })}`);
    } catch (error) {
      this.logger.warn(
        `Socket rejected invalid token ${JSON.stringify({
          socketId: client.id,
          message: error instanceof Error ? error.message : String(error),
        })}`,
      );
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; message: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return;
    this.logger.log(
      `Socket chat message received ${JSON.stringify({
        socketId: client.id,
        userId: user.sub,
        tenantId: user.tenantId,
        sessionId: body.sessionId,
        messageLength: body.message?.length || 0,
      })}`,
    );

    client.emit('chat:typing', { sessionId: body.sessionId, typing: true });
    try {
      for await (const chunk of this.chat.streamAndPersist(user.tenantId, user.sub, body.sessionId, body.message)) {
        client.emit('chat:chunk', { sessionId: body.sessionId, ...chunk });
        client.emit('chat.message.streaming', { sessionId: body.sessionId, ...chunk });
      }
      client.emit('chat.message.completed', { sessionId: body.sessionId });
      client.emit('chat:typing', { sessionId: body.sessionId, typing: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Socket chat message failed ${JSON.stringify({
          socketId: client.id,
          userId: user.sub,
          tenantId: user.tenantId,
          sessionId: body.sessionId,
          message,
        })}`,
        error instanceof Error ? error.stack : undefined,
      );
      client.emit('chat:error', {
        sessionId: body.sessionId,
        message,
      });
      client.emit('chat.message.completed', { sessionId: body.sessionId, error: message });
      client.emit('chat:typing', { sessionId: body.sessionId, typing: false });
    }
  }
}

function tenantRoom(tenantId: string) {
  return `tenant:${tenantId}`;
}
