import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthConnector } from './base-oauth.connector';
import { ToolContext } from './integration-connector.interface';

@Injectable()
export class GitHubConnector extends BaseOAuthConnector {
  providerKey = 'github';
  authBaseUrl = 'https://github.com/login/oauth/authorize';
  tokenUrl = 'https://github.com/login/oauth/access_token';
  defaultScopes = ['repo', 'read:user'];

  constructor(config: ConfigService) {
    super(config);
  }

  async executeTool(toolKey: string, payload: Record<string, unknown>, context: ToolContext) {
    if (!context.accessToken) throw new Error('GitHub is not connected.');
    if (toolKey === 'github.createRepo') {
      return providerStub('GitHub repository creation prepared', { name: payload.name, htmlUrl: `https://github.com/new?name=${payload.name}` });
    }
    if (toolKey === 'github.createIssue') {
      return providerStub('GitHub issue creation prepared', payload);
    }
    if (toolKey === 'github.getRepoStatus') {
      return providerStub('GitHub repository status fetched', payload);
    }
    throw new Error(`Unsupported GitHub tool: ${toolKey}`);
  }
}

function providerStub(message: string, data: unknown) {
  return { ok: true, message, data, mode: 'stub' };
}
