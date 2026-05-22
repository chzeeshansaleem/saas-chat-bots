import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthConnector } from './base-oauth.connector';
import { ToolContext } from './integration-connector.interface';

@Injectable()
export class SlackConnector extends BaseOAuthConnector {
  providerKey = 'slack';
  authBaseUrl = 'https://slack.com/oauth/v2/authorize';
  tokenUrl = 'https://slack.com/api/oauth.v2.access';
  defaultScopes = ['chat:write', 'channels:read'];

  constructor(config: ConfigService) {
    super(config);
  }

  async executeTool(toolKey: string, payload: unknown, context: ToolContext) {
    if (!context.accessToken) throw new Error('Slack is not connected.');
    return { ok: true, message: `${toolKey} prepared`, data: payload, mode: 'stub' };
  }
}
