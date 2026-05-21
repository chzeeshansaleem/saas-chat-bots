'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeleteSourceDialog({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  return (
    <Button
      className="h-9 w-9 bg-destructive px-0 text-white"
      title="Delete source"
      onClick={() => {
        if (window.confirm(`Delete ${name} and all related chunks?`)) onConfirm();
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
