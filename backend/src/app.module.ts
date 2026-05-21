import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { VectorSearchModule } from './vector-search/vector-search.module';
import { AiModule } from './ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { CrawlerModule } from './crawler/crawler.module';
import { QueuesModule } from './queues/queues.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'], validationSchema: envValidationSchema }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    KnowledgeModule,
    EmbeddingsModule,
    VectorSearchModule,
    AiModule,
    ChatModule,
    CrawlerModule,
    QueuesModule,
    WebsocketModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
