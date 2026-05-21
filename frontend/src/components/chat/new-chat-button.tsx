import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NewChatButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="w-full justify-start" onClick={onClick}>
      <Plus className="h-4 w-4" />
      New Chat
    </Button>
  );
}
