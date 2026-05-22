export function ConnectedAccountBadge({ status }: { status?: string }) {
  const connected = status === 'CONNECTED';
  return (
    <span className={connected ? 'rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700' : 'rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground'}>
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}
