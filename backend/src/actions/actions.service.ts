import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConnectorRegistryService } from '../integrations/connectors/connector-registry.service';
import { TokenCryptoService } from '../integrations/token-crypto.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrepareActionDto } from './dto/prepare-action.dto';

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectors: ConnectorRegistryService,
    private readonly crypto: TokenCryptoService,
    private readonly permissions: PermissionsService,
  ) {}

  async prepare(tenantId: string, userId: string, role: 'ADMIN' | 'MEMBER' | undefined, dto: PrepareActionDto) {
    const tool = await this.prisma.toolDefinition.findUnique({ where: { key: dto.toolKey }, include: { provider: true } });
    if (!tool || !tool.enabled) throw new NotFoundException('Tool not found.');
    this.permissions.assert(role, tool.actionType === 'READ' ? 'canRunReadActions' : 'canRunWriteActions');

    const request = await this.prisma.actionRequest.create({
      data: {
        tenantId,
        userId,
        toolId: tool.id,
        inputPayload: dto.inputPayload as Prisma.InputJsonValue,
        requiresConfirmation: tool.confirmationRequired,
        status: tool.confirmationRequired ? 'PENDING_CONFIRMATION' : 'CONFIRMED',
      },
      include: { tool: { include: { provider: true } } },
    });

    if (!tool.confirmationRequired) return this.execute(tenantId, userId, request.id);
    return request;
  }

  async confirm(tenantId: string, userId: string, actionId: string) {
    await this.prisma.actionRequest.updateMany({
      where: { id: actionId, tenantId, userId, status: 'PENDING_CONFIRMATION' },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    return this.execute(tenantId, userId, actionId);
  }

  async cancel(tenantId: string, userId: string, actionId: string) {
    await this.prisma.actionRequest.updateMany({
      where: { id: actionId, tenantId, userId },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: true };
  }

  get(tenantId: string, actionId: string) {
    return this.prisma.actionRequest.findFirst({ where: { id: actionId, tenantId }, include: { tool: true } });
  }

  logs(tenantId: string) {
    return this.prisma.actionLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  private async execute(tenantId: string, userId: string, actionId: string) {
    const request = await this.prisma.actionRequest.findFirst({
      where: { id: actionId, tenantId, userId },
      include: { tool: { include: { provider: true } } },
    });
    if (!request) throw new NotFoundException('Action request not found.');

    await this.prisma.actionRequest.update({ where: { id: actionId }, data: { status: 'EXECUTING' } });
    const integration = await this.prisma.tenantIntegration.findUnique({
      where: { tenantId_providerId: { tenantId, providerId: request.tool.providerId } },
    });

    try {
      const result = await this.connectors.get(request.tool.provider.key).executeTool(
        request.tool.key,
        request.inputPayload,
        {
          tenantId,
          userId,
          integrationId: integration?.id,
          accessToken: this.crypto.decrypt(integration?.accessTokenEncrypted),
        },
      );
      await this.prisma.actionRequest.update({
        where: { id: actionId },
        data: { status: 'SUCCESS', outputPayload: result as Prisma.InputJsonValue, executedAt: new Date() },
      });
      await this.prisma.actionLog.create({
        data: {
          tenantId,
          userId,
          integrationId: integration?.id,
          toolName: request.tool.key,
          actionType: request.tool.actionType,
          inputPayload: request.inputPayload as Prisma.InputJsonValue,
          outputPayload: result as Prisma.InputJsonValue,
          status: 'SUCCESS',
        },
      });
      return { status: 'SUCCESS', result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.actionRequest.update({
        where: { id: actionId },
        data: { status: 'FAILED', errorMessage: message, executedAt: new Date() },
      });
      await this.prisma.actionLog.create({
        data: {
          tenantId,
          userId,
          integrationId: integration?.id,
          toolName: request.tool.key,
          actionType: request.tool.actionType,
          inputPayload: request.inputPayload as Prisma.InputJsonValue,
          status: 'FAILED',
          errorMessage: message,
        },
      });
      throw error;
    }
  }
}
