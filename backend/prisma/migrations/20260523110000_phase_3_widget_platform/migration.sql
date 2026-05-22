CREATE TYPE "BotStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "WidgetPosition" AS ENUM ('BOTTOM_RIGHT', 'BOTTOM_LEFT');
CREATE TYPE "WidgetSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "ToolExecutionStatus" AS ENUM ('PENDING_CONFIRMATION', 'EXECUTING', 'SUCCESS', 'FAILED', 'CANCELLED');

ALTER TABLE "chat_sessions" ADD COLUMN "bot_id" TEXT;
ALTER TABLE "chat_sessions" ADD COLUMN "widget_session_id" TEXT;

ALTER TABLE "action_logs" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "action_logs" ADD COLUMN "bot_id" TEXT;
ALTER TABLE "action_logs" ADD COLUMN "chat_session_id" TEXT;
ALTER TABLE "action_logs" ADD COLUMN "confirmed_at" TIMESTAMP(3);
ALTER TABLE "action_logs" ADD COLUMN "executed_at" TIMESTAMP(3);

CREATE TABLE "bots" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "welcome_message" TEXT NOT NULL DEFAULT 'Hi, how can I help?',
  "placeholder" TEXT NOT NULL DEFAULT 'Ask me anything...',
  "theme_color" TEXT NOT NULL DEFAULT '#2563eb',
  "position" "WidgetPosition" NOT NULL DEFAULT 'BOTTOM_RIGHT',
  "z_index" INTEGER NOT NULL DEFAULT 2147483000,
  "status" "BotStatus" NOT NULL DEFAULT 'ACTIVE',
  "suggested_questions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allow_anonymous" BOOLEAN NOT NULL DEFAULT true,
  "require_signed_identity" BOOLEAN NOT NULL DEFAULT false,
  "identity_secret_encrypted" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bot_domains" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "bot_id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bot_domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "widget_users" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "external_user_id" TEXT,
  "email" TEXT,
  "name" TEXT,
  "auth_mode" TEXT NOT NULL DEFAULT 'anonymous',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "widget_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "widget_sessions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "bot_id" TEXT NOT NULL,
  "widget_user_id" TEXT NOT NULL,
  "session_token_hash" TEXT NOT NULL,
  "origin" TEXT,
  "status" "WidgetSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "widget_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_connectors" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "base_url" TEXT NOT NULL,
  "auth_type" "IntegrationAuthType" NOT NULL,
  "auth_config_encrypted" TEXT,
  "headers_encrypted" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "api_connectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_endpoints" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "connector_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tool_key" TEXT NOT NULL,
  "method" "HttpMethod" NOT NULL,
  "path" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "input_schema" JSONB NOT NULL DEFAULT '{}',
  "request_mapping" JSONB NOT NULL DEFAULT '{}',
  "response_mapping" JSONB NOT NULL DEFAULT '{}',
  "confirmation_required" BOOLEAN NOT NULL DEFAULT false,
  "allowed_roles" TEXT[] NOT NULL DEFAULT ARRAY['admin','member']::TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "api_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_executions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "bot_id" TEXT,
  "widget_user_id" TEXT,
  "chat_session_id" TEXT,
  "endpoint_id" TEXT NOT NULL,
  "tool_key" TEXT NOT NULL,
  "status" "ToolExecutionStatus" NOT NULL DEFAULT 'EXECUTING',
  "input_payload" JSONB NOT NULL DEFAULT '{}',
  "output_payload" JSONB NOT NULL DEFAULT '{}',
  "error_message" TEXT,
  "confirmed_at" TIMESTAMP(3),
  "executed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "action_confirmations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "bot_id" TEXT,
  "widget_user_id" TEXT,
  "chat_session_id" TEXT,
  "endpoint_id" TEXT NOT NULL,
  "status" "ToolExecutionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  "preview" JSONB NOT NULL DEFAULT '{}',
  "input_payload" JSONB NOT NULL DEFAULT '{}',
  "confirmed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "action_confirmations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_configs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "connector_id" TEXT,
  "name" TEXT NOT NULL,
  "auth_type" "IntegrationAuthType" NOT NULL,
  "config_encrypted" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "oauth_connections" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "connector_id" TEXT,
  "external_user_id" TEXT,
  "access_token_encrypted" TEXT,
  "refresh_token_encrypted" TEXT,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oauth_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_credentials" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "connector_id" TEXT,
  "name" TEXT NOT NULL,
  "secret_encrypted" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "api_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bot_domains_bot_id_domain_key" ON "bot_domains"("bot_id", "domain");
CREATE UNIQUE INDEX "widget_sessions_session_token_hash_key" ON "widget_sessions"("session_token_hash");
CREATE UNIQUE INDEX "api_endpoints_connector_id_tool_key_key" ON "api_endpoints"("connector_id", "tool_key");

CREATE INDEX "bots_tenant_id_status_idx" ON "bots"("tenant_id", "status");
CREATE INDEX "bot_domains_domain_enabled_idx" ON "bot_domains"("domain", "enabled");
CREATE INDEX "widget_users_tenant_id_external_user_id_idx" ON "widget_users"("tenant_id", "external_user_id");
CREATE INDEX "widget_users_tenant_id_email_idx" ON "widget_users"("tenant_id", "email");
CREATE INDEX "widget_sessions_tenant_id_bot_id_status_idx" ON "widget_sessions"("tenant_id", "bot_id", "status");
CREATE INDEX "widget_sessions_widget_user_id_status_idx" ON "widget_sessions"("widget_user_id", "status");
CREATE INDEX "chat_sessions_tenant_id_bot_id_status_idx" ON "chat_sessions"("tenant_id", "bot_id", "status");
CREATE INDEX "chat_sessions_widget_session_id_idx" ON "chat_sessions"("widget_session_id");
CREATE INDEX "api_connectors_tenant_id_enabled_idx" ON "api_connectors"("tenant_id", "enabled");
CREATE INDEX "api_endpoints_tool_key_enabled_idx" ON "api_endpoints"("tool_key", "enabled");
CREATE INDEX "api_endpoints_connector_id_enabled_idx" ON "api_endpoints"("connector_id", "enabled");
CREATE INDEX "tool_executions_tenant_id_tool_key_status_idx" ON "tool_executions"("tenant_id", "tool_key", "status");
CREATE INDEX "tool_executions_chat_session_id_created_at_idx" ON "tool_executions"("chat_session_id", "created_at");
CREATE INDEX "action_confirmations_tenant_id_status_idx" ON "action_confirmations"("tenant_id", "status");
CREATE INDEX "action_confirmations_chat_session_id_status_idx" ON "action_confirmations"("chat_session_id", "status");
CREATE INDEX "auth_configs_tenant_id_enabled_idx" ON "auth_configs"("tenant_id", "enabled");
CREATE INDEX "oauth_connections_tenant_id_connector_id_idx" ON "oauth_connections"("tenant_id", "connector_id");
CREATE INDEX "api_credentials_tenant_id_connector_id_idx" ON "api_credentials"("tenant_id", "connector_id");
CREATE INDEX "action_logs_tenant_id_bot_id_created_at_idx" ON "action_logs"("tenant_id", "bot_id", "created_at");
CREATE INDEX "action_logs_tenant_id_chat_session_id_idx" ON "action_logs"("tenant_id", "chat_session_id");

ALTER TABLE "bots" ADD CONSTRAINT "bots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bot_domains" ADD CONSTRAINT "bot_domains_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "widget_users" ADD CONSTRAINT "widget_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "widget_sessions" ADD CONSTRAINT "widget_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "widget_sessions" ADD CONSTRAINT "widget_sessions_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "widget_sessions" ADD CONSTRAINT "widget_sessions_widget_user_id_fkey" FOREIGN KEY ("widget_user_id") REFERENCES "widget_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_widget_session_id_fkey" FOREIGN KEY ("widget_session_id") REFERENCES "widget_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "api_connectors" ADD CONSTRAINT "api_connectors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_endpoints" ADD CONSTRAINT "api_endpoints_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "api_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "api_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_confirmations" ADD CONSTRAINT "action_confirmations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_confirmations" ADD CONSTRAINT "action_confirmations_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "action_confirmations" ADD CONSTRAINT "action_confirmations_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "action_confirmations" ADD CONSTRAINT "action_confirmations_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "api_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_configs" ADD CONSTRAINT "auth_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_configs" ADD CONSTRAINT "auth_configs_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "api_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "api_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "api_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "bots" ("tenant_id", "name", "welcome_message", "placeholder", "theme_color", "updated_at")
SELECT "id", "name" || ' Assistant', 'Hi, I can answer questions and help with approved actions.', 'Ask a question or request an action...', '#2563eb', NOW()
FROM "tenants"
WHERE NOT EXISTS (SELECT 1 FROM "bots" WHERE "bots"."tenant_id" = "tenants"."id");
