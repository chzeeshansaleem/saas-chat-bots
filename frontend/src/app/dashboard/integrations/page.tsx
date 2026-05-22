'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { IntegrationCard } from '@/components/integrations/integration-card';
import { ToolListTable } from '@/components/integrations/tool-list-table';
import { ToolPermissionEditor } from '@/components/integrations/tool-permission-editor';
import type { IntegrationProvider, TenantIntegration, ToolDefinition } from '@/components/integrations/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function IntegrationsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connected, setConnected] = useState<TenantIntegration[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !tenantId) return;
    const [providerRows, connectedRows, toolRows] = await Promise.all([
      api<IntegrationProvider[]>('/integrations/providers', { token, tenantId }),
      api<TenantIntegration[]>('/integrations/connected', { token, tenantId }),
      api<ToolDefinition[]>('/tools', { token, tenantId }),
    ]);
    setProviders(providerRows);
    setConnected(connectedRows);
    setTools(toolRows);
  }, [tenantId, token]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load integrations'));
  }, [load]);

  const connectedByProvider = useMemo(
    () => new Map(connected.map((integration) => [integration.provider.key, integration])),
    [connected],
  );

  async function connect(providerKey: string) {
    if (!token || !tenantId) return;
    const result = await api<{ authUrl: string; provider: string }>(`/integrations/${providerKey}/connect`, {
      method: 'POST',
      token,
      tenantId,
    });
    window.location.href = result.authUrl;
  }

  async function disconnect(integration?: TenantIntegration) {
    if (!token || !tenantId || !integration) return;
    await api(`/integrations/${integration.id}/disconnect`, { method: 'DELETE', token, tenantId });
    await load();
  }

  async function toggleTool(tool: ToolDefinition) {
    if (!token || !tenantId) return;
    await api(`/tools/${tool.id}/enable`, {
      method: 'PATCH',
      token,
      tenantId,
      body: JSON.stringify({ enabled: !tool.enabled }),
    });
    await load();
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect tenant apps and expose approved actions to the chatbot.</p>
      </div>
      {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {providers.map((provider) => (
          <IntegrationCard
            key={provider.id}
            provider={provider}
            integration={connectedByProvider.get(provider.key)}
            onConnect={() => connect(provider.key)}
            onDisconnect={() => disconnect(connectedByProvider.get(provider.key))}
          />
        ))}
      </div>
      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <ToolListTable tools={tools} onToggle={toggleTool} />
        <ToolPermissionEditor />
      </section>
    </AppShell>
  );
}
