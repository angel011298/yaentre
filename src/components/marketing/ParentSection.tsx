import Link from 'next/link';
import { Card } from '@/components/ui/Card';

/**
 * Sección para padres (F10 Task 1) — exactamente los 3 ángulos pedidos, sin
 * inventar otros:
 *  (a) la angustia de asegurar el lugar en la institución que SÍ quiere,
 *      no cualquier lugar;
 *  (b) visibilidad del avance real desde el celular del padre;
 *  (c) garantía de reembolso/repetición — aclarado que aplica SOLO a Premium.
 */
export function ParentSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-text-primary">
            Para el padre o madre que va a pagarlo
          </h2>
          <p className="mt-3 text-text-secondary">
            Hoy casi todos los aspirantes consiguen un lugar en algún lado. El reto real es que tu
            hijo entre a la institución y la carrera que de verdad quiere.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <Card className="p-6">
            <p className="text-2xl">🎯</p>
            <h3 className="mt-2 font-display text-lg font-bold text-text-primary">
              No cualquier lugar — el lugar correcto
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Con cupo limitado en las mejores opciones, prepararse en serio es lo que separa
              &ldquo;quedar en algo&rdquo; de entrar a la carrera que tu hijo realmente eligió.
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-2xl">📱</p>
            <h3 className="mt-2 font-display text-lg font-bold text-text-primary">
              Ve el avance real, sin tener que preguntar
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              El panel parental te muestra cuánto está estudiando y en qué va mejorando — desde tu
              propio celular, cuando quieras verlo.
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-2xl">🛡️</p>
            <h3 className="mt-2 font-display text-lg font-bold text-text-primary">
              Garantía si no ingresa
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Con el plan <strong className="text-text-primary">Premium Garantía</strong>, si tu
              hijo no ingresa, te reembolsamos o repite el ciclo con nosotros. Esta garantía aplica
              únicamente al plan Premium.
            </p>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/registro?role=tutor"
            className="text-sm font-semibold text-brand hover:underline"
          >
            ¿Eres papá o mamá? Ve el progreso de tu hijo →
          </Link>
        </div>
      </div>
    </section>
  );
}
