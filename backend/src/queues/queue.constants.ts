export const QUEUES = {
  crawler: 'crawler',
  fileProcessing: 'file-processing',
  embeddings: 'embeddings',
  chatTitle: 'chat-title-generation',
  integrationSync: 'integration-sync',
  webhookProcessing: 'webhook-processing',
  actionExecution: 'action-execution',
  tokenRefresh: 'token-refresh',
  externalResourceCache: 'external-resource-cache',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
