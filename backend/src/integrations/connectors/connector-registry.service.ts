import { Injectable } from '@nestjs/common';
import { ClickUpConnector } from './clickup.connector';
import { GitHubConnector } from './github.connector';
import { IntegrationConnector } from './integration-connector.interface';
import { JiraConnector } from './jira.connector';
import { SlackConnector } from './slack.connector';

@Injectable()
export class ConnectorRegistryService {
  private readonly connectors: IntegrationConnector[];

  constructor(
    github: GitHubConnector,
    clickup: ClickUpConnector,
    jira: JiraConnector,
    slack: SlackConnector,
  ) {
    this.connectors = [github, clickup, jira, slack];
  }

  get(providerKey: string) {
    const connector = this.connectors.find((item) => item.providerKey === providerKey);
    if (!connector) throw new Error(`Unsupported integration provider: ${providerKey}`);
    return connector;
  }
}
