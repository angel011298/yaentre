import { LinkButton } from '@/components/ui/LinkButton';
import { Tino } from '@/components/mascot/Tino';

/**
 * Mensaje de posicionamiento (F10 Task 1): YaEntre no es un curso de videos —
 * es un entrenador que sabe exactamente qué le falta al alumno y lo pone a
 * practicar en el examen real antes del examen real.
 */
export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand">
            🦉 Tu entrenador de admisión con IA
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-text-primary sm:text-5xl">
            No es otro curso con videos.
            <br />
            Es un entrenador que sabe <span className="text-brand">exactamente</span> qué te falta.
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-text-secondary lg:mx-0">
            YaEntre detecta tus temas débiles con inteligencia artificial y te pone a practicar en
            el simulador del examen en línea real — para que el día del examen no sea la primera
            vez que lo vives.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <LinkButton href="/registro" variant="primary" className="px-8 py-3 text-base">
              Empieza gratis
            </LinkButton>
            <LinkButton href="/precios" variant="secondary" className="px-8 py-3 text-base">
              Ver planes y precios
            </LinkButton>
          </div>
          <p className="text-sm text-text-muted">
            Sin tarjeta para empezar · Diagnóstico y 1 simulacro completo gratis
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-72 w-72 items-center justify-center rounded-full bg-brand-tint sm:h-80 sm:w-80">
            <div className="absolute inset-4 rounded-full border-4 border-dashed border-brand-soft/40" />
            <div className="flex flex-col items-center gap-2">
              <Tino state="graduated" size={140} />
              <p className="font-display text-sm font-bold text-brand">Entrómetro activo</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
