import Link from 'next/link';
import { Tino } from '@/components/mascot/Tino';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { FinishSessionResult } from '@/lib/db/sessions';

/**
 * Resumen al terminar una sesión de práctica (F14 tarea 8; Flujo_App §7:
 * "Resumen de la sesión (aciertos, tiempo, temas)"). Los temas débiles y la
 * racha YA se actualizaron — `finishSession` (reusado, sin cambios) disparó
 * `onSessionFinished` antes de que este resumen se muestre.
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

  return (
    <div className="mx-auto max-w-md space-y-6 py-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Tino state={correct / total >= 0.7 ? 'celebrating' : 'encouraging'} size={64} />
        <h1 className="font-display text-xl font-bold text-text-primary">
          Terminaste tu práctica
        </h1>
      </div>

      <Card className="space-y-1 p-5">
        <p className="font-display text-3xl font-bold text-text-primary">
          {correct}/{total}
        </p>
        <p className="text-sm text-text-secondary">
          {minutes} {minutes === 1 ? 'minuto' : 'minutos'} de práctica
        </p>
      </Card>

      <p className="text-sm text-text-secondary">
        Ya actualizamos tus temas débiles y tu racha del día. 🔥
      </p>

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
