import { Card } from '@/components/ui/Card';

const BADGE_LABELS: Record<string, string> = {
  EARLY_BIRD: '🏅 Fundador Early Bird',
};

/**
 * Insignias del perfil (F17 tarea 2): las de "materia dominada" (F15,
 * `MATERIA_DOMINADA:<subjectId>` en `UserProfile.badges`) ya vienen con el
 * nombre de materia resuelto por `loadMasteredSubjectBadges`; el resto
 * (por ahora solo EARLY_BIRD, F8) se muestra con una etiqueta fija.
 */
export function ProfileBadges({
  masteredSubjects,
  otherBadges,
}: {
  masteredSubjects: { subjectId: string; subjectName: string }[];
  otherBadges: string[];
}) {
  const hasAny = masteredSubjects.length > 0 || otherBadges.length > 0;

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-text-primary">Insignias</p>
      {!hasAny ? (
        <p className="mt-1 text-sm text-text-secondary">Todavía no tienes insignias — sigue estudiando.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {otherBadges.map((b) => (
            <li
              key={b}
              className="rounded-full border border-brand bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand"
            >
              {BADGE_LABELS[b] ?? b}
            </li>
          ))}
          {masteredSubjects.map((s) => (
            <li
              key={s.subjectId}
              className="rounded-full border border-brand bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand"
            >
              🎓 {s.subjectName}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
