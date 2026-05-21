import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';

type SocketUser = { sub: string; email: string; tenantId: string };

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

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
      }
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
      client.emit('chat:typing', { sessionId: body.sessionId, typing: false });
    }
  }
}
