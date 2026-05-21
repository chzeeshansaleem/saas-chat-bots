# Multi-Tenant AI Knowledge Base Chatbot Platform

Phase 1 monorepo for a Rovo-style SaaS chatbot where each tenant uploads or crawls its own knowledge base and receives grounded answers from only its own data.

## Folder Structure

```txt
.
├── backend/          # NestJS API, RAG, queues, Prisma, pgvector
├── frontend/         # Next.js App Router SaaS dashboard
├── infra/nginx/      # Reverse proxy for frontend, API, and Socket.io
├── docs/             # Architecture, API, and flow documentation
├── docker-compose.yml
└── .env.example
```

## Quick Start

```bash
cp .env.example .env
npm install
npm --workspace backend run prisma:generate
docker compose up --build
```

Use Node `20.11.0` or newer for local development. The Dockerfiles use Node 22.

Run migrations after the database is up:

```bash
npm --workspace backend run prisma:migrate
```

The Prisma scripts build `DATABASE_URL` automatically from `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USERNAME`, and `POSTGRES_PASSWORD` when `DATABASE_URL` is not set.

Open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`

## Phase 1 Scope

- Multi-tenant auth and tenant-scoped retrieval
- Website crawling with Playwright and BullMQ
- PDF, DOCX, and TXT processing
- Chunking, embedding generation, pgvector storage
- RAG chatbot with streaming Socket.io responses
- Chat sessions, history, Markdown/code rendering
- Docker Compose with PostgreSQL, pgvector, Redis, NestJS, Next.js, and Nginx

External CRUD integrations such as GitHub, Jira, and ClickUp are intentionally out of scope for Phase 1.
