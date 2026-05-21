import { Card } from '@/components/ui/card';

export type CrawlJob = {
  id: string;
  status: string;
  rootUrl: string;
  depth: number;
  pageLimit: number;
  createdAt: string;
  knowledgeSource?: { name: string };
};

export function CrawlProgressCard({ job }: { job: CrawlJob }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{job.knowledgeSource?.name || job.rootUrl}</p>
          <p className="truncate text-xs text-muted-foreground">{job.rootUrl}</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs">{job.status}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: job.status === 'COMPLETED' ? '100%' : job.status === 'FAILED' ? '100%' : '45%' }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Depth {job.depth} · Max {job.pageLimit} pages
      </p>
    </Card>
  );
}
