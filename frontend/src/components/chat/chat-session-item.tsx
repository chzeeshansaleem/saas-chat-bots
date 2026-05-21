import { ArchiveChatButton } from '@/components/chat/archive-chat-button';
import { DeleteChatDialog } from '@/components/chat/delete-chat-dialog';
import { RenameChatDialog } from '@/components/chat/rename-chat-dialog';
import type { ChatSession } from '@/components/chat/types';
import { cn } from '@/lib/utils';

export function ChatSessionItem({
  session,
  active,
  onRename,
  onArchive,
  onDelete,
  onSelect,
}: {
  session: ChatSession;
  active: boolean;
  onRename: (title: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  return (
    <div className={cn('rounded-md border border-transparent p-2 hover:bg-muted', active && 'border-border bg-muted')}>
      <button className="block w-full min-w-0 text-left" onClick={onSelect}>
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatSessionTime(session.lastMessageAt || session.updatedAt)}</p>
      </button>
      <div className="mt-2 flex gap-1">
        <RenameChatDialog title={session.title} onRename={onRename} />
        <ArchiveChatButton title={session.title} onArchive={onArchive} />
        <DeleteChatDialog title={session.title} onDelete={onDelete} />
      </div>
    </div>
  );
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
