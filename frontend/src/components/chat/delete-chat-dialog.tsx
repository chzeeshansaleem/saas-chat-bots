'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export function DeleteChatDialog({ title, onDelete }: { title: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="h-8 w-8 bg-destructive px-0 text-white"
        title="Delete chat"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Modal open={open} title="Delete Chat" description={`"${title}" will be hidden from your active chat list.`} onClose={() => setOpen(false)}>
        <div className="flex justify-end gap-2">
          <Button type="button" className="bg-muted text-foreground" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-destructive text-white"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
