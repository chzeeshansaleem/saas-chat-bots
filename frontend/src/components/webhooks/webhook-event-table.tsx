import { Card } from '@/components/ui/card';

type WebhookEvent = {
  id: string;
  eventType: string;
  processed: boolean;
  createdAt: string;
  provider?: { name: string };
};

export function WebhookEventTable({ events }: { events: WebhookEvent[] }) {
  if (!events.length) return <Card className="p-6 text-sm text-muted-foreground">No webhook events received yet.</Card>;
  return (
    <Card className="overflow-hidden">
      {events.map((event) => (
        <div key={event.id} className="grid gap-2 border-b border-border p-4 text-sm last:border-b-0 md:grid-cols-[1fr_160px_120px_180px]">
          <span className="font-medium">{event.eventType}</span>
          <span>{event.provider?.name || 'Provider'}</span>
          <span>{event.processed ? 'Processed' : 'Pending'}</span>
          <span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </Card>
  );
}
