/**
 * Insignias permanentes de "materia dominada" (F15 tarea 1). Sin página de
 * Perfil dedicada todavía en la app (el nav la deja `builtRoute:false`), así
 * que la insignia vive en el dashboard — el punto de partida diario — hasta
 * que exista esa pantalla.
 */
export function MasteredSubjectBadges({
  badges,
}: {
  badges: { subjectId: string; subjectName: string }[];
}) {
  if (badges.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Insignias</h2>
      <ul className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <li
            key={b.subjectId}
            className="flex items-center gap-2 rounded-full border border-brand bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand"
          >
            🎓 {b.subjectName}
          </li>
        ))}
      </ul>
    </section>
  );
}
