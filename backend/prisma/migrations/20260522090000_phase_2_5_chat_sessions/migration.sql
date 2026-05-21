CREATE TYPE "ChatSessionStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
CREATE TYPE "ChatTitleJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TYPE "ChatMessageRole" ADD VALUE IF NOT EXISTS 'TOOL';

ALTER TABLE "chat_sessions"
  ADD COLUMN "title_manually_edited" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "ChatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "last_message_at" TIMESTAMP(3);

UPDATE "chat_sessions"
SET "title" = 'New Chat'
WHERE "title" = 'New conversation';

UPDATE "chat_sessions" cs
SET "last_message_at" = latest."created_at"
FROM (
  SELECT "session_id", MAX("created_at") AS "created_at"
  FROM "chat_messages"
  GROUP BY "session_id"
) latest
WHERE latest."session_id" = cs."id";

ALTER TABLE "chat_messages"
  ADD COLUMN "tenant_id" TEXT,
  ADD COLUMN "user_id" TEXT,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "token_usage" JSONB NOT NULL DEFAULT '{}';

UPDATE "chat_messages" cm
SET
  "tenant_id" = cs."tenant_id",
  "user_id" = CASE WHEN cm."role" = 'USER' THEN cs."user_id" ELSE NULL END
FROM "chat_sessions" cs
WHERE cm."session_id" = cs."id";

ALTER TABLE "chat_messages"
  ALTER COLUMN "tenant_id" SET NOT NULL;

CREATE TABLE "chat_title_jobs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "chat_session_id" TEXT NOT NULL,
  "status" "ChatTitleJobStatus" NOT NULL DEFAULT 'PENDING',
  "generated_title" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "chat_title_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_sessions_tenant_id_user_id_status_idx" ON "chat_sessions"("tenant_id", "user_id", "status");
CREATE INDEX "chat_sessions_tenant_id_updated_at_idx" ON "chat_sessions"("tenant_id", "updated_at");
CREATE INDEX "chat_messages_tenant_id_session_id_created_at_idx" ON "chat_messages"("tenant_id", "session_id", "created_at");
CREATE INDEX "chat_messages_tenant_id_user_id_created_at_idx" ON "chat_messages"("tenant_id", "user_id", "created_at");
CREATE INDEX "chat_title_jobs_tenant_id_chat_session_id_status_idx" ON "chat_title_jobs"("tenant_id", "chat_session_id", "status");

ALTER TABLE "chat_title_jobs"
  ADD CONSTRAINT "chat_title_jobs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_title_jobs"
  ADD CONSTRAINT "chat_title_jobs_chat_session_id_fkey"
  FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
