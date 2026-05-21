'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function ChatWindow() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const { activeSessionId, messages, appendMessage, appendDelta, setActiveSession, setMessages, streaming, setStreaming } = useChatStore();
  const [input, setInput] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const socket = useMemo(() => {
    if (!hasHydrated || !token || !tenantId) return null;
    return io(SOCKET_URL, {
      auth: { token, tenantId },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }, [hasHydrated, tenantId, token]);

  useEffect(() => {
    if (!hasHydrated || !token || !tenantId) return;
    api<Array<{ id: string }>>('/chat/sessions', { token, tenantId }).then(async (sessions) => {
      const session = sessions[0] || (await api<{ id: string }>('/chat/sessions', { method: 'POST', body: JSON.stringify({}), token, tenantId }));
      setActiveSession(session.id);
      const loaded = await api('/chat/sessions/' + session.id + '/messages', { token, tenantId });
      setMessages(loaded as never[]);
    });
  }, [hasHydrated, tenantId, token, setActiveSession, setMessages]);

  useEffect(() => {
    if (!socket) return;
    const handleTyping = (event: { typing: boolean }) => setStreaming(event.typing);
    const handleChunk = (chunk: { type: string; delta?: string }) => {
      if (chunk.type === 'delta' && chunk.delta) appendDelta(chunk.delta);
      if (chunk.type === 'done') setStreaming(false);
    };
    const handleError = (event: { message?: string }) => {
      const message = event.message || 'The assistant could not respond. Please try again.';
      setStreaming(false);
      setConnectionError(message);
      appendMessage({ id: crypto.randomUUID(), role: 'ASSISTANT', content: message });
    };
    const handleConnect = () => {
      setSocketConnected(true);
      setConnectionError('');
    };
    const handleDisconnect = () => {
      setSocketConnected(false);
    };
    const handleConnectError = (error: Error) => {
      setSocketConnected(false);
      setStreaming(false);
      setConnectionError(error.message || 'Could not connect to chat server.');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:chunk', handleChunk);
    socket.on('chat:error', handleError);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:chunk', handleChunk);
      socket.off('chat:error', handleError);
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [appendDelta, appendMessage, setStreaming, socket]);

  function send(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || !activeSessionId || !socket) return;
    if (!socketConnected) {
      const message = 'Chat server is not connected yet. Please wait a moment and try again.';
      setConnectionError(message);
      appendMessage({ id: crypto.randomUUID(), role: 'ASSISTANT', content: message });
      return;
    }
    setConnectionError('');
    appendMessage({ id: crypto.randomUUID(), role: 'USER', content: input });
    socket.emit('chat:message', { sessionId: activeSessionId, message: input });
    setInput('');
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="hidden rounded-lg border border-border bg-card p-3 lg:block">
        <p className="px-2 text-sm font-medium">Conversations</p>
        <button className="mt-3 w-full rounded-md bg-muted px-3 py-2 text-left text-sm">{activeSessionId?.slice(0, 8) || 'New chat'}</button>
        <p className="mt-3 px-2 text-xs text-muted-foreground">{socketConnected ? 'Chat connected' : 'Connecting chat...'}</p>
      </aside>
      <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {connectionError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {connectionError}
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={message.role === 'USER' ? 'ml-auto max-w-3xl' : 'mr-auto max-w-3xl'}>
              <div className={message.role === 'USER' ? 'rounded-lg bg-primary p-3 text-primary-foreground' : 'rounded-lg bg-muted p-3'}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {streaming && <p className="text-sm text-muted-foreground">Assistant is typing...</p>}
        </div>
        <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask from this tenant knowledge base"
            rows={3}
          />
          <Button className="h-10 w-10 shrink-0 px-0" title="Send"><Send className="h-4 w-4" /></Button>
        </form>
      </section>
    </div>
  );
}
