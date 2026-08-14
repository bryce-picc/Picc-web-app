import { AlertCircle, CheckCircle2, ChevronDown, Clock3, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import type { RuntimeFreshness } from '@/lib/runtime/account-contact-contract';
import { buildFreshnessDisclosure } from '@/lib/ui/data-freshness-presentation';
import { cn } from '@/lib/utils';

function stateTone(state: RuntimeFreshness['state']) {
  if (state === 'fresh') {
    return {
      icon: CheckCircle2,
      badge: 'success' as const,
      label: 'Fresh',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100',
    };
  }

  if (state === 'syncing') {
    return {
      icon: Loader2,
      badge: 'warning' as const,
      label: 'Syncing',
      className: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
    };
  }

  if (state === 'error') {
    return {
      icon: AlertCircle,
      badge: 'danger' as const,
      label: 'Sync issue',
      className: 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100',
    };
  }

  return {
    icon: Clock3,
    badge: 'warning' as const,
    label: state === 'stale' ? 'Stale' : 'Unknown',
    className: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100',
  };
}

export function DataFreshnessBadge({ freshness }: { freshness: RuntimeFreshness }) {
  const tone = stateTone(freshness.state);

  return (
    <Badge variant={tone.badge} title={`${freshness.label}: ${freshness.detail}`}>
      {tone.label}
    </Badge>
  );
}

export function DataFreshnessBanner({
  freshness,
  action,
  compact = false,
  className,
}: {
  freshness: RuntimeFreshness;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const tone = stateTone(freshness.state);
  const Icon = tone.icon;
  const disclosure = buildFreshnessDisclosure(freshness);

  return (
    <details
      className={cn(
        'group rounded-lg border text-sm shadow-[0_1px_2px_rgba(24,33,45,0.04)]',
        tone.className,
        compact ? null : 'sm:max-w-2xl',
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276fd3] focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <Icon className={cn('h-4 w-4 shrink-0', freshness.state === 'syncing' ? 'animate-spin' : null)} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">{disclosure.lastSyncLabel}</span>
        <span className="hidden text-xs opacity-70 sm:inline">{disclosure.label}</span>
        <span className="hidden shrink-0 sm:block">
          <DataFreshnessBadge freshness={freshness} />
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>

      <div className="border-t border-current/15 px-3 pb-3 pt-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{disclosure.label}</span>
              <span className="text-xs opacity-75">{disclosure.relativeAge}</span>
            </div>
            <p className="mt-1 leading-5 opacity-85">{disclosure.detail}</p>
            <p className="mt-1 text-xs opacity-70">
              {disclosure.recordsLabel}
              {disclosure.error ? ` · ${disclosure.error}` : ''}
            </p>
          </div>
        </div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </details>
  );
}
