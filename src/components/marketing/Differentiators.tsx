import { Card } from '@/components/ui/Card';
import { Chilo } from '@/components/mascot/Chilo';
import type { ChiloPose } from '@/lib/brand/chilo-geometry';
import type { MarketplaceFlags } from '@/lib/marketplace/flags';

interface Differentiator {
  pose: ChiloPose;
  title: string;
  description: string;
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    pose: 'reloj',
    title: 'Simulador del examen en línea',
    description:
      'Réplica fiel de la plataforma real de tu examen: mismo formato, mismo timer, misma presión. Nada de sorpresas el día del examen.',
  },
  {
    pose: 'calc',
    title: 'Entrómetro',
    description:
      'Predice cuántos aciertos vas a sacar, actualizado después de cada sesión, comparado contra la meta real de tu carrera.',
  },
  {
    pose: 'pensando',
    title: 'Ruta de estudio personalizada',
    description:
      'El motor detecta tus temas débiles y prioriza tu práctica ahí — no repites lo que ya dominas.',
  },
  {
    pose: 'libro',
    title: 'Panel para padres',
    description:
      'Ve el progreso real de tu hijo desde tu propio celular: sesiones de estudio, avance por materia, sin tener que preguntar.',
  },
];

/**
 * G103 (spec de temporalidad §4.3) — «Practicar > ver videos»: comparativo, no
 * excluyente. Jerarquía obligatoria: práctica primero; las clases y los cursos
 * son el complemento y SOLO se mencionan si existen (sus banderas encendidas):
 * anunciar clases sin un solo profesor dado de alta sería ofrecer algo que no
 * existe. Lenguaje obligatorio: «profesores independientes verificados en
 * YaEntre», nunca «nuestros profesores».
 */
export function complementSentence(flags: Pick<MarketplaceFlags, 'liveClasses' | 'courses'>): string | null {
  if (flags.liveClasses && flags.courses) {
    return 'Y si necesitas reforzar un tema, tienes clases con profesores independientes verificados en YaEntre y cursos a tu ritmo.';
  }
  if (flags.liveClasses) {
    return 'Y si necesitas reforzar un tema, tienes clases con profesores independientes verificados en YaEntre.';
  }
  if (flags.courses) return 'Y si necesitas reforzar un tema, tienes cursos a tu ritmo.';
  return null;
}

export function Differentiators({ flags }: { flags: Pick<MarketplaceFlags, 'liveClasses' | 'courses'> }) {
  const complement = complementSentence(flags);
  return (
    <section className="bg-elevated py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-text-primary">
            Practicar {'>'} ver videos
          </h2>
          <p className="mt-3 font-semibold text-text-primary">Los videos explican. YaEntre te entrena.</p>
          <p className="mt-2 text-text-secondary">
            Nuestro simulador replica el examen real. El Entrómetro te dice en qué materia
            enfocarte.{complement ? ` ${complement}` : ''}
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {DIFFERENTIATORS.map((item) => (
            <Card key={item.title} className="flex gap-4 p-6">
              <Chilo pose={item.pose} size={48} animacion="ninguna" />
              <div>
                <h3 className="font-display text-lg font-bold text-text-primary">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
