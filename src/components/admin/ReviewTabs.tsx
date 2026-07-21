import Link from 'next/link';
import {
  REVIEW_QUEUE_LABELS,
  REVIEW_QUEUE_ORDER,
  type ReviewQueueKind,
} from '@/lib/admin/verification';

const TAB_STYLES: Record<ReviewQueueKind, string> = {
  discrepancy: 'border-danger text-danger',
  low_confidence: 'border-warning text-warning',
  degraded_audit: 'border-brand text-brand',
};

interface Props {
  active: ReviewQueueKind;
  counts: Record<ReviewQueueKind, number>;
  basePath: string;
  /** Filtros de taxonomía activos, para preservarlos al cambiar de pestaña. */
  extraParams?: Record<string, string | undefined>;
}

/** Navegación entre las 3 colas de revisión (F3), con conteos como badges. */
export function ReviewTabs({ active, counts, basePath, extraParams }: Props) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border-subtle" role="tablist">
      {REVIEW_QUEUE_ORDER.map((kind) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(extraParams ?? {})) {
          if (value) params.set(key, value);
        }
        params.set('kind', kind);
        const isActive = kind === active;

        return (
          <Link
            key={kind}
            href={`${basePath}?${params.toString()}`}
            role="tab"
            aria-selected={isActive}
            className={`min-h-touch inline-flex items-center gap-2 border-b-2 px-3 pb-2 text-sm font-medium transition-all ${
              isActive
                ? TAB_STYLES[kind]
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {REVIEW_QUEUE_LABELS[kind]}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isActive ? 'bg-current/15' : 'bg-elevated text-text-muted'
              }`}
            >
              {counts[kind]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
