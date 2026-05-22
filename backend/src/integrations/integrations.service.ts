import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TokenCryptoService } from './token-crypto.service';
import { ConnectorRegistryService } from './connectors/connector-registry.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
    private readonly connectors: ConnectorRegistryService,
  ) {}

  providers() {
    return this.prisma.integrationProvider.findMany({ orderBy: { name: 'asc' }, include: { tools: true } });
  }

  connected(tenantId: string) {
    return this.prisma.tenantIntegration.findMany({
      where: { tenantId },
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startConnect(providerKey: string, tenantId: string, userId: string) {
    const provider = await this.prisma.integrationProvider.findUnique({ where: { key: providerKey } });
    if (!provider) throw new NotFoundException('Integration provider not found.');
    if (provider.key === 'custom-api') return { authUrl: '/dashboard/custom-api' };
    const state = Buffer.from(JSON.stringify({ tenantId, userId, providerKey })).toString('base64url');
    return { authUrl: this.connectors.get(providerKey).getAuthUrl(state) };
  }

  async handleCallback(providerKey: string, tenantId: string, userId: string, code: string) {
    const provider = await this.prisma.integrationProvider.findUnique({ where: { key: providerKey } });
    if (!provider) throw new NotFoundException('Integration provider not found.');
    const token = await this.connectors.get(providerKey).handleCallback(code);
    return this.prisma.tenantIntegration.upsert({
      where: { tenantId_providerId: { tenantId, providerId: provider.id } },
      update: {
        status: 'CONNECTED',
        accessTokenEncrypted: this.crypto.encrypt(token.accessToken),
        refreshTokenEncrypted: this.crypto.encrypt(token.refreshToken),
        expiresAt: token.expiresAt,
        scopes: token.scopes || [],
        metadata: (token.metadata || {}) as Prisma.InputJsonValue,
      },
      create: {
        tenantId,
        providerId: provider.id,
        connectedByUserId: userId,
        status: 'CONNECTED',
        accessTokenEncrypted: this.crypto.encrypt(token.accessToken),
        refreshTokenEncrypted: this.crypto.encrypt(token.refreshToken),
        expiresAt: token.expiresAt,
        scopes: token.scopes || [],
        metadata: (token.metadata || {}) as Prisma.InputJsonValue,
      },
      include: { provider: true },
    });
  }

  async disconnect(tenantId: string, integrationId: string) {
    await this.prisma.tenantIntegration.updateMany({
      where: { id: integrationId, tenantId },
      data: { status: 'DISCONNECTED', accessTokenEncrypted: null, refreshTokenEncrypted: null },
    });
    return { disconnected: true };
  }
}
