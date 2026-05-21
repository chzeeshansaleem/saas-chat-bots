import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || buildDatabaseUrl(),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

function buildDatabaseUrl() {
  const host = process.env.POSTGRES_HOST || '127.0.0.1';
  const port = process.env.POSTGRES_PORT || '5432';
  const database = process.env.POSTGRES_DATABASE || 'multi_chatbot';
  const username = process.env.POSTGRES_USERNAME || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || '';

  const credentials = password
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}`
    : encodeURIComponent(username);

  return `postgresql://${credentials}@${host}:${port}/${database}?schema=public`;
}
