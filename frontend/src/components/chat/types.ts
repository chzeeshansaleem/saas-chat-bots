export type ChatSession = {
  id: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  messages?: ChatMessage[];
};

export type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  sources?: unknown[];
  createdAt?: string;
};
