import { LatexText } from './LatexText';

/**
 * Pasaje de comprensión de lectura compartido (F2b/F3): el texto se muestra
 * UNA sola vez, arriba del reactivo que depende de él (el detalle admin
 * siempre renderiza un solo reactivo por página, así que no hay riesgo de
 * duplicarlo aunque el mismo pasaje tenga varias preguntas en el banco).
 */
export function PassageBlock({
  title,
  content,
  sourceRef,
}: {
  title: string | null;
  content: string;
  sourceRef: string | null;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border-subtle bg-elevated p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Texto de referencia{title ? ` — ${title}` : ''}
      </p>
      <div className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
        <LatexText text={content} />
      </div>
      {sourceRef && <p className="text-xs text-text-muted">Fuente: {sourceRef}</p>}
    </div>
  );
}
