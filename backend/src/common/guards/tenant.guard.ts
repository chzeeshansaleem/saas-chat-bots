import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] as string | undefined;
    const userId = request.user?.sub;

    if (!tenantId || !userId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant.');
    }

    request.user.tenantId = tenantId;
    request.user.role = membership.role;
    return true;
  }
}
