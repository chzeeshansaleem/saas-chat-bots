export function SyncStatusBadge({ status }: { status?: string }) {
  return <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{status || 'Not synced'}</span>;
}
