# Phase 1 Architecture

## Backend Architecture

```txt
backend/src
├── ai                 # OpenAI RAG orchestration and streaming
├── auth               # Signup, login, JWT, refresh token storage
├── chat               # Sessions, messages, REST chat flow
├── common             # Guards, filters, interceptors, decorators, middleware
├── config             # Environment validation
├── crawler            # Playwright website crawling
├── embeddings         # Embedding service and embedding worker
├── knowledge          # Sources, uploads, file processing worker
├── prisma             # Prisma client service
├── queues             # BullMQ queue names and registration
├── tenants            # Tenant membership lookup
├── vector-search      # Tenant-filtered pgvector similarity search
└── websocket          # Socket.io streaming gateway
```

## Frontend Architecture

```txt
frontend/src
├── app                # Next.js App Router pages
├── components         # Dashboard, layout, chat, upload, shadcn-style UI
├── lib                # API client and utilities
└── store              # Zustand auth and chat state
```

## Database Schema

Core models are implemented in `backend/prisma/schema.prisma`:

- `users`
- `tenants`
- `memberships`
- `knowledge_sources`
- `documents`
- `document_chunks`
- `embeddings`
- `chat_sessions`
- `chat_messages`
- `crawl_jobs`
- `crawl_logs`

Tenant isolation is enforced at the API layer with `TenantGuard` and at retrieval time with `WHERE e.tenant_id = $tenantId`.

## API Endpoints

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

Tenants:

- `GET /api/tenants`

Knowledge:

- `GET /api/knowledge/sources`
- `GET /api/knowledge/sources/:id`
- `POST /api/knowledge/website`
- `PATCH /api/knowledge/sources/:id`
- `DELETE /api/knowledge/sources/:id`
- `POST /api/knowledge/sources/:id/reindex`
- `POST /api/knowledge/documents`
- `GET /api/knowledge/documents`
- `GET /api/knowledge/documents/:id`
- `PATCH /api/knowledge/documents/:id`
- `DELETE /api/knowledge/documents/:id`
- `GET /api/knowledge/crawl-jobs`
- `GET /api/knowledge/crawl-jobs/:id/logs`
- `PATCH /api/knowledge/crawl-jobs/:id/cancel`

Chat:

- `GET /api/chat/sessions`
- `POST /api/chat/sessions`
- `PATCH /api/chat/sessions/:id`
- `DELETE /api/chat/sessions/:id`
- `GET /api/chat/sessions/:id/messages`
- `DELETE /api/chat/sessions/:id/messages`
- `POST /api/chat/messages`

WebSocket:

- `chat:message`
- `chat:typing`
- `chat:chunk`

## RAG Flow

1. User asks a question.
2. Backend generates an embedding for the question.
3. `vector-search` runs cosine similarity in pgvector.
4. Search is filtered by current tenant.
5. Top-K chunks are assembled into context with source references.
6. OpenAI receives a strict context-only prompt.
7. Tokens stream back through Socket.io.
8. Assistant message and sources are persisted.

Prompt rule:

```txt
Answer only from the provided context. If the answer is not present, say exactly:
"I could not find this information in the knowledge base."
Never invent facts.
```

## Queue Flow

Website:

1. `POST /knowledge/website`
2. Create `knowledge_sources` and `crawl_jobs`
3. Add BullMQ `crawler` job
4. Playwright crawls same-domain pages with rate limiting
5. Extracted content is stored as `documents`
6. Chunks are created
7. Embedding jobs are queued
8. `embeddings` worker writes vectors to pgvector

Documents:

1. `POST /knowledge/documents`
2. File is validated and stored
3. Add BullMQ `file-processing` job
4. Extract text from PDF, DOCX, or TXT
5. Create document chunks
6. Queue embedding jobs
7. Mark source `READY`

## Authentication Flow

1. Signup creates user, tenant, and admin membership.
2. Login validates password with bcrypt.
3. Access token is used in `Authorization: Bearer`.
4. Tenant context is passed with `x-tenant-id`.
5. `TenantGuard` verifies membership before protected routes.
6. Refresh token hashes are stored server-side.

## Chat Flow

1. Frontend loads or creates a chat session.
2. User sends `chat:message` over Socket.io.
3. Gateway validates JWT and tenant membership.
4. User message is saved.
5. RAG answer streams as `chat:chunk`.
6. Assistant message is saved with sources.

## Docker Setup

`docker-compose.yml` runs:

- `postgres` using `pgvector/pgvector:pg16`
- `redis`
- `backend`
- `frontend`
- `nginx`

## Production Best Practices

- Use AWS RDS PostgreSQL with pgvector enabled.
- Use ElastiCache Redis for BullMQ.
- Store uploaded files in S3 and persist object keys instead of local paths.
- Move workers into separate ECS/Kubernetes deployments from the API.
- Add row-level security in PostgreSQL for defense in depth.
- Add queue dead-letter monitoring and alerting.
- Add tenant-level quotas for crawl pages, tokens, storage, and upload size.
- Encrypt refresh tokens and secrets with a managed KMS.
- Use OpenTelemetry traces across API, queue, and AI calls.
- Add CDN and WAF in front of Nginx or an AWS Application Load Balancer.

## Development Roadmap

1. Add Prisma migrations and seed scripts.
2. Add e2e tests for auth, tenant isolation, upload, and chat.
3. Add crawl cancellation, robots.txt policy, and sitemap ingestion.
4. Add per-tenant usage metering.
5. Add source-level reindexing and deletion.
6. Add admin member invitations.
7. Add production observability dashboards.
8. Add external integrations in Phase 2.

## Example Request

```bash
curl -X POST http://localhost:4000/api/knowledge/website \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"name":"Docs","url":"https://example.com/docs","depth":2,"pageLimit":50}'
```
