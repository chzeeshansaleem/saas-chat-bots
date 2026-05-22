import { Card } from '@/components/ui/card';

export type ActionLog = {
  id: string;
  toolName: string;
  actionType: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
};

export function ActionLogTable({ logs }: { logs: ActionLog[] }) {
  if (!logs.length) return <Card className="p-6 text-sm text-muted-foreground">No actions have been executed yet.</Card>;
  return (
    <Card className="overflow-hidden">
      {logs.map((log) => (
        <div key={log.id} className="grid gap-1 border-b border-border p-4 text-sm last:border-b-0 md:grid-cols-[1fr_100px_100px_180px]">
          <span className="font-medium">{log.toolName}</span>
          <span>{log.actionType}</span>
          <span>{log.status}</span>
          <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
          {log.errorMessage && <p className="md:col-span-4 text-xs text-destructive">{log.errorMessage}</p>}
        </div>
      ))}
    </Card>
  );
}
