import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  online: boolean;
  loading?: boolean;
  className?: string;
}

export function StatusBadge({ online, loading = false, className }: StatusBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div 
        className={cn(
          'w-2 h-2 rounded-full',
          loading
            ? 'bg-muted-foreground animate-pulse'
            : online
              ? 'bg-[hsl(146,56%,42%)] animate-pulse-glow'
              : 'bg-[hsl(0,72%,51%)]'
        )}
      />
      <span className="text-xs font-mono font-medium">
        {loading ? 'CHECKING' : online ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  );
}
