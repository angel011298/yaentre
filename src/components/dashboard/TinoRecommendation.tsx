import { Tino } from '@/components/mascot/Tino';
import type { WeakTopicSummary } from '@/lib/db/dashboard';

/**
 * Burbuja de Tino (F11 Task 3): recomienda el tema MÁS débil real del
 * alumno — no hay mensaje genérico de respaldo. Si todavía no hay ningún
 * tema débil identificado (sin diagnóstico, o va muy bien en todo), esta
 * burbuja simplemente no se muestra — la página cubre ese caso con un
 * `EmptyState` distinto, no con un texto inventado aquí.
 */
export function TinoRecommendation({ weakestTopic }: { weakestTopic: WeakTopicSummary }) {
  const pct = Math.round(weakestTopic.hitRate * 100);

  return (
    <div className="flex items-start gap-3 rounded-lg bg-brand-tint p-4">
      <Tino state="encouraging" size={48} />
      <p className="text-sm leading-relaxed text-text-primary">
        <strong className="font-display">Tino recomienda:</strong> hoy enfócate en{' '}
        <strong>{weakestTopic.topicName}</strong> ({weakestTopic.subjectName}) — llevas {pct}% de
        dominio ahí, es donde más rápido vas a subir tu Aciertómetro.
      </p>
    </div>
  );
}
