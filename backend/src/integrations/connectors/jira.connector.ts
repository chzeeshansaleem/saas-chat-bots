import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthConnector } from './base-oauth.connector';
import { ToolContext } from './integration-connector.interface';

@Injectable()
export class JiraConnector extends BaseOAuthConnector {
  providerKey = 'jira';
  authBaseUrl = 'https://auth.atlassian.com/authorize';
  tokenUrl = 'https://auth.atlassian.com/oauth/token';
  defaultScopes = ['read:jira-work', 'write:jira-work'];

  constructor(config: ConfigService) {
    super(config);
  }

  async executeTool(toolKey: string, payload: unknown, context: ToolContext) {
    if (!context.accessToken) throw new Error('Jira is not connected.');
    return { ok: true, message: `${toolKey} prepared`, data: payload, mode: 'stub' };
  }
}
