'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { AddWebsiteForm } from '@/components/knowledge/add-website-form';

export default function AddWebsitePage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Add Website</h1>
        <p className="mt-1 text-sm text-muted-foreground">Crawl same-domain public pages and index clean content for chat.</p>
      </div>
      <AddWebsiteForm onCreated={() => router.push('/dashboard/knowledge')} />
    </AppShell>
  );
}
