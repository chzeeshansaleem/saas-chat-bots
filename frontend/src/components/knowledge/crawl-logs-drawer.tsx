'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type CrawlLog = {
  id: string;
  url: string;
  statusCode?: number;
  message?: string;
  crawledAt: string;
};

export function CrawlLogsDrawer({ jobId }: { jobId: string }) {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!token || !tenantId) return;
    const loaded = await api<CrawlLog[]>(`/crawler/jobs/${jobId}/logs`, { token, tenantId });
    setLogs(loaded);
    setOpen(true);
  }

  return (
    <div>
      <Button className="h-9 bg-muted px-3 text-foreground" onClick={load}>Logs</Button>
      {open && (
        <Card className="mt-3 max-h-80 overflow-y-auto p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Crawl logs</p>
            <Button className="h-8 bg-muted px-3 text-foreground" onClick={() => setOpen(false)}>Close</Button>
          </div>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md bg-muted p-2 text-xs">
                <p className="truncate font-medium">{log.url}</p>
                <p className="mt-1 text-muted-foreground">{log.statusCode || 'n/a'} · {log.message || 'No message'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
