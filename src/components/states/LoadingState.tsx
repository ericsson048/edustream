import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './Skeleton';

interface LoadingStateProps {
  /** 'skeleton' reproduces the final layout, 'spinner' shows a centered loader. */
  mode?: 'skeleton' | 'spinner';
  label?: string;
  /** Number of skeleton rows rendered in 'skeleton' mode. */
  rows?: number;
  className?: string;
}

export function LoadingState({ mode = 'skeleton', label, rows = 3, className }: LoadingStateProps) {
  if (mode === 'spinner') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 py-20', className)}>
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        {label && <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)} aria-busy="true" aria-label={label ?? 'Loading'}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4"
          >
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
