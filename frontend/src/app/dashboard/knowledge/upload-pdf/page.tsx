'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PdfUploadDropzone } from '@/components/knowledge/pdf-upload-dropzone';

export default function UploadPdfPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Upload PDF</h1>
        <p className="mt-1 text-sm text-muted-foreground">PDF text is extracted, chunked, embedded, and attached to this tenant.</p>
      </div>
      <PdfUploadDropzone onUploaded={() => router.push('/dashboard/knowledge')} />
    </AppShell>
  );
}
