import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(tenantId: string, providerKey: string, payload: unknown) {
    const provider = await this.prisma.integrationProvider.findUnique({ where: { key: providerKey } });
    if (!provider) throw new NotFoundException('Webhook provider not found.');
    return this.prisma.webhookEvent.create({
      data: {
        tenantId,
        providerId: provider.id,
        eventType: inferEventType(payload),
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  events(tenantId: string) {
    return this.prisma.webhookEvent.findMany({ where: { tenantId }, include: { provider: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}

function inferEventType(payload: unknown) {
  if (typeof payload === 'object' && payload && 'type' in payload) return String((payload as { type: unknown }).type);
  if (typeof payload === 'object' && payload && 'event' in payload) return String((payload as { event: unknown }).event);
  return 'unknown';
}
