import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenCryptoService } from '../integrations/token-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';

@Injectable()
export class BotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
  ) {}

  list(tenantId: string) {
    return this.prisma.bot.findMany({
      where: { tenantId },
      include: { domains: { orderBy: { domain: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateBotDto) {
    return this.prisma.bot.create({
      data: {
        tenantId,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        welcomeMessage: dto.welcomeMessage,
        placeholder: dto.placeholder,
        themeColor: dto.themeColor,
        position: dto.position,
        zIndex: dto.zIndex,
        suggestedQuestions: dto.suggestedQuestions || [],
        allowAnonymous: dto.allowAnonymous ?? true,
        requireSignedIdentity: dto.requireSignedIdentity ?? false,
        identitySecretEncrypted: dto.identitySecret ? this.crypto.encrypt(dto.identitySecret) : undefined,
        domains: {
          create: normalizeDomains(dto.allowedDomains || []).map((domain) => ({ domain })),
        },
      },
      include: { domains: true },
    });
  }

  async get(tenantId: string, id: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id, tenantId },
      include: { domains: { orderBy: { domain: 'asc' } } },
    });
    if (!bot) throw new NotFoundException('Bot not found.');
    return bot;
  }

  async update(tenantId: string, id: string, dto: UpdateBotDto) {
    await this.get(tenantId, id);
    await this.prisma.botDomain.deleteMany({ where: { botId: id } });
    return this.prisma.bot.update({
      where: { id },
      data: {
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        welcomeMessage: dto.welcomeMessage,
        placeholder: dto.placeholder,
        themeColor: dto.themeColor,
        position: dto.position,
        zIndex: dto.zIndex,
        suggestedQuestions: dto.suggestedQuestions,
        allowAnonymous: dto.allowAnonymous,
        requireSignedIdentity: dto.requireSignedIdentity,
        identitySecretEncrypted: dto.identitySecret ? this.crypto.encrypt(dto.identitySecret) : undefined,
        domains: dto.allowedDomains
          ? { create: normalizeDomains(dto.allowedDomains).map((domain) => ({ domain })) }
          : undefined,
      },
      include: { domains: true },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.prisma.bot.update({ where: { id }, data: { status: 'DISABLED' } });
    return { deleted: true };
  }

  async embedCode(tenantId: string, id: string) {
    const bot = await this.get(tenantId, id);
    return {
      botId: bot.id,
      script: `<script src="${process.env.WIDGET_CDN_URL || 'http://localhost:5173/widget.js'}" data-tenant-id="${bot.tenantId}" data-bot-id="${bot.id}" data-user-id="CURRENT_USER_ID" data-user-email="CURRENT_USER_EMAIL" data-user-name="CURRENT_USER_NAME"></script>`,
    };
  }
}

function normalizeDomains(domains: string[]) {
  return [...new Set(domains.map(normalizeDomain).filter(Boolean))];
}

function normalizeDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    return new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}
