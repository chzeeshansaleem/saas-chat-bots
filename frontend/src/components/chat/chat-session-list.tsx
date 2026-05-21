import { ChatSessionItem } from '@/components/chat/chat-session-item';
import type { ChatSession } from '@/components/chat/types';

export function ChatSessionList({
  sessions,
  activeSessionId,
  onRename,
  onArchive,
  onDelete,
  onSelect,
}: {
  sessions: ChatSession[];
  activeSessionId?: string;
  onRename: (session: ChatSession, title: string) => void;
  onArchive: (session: ChatSession) => void;
  onDelete: (session: ChatSession) => void;
  onSelect: (session: ChatSession) => void;
}) {
  const groups = groupSessions(sessions);

  if (!sessions.length) {
    return <p className="px-2 text-sm text-muted-foreground">No chats yet.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
          <div className="space-y-2">
            {group.sessions.map((session) => (
              <ChatSessionItem
                key={session.id}
                session={session}
                active={session.id === activeSessionId}
                onRename={(title) => onRename(session, title)}
                onArchive={() => onArchive(session)}
                onDelete={() => onDelete(session)}
                onSelect={() => onSelect(session)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupSessions(sessions: ChatSession[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const buckets = [
    { label: 'Today', sessions: [] as ChatSession[] },
    { label: 'Yesterday', sessions: [] as ChatSession[] },
    { label: 'Previous 7 Days', sessions: [] as ChatSession[] },
    { label: 'Previous 30 Days', sessions: [] as ChatSession[] },
    { label: 'Older', sessions: [] as ChatSession[] },
  ];

  for (const session of sessions) {
    const time = new Date(session.lastMessageAt || session.updatedAt).getTime();
    const age = startOfToday - new Date(time).setHours(0, 0, 0, 0);
    if (age <= 0) buckets[0].sessions.push(session);
    else if (age <= day) buckets[1].sessions.push(session);
    else if (age <= 7 * day) buckets[2].sessions.push(session);
    else if (age <= 30 * day) buckets[3].sessions.push(session);
    else buckets[4].sessions.push(session);
  }

  return buckets.filter((bucket) => bucket.sessions.length);
}
