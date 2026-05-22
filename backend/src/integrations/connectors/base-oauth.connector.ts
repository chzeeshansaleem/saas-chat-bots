import { ConfigService } from '@nestjs/config';
import { IntegrationConnector, TokenResponse, ToolContext } from './integration-connector.interface';

export abstract class BaseOAuthConnector implements IntegrationConnector {
  abstract providerKey: string;
  abstract authBaseUrl: string;
  abstract tokenUrl: string;
  abstract defaultScopes: string[];

  protected constructor(protected readonly config: ConfigService) {}

  getAuthUrl(state: string) {
    const clientId = this.config.get<string>(`${this.providerKey.toUpperCase()}_CLIENT_ID`, '');
    const redirectUri = this.redirectUri();
    const url = new URL(this.authBaseUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    if (this.defaultScopes.length) url.searchParams.set('scope', this.defaultScopes.join(' '));
    return url.toString();
  }

  async handleCallback(code: string): Promise<TokenResponse> {
    return {
      accessToken: `pending-provider-token-exchange:${this.providerKey}:${code}`,
      scopes: this.defaultScopes,
      metadata: { mode: 'stub', note: 'Configure provider token exchange before production use.' },
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return { accessToken: refreshToken, refreshToken, scopes: this.defaultScopes };
  }

  verifyWebhook() {
    return true;
  }

  protected redirectUri() {
    return this.config.get<string>('BACKEND_PUBLIC_URL', 'http://localhost:4000') + `/api/integrations/${this.providerKey}/callback`;
  }

  abstract executeTool(toolKey: string, payload: unknown, context: ToolContext): Promise<unknown>;
}
