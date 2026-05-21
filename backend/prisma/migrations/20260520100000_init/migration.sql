CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "KnowledgeSourceType" AS ENUM ('WEBSITE', 'PDF', 'DOCX', 'TXT');
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "CrawlJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "refresh_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "KnowledgeSourceType" NOT NULL,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "url" TEXT,
    "file_path" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "knowledge_source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "embeddings" (
    "id" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vector" vector(1536) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "token_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "knowledge_source_id" TEXT NOT NULL,
    "root_url" TEXT NOT NULL,
    "status" "CrawlJobStatus" NOT NULL DEFAULT 'QUEUED',
    "depth" INTEGER NOT NULL DEFAULT 2,
    "page_limit" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crawl_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_logs" (
    "id" TEXT NOT NULL,
    "crawl_job_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status_code" INTEGER,
    "message" TEXT,
    "crawled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crawl_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");
CREATE UNIQUE INDEX "memberships_user_id_tenant_id_key" ON "memberships"("user_id", "tenant_id");
CREATE INDEX "knowledge_sources_tenant_id_type_idx" ON "knowledge_sources"("tenant_id", "type");
CREATE INDEX "documents_tenant_id_knowledge_source_id_idx" ON "documents"("tenant_id", "knowledge_source_id");
CREATE UNIQUE INDEX "documents_tenant_id_content_hash_key" ON "documents"("tenant_id", "content_hash");
CREATE INDEX "document_chunks_tenant_id_document_id_idx" ON "document_chunks"("tenant_id", "document_id");
CREATE UNIQUE INDEX "document_chunks_document_id_ordinal_key" ON "document_chunks"("document_id", "ordinal");
CREATE UNIQUE INDEX "embeddings_chunk_id_key" ON "embeddings"("chunk_id");
CREATE INDEX "embeddings_tenant_id_idx" ON "embeddings"("tenant_id");
CREATE INDEX "chat_sessions_tenant_id_user_id_idx" ON "chat_sessions"("tenant_id", "user_id");
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");
CREATE INDEX "crawl_jobs_tenant_id_status_idx" ON "crawl_jobs"("tenant_id", "status");
CREATE INDEX "crawl_logs_crawl_job_id_idx" ON "crawl_logs"("crawl_job_id");

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledge_source_id_fkey" FOREIGN KEY ("knowledge_source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_knowledge_source_id_fkey" FOREIGN KEY ("knowledge_source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_logs" ADD CONSTRAINT "crawl_logs_crawl_job_id_fkey" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
