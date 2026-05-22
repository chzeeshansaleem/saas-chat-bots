'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ToolDefinition } from '@/components/integrations/types';

export function ToolListTable({ tools, onToggle }: { tools: ToolDefinition[]; onToggle?: (tool: ToolDefinition) => Promise<void> }) {
  const [busy, setBusy] = useState('');

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_110px_120px_96px] gap-3 border-b border-border p-3 text-xs font-medium text-muted-foreground">
        <span>Tool</span>
        <span>Type</span>
        <span>Confirm</span>
        <span>Status</span>
      </div>
      {tools.map((tool) => (
        <div key={tool.id} className="grid grid-cols-[1fr_110px_120px_96px] items-center gap-3 border-b border-border p-3 text-sm last:border-b-0">
          <div>
            <p className="font-medium">{tool.name}</p>
            <p className="text-xs text-muted-foreground">{tool.key}</p>
          </div>
          <span>{tool.actionType}</span>
          <span>{tool.confirmationRequired ? 'Required' : 'No'}</span>
          <Button
            className="h-8 bg-muted px-3 text-foreground"
            disabled={!onToggle || busy === tool.id}
            onClick={async () => {
              setBusy(tool.id);
              await onToggle?.(tool);
              setBusy('');
            }}
          >
            {tool.enabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      ))}
    </Card>
  );
}
