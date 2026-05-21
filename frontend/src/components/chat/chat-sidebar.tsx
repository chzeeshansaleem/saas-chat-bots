'use client';

import { ChatSearchInput } from '@/components/chat/chat-search-input';
import { ChatSessionList } from '@/components/chat/chat-session-list';
import { NewChatButton } from '@/components/chat/new-chat-button';
import type { ChatSession } from '@/components/chat/types';

export function ChatSidebar({
  sessions,
  activeSessionId,
  search,
  onSearch,
  onNew,
  onRename,
  onArchive,
  onDelete,
  onSelect,
}: {
  sessions: ChatSession[];
  activeSessionId?: string;
  search: string;
  onSearch: (value: string) => void;
  onNew: () => void;
  onRename: (session: ChatSession, title: string) => void;
  onArchive: (session: ChatSession) => void;
  onDelete: (session: ChatSession) => void;
  onSelect: (session: ChatSession) => void;
}) {
  return (
    <aside className="hidden min-h-0 flex-col border-r border-border bg-card p-3 lg:flex">
      <NewChatButton onClick={onNew} />
      <div className="mt-3">
        <ChatSearchInput value={search} onChange={onSearch} />
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <ChatSessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onRename={onRename}
          onArchive={onArchive}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      </div>
    </aside>
  );
}
