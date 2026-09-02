import Link from 'next/link';
import type { LinkedStudent } from '@/lib/db/parent';

/**
 * Selector entre alumnos vinculados (F16 tarea 6). Puros `<Link>` con
 * `?student=` — sin JS de cliente, navegación de página completa (tarea 7:
 * el navegador de Facebook no necesita ninguna API especial para esto).
 * Se oculta con un solo alumno vinculado (no hay nada que "cambiar").
 */
export function StudentSwitcher({
  students,
  selectedId,
}: {
  students: LinkedStudent[];
  selectedId: string;
}) {
  if (students.length <= 1) return null;

  return (
    <nav className="flex gap-2 overflow-x-auto" aria-label="Cambiar de alumno">
      {students.map((s) => (
        <Link
          key={s.studentProfileId}
          href={`/tutor?student=${s.studentProfileId}`}
          aria-current={s.studentProfileId === selectedId ? 'page' : undefined}
          className={`flex min-h-touch items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors ${
            s.studentProfileId === selectedId
              ? 'bg-brand text-white'
              : 'bg-elevated text-text-secondary hover:bg-brand-tint hover:text-brand'
          }`}
        >
          {s.displayName}
        </Link>
      ))}
    </nav>
  );
}
