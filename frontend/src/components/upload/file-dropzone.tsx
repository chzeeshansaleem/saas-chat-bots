'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type FileSource = {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'TXT' | 'WEBSITE';
  status: string;
  filePath?: string;
};

export function FileDropzone() {
  const [status, setStatus] = useState('');
  const [sources, setSources] = useState<FileSource[]>([]);
  const token = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);

  const loadSources = useCallback(async () => {
    if (!token || !tenantId) return;
    const loaded = await api<FileSource[]>('/knowledge/sources', { token, tenantId });
    setSources(loaded.filter((source) => source.type !== 'WEBSITE'));
  }, [tenantId, token]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files[0] || !token || !tenantId) return;
      setStatus('Uploading...');
      const formData = new FormData();
      formData.append('file', files[0]);
      const response = await fetch(`${API_URL}/knowledge/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
        body: formData,
      });
      setStatus(response.ok ? 'Queued for processing' : 'Upload failed');
      if (response.ok) await loadSources();
    },
    [loadSources, tenantId, token],
  );

  async function deleteSource(sourceId: string) {
    if (!token || !tenantId) return;
    await api('/knowledge/sources/' + sourceId, { method: 'DELETE', token, tenantId });
    await loadSources();
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 20 * 1024 * 1024,
  });

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center"
      >
        <input {...getInputProps()} />
        <FileUp className="h-8 w-8 text-primary" />
        <p className="mt-4 text-sm font-medium">{isDragActive ? 'Drop to upload' : 'Drop PDF, DOCX, or TXT files'}</p>
        <p className="mt-1 text-xs text-muted-foreground">20 MB maximum file size</p>
        <Button className="mt-5" type="button">Choose file</Button>
        {status && <p className="mt-4 text-sm text-muted-foreground">{status}</p>}
      </div>
      <div className="grid gap-3">
        {sources.map((source) => (
          <Card key={source.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">{source.name}</p>
              <p className="text-xs text-muted-foreground">{source.type} · {source.status}</p>
            </div>
            <Button className="h-9 w-9 bg-destructive px-0 text-white" title="Delete file source" onClick={() => deleteSource(source.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
