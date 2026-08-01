import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-card border border-card-border rounded-lg p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </p>
          <p className="text-3xl font-bold font-mono tracking-tight">
            {value}
          </p>
          {trend && (
            <p className="text-xs text-muted-foreground font-mono">
              {trend}
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-md bg-primary/10">
          <Icon size={20} className="text-primary" />
        </div>
      </div>
    </div>
  );
}
