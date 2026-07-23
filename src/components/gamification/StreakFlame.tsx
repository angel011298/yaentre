/** Contador de racha con llama (UIUX Spec §7.4 `StreakFlame`). Server-renderable
 *  — no necesita animación de cliente para mostrar el número correctamente. */
export function StreakFlame({ days }: { days: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-streak"
      title={`${days} ${days === 1 ? 'día' : 'días'} de racha`}
    >
      🔥 {days}
    </span>
  );
}
