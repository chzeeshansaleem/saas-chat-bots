'use client';

import { useState } from 'react';
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export function ArchiveChatButton({ title, onArchive }: { title: string; onArchive: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="h-8 w-8 bg-muted px-0 text-foreground"
        title="Archive chat"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Archive className="h-3.5 w-3.5" />
      </Button>
      <Modal open={open} title="Archive Chat" description={`Move "${title}" out of your active chat list.`} onClose={() => setOpen(false)}>
        <div className="flex justify-end gap-2">
          <Button type="button" className="bg-muted text-foreground" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onArchive();
              setOpen(false);
            }}
          >
            Archive
          </Button>
        </div>
      </Modal>
    </>
  );
}
