import { postponeDiagnosticAction, startDiagnosticAction } from '@/app/actions/onboarding';
import { Tino } from '@/components/mascot/Tino';
import { Button } from '@/components/ui/Button';

export function DiagnosticIntroStep({ careerName }: { careerName: string | null }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Tino state="encouraging" size={140} />

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">
          {careerName ? `¡Listo para ${careerName}!` : '¡Ya casi terminamos!'}
        </h1>
        <p className="max-w-sm text-sm text-text-secondary">
          Voy a hacerte <span className="font-semibold text-text-primary">30 preguntas</span> para
          saber en qué estás fuerte y en qué te ayudo. No te preocupes por fallar — justo para eso
          es. Toma unos <span className="font-semibold text-text-primary">45 minutos</span> y puedes
          pausarlo cuando quieras.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <form action={startDiagnosticAction} className="w-full">
          <Button type="submit" variant="primary" className="w-full">
            Empezar diagnóstico
          </Button>
        </form>
        <form action={postponeDiagnosticAction} className="w-full">
          <Button type="submit" variant="ghost" className="w-full">
            Ahora no, hacerlo después
          </Button>
        </form>
      </div>
    </div>
  );
}
