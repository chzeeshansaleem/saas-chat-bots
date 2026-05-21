export function SourceReferences({ sources }: { sources?: unknown[] }) {
  if (!sources?.length) return null;

  return (
    <div className="mt-3 space-y-1 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Sources</p>
      {sources.slice(0, 4).map((source, index) => {
        const item = source as { title?: string; uri?: string; similarity?: number };
        return (
          <p key={`${item.uri || item.title || index}`} className="truncate text-xs text-muted-foreground">
            [{index + 1}] {item.title || item.uri || 'Source'}
          </p>
        );
      })}
    </div>
  );
}
