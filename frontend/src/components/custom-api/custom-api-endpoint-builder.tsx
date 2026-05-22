'use client';

import { FormEvent, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type CustomApiEndpointPayload = {
  name: string;
  method: string;
  path: string;
  description: string;
  inputSchema: Record<string, unknown>;
  responseMapping: Record<string, unknown>;
  confirmationRequired: boolean;
  allowedRoles: string[];
};

export function CustomApiEndpointBuilder({
  connectorId,
  onSubmit,
}: {
  connectorId?: string;
  onSubmit: (connectorId: string, payload: CustomApiEndpointPayload) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connectorId) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');

    try {
      await onSubmit(connectorId, {
        name: String(form.get('name') || ''),
        method: String(form.get('method') || 'GET'),
        path: String(form.get('path') || ''),
        description: String(form.get('description') || ''),
        inputSchema: parseJson(String(form.get('inputSchema') || '{}')),
        responseMapping: parseJson(String(form.get('responseMapping') || '{}')),
        confirmationRequired: form.get('confirmationRequired') === 'on',
        allowedRoles: String(form.get('allowedRoles') || 'ADMIN')
          .split(',')
          .map((role) => role.trim().toUpperCase())
          .filter(Boolean),
      });
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save endpoint');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Endpoint Tool</h2>
        <p className="mt-1 text-sm text-muted-foreground">Expose a custom REST endpoint as an AI tool.</p>
      </div>
      {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[1fr_120px_2fr]">
          <Input name="name" placeholder="hospital.createAppointment" required disabled={!connectorId} />
          <select name="method" className="h-10 rounded-md border border-border bg-background px-3 text-sm" disabled={!connectorId}>
            <option>GET</option>
            <option>POST</option>
            <option>PATCH</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <Input name="path" placeholder="/appointments" required disabled={!connectorId} />
        </div>
        <Textarea name="description" placeholder="Create an appointment for a patient" rows={2} disabled={!connectorId} />
        <div className="grid gap-3 md:grid-cols-2">
          <Textarea name="inputSchema" placeholder='{"type":"object","properties":{"patientName":{"type":"string"}}}' rows={5} disabled={!connectorId} />
          <Textarea name="responseMapping" placeholder='{"link":"$.url","summary":"$.message"}' rows={5} disabled={!connectorId} />
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input name="confirmationRequired" type="checkbox" className="h-4 w-4" defaultChecked disabled={!connectorId} />
            Require confirmation for execution
          </label>
          <Input name="allowedRoles" defaultValue="ADMIN" placeholder="ADMIN,MEMBER" disabled={!connectorId} />
          <Button disabled={!connectorId || busy} className="gap-2">
            <Plus className="h-4 w-4" />
            {busy ? 'Saving...' : 'Add Endpoint'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function parseJson(value: string) {
  try {
    return JSON.parse(value || '{}') as Record<string, unknown>;
  } catch {
    throw new Error('Schema and response mapping must be valid JSON.');
  }
}
