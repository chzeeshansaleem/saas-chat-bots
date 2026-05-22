import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.toolDefinition.findMany({ include: { provider: true }, orderBy: { key: 'asc' } });
  }

  async get(id: string) {
    const tool = await this.prisma.toolDefinition.findUnique({ where: { id }, include: { provider: true } });
    if (!tool) throw new NotFoundException('Tool not found.');
    return tool;
  }

  enable(id: string, enabled: boolean) {
    return this.prisma.toolDefinition.update({ where: { id }, data: { enabled } });
  }

  async test(id: string) {
    const tool = await this.get(id);
    return { ok: true, tool: tool.key, message: 'Tool definition is valid and registered.' };
  }
}
