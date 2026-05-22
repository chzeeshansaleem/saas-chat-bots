# Phase 3: Universal Embeddable AI Action Widget

This phase adds a separate embeddable AI agent layer that any website or SaaS app can load with one script tag. The widget answers from the tenant knowledge base and can prepare or execute configured API tools through the backend.

## Monorepo Structure

```txt
apps/
  widget/             React + Vite embeddable widget, CDN deployable as widget.js

backend/src/
  widget/             public widget config, session, chat, action confirm/cancel APIs
  bots/               tenant bot configuration and embed code generation
  api-connectors/     universal connector and endpoint builder
  action-executor/    server-side tool execution and action audit
  action-router/      intent/tool routing boundary

frontend/src/app/dashboard/
  bots/               bot settings, branding, allowed domains, embed code
  custom-api/         existing custom connector surface
  integrations/       provider marketplace

packages/
  types/ sdk/ utils/ ui/
```

The existing `backend` and `frontend` folders remain in place to avoid a risky app move. `apps/widget` follows the requested deployable widget shape.

## Embed Script

```html
<script
  src="https://my-ai-platform.com/widget.js"
  data-api-url="https://my-ai-platform.com/api"
  data-tenant-id="TENANT_ID"
  data-bot-id="BOT_ID"
  data-user-id="CURRENT_USER_ID"
  data-user-email="CURRENT_USER_EMAIL"
  data-user-name="CURRENT_USER_NAME"
  data-user-signature="HMAC_SHA256(userId + email, secret)">
</script>
```

Programmatic initialization is also supported:

```js
window.AIChatbot.init({
  apiUrl: 'https://my-ai-platform.com/api',
  tenantId: 'ideawake',
  botId: 'main-bot',
  user: {
    id: '123',
    name: 'Zeeshan',
    email: 'zeeshan@example.com',
    signature: 'hmac',
  },
});
```

## Widget Architecture

- Loads automatically from script attributes.
- Mounts a Shadow DOM root to avoid host CSS conflicts.
- Shows a bottom-left or bottom-right floating button.
- Opens a right-side drawer, full width on mobile.
- Creates a backend widget session.
- Sends messages to `/api/widget/chat`.
- Shows Markdown messages, suggested questions, typing state, and action confirmation cards.
- Confirms/cancels actions through backend endpoints. The widget never calls business APIs directly.

## Bot Configuration

Admins configure bots at `/dashboard/bots`:

- Name, avatar URL, welcome message, placeholder text
- Theme color, position, z-index
- Allowed domains
- Suggested questions
- Anonymous or signed-user mode
- Embed script generation

Public config endpoint:

- `GET /widget/config/:botId`

## Universal API Connector Builder

Backend APIs:

- `POST /api-connectors`
- `GET /api-connectors`
- `GET /api-connectors/:id`
- `PATCH /api-connectors/:id`
- `DELETE /api-connectors/:id`
- `POST /api-connectors/:id/test`
- `POST /api-connectors/:id/tools`
- `GET /api-tools`
- `GET /api-tools/:id`
- `PATCH /api-tools/:id`
- `DELETE /api-tools/:id`
- `POST /api-tools/:id/test`

Each connector stores encrypted auth config and headers. Each API endpoint becomes a tool with:

- `toolKey`
- method/path
- input schema
- request mapping
- response mapping
- confirmation requirement
- allowed roles

## AI Action Flow

1. User sends a widget message.
2. Backend stores the user message.
3. Widget service checks configured tools for a likely match.
4. If required fields are missing, assistant asks a follow-up.
5. If confirmation is required, backend creates `ActionConfirmation`.
6. Widget displays Confirm/Cancel.
7. Confirmation executes the API call server-side.
8. `ToolExecution` and `ActionLog` are stored.
9. Result is returned to the widget.
10. If no tool matches, existing tenant RAG answers from pgvector knowledge chunks.

## Security Strategy

- Allowed domains are checked on config, session, chat, and action endpoints.
- HMAC signed identity is supported with `HMAC_SHA256(userId + email, secret)`.
- API credentials are encrypted at rest.
- Widget session tokens are stored as SHA-256 hashes.
- Widget never receives connector secrets.
- Backend blocks localhost, `.local`, cloud metadata hostnames, and private IPv4 literal URLs for connectors.
- Create/update/delete actions require confirmation.
- Every execution writes an audit record.
- CORS is open at the transport layer for embeddability; widget endpoints enforce origin allowlists.

## HMAC Verification

When `requireSignedIdentity` is enabled for a bot:

```txt
signature = HMAC_SHA256(user.id + user.email, botIdentitySecret)
```

The host app generates the signature. The backend decrypts the bot secret and compares using timing-safe equality.

## Ideawake Connector Example

Connector:

```json
{
  "name": "Ideawake",
  "baseUrl": "https://api.ideawake.com",
  "authType": "BEARER_TOKEN",
  "authConfig": { "token": "{{jwt}}" },
  "headers": { "X-Tenant-ID": "{{tenantId}}" }
}
```

Create idea:

```json
{
  "name": "Create Idea",
  "toolKey": "ideawake.createIdea",
  "method": "POST",
  "path": "/ideas",
  "description": "Create a new idea inside Ideawake.",
  "inputSchema": {
    "type": "object",
    "required": ["title", "description"],
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "challengeId": { "type": "number" },
      "tags": { "type": "array" }
    }
  },
  "requestMapping": {
    "title": "{{title}}",
    "description": "{{description}}",
    "challengeId": "{{challengeId}}",
    "tags": "{{tags}}"
  },
  "responseMapping": {
    "successMessage": "Idea created successfully",
    "recordId": "data.id",
    "recordUrl": "data.url"
  },
  "confirmationRequired": true,
  "allowedRoles": ["admin", "member"]
}
```

Other Ideawake tools follow the same pattern:

- `ideawake.createChallenge`
- `ideawake.addComment`
- `ideawake.updateIdeaStage`
- `ideawake.getIdeaDetails`
- `ideawake.searchIdeas`
- `ideawake.assignIdea`
- `ideawake.voteIdea`
- `ideawake.updateIdeaStatus`

## Database Additions

Added Prisma models:

- `Bot`, `BotDomain`
- `WidgetUser`, `WidgetSession`
- `ApiConnector`, `ApiEndpoint`
- `ToolExecution`, `ActionConfirmation`
- `AuthConfig`, `OAuthConnection`, `ApiCredential`

Extended:

- `ChatSession` with `botId` and `widgetSessionId`
- `ActionLog` with `botId`, `chatSessionId`, `confirmedAt`, `executedAt`, and nullable `userId`

## Queue and Background Jobs

The architecture keeps BullMQ ready for:

- Tool execution offload
- Webhook processing
- Token refresh
- Resource cache sync
- Action retry and dead-letter handling

The current widget path executes synchronously for Phase 3 responsiveness. Move heavy/slow tools into `action-execution` workers when provider latency grows.

## Deployment

- `apps/widget/Dockerfile` builds `widget.js`.
- Docker Compose exposes the widget service on `5173`.
- Nginx serves the CDN asset at `/widget.js`.
- Configure `WIDGET_CDN_URL` to your production CDN URL.

## Testing Checklist

- Create a bot from `/dashboard/bots`.
- Add allowed domain `localhost` or your test host.
- Copy embed script and load it in a static HTML page.
- Confirm `/api/widget/config/:botId` rejects disallowed origins.
- Create a test API connector and tool.
- Send a message that matches the tool.
- Verify confirmation card appears.
- Confirm action and verify `tool_executions` and `action_logs`.
- Ask a knowledge question and verify RAG still answers from tenant chunks.
