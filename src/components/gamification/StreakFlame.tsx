import { Icon } from '@/components/ui/Icon';

/** Contador de racha con llama (UIUX Spec §7.4 `StreakFlame`). Server-renderable
 *  — no necesita animación de cliente para mostrar el número correctamente. */
export function StreakFlame({ days }: { days: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-accent-fg"
      title={`${days} ${days === 1 ? 'día' : 'días'} de racha`}
    >
      <Icon name="flame" className="h-4 w-4" />
      {days}
    </span>
  );
}
