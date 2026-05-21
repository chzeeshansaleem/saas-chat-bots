export function TypingIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return <p className="text-sm text-muted-foreground">Assistant is typing...</p>;
}
