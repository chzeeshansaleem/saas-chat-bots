export const QUEUES = {
  crawler: 'crawler',
  fileProcessing: 'file-processing',
  embeddings: 'embeddings',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
