import { CheckCircle2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface SuccessStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SuccessState({ icon: Icon = CheckCircle2, title, description, action, className }: SuccessStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-20 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mb-4">
        <Icon size={20} />
      </div>
      <p className="text-slate-700 dark:text-slate-200 font-medium">{title}</p>
      {description && <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
