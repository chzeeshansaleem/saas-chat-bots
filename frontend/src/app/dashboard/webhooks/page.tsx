'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { WebhookEventTable } from '@/components/webhooks/webhook-event-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type WebhookEvent = {
  id: string;
  eventType: string;
  processed: boolean;
  createdAt: string;
  provider?: { name: string };
};

export default function WebhooksPage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !tenantId) return;
    setEvents(await api<WebhookEvent[]>('/webhooks/events', { token, tenantId }));
  }, [tenantId, token]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load webhook events'));
    const timer = setInterval(() => load().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Incoming provider events captured for sync and notifications.</p>
      </div>
      {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <WebhookEventTable events={events} />
    </AppShell>
  );
}
