import { AppShell } from '@/components/layout/app-shell';
import { FileDropzone } from '@/components/upload/file-dropzone';

export default function UploadPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Upload Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX, and TXT documents are processed in the background.</p>
      </div>
      <FileDropzone />
    </AppShell>
  );
}
