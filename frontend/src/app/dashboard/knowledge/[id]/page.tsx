'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { SourceStatusBadge } from '@/components/knowledge/source-status-badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type SourceDetail = {
  id: string;
  name: string;
  type: string;
  status: string;
  url?: string;
  filePath?: string;
  documents: Array<{ id: string; title: string; uri: string; createdAt: string }>;
  crawlJobs: Array<{ id: string; status: string; rootUrl: string; createdAt: string }>;
};

export default function SourceDetailPage({ params }: { params: { id: string } }) {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [source, setSource] = useState<SourceDetail>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !tenantId) return;
    api<SourceDetail>(`/knowledge-sources/${params.id}`, { token, tenantId })
      .then(setSource)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load source'));
  }, [params.id, tenantId, token]);

  return (
    <AppShell>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      {source && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{source.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{source.url || source.filePath || source.type}</p>
            </div>
            <SourceStatusBadge status={source.status} />
          </div>
          <Card className="p-5">
            <p className="text-sm font-medium">Documents</p>
            <div className="mt-3 space-y-2">
              {source.documents.map((document) => (
                <div key={document.id} className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium">{document.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{document.uri}</p>
                </div>
              ))}
              {!source.documents.length && <p className="text-sm text-muted-foreground">No documents indexed yet.</p>}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium">Recent crawl jobs</p>
            <div className="mt-3 space-y-2">
              {source.crawlJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-md bg-muted p-3 text-sm">
                  <span className="truncate">{job.rootUrl}</span>
                  <span className="text-xs text-muted-foreground">{job.status}</span>
                </div>
              ))}
              {!source.crawlJobs.length && <p className="text-sm text-muted-foreground">No crawl jobs yet.</p>}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
