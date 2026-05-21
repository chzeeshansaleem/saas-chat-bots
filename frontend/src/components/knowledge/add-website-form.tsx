'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export function AddWebsiteForm({ onCreated }: { onCreated?: () => void }) {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;
    setSaving(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api('/knowledge-sources/website', {
        method: 'POST',
        token,
        tenantId,
        body: JSON.stringify({
          name: form.get('name'),
          url: form.get('url'),
          depth: Number(form.get('depth') || 1),
          pageLimit: Number(form.get('maxPages') || 2),
        }),
      });
      event.currentTarget.reset();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add website');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_2fr_96px_120px_auto]">
        <Input name="name" placeholder="Source name" required />
        <Input name="url" placeholder="https://example.com/docs" required />
        <Input name="depth" type="number" min={0} max={4} defaultValue={1} />
        <Input name="maxPages" type="number" min={1} max={250} defaultValue={2} />
        <Button disabled={saving}>{saving ? 'Adding...' : 'Add URL'}</Button>
      </form>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </Card>
  );
}
