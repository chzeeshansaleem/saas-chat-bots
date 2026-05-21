import { MessageBubble } from '@/components/chat/message-bubble';
import type { ChatMessage } from '@/components/chat/types';

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  if (!messages.length) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Ask a question from this tenant knowledge base.</div>;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
