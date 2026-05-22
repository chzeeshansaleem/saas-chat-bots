export type CustomApiEndpoint = {
  id: string;
  name: string;
  method: string;
  path: string;
  description?: string;
  confirmationRequired: boolean;
  enabled: boolean;
};

export type CustomApiConnector = {
  id: string;
  name: string;
  baseUrl: string;
  authType: string;
  enabled: boolean;
  endpoints?: CustomApiEndpoint[];
  createdAt: string;
};
