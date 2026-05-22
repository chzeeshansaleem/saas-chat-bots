'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConnectedAccountBadge } from '@/components/integrations/connected-account-badge';
import { OAuthConnectButton } from '@/components/integrations/oauth-connect-button';
import { SyncStatusBadge } from '@/components/integrations/sync-status-badge';
import { ToolListTable } from '@/components/integrations/tool-list-table';
import type { IntegrationProvider, TenantIntegration, ToolDefinition } from '@/components/integrations/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export function ProviderPage({ providerKey }: { providerKey: string }) {
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
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load provider'));
  }, [load]);

  const provider = providers.find((row) => row.key === providerKey);
  const integration = connected.find((row) => row.provider.key === providerKey);
  const providerTools = useMemo(() => tools.filter((tool) => tool.provider?.key === providerKey), [providerKey, tools]);

  async function connect() {
    if (!token || !tenantId) return;
    const result = await api<{ authUrl: string }>(`/integrations/${providerKey}/connect`, { method: 'POST', token, tenantId });
    window.location.href = result.authUrl;
  }

  async function disconnect() {
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/integrations" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Integrations
          </Link>
          <h1 className="text-2xl font-semibold">{provider?.name || providerKey}</h1>
          <p className="mt-1 text-sm text-muted-foreground">OAuth status, scopes, and enabled tools for this provider.</p>
        </div>
        <OAuthConnectButton connected={integration?.status === 'CONNECTED'} onConnect={connect} onDisconnect={disconnect} />
      </div>
      {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Connection</p>
          <div className="mt-2"><ConnectedAccountBadge status={integration?.status} /></div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Scopes</p>
          <p className="mt-2 text-sm font-medium">{(integration?.scopes || provider?.scopes || []).join(', ') || 'No scopes configured'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Sync</p>
          <div className="mt-2"><SyncStatusBadge status={integration?.updatedAt ? new Date(integration.updatedAt).toLocaleString() : undefined} /></div>
        </Card>
      </div>
      <ToolListTable tools={providerTools} onToggle={toggleTool} />
      {!providerTools.length && (
        <Card className="mt-4 p-6 text-sm text-muted-foreground">No tools are registered for this provider yet.</Card>
      )}
    </AppShell>
  );
}
