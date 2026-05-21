import { ChatDashboard } from '@/components/chat/chat-dashboard';
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardChatSessionPage({ params }: { params: { chatId: string } }) {
  return (
    <AppShell>
      <ChatDashboard chatId={params.chatId} />
    </AppShell>
  );
}
