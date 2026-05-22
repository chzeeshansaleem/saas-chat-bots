'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function CustomApiConnectorForm({ onSubmit }: { onSubmit: (payload: { name: string; baseUrl: string; authType: string }) => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    await onSubmit({
      name: String(form.get('name') || ''),
      baseUrl: String(form.get('baseUrl') || ''),
      authType: String(form.get('authType') || 'NONE'),
    });
    setBusy(false);
    event.currentTarget.reset();
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_2fr_140px_auto]">
        <Input name="name" placeholder="Connector name" required />
        <Input name="baseUrl" placeholder="https://api.example.com" required />
        <select name="authType" className="h-10 rounded-md border border-border bg-background px-3 text-sm">
          <option value="NONE">None</option>
          <option value="API_KEY">API key</option>
          <option value="BEARER_TOKEN">Bearer</option>
          <option value="BASIC">Basic</option>
        </select>
        <Button disabled={busy}>{busy ? 'Saving...' : 'Add Connector'}</Button>
      </form>
    </Card>
  );
}
