'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type Bot = {
  id: string;
  tenantId: string;
  name: string;
  welcomeMessage: string;
  placeholder: string;
  themeColor: string;
  position: string;
  status: string;
  domains: Array<{ id: string; domain: string }>;
};

export default function BotsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [bots, setBots] = useState<Bot[]>([]);
  const [embed, setEmbed] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !tenantId) return;
    setBots(await api<Bot[]>('/bots', { token, tenantId }));
  }, [tenantId, token]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load bots'));
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api('/bots', {
        method: 'POST',
        token,
        tenantId,
        body: JSON.stringify({
          name: String(form.get('name') || ''),
          welcomeMessage: String(form.get('welcomeMessage') || ''),
          placeholder: String(form.get('placeholder') || ''),
          themeColor: String(form.get('themeColor') || '#2563eb'),
          allowedDomains: String(form.get('allowedDomains') || '')
            .split(',')
            .map((domain) => domain.trim())
            .filter(Boolean),
          suggestedQuestions: String(form.get('suggestedQuestions') || '')
            .split('\n')
            .map((question) => question.trim())
            .filter(Boolean),
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create bot');
    } finally {
      setBusy(false);
    }
  }

  async function loadEmbed(bot: Bot) {
    if (!token || !tenantId) return;
    const result = await api<{ script: string }>(`/bots/${bot.id}/embed-code`, { token, tenantId });
    setEmbed((current) => ({ ...current, [bot.id]: result.script }));
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Bots</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure embeddable assistants, branding, allowed domains, and script tags.</p>
      </div>
      {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Card className="p-5">
        <form onSubmit={create} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input name="name" placeholder="Ideawake Assistant" required />
            <Input name="themeColor" placeholder="#2563eb" defaultValue="#2563eb" />
            <Input name="allowedDomains" placeholder="app.example.com, www.example.com" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Textarea name="welcomeMessage" placeholder="Hi, I can help with ideas and challenges." rows={3} />
            <Textarea name="suggestedQuestions" placeholder={'How do I create an idea?\nShow my open challenges'} rows={3} />
          </div>
          <Input name="placeholder" placeholder="Ask a question or request an action..." />
          <div className="flex justify-end">
            <Button disabled={busy}>{busy ? 'Saving...' : 'Create Bot'}</Button>
          </div>
        </form>
      </Card>
      <div className="mt-6 grid gap-4">
        {bots.map((bot) => (
          <Card key={bot.id} className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold">{bot.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{bot.status} · {bot.domains.map((domain) => domain.domain).join(', ') || 'No domain allowlist'}</p>
                <p className="mt-3 text-sm">{bot.welcomeMessage}</p>
              </div>
              <Button className="gap-2 bg-muted text-foreground" onClick={() => loadEmbed(bot)}>
                <Copy className="h-4 w-4" />
                Embed Code
              </Button>
            </div>
            {embed[bot.id] && (
              <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {embed[bot.id]}
              </pre>
            )}
          </Card>
        ))}
        {!bots.length && <Card className="p-6 text-sm text-muted-foreground">No bots configured yet.</Card>}
      </div>
    </AppShell>
  );
}
