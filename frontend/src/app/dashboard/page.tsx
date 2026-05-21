'use client';

import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/dashboard/stat-card';

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Knowledge readiness and chatbot activity for the current tenant.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Knowledge sources" value="Phase 1" />
        <StatCard label="Indexing pipeline" value="BullMQ" />
        <StatCard label="Retrieval mode" value="RAG" />
      </div>
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">System flow</h2>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
          <p>Upload or crawl</p>
          <p>Extract and chunk</p>
          <p>Embed into pgvector</p>
          <p>Stream grounded answers</p>
        </div>
      </section>
    </AppShell>
  );
}
