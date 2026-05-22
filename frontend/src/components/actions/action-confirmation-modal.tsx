import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export function ActionConfirmationModal({
  open,
  title,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title="Confirm Action" description={title} onClose={onCancel}>
      <div className="flex justify-end gap-2">
        <Button className="bg-muted text-foreground" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}>Confirm</Button>
      </div>
    </Modal>
  );
}
