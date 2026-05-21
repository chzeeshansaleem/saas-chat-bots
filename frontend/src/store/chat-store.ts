'use client';

import { create } from 'zustand';

export type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: unknown[];
};

type ChatState = {
  activeSessionId?: string;
  messages: ChatMessage[];
  streaming: boolean;
  setActiveSession: (id: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  appendDelta: (delta: string) => void;
  setStreaming: (streaming: boolean) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  streaming: false,
  setActiveSession: (id) => set({ activeSessionId: id, messages: [] }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  appendDelta: (delta) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last?.role === 'ASSISTANT') {
        last.content += delta;
      } else {
        messages.push({ id: crypto.randomUUID(), role: 'ASSISTANT', content: delta });
      }
      return { messages };
    }),
  setStreaming: (streaming) => set({ streaming }),
}));
