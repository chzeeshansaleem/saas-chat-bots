'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function PdfUploadDropzone({ onUploaded }: { onUploaded?: () => void }) {
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [status, setStatus] = useState('');

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files[0] || !token || !tenantId) return;
      setStatus('Uploading...');
      const form = new FormData();
      form.append('file', files[0]);
      const response = await fetch(`${API_URL}/pdf/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
        body: form,
      });
      setStatus(response.ok ? 'Queued for PDF processing' : 'PDF upload failed');
      if (response.ok) onUploaded?.();
    },
    [onUploaded, tenantId, token],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center"
    >
      <input {...getInputProps()} />
      <FileUp className="h-8 w-8 text-primary" />
      <p className="mt-4 text-sm font-medium">{isDragActive ? 'Drop PDF here' : 'Drop a PDF file'}</p>
      <p className="mt-1 text-xs text-muted-foreground">PDF only, 20 MB maximum</p>
      <Button className="mt-5" type="button">Choose PDF</Button>
      {status && <p className="mt-4 text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
