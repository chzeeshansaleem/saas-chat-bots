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
import { IntegrationsModule } from './integrations/integrations.module';
import { OAuthModule } from './oauth/oauth.module';
import { ToolsModule } from './tools/tools.module';
import { ActionsModule } from './actions/actions.module';
import { ActionRouterModule } from './action-router/action-router.module';
import { ActionLogsModule } from './action-logs/action-logs.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CustomApiModule } from './custom-api/custom-api.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SyncModule } from './sync/sync.module';
import { BotsModule } from './bots/bots.module';
import { WidgetModule } from './widget/widget.module';
import { ApiConnectorsModule } from './api-connectors/api-connectors.module';
import { ActionExecutorModule } from './action-executor/action-executor.module';
import { AuthConfigModule } from './auth-config/auth-config.module';
import { AiOrchestratorModule } from './ai-orchestrator/ai-orchestrator.module';
import { RagModule } from './rag/rag.module';
import { SecurityModule } from './security/security.module';
import { DomainVerificationModule } from './domain-verification/domain-verification.module';
import { WidgetSessionsModule } from './widget-sessions/widget-sessions.module';

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
    IntegrationsModule,
    OAuthModule,
    ToolsModule,
    ActionRouterModule,
    ActionsModule,
    ActionLogsModule,
    WebhooksModule,
    CustomApiModule,
    PermissionsModule,
    SyncModule,
    BotsModule,
    WidgetModule,
    ApiConnectorsModule,
    ActionExecutorModule,
    AuthConfigModule,
    AiOrchestratorModule,
    RagModule,
    SecurityModule,
    DomainVerificationModule,
    WidgetSessionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
