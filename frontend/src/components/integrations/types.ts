export type IntegrationProvider = {
  id: string;
  name: string;
  key: string;
  authType: string;
  scopes: string[];
  tools?: ToolDefinition[];
};

export type TenantIntegration = {
  id: string;
  status: string;
  scopes: string[];
  metadata?: unknown;
  provider: IntegrationProvider;
  updatedAt: string;
};

export type ToolDefinition = {
  id: string;
  name: string;
  key: string;
  description: string;
  actionType: 'READ' | 'WRITE' | 'DELETE';
  confirmationRequired: boolean;
  enabled: boolean;
  provider?: IntegrationProvider;
};
