import * as React from 'react';
import { cn } from '@/lib/utils';

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-20 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary',
        props.className,
      )}
    />
  );
}
