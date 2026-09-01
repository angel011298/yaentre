import Link from 'next/link';
import { DrillApp } from '@/components/drill/DrillApp';
import { Tino } from '@/components/mascot/Tino';
import { requireOnboarding } from '@/lib/auth/guards';
import * as drillDb from '@/lib/db/drill';
import { noTargetChosen } from '@/lib/tino/copy';

/**
 * Ruta de práctica libre (F14). Vive DENTRO del grupo (app) a propósito —
 * a diferencia del simulador (F12), el drill SÍ es parte de la experiencia
 * cálida cotidiana: conserva Sidebar/BottomNav/TopBar. Server Component:
 * resuelve primero si hay una sesión IN_PROGRESS que retomar; si no, arma el
 * selector con las materias/temas reales del área del alumno y su cupo
 * gratuito restante del día (F9).
 */
export default async function PracticarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireOnboarding();

  // G62 (rendimiento): antes estos tres loaders se hacían en serie —
  // `loadDrillState` → `loadPracticeOptions` → `evaluateDrillAccess` —, ~3 s
  // apilados desde una máquina lejos de la base (LCP de `/practicar` en ~4,6 s).
  // El caso "hay sesión activa" es raro; se resuelven los tres en paralelo y
  // se descartan `options`/`access` si resultó que había una sesión en curso.
  const [state, options, access] = await Promise.all([
    drillDb.loadDrillState(profile.id),
    drillDb.loadPracticeOptions(profile.id),
    drillDb.evaluateDrillAccess(profile.id),
  ]);

  if (state.kind === 'active') {
    return <DrillApp initial={{ kind: 'active', payload: state.payload }} />;
  }

  if (!options) return <NoTargetMessage />;

  // Deep link desde "reforzar hoy" del dashboard (F11 WeakTopicCard): arranca
  // directo esa práctica sin pasar por el selector. `subjectId` es el mismo
  // patrón para el CTA "Practicar" de la pantalla de progreso (F18).
  const sp = await searchParams;
  const topicId = typeof sp.topicId === 'string' ? sp.topicId : undefined;
  const validTopicId = topicId && options.subjects.some((s) => s.topics.some((t) => t.topicId === topicId))
    ? topicId
    : undefined;
  const subjectId = typeof sp.subjectId === 'string' ? sp.subjectId : undefined;
  const validSubjectId = subjectId && options.subjects.some((s) => s.subjectId === subjectId)
    ? subjectId
    : undefined;

  const autoStartScope = validTopicId
    ? { kind: 'topic' as const, topicId: validTopicId }
    : validSubjectId
      ? { kind: 'subject' as const, subjectId: validSubjectId }
      : undefined;

  return (
    <DrillApp
      initial={{
        kind: 'selecting',
        options,
        remainingToday: access.remainingToday,
        autoStartScope,
      }}
    />
  );
}

function NoTargetMessage() {
  const copy = noTargetChosen('practicar');
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Tino state={copy.state} size={72} />
      <h1 className="font-display text-xl font-bold text-text-primary">
        Primero elige tu examen
      </h1>
      <p className="text-sm text-text-secondary">{copy.message}</p>
      <Link href="/onboarding" className="font-semibold text-brand-soft hover:underline">
        Completar mi perfil
      </Link>
    </div>
  );
}
