CREATE TYPE "IntegrationAuthType" AS ENUM ('OAUTH2', 'API_KEY', 'BEARER_TOKEN', 'BASIC', 'NONE');
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED');
CREATE TYPE "ToolActionType" AS ENUM ('READ', 'WRITE', 'DELETE');
CREATE TYPE "ActionRequestStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'EXECUTING', 'SUCCESS', 'FAILED', 'CANCELLED');
CREATE TYPE "ActionLogStatus" AS ENUM ('SUCCESS', 'FAILED', 'CANCELLED');
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PATCH', 'PUT', 'DELETE');

CREATE TABLE "integration_providers" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "auth_type" "IntegrationAuthType" NOT NULL,
  "oauth_config" JSONB NOT NULL DEFAULT '{}',
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_integrations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "connected_by_user_id" TEXT NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
  "access_token_encrypted" TEXT,
  "refresh_token_encrypted" TEXT,
  "expires_at" TIMESTAMP(3),
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_definitions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "provider_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "action_type" "ToolActionType" NOT NULL,
  "input_schema" JSONB NOT NULL DEFAULT '{}',
  "required_scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "confirmation_required" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "action_requests" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "tool_id" TEXT NOT NULL,
  "status" "ActionRequestStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  "input_payload" JSONB NOT NULL DEFAULT '{}',
  "output_payload" JSONB NOT NULL DEFAULT '{}',
  "error_message" TEXT,
  "requires_confirmation" BOOLEAN NOT NULL DEFAULT true,
  "confirmed_at" TIMESTAMP(3),
  "executed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "action_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "integration_id" TEXT,
  "tool_name" TEXT NOT NULL,
  "action_type" "ToolActionType" NOT NULL,
  "input_payload" JSONB NOT NULL DEFAULT '{}',
  "output_payload" JSONB NOT NULL DEFAULT '{}',
  "status" "ActionLogStatus" NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_endpoints" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_resource_cache" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_resource_cache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_api_connectors" (
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
  CONSTRAINT "custom_api_connectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_api_endpoints" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "connector_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "method" "HttpMethod" NOT NULL,
  "path" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "input_schema" JSONB NOT NULL DEFAULT '{}',
  "response_mapping" JSONB NOT NULL DEFAULT '{}',
  "confirmation_required" BOOLEAN NOT NULL DEFAULT false,
  "allowed_roles" TEXT[] NOT NULL DEFAULT ARRAY['ADMIN']::TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "custom_api_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_providers_key_key" ON "integration_providers"("key");
CREATE UNIQUE INDEX "tenant_integrations_tenant_id_provider_id_key" ON "tenant_integrations"("tenant_id", "provider_id");
CREATE UNIQUE INDEX "tool_definitions_key_key" ON "tool_definitions"("key");
CREATE UNIQUE INDEX "external_resource_cache_tenant_id_provider_id_resource_type_external_id_key" ON "external_resource_cache"("tenant_id", "provider_id", "resource_type", "external_id");

CREATE INDEX "tenant_integrations_tenant_id_status_idx" ON "tenant_integrations"("tenant_id", "status");
CREATE INDEX "tool_definitions_provider_id_enabled_idx" ON "tool_definitions"("provider_id", "enabled");
CREATE INDEX "action_requests_tenant_id_user_id_status_idx" ON "action_requests"("tenant_id", "user_id", "status");
CREATE INDEX "action_logs_tenant_id_created_at_idx" ON "action_logs"("tenant_id", "created_at");
CREATE INDEX "action_logs_tenant_id_tool_name_idx" ON "action_logs"("tenant_id", "tool_name");
CREATE INDEX "webhook_endpoints_tenant_id_provider_id_idx" ON "webhook_endpoints"("tenant_id", "provider_id");
CREATE INDEX "webhook_events_tenant_id_provider_id_processed_idx" ON "webhook_events"("tenant_id", "provider_id", "processed");
CREATE INDEX "external_resource_cache_tenant_id_resource_type_idx" ON "external_resource_cache"("tenant_id", "resource_type");
CREATE INDEX "custom_api_connectors_tenant_id_enabled_idx" ON "custom_api_connectors"("tenant_id", "enabled");
CREATE INDEX "custom_api_endpoints_connector_id_enabled_idx" ON "custom_api_endpoints"("connector_id", "enabled");

ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "integration_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_connected_by_user_id_fkey" FOREIGN KEY ("connected_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_definitions" ADD CONSTRAINT "tool_definitions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "integration_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tool_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "tenant_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "integration_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "integration_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_resource_cache" ADD CONSTRAINT "external_resource_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_resource_cache" ADD CONSTRAINT "external_resource_cache_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "integration_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_api_connectors" ADD CONSTRAINT "custom_api_connectors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_api_endpoints" ADD CONSTRAINT "custom_api_endpoints_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "custom_api_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "integration_providers" ("name", "key", "auth_type", "oauth_config", "scopes", "updated_at")
VALUES
  ('GitHub', 'github', 'OAUTH2', '{}', ARRAY['repo', 'read:user']::TEXT[], NOW()),
  ('ClickUp', 'clickup', 'OAUTH2', '{}', ARRAY['task:read', 'task:write']::TEXT[], NOW()),
  ('Jira', 'jira', 'OAUTH2', '{}', ARRAY['read:jira-work', 'write:jira-work']::TEXT[], NOW()),
  ('Slack', 'slack', 'OAUTH2', '{}', ARRAY['chat:write', 'channels:read']::TEXT[], NOW()),
  ('Custom REST API', 'custom-api', 'API_KEY', '{}', ARRAY[]::TEXT[], NOW())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "tool_definitions" ("provider_id", "name", "key", "description", "action_type", "input_schema", "required_scopes", "confirmation_required", "updated_at")
SELECT p."id", tool."name", tool."key", tool."description", tool."action_type"::"ToolActionType", tool."input_schema"::JSONB, tool."required_scopes"::TEXT[], tool."confirmation_required", NOW()
FROM "integration_providers" p
JOIN (
  VALUES
    ('github', 'Create GitHub Repository', 'github.createRepo', 'Create a new GitHub repository', 'WRITE', '{"type":"object","required":["name"]}', ARRAY['repo']::TEXT[], true),
    ('github', 'Create GitHub Issue', 'github.createIssue', 'Create a GitHub issue', 'WRITE', '{"type":"object","required":["owner","repo","title"]}', ARRAY['repo']::TEXT[], true),
    ('github', 'Get GitHub Repository Status', 'github.getRepoStatus', 'Read repository status and metadata', 'READ', '{"type":"object","required":["owner","repo"]}', ARRAY['repo']::TEXT[], false),
    ('clickup', 'Create ClickUp Task', 'clickup.createTask', 'Create a ClickUp task', 'WRITE', '{"type":"object","required":["listId","name"]}', ARRAY['task:write']::TEXT[], true),
    ('clickup', 'Get ClickUp Task Details', 'clickup.getTaskDetails', 'Read ClickUp task details', 'READ', '{"type":"object","required":["taskId"]}', ARRAY['task:read']::TEXT[], false),
    ('jira', 'Create Jira Issue', 'jira.createIssue', 'Create a Jira issue', 'WRITE', '{"type":"object","required":["projectKey","summary","issueType"]}', ARRAY['write:jira-work']::TEXT[], true),
    ('jira', 'Get Jira Project Issues', 'jira.getProjectIssues', 'Read Jira project issues', 'READ', '{"type":"object","required":["projectKey"]}', ARRAY['read:jira-work']::TEXT[], false),
    ('slack', 'Send Slack Message', 'slack.sendMessage', 'Send a Slack channel message', 'WRITE', '{"type":"object","required":["channel","text"]}', ARRAY['chat:write']::TEXT[], true),
    ('slack', 'Read Slack Channel Messages', 'slack.readChannelMessages', 'Read recent Slack channel messages', 'READ', '{"type":"object","required":["channel"]}', ARRAY['channels:read']::TEXT[], false),
    ('custom-api', 'Call Custom REST Endpoint', 'customApi.callEndpoint', 'Execute an enabled custom REST endpoint', 'WRITE', '{"type":"object","required":["endpointId"]}', ARRAY[]::TEXT[], true)
) AS tool("provider_key", "name", "key", "description", "action_type", "input_schema", "required_scopes", "confirmation_required")
ON p."key" = tool."provider_key"
ON CONFLICT ("key") DO NOTHING;
