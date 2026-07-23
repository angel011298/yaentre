import Link from 'next/link';
import type { WeakTopicSummary } from '@/lib/db/dashboard';

/** Umbral bajo el cual el tema se marca como más urgente (rojo vs. ámbar). */
const URGENT_HIT_RATE = 0.4;

/**
 * Tarjeta "reforzar hoy" (F11 Task 6). El color refleja qué tan urgente es el
 * tema: por debajo de `URGENT_HIT_RATE` es rojo (muy débil), si no, ámbar
 * (débil pero no crítico) — ambos ya están por debajo del umbral de 0.60 que
 * los metió a `WeakTopic` en primer lugar (F6).
 *
 * El CTA apunta a `/app` (el propio dashboard) porque el Drill por tema (F14)
 * todavía no existe — mismo criterio ya usado en F7 para no dejar un link
 * roto a una pantalla que aún no se construye.
 */
export function WeakTopicCard({ topic }: { topic: WeakTopicSummary }) {
  const pct = Math.round(topic.hitRate * 100);
  const urgent = topic.hitRate < URGENT_HIT_RATE;

  return (
    <div className="flex min-w-[160px] flex-1 flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {topic.subjectName}
        </p>
        <p className="font-display font-semibold text-text-primary">{topic.topicName}</p>
      </div>

      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
          <div
            className={`h-full rounded-full ${urgent ? 'bg-danger' : 'bg-warning'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`text-sm font-semibold ${urgent ? 'text-danger' : 'text-warning'}`}>
          {pct}% de dominio
        </p>
      </div>

      <Link
        href="/app"
        className="mt-auto inline-flex min-h-touch items-center justify-center rounded-md border border-border-subtle bg-elevated px-3 py-2 text-sm font-semibold text-text-primary transition-all hover:bg-brand-tint hover:text-brand active:scale-[0.97]"
      >
        Practicar
      </Link>
    </div>
  );
}
