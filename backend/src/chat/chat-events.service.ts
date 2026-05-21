import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export type ChatRealtimeEvent = {
  tenantId: string;
  sessionId: string;
  title?: string;
};

@Injectable()
export class ChatEventsService {
  private readonly emitter = new EventEmitter();

  emitTitleUpdated(event: ChatRealtimeEvent) {
    this.emitter.emit('chat.title.updated', event);
  }

  emitSessionCreated(event: ChatRealtimeEvent) {
    this.emitter.emit('chat.session.created', event);
  }

  emitSessionDeleted(event: ChatRealtimeEvent) {
    this.emitter.emit('chat.session.deleted', event);
  }

  emitSessionArchived(event: ChatRealtimeEvent) {
    this.emitter.emit('chat.session.archived', event);
  }

  on(event: 'chat.title.updated' | 'chat.session.created' | 'chat.session.deleted' | 'chat.session.archived', listener: (payload: ChatRealtimeEvent) => void) {
    this.emitter.on(event, listener);
  }
}
