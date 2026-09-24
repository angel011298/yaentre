import Link from 'next/link';
import { Card } from '@/components/ui/Card';

/**
 * Sección para padres (F10 Task 1) — exactamente los 3 ángulos pedidos, sin
 * inventar otros:
 *  (a) la angustia de asegurar el lugar en la institución que SÍ quiere,
 *      no cualquier lugar;
 *  (b) visibilidad del avance real desde el celular del padre;
 *  (c) precio claro: un solo pago con vigencia hasta el examen, sin cobros
 *      recurrentes que sorprendan.
 *
 * Bloque 1 (handoff §3.2 y guardrails §8): se retiró el ángulo de «garantía de
 * reembolso» — el producto ya no ofrece garantía de ingreso de ningún tipo, y
 * la palabra «garantía» se elimina de todo el copy.
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
            <p className="text-2xl">🧾</p>
            <h3 className="mt-2 font-display text-lg font-bold text-text-primary">
              Precio claro, sin sorpresas
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Los planes <strong className="text-text-primary">Básico</strong> y{' '}
              <strong className="text-text-primary">Premium</strong> son un solo pago con vigencia
              hasta el día del examen — sin cobros recurrentes que recordar ni cancelar.
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
