export type TokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  metadata?: Record<string, unknown>;
};

export type ToolContext = {
  tenantId: string;
  userId: string;
  accessToken?: string | null;
  integrationId?: string;
};

export interface IntegrationConnector {
  providerKey: string;
  getAuthUrl(state: string): string;
  handleCallback(code: string): Promise<TokenResponse>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  executeTool(toolKey: string, payload: unknown, context: ToolContext): Promise<unknown>;
  verifyWebhook(signature: string | undefined, payload: unknown): boolean;
}
