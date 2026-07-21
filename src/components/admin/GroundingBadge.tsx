import type { GroundingStatus } from '@prisma/client';

const CONFIG: Record<GroundingStatus, { label: string; className: string }> = {
  SOURCED: {
    label: '⚓ Con fuente real',
    className: 'border-info/30 bg-info/10 text-info',
  },
  TEMARIO_ONLY: {
    label: '📖 Solo temario',
    className: 'border-warning/30 bg-warning/10 text-warning',
  },
};

/**
 * Estado de anclaje del reactivo (F2b): si cita un fragmento real de un
 * documento fuente (SOURCED) o solo se apoyó en el temario oficial
 * (TEMARIO_ONLY). Ninguno de los dos bloquea publicación — es informativo.
 */
export function GroundingBadge({
  status,
  className = '',
}: {
  status: GroundingStatus;
  className?: string;
}) {
  const cfg = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
