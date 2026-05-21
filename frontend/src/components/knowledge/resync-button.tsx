'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReSyncButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button className="h-9 w-9 px-0" title="Re-sync source" onClick={onClick} disabled={disabled}>
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
}
