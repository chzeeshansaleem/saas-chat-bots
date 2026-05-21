import type { ChatMessage } from '@/components/chat/types';

export function appendStreamingDelta(messages: ChatMessage[], delta: string, sources?: unknown[]) {
  const next = [...messages];
  const last = next[next.length - 1];
  if (last?.role === 'ASSISTANT') {
    last.content += delta;
    if (sources?.length) last.sources = sources;
  } else {
    next.push({ id: crypto.randomUUID(), role: 'ASSISTANT', content: delta, sources });
  }
  return next;
}
