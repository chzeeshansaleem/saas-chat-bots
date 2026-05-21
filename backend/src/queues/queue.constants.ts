export const QUEUES = {
  crawler: 'crawler',
  fileProcessing: 'file-processing',
  embeddings: 'embeddings',
  chatTitle: 'chat-title-generation',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
