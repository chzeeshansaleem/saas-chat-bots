import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateTenantDto) {
    const slug = `${dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')}-${Date.now()}`;

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        memberships: { create: { userId, role: 'ADMIN' } },
      },
    });
  }

  async getForUser(userId: string, tenantId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { tenant: true },
    });
    if (!membership) throw new NotFoundException('Tenant not found.');
    return membership;
  }

  async update(userId: string, tenantId: string, dto: UpdateTenantDto) {
    await this.assertAdmin(userId, tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { name: dto.name },
    });
  }

  async delete(userId: string, tenantId: string) {
    await this.assertAdmin(userId, tenantId);
    await this.prisma.tenant.delete({ where: { id: tenantId } });
    return { deleted: true };
  }

  async members(userId: string, tenantId: string) {
    await this.getForUser(userId, tenantId);
    return this.prisma.membership.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertAdmin(userId: string, tenantId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership) throw new NotFoundException('Tenant not found.');
    if (membership.role !== 'ADMIN') throw new ForbiddenException('Admin role is required.');
  }
}
