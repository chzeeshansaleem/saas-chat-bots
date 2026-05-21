# Phase 2: Website Crawler + PDF Upload System

## Folder Structure

Backend Phase 2 is layered on the existing NestJS modules:

```txt
backend/src/
  knowledge/              # source, document, PDF upload, Phase 2 route aliases
  crawler/                # Playwright crawler, SSRF guard, clean text extraction
  embeddings/             # OpenAI embeddings, retry handling, pgvector writes
  vector-search/          # tenant-filtered pgvector retrieval
  queues/                 # BullMQ queues and retry defaults
  prisma/                 # PrismaService
```

Frontend Phase 2 pages/components:

```txt
frontend/src/app/dashboard/
  knowledge/
    page.tsx
    add-website/page.tsx
    upload-pdf/page.tsx
    [id]/page.tsx
  crawl-jobs/page.tsx

frontend/src/components/knowledge/
  add-website-form.tsx
  pdf-upload-dropzone.tsx
  knowledge-source-table.tsx
  source-status-badge.tsx
  crawl-progress-card.tsx
  crawl-logs-drawer.tsx
  resync-button.tsx
  delete-source-dialog.tsx
```

## Prisma Schema Target

Current Phase 1 tables already support Phase 2 with `knowledge_sources`, `documents`, `document_chunks`, `embeddings`, `crawl_jobs`, and `crawl_logs`.

Production schema additions recommended for the next migration:

```prisma
model KnowledgeSource {
  id           String @id @default(uuid())
  tenantId     String @map("tenant_id")
  type         KnowledgeSourceType
  name         String
  url          String?
  filePath     String? @map("file_path")
  fileUrl      String? @map("file_url")
  status       KnowledgeSourceStatus @default(PENDING)
  crawlDepth   Int? @map("crawl_depth")
  maxPages     Int? @map("max_pages")
  lastSyncedAt DateTime? @map("last_synced_at")
  errorMessage String? @map("error_message")
  enabled      Boolean @default(true)
  metadata     Json @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
}

model Document {
  id          String @id @default(uuid())
  tenantId    String @map("tenant_id")
  sourceId    String @map("knowledge_source_id")
  title       String
  url         String? @map("uri")
  fileName    String? @map("file_name")
  mimeType    String? @map("mime_type")
  contentHash String @map("content_hash")
  rawText     String @map("raw_text")
  cleanText   String? @map("clean_text")
  status      String @default("INDEXED")
  metadata    Json @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
}

model DocumentChunk {
  id          String @id @default(uuid())
  tenantId    String @map("tenant_id")
  documentId  String @map("document_id")
  sourceId    String? @map("source_id")
  content     String
  contentHash String? @map("content_hash")
  chunkIndex  Int @map("chunk_index")
  tokenCount  Int @map("token_count")
  metadata    Json @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt
}
```

The current implementation keeps vectors in the dedicated `embeddings` table. That is usually preferable to embedding directly on `document_chunks` because it supports multiple embedding models later.

## API Endpoints

Phase 2 route aliases added:

```txt
POST   /api/knowledge-sources/website
POST   /api/knowledge-sources/pdf
GET    /api/knowledge-sources
GET    /api/knowledge-sources/:id
PATCH  /api/knowledge-sources/:id
DELETE /api/knowledge-sources/:id
POST   /api/knowledge-sources/:id/resync

POST   /api/crawler/start
GET    /api/crawler/jobs
GET    /api/crawler/jobs/:id
GET    /api/crawler/jobs/:id/logs

GET    /api/documents
GET    /api/documents/:id
DELETE /api/documents/:id

POST   /api/pdf/upload
GET    /api/pdf/:id/status

POST   /api/embeddings/rebuild/:sourceId
```

Legacy Phase 1 `/api/knowledge/*` routes remain available.

## Website Crawler

Implemented with Playwright:

- same-domain crawling
- depth and page limit
- duplicate URL prevention
- URL normalization
- tracking param removal
- metadata extraction
- clean readable text extraction
- crawl logs
- retry-friendly BullMQ worker
- SSRF guard for localhost, private IP ranges, metadata URLs, and non-http protocols

The crawler rejects:

```txt
localhost
127.0.0.1
0.0.0.0
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
::1
fc00::/7
fe80::/10
file:// URLs
```

## PDF Upload

PDF upload is available at `/api/pdf/upload` and `/api/knowledge-sources/pdf`.

Current storage is local disk under `backend/uploads`. Production should swap this behind a `StorageService` interface:

```txt
LocalStorageService for dev
S3StorageService for production
```

PDF validation:

- `.pdf` extension
- `application/pdf` mimetype
- 20 MB max
- tenant-scoped source/document records

## Queue Structure

Current queues:

```txt
crawler
file-processing
embeddings
```

Phase 2 target naming:

```txt
crawl-website
process-pdf
extract-text
generate-embeddings
cleanup-source
```

Recommended worker behavior:

- `attempts: 8`
- exponential backoff
- tenantId/sourceId in every job payload
- persisted logs for every page/file
- progress updates for dashboard polling/websocket

## RAG Integration

Chat retrieval already filters by `tenantId` through pgvector search.

Production refinement:

- filter only `KnowledgeSource.status = READY`
- include source URL/file name in citations
- ignore failed/processing documents
- return sources with each assistant answer

## Security

Implemented or configured:

- JWT auth
- tenant guard
- admin-only Phase 2 mutation endpoints
- PDF validation and size limit
- CORS
- Helmet
- throttling
- crawler SSRF guard
- sanitized/cleaned extraction

Production additions:

- virus scan uploaded PDFs
- S3 object encryption
- per-tenant crawl quotas
- robots.txt policy decision
- outbound egress allowlist/denylist
- queue dead-letter monitoring

## Docker

Backend Dockerfile now uses a Playwright base image:

```txt
mcr.microsoft.com/playwright:v1.49.1-noble
```

This includes browser dependencies needed by Chromium crawling.

Required env:

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=multi_chatbot
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=...
REDIS_HOST=redis
REDIS_PORT=6379
OPENAI_API_KEY=...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4.1-mini
CRAWLER_WAIT_UNTIL=domcontentloaded
CRAWLER_TIMEOUT_MS=30000
CRAWLER_RATE_LIMIT_MS=350
CRAWLER_IGNORE_HTTPS_ERRORS=false
```

## Production Checklist

- Add Prisma migration for Phase 2 metadata fields.
- Move upload storage to S3.
- Add antivirus scanning before indexing PDFs.
- Add queue dashboards and alerting.
- Add source progress percentages.
- Add websocket source status updates.
- Add per-tenant crawl and embedding quotas.
- Add integration tests for SSRF blocking.
- Add tests for PDF extraction, chunking, and vector search.
- Add pgvector ivfflat/hnsw indexes after enough data exists.
