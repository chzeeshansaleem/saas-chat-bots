export type WidgetInitOptions = {
  apiUrl?: string;
  tenantId: string;
  botId: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    signature?: string;
    jwt?: string;
  };
};
