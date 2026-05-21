'use client';

import { FormEvent, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export function RenameChatDialog({ title, onRename }: { title: string; onRename: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(title);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    onRename(value.trim());
    setOpen(false);
  }

  return (
    <>
      <Button
        className="h-8 w-8 bg-muted px-0 text-foreground"
        title="Rename chat"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setValue(title);
          setOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Modal open={open} title="Rename Chat" description="Give this conversation a clear title." onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Input value={value} onChange={(event) => setValue(event.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" className="bg-muted text-foreground" onClick={() => setOpen(false)}>Cancel</Button>
            <Button>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
