import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { TokenCryptoService } from '../integrations/token-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiConnectorDto } from './dto/create-api-connector.dto';
import { CreateApiToolDto } from './dto/create-api-tool.dto';

@Injectable()
export class ApiConnectorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
    private readonly config: ConfigService,
  ) {}

  async createConnector(tenantId: string, dto: CreateApiConnectorDto) {
    assertPublicBaseUrl(dto.baseUrl, this.allowPrivateConnectorUrls());
    return this.prisma.apiConnector.create({
      data: {
        tenantId,
        name: dto.name,
        baseUrl: normalizeBaseUrl(dto.baseUrl),
        authType: dto.authType,
        authConfigEncrypted: dto.authConfig ? this.crypto.encrypt(JSON.stringify(dto.authConfig)) : undefined,
        headersEncrypted: dto.headers ? this.crypto.encrypt(JSON.stringify(dto.headers)) : undefined,
      },
      include: { endpoints: true },
    });
  }

  connectors(tenantId: string) {
    return this.prisma.apiConnector.findMany({
      where: { tenantId },
      include: { endpoints: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConnector(tenantId: string, id: string) {
    const connector = await this.prisma.apiConnector.findFirst({ where: { id, tenantId }, include: { endpoints: true } });
    if (!connector) throw new NotFoundException('API connector not found.');
    return connector;
  }

  async updateConnector(tenantId: string, id: string, dto: Partial<CreateApiConnectorDto>) {
    await this.getConnector(tenantId, id);
    if (dto.baseUrl) assertPublicBaseUrl(dto.baseUrl, this.allowPrivateConnectorUrls());
    return this.prisma.apiConnector.update({
      where: { id },
      data: {
        name: dto.name,
        baseUrl: dto.baseUrl ? normalizeBaseUrl(dto.baseUrl) : undefined,
        authType: dto.authType,
        authConfigEncrypted: dto.authConfig ? this.crypto.encrypt(JSON.stringify(dto.authConfig)) : undefined,
        headersEncrypted: dto.headers ? this.crypto.encrypt(JSON.stringify(dto.headers)) : undefined,
      },
    });
  }

  async deleteConnector(tenantId: string, id: string) {
    await this.getConnector(tenantId, id);
    await this.prisma.apiConnector.update({ where: { id }, data: { enabled: false } });
    return { deleted: true };
  }

  async testConnector(tenantId: string, id: string) {
    const connector = await this.getConnector(tenantId, id);
    assertPublicBaseUrl(connector.baseUrl, this.allowPrivateConnectorUrls());
    return { ok: true, baseUrl: connector.baseUrl, message: 'Connector is configured and SSRF checks passed.' };
  }

  async createTool(tenantId: string, connectorId: string, dto: CreateApiToolDto) {
    await this.getConnector(tenantId, connectorId);
    return this.prisma.apiEndpoint.create({
      data: {
        connectorId,
        name: dto.name,
        toolKey: dto.toolKey,
        method: dto.method,
        path: dto.path,
        description: dto.description,
        inputSchema: (dto.inputSchema || {}) as Prisma.InputJsonValue,
        requestMapping: (dto.requestMapping || {}) as Prisma.InputJsonValue,
        responseMapping: (dto.responseMapping || {}) as Prisma.InputJsonValue,
        confirmationRequired: dto.confirmationRequired ?? true,
        allowedRoles: dto.allowedRoles || ['admin', 'member'],
      },
    });
  }

  tools(tenantId: string) {
    return this.prisma.apiEndpoint.findMany({
      where: { connector: { tenantId } },
      include: { connector: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTool(tenantId: string, id: string) {
    const tool = await this.prisma.apiEndpoint.findFirst({
      where: { id, connector: { tenantId } },
      include: { connector: true },
    });
    if (!tool) throw new NotFoundException('Tool not found.');
    return tool;
  }

  async updateTool(tenantId: string, id: string, dto: Partial<CreateApiToolDto> & { enabled?: boolean }) {
    await this.getTool(tenantId, id);
    return this.prisma.apiEndpoint.update({
      where: { id },
      data: {
        name: dto.name,
        toolKey: dto.toolKey,
        method: dto.method,
        path: dto.path,
        description: dto.description,
        inputSchema: dto.inputSchema as Prisma.InputJsonValue | undefined,
        requestMapping: dto.requestMapping as Prisma.InputJsonValue | undefined,
        responseMapping: dto.responseMapping as Prisma.InputJsonValue | undefined,
        confirmationRequired: dto.confirmationRequired,
        allowedRoles: dto.allowedRoles,
        enabled: dto.enabled,
      },
    });
  }

  async deleteTool(tenantId: string, id: string) {
    await this.getTool(tenantId, id);
    await this.prisma.apiEndpoint.update({ where: { id }, data: { enabled: false } });
    return { deleted: true };
  }

  async testTool(tenantId: string, id: string) {
    const tool = await this.getTool(tenantId, id);
    return { ok: true, toolKey: tool.toolKey, message: 'Tool is registered and ready for action routing.' };
  }

  private allowPrivateConnectorUrls() {
    return this.config.get<string>('NODE_ENV') !== 'production' || this.config.get<boolean>('CUSTOM_API_ALLOW_PRIVATE_URLS', false);
  }
}

export function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  return url.origin + url.pathname.replace(/\/$/, '');
}

export function assertPublicBaseUrl(value: string, allowPrivate = false) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Invalid base URL.');
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new BadRequestException('Only HTTP(S) URLs are supported.');
  const hostname = url.hostname.toLowerCase();
  if (allowPrivate) return;
  if (['localhost', 'metadata.google.internal'].includes(hostname) || hostname.endsWith('.local')) {
    throw new BadRequestException('Private or local URLs are not allowed.');
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname)) {
    throw new BadRequestException('Private IP ranges are not allowed.');
  }
}
