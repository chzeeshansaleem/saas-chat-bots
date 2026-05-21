import { Input } from '@/components/ui/input';

export function ChatSearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search chats" />;
}
