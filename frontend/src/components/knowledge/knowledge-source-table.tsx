'use client';

import Link from 'next/link';
import { Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DeleteSourceDialog } from '@/components/knowledge/delete-source-dialog';
import { ReSyncButton } from '@/components/knowledge/resync-button';
import { SourceStatusBadge } from '@/components/knowledge/source-status-badge';

export type KnowledgeSourceRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  url?: string;
  filePath?: string;
  updatedAt?: string;
  documents?: Array<{ id: string }>;
};

export function KnowledgeSourceTable({
  sources,
  onResync,
  onDelete,
}: {
  sources: KnowledgeSourceRow[];
  onResync: (source: KnowledgeSourceRow) => void;
  onDelete: (source: KnowledgeSourceRow) => void;
}) {
  if (!sources.length) {
    return <Card className="p-6 text-sm text-muted-foreground">No knowledge sources yet.</Card>;
  }

  return (
    <div className="grid gap-3">
      {sources.map((source) => (
        <Card key={source.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
          <Link href={`/dashboard/knowledge/${source.id}`} className="flex min-w-0 items-start gap-3">
            <Database className="mt-1 h-4 w-4 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{source.name}</p>
              <p className="truncate text-xs text-muted-foreground">{source.url || source.filePath || source.type}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {source.type} · {source.documents?.length || 0} documents
              </p>
            </div>
          </Link>
          <div className="flex items-center justify-end gap-2">
            <SourceStatusBadge status={source.status} />
            <ReSyncButton onClick={() => onResync(source)} disabled={source.status === 'PROCESSING' || source.status === 'PENDING'} />
            <DeleteSourceDialog name={source.name} onConfirm={() => onDelete(source)} />
          </div>
        </Card>
      ))}
    </div>
  );
}
