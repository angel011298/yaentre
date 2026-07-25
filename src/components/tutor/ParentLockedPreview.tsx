import { Card } from '@/components/ui/Card';

/**
 * Vista bloqueada del panel parental (F16 tarea 5): el alumno vinculado
 * existe, pero no tiene Pase de Temporada ni Premium (`evaluateParentDashboardGate`,
 * F9 — Mensual NO alcanza). No hay botón de "comprar" aquí: el plan se activa
 * desde la cuenta del alumno, no desde la del tutor.
 */
export function ParentLockedPreview({ studentName }: { studentName: string }) {
  return (
    <Card className="space-y-4 p-8 text-center">
      <p className="text-3xl">🔒</p>
      <h2 className="font-display text-lg font-bold text-text-primary">
        El panel completo está bloqueado
      </h2>
      <p className="mx-auto max-w-sm text-sm text-text-secondary">
        Para ver el progreso de <strong className="text-text-primary">{studentName}</strong>{' '}
        necesita el Pase de Temporada o Premium (el plan Mensual no incluye el panel parental).
        Pídele que lo active desde su cuenta en acierta.mx.
      </p>
    </Card>
  );
}
