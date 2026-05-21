'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Database, RefreshCw, Save, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type Source = {
  id: string;
  name: string;
  type: string;
  status: string;
  url?: string;
};

export default function KnowledgePage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [sources, setSources] = useState<Source[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; url: string }>>({});
  const [error, setError] = useState('');

  async function load() {
    if (!token || !tenantId) return;
    const loaded = await api<Source[]>('/knowledge/sources', { token, tenantId });
    setSources(loaded);
    setDrafts(
      Object.fromEntries(
        loaded.map((source) => [source.id, { name: source.name, url: source.url || '' }]),
      ),
    );
  }

  useEffect(() => {
    load();
  }, [tenantId, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/knowledge/website', {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name'), url: form.get('url'), depth: 1, pageLimit: 2 }),
        token,
        tenantId,
      });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add source');
    }
  }

  async function saveSource(source: Source) {
    try {
      const draft = drafts[source.id];
      await api('/knowledge/sources/' + source.id, {
        method: 'PATCH',
        body: JSON.stringify({ name: draft.name, url: source.type === 'WEBSITE' ? draft.url : undefined }),
        token,
        tenantId,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save source');
    }
  }

  async function reindexSource(source: Source) {
    try {
      await api('/knowledge/sources/' + source.id + '/reindex', {
        method: 'POST',
        body: JSON.stringify({ depth: 1, pageLimit: 2 }),
        token,
        tenantId,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reindex source');
    }
  }

  async function deleteSource(source: Source) {
    try {
      await api('/knowledge/sources/' + source.id, { method: 'DELETE', token, tenantId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete source');
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Knowledge Sources</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add tenant-owned websites and monitor indexing status.</p>
      </div>
      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <Input name="name" placeholder="Source name" required />
          <Input name="url" placeholder="https://example.com/docs" required />
          <Button>Add URL</Button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </Card>
      <div className="mt-5 grid gap-3">
        {sources.map((source) => (
          <Card key={source.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 items-start gap-3">
              <Database className="h-4 w-4 text-primary" />
              <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[1fr_2fr]">
                <Input
                  value={drafts[source.id]?.name || ''}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [source.id]: { ...(current[source.id] || { name: '', url: '' }), name: event.target.value },
                    }))
                  }
                  placeholder="Source name"
                />
                <Input
                  value={drafts[source.id]?.url || ''}
                  disabled={source.type !== 'WEBSITE'}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [source.id]: { ...(current[source.id] || { name: '', url: '' }), url: event.target.value },
                    }))
                  }
                  placeholder={source.type === 'WEBSITE' ? 'https://example.com/docs' : source.type}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="rounded-md bg-muted px-2 py-1 text-xs">{source.status}</span>
              <Button className="h-9 w-9 px-0" title="Save source" onClick={() => saveSource(source)}>
                <Save className="h-4 w-4" />
              </Button>
              <Button className="h-9 w-9 px-0" title="Reindex source" onClick={() => reindexSource(source)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button className="h-9 w-9 bg-destructive px-0 text-white" title="Delete source" onClick={() => deleteSource(source)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
