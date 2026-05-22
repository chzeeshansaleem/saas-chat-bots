import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthConnector } from './base-oauth.connector';
import { ToolContext } from './integration-connector.interface';

@Injectable()
export class ClickUpConnector extends BaseOAuthConnector {
  providerKey = 'clickup';
  authBaseUrl = 'https://app.clickup.com/api';
  tokenUrl = 'https://api.clickup.com/api/v2/oauth/token';
  defaultScopes = ['task:read', 'task:write'];

  constructor(config: ConfigService) {
    super(config);
  }

  async executeTool(toolKey: string, payload: unknown, context: ToolContext) {
    if (!context.accessToken) throw new Error('ClickUp is not connected.');
    return { ok: true, message: `${toolKey} prepared`, data: payload, mode: 'stub' };
  }
}
