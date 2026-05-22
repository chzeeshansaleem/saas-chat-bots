'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomApiConnectorForm } from '@/components/custom-api/custom-api-connector-form';
import { CustomApiEndpointBuilder, type CustomApiEndpointPayload } from '@/components/custom-api/custom-api-endpoint-builder';
import type { CustomApiConnector, CustomApiEndpoint } from '@/components/custom-api/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function CustomApiPage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [connectors, setConnectors] = useState<CustomApiConnector[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [endpoints, setEndpoints] = useState<CustomApiEndpoint[]>([]);
  const [error, setError] = useState('');

  const loadConnectors = useCallback(async () => {
    if (!token || !tenantId) return;
    const rows = await api<CustomApiConnector[]>('/custom-api/connectors', { token, tenantId });
    setConnectors(rows);
    setSelectedId((current) => current || rows[0]?.id);
  }, [tenantId, token]);

  const loadEndpoints = useCallback(async () => {
    if (!token || !tenantId || !selectedId) {
      setEndpoints([]);
      return;
    }
    setEndpoints(await api<CustomApiEndpoint[]>(`/custom-api/connectors/${selectedId}/endpoints`, { token, tenantId }));
  }, [selectedId, tenantId, token]);

  useEffect(() => {
    loadConnectors().catch((err) => setError(err instanceof Error ? err.message : 'Could not load connectors'));
  }, [loadConnectors]);

  useEffect(() => {
    loadEndpoints().catch((err) => setError(err instanceof Error ? err.message : 'Could not load endpoints'));
  }, [loadEndpoints]);

  async function createConnector(payload: { name: string; baseUrl: string; authType: string }) {
    if (!token || !tenantId) return;
    await api('/custom-api/connectors', { method: 'POST', token, tenantId, body: JSON.stringify(payload) });
    await loadConnectors();
  }

  async function createEndpoint(connectorId: string, payload: CustomApiEndpointPayload) {
    if (!token || !tenantId) return;
    await api(`/custom-api/connectors/${connectorId}/endpoints`, { method: 'POST', token, tenantId, body: JSON.stringify(payload) });
    await loadEndpoints();
  }

  async function testEndpoint(endpointId: string) {
    if (!token || !tenantId) return;
    await api(`/custom-api/endpoints/${endpointId}/test`, { method: 'POST', token, tenantId });
  }

  const selected = connectors.find((connector) => connector.id === selectedId);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Custom API</h1>
        <p className="mt-1 text-sm text-muted-foreground">Register tenant-owned REST APIs as guarded chatbot tools.</p>
      </div>
      {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <CustomApiConnectorForm onSubmit={createConnector} />
      <div className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              className={`block w-full border-b border-border p-4 text-left text-sm last:border-b-0 ${selectedId === connector.id ? 'bg-muted' : ''}`}
              onClick={() => setSelectedId(connector.id)}
            >
              <span className="font-medium">{connector.name}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{connector.baseUrl}</span>
            </button>
          ))}
          {!connectors.length && <p className="p-5 text-sm text-muted-foreground">No custom connectors yet.</p>}
        </Card>
        <div className="grid gap-4">
          <CustomApiEndpointBuilder connectorId={selected?.id} onSubmit={createEndpoint} />
          <Card className="overflow-hidden">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="grid gap-3 border-b border-border p-4 text-sm last:border-b-0 md:grid-cols-[1fr_80px_2fr_auto] md:items-center">
                <span className="font-medium">{endpoint.name}</span>
                <span>{endpoint.method}</span>
                <span className="truncate text-muted-foreground">{endpoint.path}</span>
                <Button className="h-8 bg-muted px-3 text-foreground" onClick={() => testEndpoint(endpoint.id)}>Test</Button>
              </div>
            ))}
            {!endpoints.length && <p className="p-5 text-sm text-muted-foreground">No endpoints configured for this connector.</p>}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
