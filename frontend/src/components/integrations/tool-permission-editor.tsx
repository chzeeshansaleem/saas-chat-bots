import { Card } from '@/components/ui/card';

export function ToolPermissionEditor() {
  return (
    <Card className="p-4 text-sm text-muted-foreground">
      Tool permission policies are role-based: admins can run write tools, members can run read tools. Extend this panel with per-tool overrides when plans require it.
    </Card>
  );
}
