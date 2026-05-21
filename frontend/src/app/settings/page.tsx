'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';

export default function SettingsPage() {
  const tenantId = useAuthStore((state) => state.tenantId);
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workspace identity and API context.</p>
      </div>
      <Card className="max-w-xl space-y-4 p-5">
        <label className="block text-sm">
          Tenant ID
          <Input className="mt-2" value={tenantId || ''} readOnly />
        </label>
        <label className="block text-sm">
          Allowed file types
          <Input className="mt-2" value="PDF, DOCX, TXT" readOnly />
        </label>
      </Card>
    </AppShell>
  );
}
