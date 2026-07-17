import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { listOfficialSampleSources } from '@/lib/db/content-sources';

/**
 * "Examen muestra oficial" (CC-25) — enlaza el material oficial publicado
 * por cada institución (guía + examen muestra en PDF), con atribución
 * visible. NUNCA recaptura las preguntas oficiales como contenido
 * interactivo de la app — ver TODO-LEGAL en [externalRef]/page.tsx.
 */
export default async function OfficialSampleIndexPage() {
  const sources = await listOfficialSampleSources();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Examen muestra oficial</h1>
        <p className="text-text-secondary">
          Practica con el examen muestra tal como lo publica cada institución — el
          material completo, con atribución clara. Acierta no modifica ni reproduce
          estas preguntas como contenido propio.
        </p>
      </div>

      {sources.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          No hay material oficial disponible todavía. Vuelve pronto.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sources.map((source) => (
            <Link key={source.externalRef} href={`/app/examen-oficial/${source.externalRef}`}>
              <Card className="flex h-full flex-col gap-2 p-5">
                <span className="inline-flex w-fit items-center rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {source.institution}
                </span>
                <h2 className="font-display text-lg font-semibold text-text-primary">
                  {source.name}
                </h2>
                <p className="text-sm text-text-muted">
                  {source.type === 'MEDIA_SUPERIOR' ? 'Media Superior' : 'Superior'}
                  {source.year ? ` · ${source.year}` : ''} · Material oficial de uso público
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          ¿Quieres practicar ilimitado con reactivos del mismo nivel?
        </h2>
        <p className="text-sm text-text-secondary">
          El examen muestra oficial es un solo intento fijo. Un simulacro Acierta te
          da reactivos nuevos cada vez, cronometrados igual que el examen real, con
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
