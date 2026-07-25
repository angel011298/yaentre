import Link from 'next/link';
import type { SubjectMastery } from '@/lib/db/progress';

const MASTERED_THRESHOLD = 0.85;
const WEAK_THRESHOLD = 0.6;

function tierClasses(hitRate: number, attempts: number): { bar: string; text: string; label: string } {
  if (attempts === 0) {
    return { bar: 'bg-border-strong', text: 'text-text-muted', label: 'Sin intentos todavía' };
  }
  if (hitRate >= MASTERED_THRESHOLD) {
    return { bar: 'bg-success', text: 'text-success', label: 'Dominada' };
  }
  if (hitRate < WEAK_THRESHOLD) {
    return { bar: 'bg-danger', text: 'text-danger', label: 'Débil' };
  }
  return { bar: 'bg-warning', text: 'text-warning', label: 'En progreso' };
}

/**
 * Dominio por materia, de más débil a más fuerte (F18 tarea 1). El color de
 * la barra refuerza la etiqueta de texto ("Débil"/"En progreso"/"Dominada")
 * — nunca es el único canal (UIUX Spec §12). El CTA lleva directo a una
 * sesión de drill filtrada por esa materia (mismo patrón que `WeakTopicCard`,
 * F11, extendido a `/practicar?subjectId=` en esta fase).
 */
export function SubjectMasteryList({ subjects }: { subjects: SubjectMastery[] }) {
  if (subjects.length === 0) return null;

  return (
    <ul className="divide-y divide-border-subtle">
      {subjects.map((s) => {
        const pct = Math.round(s.hitRate * 100);
        const tier = tierClasses(s.hitRate, s.attempts);
        return (
          <li key={s.subjectId} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold text-text-primary">{s.subjectName}</p>
                <p className={`shrink-0 text-sm font-semibold ${tier.text}`}>
                  {s.attempts > 0 ? `${pct}%` : '—'}
                </p>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-elevated">
                <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${Math.max(pct, s.attempts > 0 ? 4 : 0)}%` }} />
              </div>
              <p className={`mt-1 text-xs ${tier.text}`}>
                {tier.label}
                {s.attempts > 0 && !s.hasEnoughData ? ` · ${s.attempts} intento${s.attempts === 1 ? '' : 's'}` : ''}
              </p>
            </div>
            <Link
              href={`/practicar?subjectId=${s.subjectId}`}
              className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-md border border-border-subtle bg-elevated px-3 py-2 text-sm font-semibold text-text-primary transition-all hover:bg-brand-tint hover:text-brand active:scale-[0.97]"
            >
              Practicar
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
