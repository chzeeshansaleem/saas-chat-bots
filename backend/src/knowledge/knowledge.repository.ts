import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  listSources(tenantId: string) {
    return this.prisma.knowledgeSource.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { documents: { select: { id: true } } },
    });
  }

  updateSourceStatus(id: string, tenantId: string, status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED') {
    return this.prisma.knowledgeSource.updateMany({ where: { id, tenantId }, data: { status } });
  }
}
