import { RotateCw, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  icon: Icon = TriangleAlert,
  title = 'Something went wrong',
  description,
  action,
  onRetry,
  retryLabel = 'Retry',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-20 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 flex items-center justify-center mb-4">
        <Icon size={20} />
      </div>
      <p className="text-slate-700 dark:text-slate-200 font-medium">{title}</p>
      {description && <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 max-w-sm">{description}</p>}
      {(onRetry || action) && (
        <div className="mt-5">
          {action ?? (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              {retryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
