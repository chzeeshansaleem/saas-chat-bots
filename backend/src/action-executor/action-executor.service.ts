import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { assertPublicBaseUrl } from '../api-connectors/api-connectors.service';
import { TokenCryptoService } from '../integrations/token-crypto.service';
import { PrismaService } from '../prisma/prisma.service';

type ExecuteContext = {
  tenantId: string;
  botId?: string;
  widgetUserId?: string;
  chatSessionId?: string;
  userId?: string;
  authContext?: Record<string, unknown>;
};

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
    private readonly config: ConfigService,
  ) {}

  async prepare(endpointId: string, inputPayload: Record<string, unknown>, context: ExecuteContext) {
    const endpoint = await this.getEndpoint(context.tenantId, endpointId);
    const preview = {
      toolKey: endpoint.toolKey,
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      input: inputPayload,
    };
    return this.prisma.actionConfirmation.create({
      data: {
        tenantId: context.tenantId,
        botId: context.botId,
        widgetUserId: context.widgetUserId,
        chatSessionId: context.chatSessionId,
        endpointId: endpoint.id,
        preview: preview as Prisma.InputJsonValue,
        inputPayload: inputPayload as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      include: { endpoint: true },
    });
  }

  async confirm(confirmationId: string, context: ExecuteContext) {
    const confirmation = await this.prisma.actionConfirmation.findFirst({
      where: { id: confirmationId, tenantId: context.tenantId, status: 'PENDING_CONFIRMATION' },
      include: { endpoint: { include: { connector: true } } },
    });
    if (!confirmation) throw new NotFoundException('Action confirmation not found.');
    await this.prisma.actionConfirmation.update({
      where: { id: confirmation.id },
      data: { status: 'EXECUTING', confirmedAt: new Date() },
    });
    return this.executeEndpoint(confirmation.endpoint.id, confirmation.inputPayload as Record<string, unknown>, {
      ...context,
      botId: context.botId || confirmation.botId || undefined,
      chatSessionId: context.chatSessionId || confirmation.chatSessionId || undefined,
      widgetUserId: context.widgetUserId || confirmation.widgetUserId || undefined,
    });
  }

  async cancel(confirmationId: string, context: ExecuteContext) {
    await this.prisma.actionConfirmation.updateMany({
      where: { id: confirmationId, tenantId: context.tenantId },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: true };
  }

  async executeEndpoint(endpointId: string, inputPayload: Record<string, unknown>, context: ExecuteContext) {
    const endpoint = await this.getEndpoint(context.tenantId, endpointId);
    const execution = await this.prisma.toolExecution.create({
      data: {
        tenantId: context.tenantId,
        botId: context.botId,
        widgetUserId: context.widgetUserId,
        chatSessionId: context.chatSessionId,
        endpointId,
        toolKey: endpoint.toolKey,
        inputPayload: inputPayload as Prisma.InputJsonValue,
        status: 'EXECUTING',
        confirmedAt: new Date(),
      },
    });

    try {
      const result = await this.callEndpoint(endpoint, inputPayload, context);
      await this.prisma.toolExecution.update({
        where: { id: execution.id },
        data: { status: 'SUCCESS', outputPayload: result as Prisma.InputJsonValue, executedAt: new Date() },
      });
      await this.prisma.actionLog.create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId,
          botId: context.botId,
          chatSessionId: context.chatSessionId,
          toolName: endpoint.toolKey,
          actionType: ['GET'].includes(endpoint.method) ? 'READ' : endpoint.method === 'DELETE' ? 'DELETE' : 'WRITE',
          inputPayload: inputPayload as Prisma.InputJsonValue,
          outputPayload: result as Prisma.InputJsonValue,
          status: 'SUCCESS',
          confirmedAt: new Date(),
          executedAt: new Date(),
        },
      });
      return { status: 'SUCCESS', result, executionId: execution.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool execution failed ${JSON.stringify({ endpointId, toolKey: endpoint.toolKey, message })}`);
      await this.prisma.toolExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', errorMessage: message, executedAt: new Date() },
      });
      await this.prisma.actionLog.create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId,
          botId: context.botId,
          chatSessionId: context.chatSessionId,
          toolName: endpoint.toolKey,
          actionType: ['GET'].includes(endpoint.method) ? 'READ' : endpoint.method === 'DELETE' ? 'DELETE' : 'WRITE',
          inputPayload: inputPayload as Prisma.InputJsonValue,
          status: 'FAILED',
          errorMessage: message,
          confirmedAt: new Date(),
          executedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async getEndpoint(tenantId: string, endpointId: string) {
    const endpoint = await this.prisma.apiEndpoint.findFirst({
      where: { id: endpointId, enabled: true, connector: { tenantId, enabled: true } },
      include: { connector: true },
    });
    if (!endpoint) throw new NotFoundException('API tool not found.');
    return endpoint;
  }

  private async callEndpoint(
    endpoint: Awaited<ReturnType<ActionExecutorService['getEndpoint']>>,
    inputPayload: Record<string, unknown>,
    context: ExecuteContext,
  ) {
    const connector = endpoint.connector;
    assertPublicBaseUrl(connector.baseUrl, this.allowPrivateConnectorUrls());
    const renderPayload = buildRenderPayload(inputPayload, context.authContext);
    const url = new URL(renderTemplate(endpoint.path, renderPayload), connector.baseUrl.endsWith('/') ? connector.baseUrl : `${connector.baseUrl}/`);
    assertPublicBaseUrl(url.toString(), this.allowPrivateConnectorUrls());

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    Object.assign(headers, renderHeaderValues(this.decryptJson(connector.headersEncrypted), renderPayload));
    Object.assign(headers, this.authHeaders(connector.authType, this.decryptJson(connector.authConfigEncrypted), renderPayload));

    const body = endpoint.method === 'GET' ? undefined : JSON.stringify(mapObject(endpoint.requestMapping as Record<string, unknown>, renderPayload));
    const response = await fetch(url.toString(), { method: endpoint.method, headers, body, signal: AbortSignal.timeout(30000) });
    const responseText = await response.text();
    const parsed = parseBody(responseText);
    if (!response.ok) throw new BadRequestException(`External API failed with ${response.status}: ${responseText.slice(0, 500)}`);
    return mapResponse(endpoint.responseMapping as Record<string, unknown>, parsed);
  }

  private decryptJson(value?: string | null) {
    if (!value) return {};
    try {
      return JSON.parse(this.crypto.decrypt(value) || '{}') as Record<string, string>;
    } catch {
      return {};
    }
  }

  private authHeaders(authType: string, config: Record<string, string>, inputPayload: Record<string, unknown>) {
    if (authType === 'BEARER_TOKEN') {
      const token = renderTemplate(config.token || config.bearerToken || '{{jwt}}', inputPayload);
      return token ? { authorization: `Bearer ${normalizeBearerToken(token)}` } : {};
    }
    if (authType === 'API_KEY' && config.headerName && config.apiKey) return { [config.headerName]: renderTemplate(config.apiKey, inputPayload) };
    if (authType === 'BASIC' && config.username && config.password) {
      return { authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}` };
    }
    return {};
  }

  private allowPrivateConnectorUrls() {
    return this.config.get<string>('NODE_ENV') !== 'production' || this.config.get<boolean>('CUSTOM_API_ALLOW_PRIVATE_URLS', false);
  }
}

function buildRenderPayload(inputPayload: Record<string, unknown>, authContext: Record<string, unknown> = {}) {
  return {
    ...inputPayload,
    ...authContext,
    input: inputPayload,
    auth: authContext,
  };
}

function renderHeaderValues(headers: Record<string, string>, payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, renderTemplate(String(value), payload)]));
}

function mapObject(mapping: Record<string, unknown>, payload: Record<string, unknown>) {
  if (!Object.keys(mapping || {}).length) return payload;
  return Object.fromEntries(Object.entries(mapping).map(([key, value]) => [key, renderValue(value, payload)]));
}

function renderValue(value: unknown, payload: Record<string, unknown>): unknown {
  if (typeof value === 'string') return renderTemplate(value, payload);
  if (Array.isArray(value)) return value.map((item) => renderValue(item, payload));
  if (value && typeof value === 'object') return mapObject(value as Record<string, unknown>, payload);
  return value;
}

function renderTemplate(value: string, payload: Record<string, unknown>) {
  return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const resolved = getPath(payload, path);
    return resolved == null ? '' : String(resolved);
  });
}

function normalizeBearerToken(value: string) {
  return value.replace(/^Bearer\s+/i, '').trim();
}

function mapResponse(mapping: Record<string, unknown>, response: unknown) {
  if (!Object.keys(mapping || {}).length) return response as Prisma.InputJsonValue;
  const source = response as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(mapping).map(([key, value]) => [
      key,
      typeof value === 'string' && value.includes('.') ? getPath(source, value) : value,
    ]),
  );
}

function getPath(source: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[segment];
    return undefined;
  }, source);
}

function parseBody(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { text: value };
  }
}
