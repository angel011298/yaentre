import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getOfficialSampleSource } from '@/lib/db/content-sources';

/**
 * Detalle de un examen muestra oficial (CC-25). Embebe/enlaza el PDF público
 * de la institución tal cual — Acierta NUNCA recaptura estas preguntas como
 * reactivos interactivos propios. `Question.usage = CALIBRATION_ONLY` (ver
 * src/lib/db/question-read.ts, CC-01c) ya garantiza esto a nivel de query:
 * ningún reactivo oficial usado para calibrar el generador llega a un
 * usuario. Esta pantalla es la vía LEGÍTIMA de mostrarle a un aspirante el
 * examen muestra real — apuntando al documento oficial, no reconstruyéndolo.
 *
 * TODO-LEGAL: si en el futuro se quiere una variante interactiva nativa
 * (reactivo por reactivo, con opciones clickeables dentro de la app) de
 * estas preguntas oficiales, requiere validación legal antes de reproducir
 * preguntas oficiales en el producto de pago — no implementar sin ese visto
 * bueno explícito. Ver docs/FUENTES_ADICIONALES.md y docs/EXTRACCION_*.md
 * para el estado de licencia de cada fuente.
 */
export default async function OfficialSampleDetailPage({
  params,
}: {
  params: Promise<{ externalRef: string }>;
}) {
  const { externalRef } = await params;
  const source = await getOfficialSampleSource(externalRef);

  if (!source) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/app/examen-oficial" className="text-sm text-brand-soft hover:underline">
        ← Volver a exámenes muestra oficiales
      </Link>

      <div className="space-y-2">
        <span className="inline-flex w-fit items-center rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand">
          {source.institution}
        </span>
        <h1 className="font-display text-2xl font-bold text-text-primary">{source.name}</h1>
      </div>

      <Card className="space-y-2 p-5">
        <p className="text-sm text-text-primary">
          Este es el examen muestra oficial publicado por <strong>{source.institution}</strong>.
          Acierta te lo acerca; el material es propiedad de {source.institution}.
        </p>
        {source.license && (
          <p className="text-xs text-text-muted">{source.license}</p>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <iframe
          src={source.fileUrl}
          title={source.name}
          className="h-[75vh] w-full"
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <a
          href={source.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-soft hover:underline"
        >
          Abrir en una pestaña nueva ↗
        </a>
        <span className="text-text-muted">
          {source.type === 'MEDIA_SUPERIOR' ? 'Media Superior' : 'Superior'}
          {source.year ? ` · ${source.year}` : ''}
        </span>
      </div>

      <Card className="space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          ¿Quieres practicar ilimitado con reactivos del mismo nivel?
        </h2>
        <p className="text-sm text-text-secondary">
          Este examen es un solo intento fijo. Un simulacro Acierta te da reactivos
          nuevos cada vez, cronometrado igual que el examen real, con
          retroalimentación inmediata.
        </p>
        <Link
          href="/simulador"
          className="inline-flex min-h-touch w-fit items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-hover hover:shadow-lg active:scale-[0.97]"
        >
          Hacer un simulacro Acierta →
        </Link>
      </Card>
    </div>
  );
}
