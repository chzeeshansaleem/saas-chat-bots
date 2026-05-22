import { Module } from '@nestjs/common';
import { ClickUpConnector } from './connectors/clickup.connector';
import { ConnectorRegistryService } from './connectors/connector-registry.service';
import { GitHubConnector } from './connectors/github.connector';
import { JiraConnector } from './connectors/jira.connector';
import { SlackConnector } from './connectors/slack.connector';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { TokenCryptoService } from './token-crypto.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    TokenCryptoService,
    ConnectorRegistryService,
    GitHubConnector,
    ClickUpConnector,
    JiraConnector,
    SlackConnector,
  ],
  exports: [IntegrationsService, TokenCryptoService, ConnectorRegistryService],
})
export class IntegrationsModule {}
