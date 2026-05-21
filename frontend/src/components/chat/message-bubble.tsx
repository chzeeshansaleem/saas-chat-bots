import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { SourceReferences } from '@/components/chat/source-references';
import type { ChatMessage } from '@/components/chat/types';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';

  return (
    <div className={isUser ? 'ml-auto max-w-3xl' : 'mr-auto max-w-3xl'}>
      <div className={isUser ? 'rounded-lg bg-primary p-3 text-primary-foreground' : 'rounded-lg bg-muted p-3'}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {message.content}
        </ReactMarkdown>
        {!isUser && <SourceReferences sources={message.sources} />}
      </div>
    </div>
  );
}
