'use client';

import { Button } from '@/components/ui/button';

export function OAuthConnectButton({ connected, onConnect, onDisconnect }: { connected: boolean; onConnect: () => void; onDisconnect?: () => void }) {
  return connected ? (
    <Button className="bg-muted text-foreground" onClick={onDisconnect}>Disconnect</Button>
  ) : (
    <Button onClick={onConnect}>Connect</Button>
  );
}
