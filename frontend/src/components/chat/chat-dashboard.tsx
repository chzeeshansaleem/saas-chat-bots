'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { Send } from 'lucide-react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { MessageList } from '@/components/chat/message-list';
import { appendStreamingDelta } from '@/components/chat/streaming-response';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import type { ChatMessage, ChatSession } from '@/components/chat/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function ChatDashboard({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | undefined>(chatId);
  const activeSessionRef = useRef<string | undefined>(chatId);
  const currentSourcesRef = useRef<unknown[]>([]);
  const skipNextMessageLoadRef = useRef(false);

  useEffect(() => {
    setActiveChatId(chatId);
    activeSessionRef.current = chatId;
  }, [chatId]);

  const socket = useMemo(() => {
    if (!hasHydrated || !token || !tenantId) return null;
    return io(SOCKET_URL, { auth: { token, tenantId }, autoConnect: false, transports: ['websocket', 'polling'] });
  }, [hasHydrated, tenantId, token]);

  const loadSessions = useCallback(async () => {
    if (!token || !tenantId) return;
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    const loaded = await api<ChatSession[]>(`/chat-sessions${query}`, { token, tenantId });
    setSessions(loaded);
  }, [search, tenantId, token]);

  const loadMessages = useCallback(async () => {
    if (skipNextMessageLoadRef.current) {
      skipNextMessageLoadRef.current = false;
      return;
    }
    if (!token || !tenantId || !activeChatId) {
      setMessages([]);
      return;
    }
    setMessages(await api<ChatMessage[]>(`/chat-sessions/${activeChatId}/messages`, { token, tenantId }));
  }, [activeChatId, tenantId, token]);

  const selectChat = useCallback(
    async (session: ChatSession) => {
      if (!token || !tenantId) return;
      setError('');
      setStreaming(false);
      currentSourcesRef.current = [];
      skipNextMessageLoadRef.current = true;
      setActiveChatId(session.id);
      activeSessionRef.current = session.id;
      window.history.pushState(null, '', `/dashboard/chat/${session.id}`);
      const loaded = await api<ChatMessage[]>(`/chat-sessions/${session.id}/messages`, { token, tenantId });
      setMessages(loaded);
    },
    [tenantId, token],
  );

  useEffect(() => {
    if (!hasHydrated || !token || !tenantId) return;
    loadSessions().catch((err) => setError(err instanceof Error ? err.message : 'Could not load chats'));
    const timer = setInterval(() => loadSessions().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [hasHydrated, loadSessions, tenantId, token]);

  useEffect(() => {
    loadMessages().catch((err) => setError(err instanceof Error ? err.message : 'Could not load messages'));
  }, [loadMessages]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      setSocketConnected(true);
      setError('');
    };
    const onDisconnect = () => setSocketConnected(false);
    const onConnectError = (err: Error) => {
      setSocketConnected(false);
      setError(err.message || 'Could not connect to chat server');
    };
    const onStreaming = (chunk: { sessionId: string; type: string; delta?: string; sources?: unknown[] }) => {
      if (chunk.sessionId !== activeSessionRef.current) return;
      if (chunk.type === 'sources') currentSourcesRef.current = chunk.sources || [];
      if (chunk.type === 'delta' && chunk.delta) {
        setMessages((current) => appendStreamingDelta(current, chunk.delta!, currentSourcesRef.current));
      }
      if (chunk.type === 'done') setStreaming(false);
    };
    const onCompleted = (event: { sessionId: string; error?: string }) => {
      if (event.sessionId !== activeSessionRef.current) return;
      setStreaming(false);
      if (event.error) setError(event.error);
      currentSourcesRef.current = [];
      loadSessions().catch(() => undefined);
      if (token && tenantId) {
        api<ChatMessage[]>(`/chat-sessions/${event.sessionId}/messages`, { token, tenantId })
          .then(setMessages)
          .catch(() => undefined);
      }
    };
    const onError = (event: { sessionId: string; message?: string }) => {
      if (event.sessionId !== activeSessionRef.current) return;
      setStreaming(false);
      setError(event.message || 'The assistant could not respond');
    };
    const onSessionChanged = () => {
      loadSessions().catch(() => undefined);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('chat.message.streaming', onStreaming);
    socket.on('chat.message.completed', onCompleted);
    socket.on('chat:error', onError);
    socket.on('chat.title.updated', onSessionChanged);
    socket.on('chat.session.created', onSessionChanged);
    socket.on('chat.session.deleted', onSessionChanged);
    socket.on('chat.session.archived', onSessionChanged);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('chat.message.streaming', onStreaming);
      socket.off('chat.message.completed', onCompleted);
      socket.off('chat:error', onError);
      socket.off('chat.title.updated', onSessionChanged);
      socket.off('chat.session.created', onSessionChanged);
      socket.off('chat.session.deleted', onSessionChanged);
      socket.off('chat.session.archived', onSessionChanged);
      socket.disconnect();
    };
  }, [loadSessions, socket, tenantId, token]);

  async function createChat() {
    if (!token || !tenantId) return;
    const session = await api<ChatSession>('/chat-sessions', { method: 'POST', token, tenantId, body: JSON.stringify({}) });
    setActiveChatId(session.id);
    activeSessionRef.current = session.id;
    await loadSessions();
    router.push(`/dashboard/chat/${session.id}`);
  }

  async function renameChat(session: ChatSession, title: string) {
    if (!token || !tenantId) return;
    await api(`/chat-sessions/${session.id}/title`, { method: 'PATCH', token, tenantId, body: JSON.stringify({ title }) });
    await loadSessions();
  }

  async function archiveChat(session: ChatSession) {
    if (!token || !tenantId) return;
    await api(`/chat-sessions/${session.id}/archive`, { method: 'POST', token, tenantId });
    if (session.id === activeChatId) {
      setActiveChatId(undefined);
      activeSessionRef.current = undefined;
      router.push('/dashboard/chat');
    }
    await loadSessions();
  }

  async function deleteChat(session: ChatSession) {
    if (!token || !tenantId) return;
    await api(`/chat-sessions/${session.id}`, { method: 'DELETE', token, tenantId });
    if (session.id === activeChatId) {
      setActiveChatId(undefined);
      activeSessionRef.current = undefined;
      router.push('/dashboard/chat');
    }
    await loadSessions();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || !socket || !token || !tenantId) return;
    if (!socketConnected) {
      setError('Chat server is not connected yet. Please wait a moment and try again.');
      return;
    }
    const message = input.trim();
    let sessionId = activeChatId;
    if (!sessionId) {
      const session = await api<ChatSession>('/chat-sessions', { method: 'POST', token, tenantId, body: JSON.stringify({}) });
      sessionId = session.id;
      skipNextMessageLoadRef.current = true;
      setActiveChatId(session.id);
      activeSessionRef.current = session.id;
      window.history.replaceState(null, '', `/dashboard/chat/${session.id}`);
      await loadSessions();
    }
    setInput('');
    setError('');
    setStreaming(true);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'USER', content: message }]);
    socket.emit('chat:message', { sessionId, message });
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-border bg-background lg:grid-cols-[320px_1fr]">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeChatId}
        search={search}
        onSearch={setSearch}
        onNew={createChat}
        onRename={renameChat}
        onArchive={archiveChat}
        onDelete={deleteChat}
        onSelect={selectChat}
      />
      <section className="flex min-h-0 flex-col">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">{sessions.find((session) => session.id === activeChatId)?.title || 'New Chat'}</p>
          <p className="text-xs text-muted-foreground">{socketConnected ? 'Chat connected' : 'Connecting chat...'}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <MessageList messages={messages} />
          <TypingIndicator active={streaming} />
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
          <Button className="h-10 w-10 shrink-0 px-0" title="Send" disabled={streaming}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}
