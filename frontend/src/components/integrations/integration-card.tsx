'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ConnectedAccountBadge } from '@/components/integrations/connected-account-badge';
import { OAuthConnectButton } from '@/components/integrations/oauth-connect-button';
import type { IntegrationProvider, TenantIntegration } from '@/components/integrations/types';

export function IntegrationCard({
  provider,
  integration,
  onConnect,
  onDisconnect,
}: {
  provider: IntegrationProvider;
  integration?: TenantIntegration;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <Card className="flex flex-col justify-between gap-4 p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/dashboard/integrations/${provider.key}`} className="text-base font-semibold hover:underline">
              {provider.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{provider.authType} · {provider.scopes.length || 0} scopes</p>
          </div>
          <ConnectedAccountBadge status={integration?.status} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{provider.tools?.length || 0} registered tools</p>
      </div>
      <OAuthConnectButton connected={integration?.status === 'CONNECTED'} onConnect={onConnect} onDisconnect={onDisconnect} />
    </Card>
  );
}
