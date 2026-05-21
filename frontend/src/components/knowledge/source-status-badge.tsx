import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  READY: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  PROCESSING: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  FAILED: 'bg-destructive/10 text-destructive',
};

export function SourceStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium', statusStyles[status] || 'bg-muted text-muted-foreground')}>
      {status}
    </span>
  );
}
