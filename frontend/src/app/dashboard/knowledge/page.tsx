'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { KnowledgeSourceRow, KnowledgeSourceTable } from '@/components/knowledge/knowledge-source-table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardKnowledgePage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [sources, setSources] = useState<KnowledgeSourceRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !tenantId) return;
    try {
      setSources(await api<KnowledgeSourceRow[]>('/knowledge-sources', { token, tenantId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sources');
    }
  }, [tenantId, token]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function resync(source: KnowledgeSourceRow) {
    if (!token || !tenantId) return;
    await api(`/knowledge-sources/${source.id}/resync`, { method: 'POST', token, tenantId, body: JSON.stringify({ depth: 1, pageLimit: 2 }) });
    await load();
  }

  async function deleteSource(source: KnowledgeSourceRow) {
    if (!token || !tenantId) return;
    await api(`/knowledge-sources/${source.id}`, { method: 'DELETE', token, tenantId });
    await load();
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">Websites and PDFs indexed for tenant-isolated chat answers.</p>
        </div>
        <div className="flex gap-2">
          <Link className="inline-flex h-10 items-center rounded-md bg-muted px-4 text-sm font-medium text-foreground" href="/dashboard/knowledge/upload-pdf">
            Upload PDF
          </Link>
          <Link className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/dashboard/knowledge/add-website">
            Add Website
          </Link>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <KnowledgeSourceTable sources={sources} onResync={resync} onDelete={deleteSource} />
    </AppShell>
  );
}
