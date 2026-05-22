'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ActionLogTable, type ActionLog } from '@/components/actions/action-log-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function ActionLogsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !tenantId) return;
    setLogs(await api<ActionLog[]>('/actions/logs', { token, tenantId }));
  }, [tenantId, token]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load action logs'));
  }, [load]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Action Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Audited external actions executed by tenant users and agents.</p>
      </div>
      {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <ActionLogTable logs={logs} />
    </AppShell>
  );
}
