import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isIP } from 'net';
import { Prisma } from '@prisma/client';
import { TokenCryptoService } from '../integrations/token-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomApiConnectorDto } from './dto/create-custom-api-connector.dto';
import { CreateCustomApiEndpointDto } from './dto/create-custom-api-endpoint.dto';

@Injectable()
export class CustomApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
  ) {}

  async createConnector(tenantId: string, dto: CreateCustomApiConnectorDto) {
    assertPublicBaseUrl(dto.baseUrl);
    return this.prisma.customApiConnector.create({
      data: {
        tenantId,
        name: dto.name,
        baseUrl: dto.baseUrl,
        authType: dto.authType,
        authConfigEncrypted: this.crypto.encrypt(JSON.stringify(dto.authConfig || {})),
        headersEncrypted: this.crypto.encrypt(JSON.stringify(dto.headers || {})),
      },
    });
  }

  connectors(tenantId: string) {
    return this.prisma.customApiConnector.findMany({ where: { tenantId }, include: { endpoints: true }, orderBy: { createdAt: 'desc' } });
  }

  async updateConnector(tenantId: string, id: string, dto: Partial<CreateCustomApiConnectorDto>) {
    if (dto.baseUrl) assertPublicBaseUrl(dto.baseUrl);
    await this.assertConnector(tenantId, id);
    return this.prisma.customApiConnector.update({
      where: { id },
      data: {
        name: dto.name,
        baseUrl: dto.baseUrl,
        authType: dto.authType,
        authConfigEncrypted: dto.authConfig ? this.crypto.encrypt(JSON.stringify(dto.authConfig)) : undefined,
        headersEncrypted: dto.headers ? this.crypto.encrypt(JSON.stringify(dto.headers)) : undefined,
      },
    });
  }

  async deleteConnector(tenantId: string, id: string) {
    await this.assertConnector(tenantId, id);
    await this.prisma.customApiConnector.delete({ where: { id } });
    return { deleted: true };
  }

  async createEndpoint(tenantId: string, connectorId: string, dto: CreateCustomApiEndpointDto) {
    await this.assertConnector(tenantId, connectorId);
    return this.prisma.customApiEndpoint.create({
      data: {
        connectorId,
        name: dto.name,
        method: dto.method,
        path: dto.path,
        description: dto.description,
        inputSchema: (dto.inputSchema || {}) as Prisma.InputJsonValue,
        responseMapping: (dto.responseMapping || {}) as Prisma.InputJsonValue,
        confirmationRequired: dto.confirmationRequired ?? dto.method !== 'GET',
      },
    });
  }

  endpoints(tenantId: string, connectorId: string) {
    return this.prisma.customApiEndpoint.findMany({ where: { connectorId, connector: { tenantId } }, orderBy: { createdAt: 'desc' } });
  }

  async updateEndpoint(tenantId: string, id: string, dto: Partial<CreateCustomApiEndpointDto>) {
    await this.assertEndpoint(tenantId, id);
    return this.prisma.customApiEndpoint.update({
      where: { id },
      data: {
        name: dto.name,
        method: dto.method,
        path: dto.path,
        description: dto.description,
        inputSchema: dto.inputSchema as Prisma.InputJsonValue | undefined,
        responseMapping: dto.responseMapping as Prisma.InputJsonValue | undefined,
        confirmationRequired: dto.confirmationRequired,
      },
    });
  }

  async deleteEndpoint(tenantId: string, id: string) {
    await this.assertEndpoint(tenantId, id);
    await this.prisma.customApiEndpoint.delete({ where: { id } });
    return { deleted: true };
  }

  async testEndpoint(tenantId: string, id: string) {
    const endpoint = await this.prisma.customApiEndpoint.findFirst({ where: { id, connector: { tenantId } }, include: { connector: true } });
    if (!endpoint) throw new NotFoundException('Endpoint not found.');
    assertPublicBaseUrl(endpoint.connector.baseUrl);
    return { ok: true, message: 'Endpoint configuration is valid.', endpoint: endpoint.name };
  }

  private async assertConnector(tenantId: string, id: string) {
    const connector = await this.prisma.customApiConnector.findFirst({ where: { id, tenantId } });
    if (!connector) throw new NotFoundException('Connector not found.');
  }

  private async assertEndpoint(tenantId: string, id: string) {
    const endpoint = await this.prisma.customApiEndpoint.findFirst({ where: { id, connector: { tenantId } } });
    if (!endpoint) throw new NotFoundException('Endpoint not found.');
  }
}

function assertPublicBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new BadRequestException('Only HTTP(S) custom API URLs are allowed.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') {
    throw new BadRequestException('Private/internal custom API hosts are not allowed.');
  }
  if (isIP(host) && (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('127.') || host.startsWith('169.254.'))) {
    throw new BadRequestException('Private/internal custom API IPs are not allowed.');
  }
}
