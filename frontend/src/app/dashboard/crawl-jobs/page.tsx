'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { CrawlJob, CrawlProgressCard } from '@/components/knowledge/crawl-progress-card';
import { CrawlLogsDrawer } from '@/components/knowledge/crawl-logs-drawer';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function CrawlJobsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !tenantId) return;
    try {
      setJobs(await api<CrawlJob[]>('/crawler/jobs', { token, tenantId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load crawl jobs');
    }
  }, [tenantId, token]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Crawl Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent website ingestion jobs and crawl logs.</p>
      </div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="grid gap-3">
        {jobs.map((job) => (
          <div key={job.id} className="space-y-2">
            <CrawlProgressCard job={job} />
            <CrawlLogsDrawer jobId={job.id} />
          </div>
        ))}
        {!jobs.length && <p className="text-sm text-muted-foreground">No crawl jobs yet.</p>}
      </div>
    </AppShell>
  );
}
