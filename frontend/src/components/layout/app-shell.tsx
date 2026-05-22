'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Bot,
  Database,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Moon,
  Plug,
  Settings,
  Sun,
  Upload,
  Webhook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/knowledge', label: 'Sources', icon: Database },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/dashboard/crawl-jobs', label: 'Crawl Jobs', icon: Database },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/custom-api', label: 'Custom API', icon: GitBranch },
  { href: '/dashboard/action-logs', label: 'Action Logs', icon: ListChecks },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card md:block">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Knowledge Chat</span>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                  (path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href))) && 'bg-muted text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs text-muted-foreground">Tenant workspace</p>
            <TenantBadge />
          </div>
          <div className="flex items-center gap-2">
            <Button className="h-9 w-9 px-0" title="Toggle theme" onClick={() => setDark((value) => !value)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              className="h-9 w-9 bg-muted px-0 text-foreground"
              title="Log out"
              onClick={() => {
                logout();
                router.push('/auth/login');
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

function TenantBadge() {
  const tenantId = useAuthStore((state) => state.tenantId);
  return <p className="text-sm font-medium">{tenantId ? tenantId.slice(0, 8) : 'No tenant selected'}</p>;
}
