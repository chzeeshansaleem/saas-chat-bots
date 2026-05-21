# Phase 2.5: Multiple Chat Sessions + History + Auto Titles

## Updated Structure

```txt
backend/src/chat/
  chat.controller.ts          # legacy /chat plus Phase 2.5 /chat-sessions APIs
  chat.service.ts             # sessions, messages, search, archive/delete, RAG persistence
  chat-title.processor.ts     # BullMQ title-generation worker
  chat-events.service.ts      # in-process realtime event bus
  dto/

frontend/src/app/dashboard/chat/
  page.tsx
  [chatId]/page.tsx

frontend/src/components/chat/
  chat-dashboard.tsx
  chat-sidebar.tsx
  chat-session-list.tsx
  chat-session-item.tsx
  new-chat-button.tsx
  chat-search-input.tsx
  rename-chat-dialog.tsx
  delete-chat-dialog.tsx
  archive-chat-button.tsx
  message-list.tsx
  message-bubble.tsx
  source-references.tsx
  typing-indicator.tsx
  streaming-response.tsx
```

## Prisma Updates

Added:

- `ChatSessionStatus`: `ACTIVE`, `ARCHIVED`, `DELETED`
- `ChatTitleJobStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
- `ChatMessageRole.TOOL`
- `ChatSession.titleManuallyEdited`
- `ChatSession.status`
- `ChatSession.lastMessageAt`
- `ChatMessage.tenantId`
- `ChatMessage.userId`
- `ChatMessage.metadata`
- `ChatMessage.tokenUsage`
- `ChatTitleJob`

Migration:

```txt
backend/prisma/migrations/20260522090000_phase_2_5_chat_sessions/migration.sql
```

## API Endpoints

```txt
POST   /api/chat-sessions
GET    /api/chat-sessions
GET    /api/chat-sessions/search?q=
GET    /api/chat-sessions/:id
PATCH  /api/chat-sessions/:id
DELETE /api/chat-sessions/:id
POST   /api/chat-sessions/:id/archive
POST   /api/chat-sessions/:id/restore
GET    /api/chat-sessions/:id/messages
POST   /api/chat-sessions/:id/messages
DELETE /api/chat-sessions/:id/messages
POST   /api/chat-sessions/:id/generate-title
PATCH  /api/chat-sessions/:id/title
```

Legacy `/api/chat/sessions` and `/api/chat/messages` remain available.

## Chat Flow

1. User creates a session with title `New Chat`.
2. User sends a message over Socket.io.
3. Backend validates tenant and user ownership.
4. Backend saves the user message.
5. Backend loads recent history, excluding the current question from duplicated prompt context.
6. RAG retrieves tenant-filtered knowledge chunks.
7. AI streams answer.
8. Backend saves assistant message and sources.
9. Backend queues `generate-chat-title` if the title is still `New Chat`.
10. Title worker updates the session and emits `chat.title.updated`.

## Title Generation

Queue:

```txt
chat-title-generation
```

Rules:

- run after first assistant response
- only when title is `New Chat`
- skip if `titleManuallyEdited = true`
- 3 to 7 words
- title case
- no quotes or emoji

## WebSocket Events

```txt
chat.message.streaming
chat.message.completed
chat.title.updated
chat.session.created
chat.session.deleted
chat.session.archived
```

Events are emitted to tenant-specific Socket.io rooms:

```txt
tenant:{tenantId}
```

## Security Rules

- JWT required.
- Tenant guard required.
- Users can only access their own chat sessions.
- Deleted chats are soft-deleted with `status = DELETED`.
- Archived chats cannot receive new messages until restored.
- Message content is sanitized for null bytes and trimmed.
- Realtime session/title events are scoped to tenant rooms.

## RAG Integration

`AiService.streamRagAnswer` now accepts recent chat history and still retrieves context by tenant. The prompt includes:

- recent messages
- current question
- retrieved knowledge chunks
- source references

It does not send the full chat history.

## Production Checklist

- Add pagination for chat sessions and messages.
- Add full-text indexes for chat search.
- Add restore UI for deleted sessions if desired.
- Add server-side message length limits by plan.
- Add title regeneration throttling.
- Add audit log for deleted/archived chats.
- Add e2e tests for tenant isolation.
- Add websocket authorization tests for tenant rooms.
- Add background summarization for long-running chats in Phase 3.
