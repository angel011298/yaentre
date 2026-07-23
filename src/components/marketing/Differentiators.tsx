import { Card } from '@/components/ui/Card';
import { Tino, type TinoState } from '@/components/mascot/Tino';

interface Differentiator {
  tino: TinoState;
  title: string;
  description: string;
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    tino: 'attentive',
    title: 'Simulador del examen en línea',
    description:
      'Réplica fiel de la plataforma real de tu examen: mismo formato, mismo timer, misma presión. Nada de sorpresas el día del examen.',
  },
  {
    tino: 'celebrating',
    title: 'Aciertómetro',
    description:
      'Predice cuántos aciertos vas a sacar, actualizado después de cada sesión, comparado contra la meta real de tu carrera.',
  },
  {
    tino: 'streak',
    title: 'Ruta de estudio personalizada',
    description:
      'El motor detecta tus temas débiles y prioriza tu práctica ahí — no repites lo que ya dominas.',
  },
  {
    tino: 'graduated',
    title: 'Panel para padres',
    description:
      'Ve el progreso real de tu hijo desde tu propio celular: sesiones de estudio, avance por materia, sin tener que preguntar.',
  },
];

export function Differentiators() {
  return (
    <section className="bg-elevated py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-text-primary">
            Todo lo que necesitas para entrar, en un solo lugar
          </h2>
          <p className="mt-3 text-text-secondary">
            No es contenido genérico — es un sistema que se adapta a ti.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {DIFFERENTIATORS.map((item) => (
            <Card key={item.title} className="flex gap-4 p-6">
              <Tino state={item.tino} size={56} />
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
