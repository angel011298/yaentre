import Link from 'next/link';
import { CelebrationDisplay } from '@/components/gamification/CelebrationDisplayLazy';
import { Chilo } from '@/components/mascot/Chilo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { FinishSessionResult } from '@/lib/db/sessions';
import { drillSummary } from '@/lib/chilo/copy';

/**
 * Resumen al terminar una sesión de práctica (F14 tarea 8; Flujo_App §7:
 * "Resumen de la sesión (aciertos, tiempo, temas)"). Los temas débiles y la
 * racha YA se actualizaron — `finishSession` (reusado, sin cambios) disparó
 * `onSessionFinished` antes de que este resumen se muestre. `result.celebration`
 * (F15) es la única celebración grande de esta sesión, ya decidida server-side.
 */
export function DrillSummary({
  result,
  onPracticeAgain,
}: {
  result: FinishSessionResult;
  onPracticeAgain: () => void;
}) {
  const total = result.answers.length;
  const correct = result.answers.filter((a) => a.isCorrect).length;
  const minutes = Math.max(1, Math.round(result.elapsedSecs / 60));
  const fraction = total > 0 ? correct / total : 0;
  const line = drillSummary(fraction);

  return (
    <div className="mx-auto max-w-md space-y-6 py-6 text-center">
      <div className="flex flex-col items-center gap-3">
        {/* Si hay celebración, la mascota sale ahí: una sola aparición por pantalla. */}
        {!result.celebration && (
          <Chilo pose={line.pose} size={52} animacion={line.pose === 'lapiz' ? 'acierto' : 'entrada'} />
        )}
        <h1 className="font-display text-xl font-bold text-text-primary">
          Terminaste tu práctica
        </h1>
      </div>

      {result.celebration && <CelebrationDisplay celebration={result.celebration} />}

      <Card className="space-y-1 p-5">
        <p className="font-display text-3xl font-bold text-text-primary">
          {correct}/{total}
        </p>
        <p className="text-sm text-text-secondary">
          {minutes} {minutes === 1 ? 'minuto' : 'minutos'} de práctica
        </p>
      </Card>

      <p className="text-sm text-text-secondary">{line.message}</p>

      <div className="space-y-2">
        <Button variant="primary" className="w-full" onClick={onPracticeAgain}>
          Practicar otra vez
        </Button>
        <Link href="/app">
          <Button variant="secondary" className="w-full">
            Ir a mi tablero
          </Button>
        </Link>
      </div>
    </div>
  );
}
