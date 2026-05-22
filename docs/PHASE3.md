# Phase 3: Third-Party App Integrations + Action Agents

Phase 3 extends the tenant-isolated RAG chatbot into an action-capable SaaS assistant. The design is generic: providers register tools, tenants connect accounts, the action router selects a tool, permission checks run, write actions require confirmation, connectors execute against external APIs, and every attempt is audited.

## Updated Folder Structure

```txt
backend/src/
  action-router/       intent routing and tool suggestions
  actions/             prepare, confirm, cancel, execute, audit
  action-logs/         action log read API
  custom-api/          tenant REST connector and endpoint tools
  integrations/        providers, OAuth, token encryption, connectors
  oauth/               OAuth module boundary
  permissions/         role-to-capability checks
  sync/                sync worker boundary
  tools/               generic tool registry
  webhooks/            incoming provider events

frontend/src/app/dashboard/
  integrations/        marketplace and provider detail pages
  custom-api/          custom REST connector builder
  action-logs/         audit table
  webhooks/            webhook event table
```

## Prisma Schema

The Phase 3 migration adds:

- `IntegrationProvider`, `TenantIntegration`, `ToolDefinition`
- `ActionRequest`, `ActionLog`
- `WebhookEndpoint`, `WebhookEvent`, `ExternalResourceCache`
- `CustomApiConnector`, `CustomApiEndpoint`
- Enums for auth type, integration status, tool action type, action status, log status, and HTTP method

The migration seeds GitHub, ClickUp, Jira, Slack, and Custom REST API providers plus starter tools such as `github.createRepo`, `clickup.createTask`, `jira.createIssue`, `slack.sendMessage`, and `customApi.callEndpoint`.

## Integration Architecture

```txt
Chat Message
  -> ActionRouterService
  -> ToolDefinition lookup
  -> PermissionsService
  -> ActionRequest
  -> confirmation gate for WRITE/DELETE
  -> ConnectorRegistryService
  -> Provider Connector
  -> External API
  -> ActionLog
  -> Chat/UI result
```

Connectors implement a common contract:

```ts
IntegrationConnector {
  providerKey: string;
  getAuthUrl(state: string): string;
  handleCallback(code: string): Promise<TokenResponse>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  executeTool(toolKey: string, payload: unknown, context: ToolContext): Promise<unknown>;
  verifyWebhook(signature: string, payload: unknown): boolean;
}
```

## OAuth Flow

1. Admin clicks Connect in `/dashboard/integrations`.
2. Backend creates a signed state with `tenantId:userId:provider`.
3. Provider redirects to `/integrations/:provider/callback`.
4. Connector exchanges code for tokens.
5. Tokens are encrypted with `TokenCryptoService` before storage.
6. Frontend only receives connection status and metadata, never secrets.

## Tool Registry

Tools are data-driven in `ToolDefinition`:

- `key`: unique action name like `github.createIssue`
- `actionType`: `READ`, `WRITE`, or `DELETE`
- `inputSchema`: JSON schema for validation/UI generation
- `requiredScopes`: OAuth scopes required by the provider
- `confirmationRequired`: true for write/delete actions
- `enabled`: tenant/platform rollout switch

## Connector Examples

- GitHub: create repository, create issue, get repo status
- ClickUp: create task, get task details
- Custom API: executes configured endpoint definitions using tenant-owned base URLs and encrypted auth config

Current connectors are production-shaped boundaries with safe stub execution. Replace each `executeTool` body with provider SDK/API calls as credentials and exact payload contracts are finalized.

## AI Tool-Calling Flow

1. Classify message as knowledge, live data, action, or mixed.
2. For knowledge, use existing tenant RAG.
3. For live data, execute a `READ` tool and summarize the result.
4. For write/delete, create `ActionRequest` in `PENDING_CONFIRMATION`.
5. UI shows an action preview with confirm/cancel.
6. Confirmation executes connector and stores `ActionLog`.

System rules:

- Never execute write/delete without confirmation.
- Ask a follow-up if required tool input is missing.
- Never expose access tokens, headers, API keys, or webhook secrets.
- Use tenant knowledge for documentation and live APIs for real-time state.

## API Endpoints

Integrations:

- `GET /integrations/providers`
- `GET /integrations/connected`
- `POST /integrations/:provider/connect`
- `GET /integrations/:provider/callback`
- `DELETE /integrations/:id/disconnect`

Tools and actions:

- `GET /tools`
- `PATCH /tools/:id/enable`
- `POST /tools/:id/test`
- `POST /actions/prepare`
- `POST /actions/:id/confirm`
- `POST /actions/:id/cancel`
- `GET /actions/logs`

Custom API:

- `POST /custom-api/connectors`
- `GET /custom-api/connectors`
- `PATCH /custom-api/connectors/:id`
- `DELETE /custom-api/connectors/:id`
- `POST /custom-api/connectors/:id/endpoints`
- `GET /custom-api/connectors/:id/endpoints`
- `PATCH /custom-api/endpoints/:id`
- `DELETE /custom-api/endpoints/:id`
- `POST /custom-api/endpoints/:id/test`

Webhooks:

- `POST /webhooks/:tenantId/:provider`
- `GET /webhooks/events`

## Queue Design

Registered BullMQ queues:

- `integration-sync`
- `webhook-processing`
- `action-execution`
- `token-refresh`
- `external-resource-cache`

Production deployments can split queue processors into dedicated worker containers using the same backend image and a queue-only bootstrap.

## Webhook Processing

1. Provider posts to `/webhooks/:tenantId/:provider`.
2. Connector verifies signature.
3. `WebhookEvent` is stored with provider, tenant, event type, and payload.
4. Background processing updates `ExternalResourceCache`.
5. WebSocket notifications can update active tenant dashboards.

## Sync and Cache

Use `ExternalResourceCache` for fast reads of common resources:

- GitHub repos/issues/PRs
- ClickUp spaces/lists/tasks
- Jira projects/issues/sprints
- Slack channels/messages

Cache rows are tenant-scoped and keyed by provider, resource type, and external ID.

## Frontend

Dashboard pages:

- `/dashboard/integrations`
- `/dashboard/integrations/github`
- `/dashboard/integrations/clickup`
- `/dashboard/integrations/jira`
- `/dashboard/integrations/slack`
- `/dashboard/custom-api`
- `/dashboard/action-logs`
- `/dashboard/webhooks`

Core components:

- `IntegrationCard`
- `OAuthConnectButton`
- `ConnectedAccountBadge`
- `ToolListTable`
- `ToolPermissionEditor`
- `CustomApiConnectorForm`
- `CustomApiEndpointBuilder`
- `ActionConfirmationModal`
- `ActionLogTable`
- `WebhookEventTable`
- `SyncStatusBadge`

## Security

- OAuth tokens and custom API credentials are encrypted at rest.
- Tokens are never returned to frontend clients.
- Tenant isolation is enforced through `TenantGuard` and tenant-scoped Prisma queries.
- Role permissions gate read/write/delete tools.
- Write/delete tools require confirmation.
- Custom API connector blocks localhost, loopback, metadata hostnames, and private IPv4 literals.
- Webhooks use provider signature verification boundaries.
- Action logs provide auditability for all external effects.

For stricter production SSRF protection, add DNS resolution checks, egress firewall rules, and explicit tenant domain allowlists.

## Environment Variables

```txt
BACKEND_PUBLIC_URL=http://localhost:4000
ENCRYPTION_KEY=replace-with-32-plus-character-secret
WEBHOOK_SECRET=replace-with-webhook-secret
ACTION_QUEUE_CONCURRENCY=3
SYNC_QUEUE_CONCURRENCY=2
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
CLICKUP_CLIENT_ID=
CLICKUP_CLIENT_SECRET=
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
```

## Production Checklist

- Apply the Phase 3 Prisma migration and regenerate Prisma Client.
- Configure OAuth callback URLs in each provider console.
- Replace connector stubs with provider API calls and provider-specific validation.
- Add per-provider rate-limit handling and token refresh workers.
- Enforce custom API domain allowlists per tenant.
- Split queue workers from API servers when throughput grows.
- Add integration tests for confirmation gates and cross-tenant access.
- Monitor action failures, webhook verification failures, token refresh failures, and provider API rate limits.
