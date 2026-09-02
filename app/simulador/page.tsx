import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SimulatorApp } from '@/components/simulator/SimulatorApp';
import { SimulatorResult } from '@/components/simulator/SimulatorResult';
import { SimulatorReview } from '@/components/simulator/SimulatorReview';
import { Tino } from '@/components/mascot/Tino';
import { AuthError } from '@/lib/auth/errors';
import { requireOnboarding } from '@/lib/auth/guards';
import * as sessionsDb from '@/lib/db/sessions';
import * as simulatorDb from '@/lib/db/simulator';
import { getStreak } from '@/lib/db/streak';
import { decodeCelebrationParam } from '@/lib/gamification/celebrations';
import { noTargetChosen } from '@/lib/tino/copy';

export const metadata = { title: 'Simulacro · YaEntre' };

/**
 * Ruta del simulador (F12). Vive FUERA del grupo (app) a propósito: sin la
 * barra lateral, sin la nav inferior, sin el TopBar — la pantalla es
 * deliberadamente aislada y seria (UIUX §13). Server Component: resuelve el
 * estado real (reanudar / resultados / entrada) sin confiar nunca en el
 * cliente, y aplica el muro suave (F9) antes de renderizar la entrada.
 */
export default async function SimuladorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let profileId: string;
  try {
    const { profile } = await requireOnboarding();
    profileId = profile.id;
  } catch (err) {
    if (err instanceof AuthError) redirect('/login?next=/simulador');
    throw err;
  }

  const sp = await searchParams;
  const view = typeof sp.view === 'string' ? sp.view : undefined;
  const sessionParam = typeof sp.session === 'string' ? sp.session : undefined;

  // 1) Vista de resultados (destino tras terminar; también revisión posterior).
  if (view === 'result' && sessionParam) {
    const result = await simulatorDb.loadSimulatorResult(profileId, sessionParam);
    if (result) {
      const streak = await getStreak(profileId);
      const celebrationParam = typeof sp.celebration === 'string' ? sp.celebration : undefined;
      return (
        <SimulatorResult
          data={result}
          currentStreak={streak?.currentStreak ?? 0}
          celebration={decodeCelebrationParam(celebrationParam)}
        />
      );
    }
    // Sesión inexistente/ajena/no terminada: cae a la entrada normal.
  }

  // 1b) Revisión de preguntas falladas (F13 tarea 9) — mismo guard dueño+terminada.
  if (view === 'review' && sessionParam) {
    const questions = await simulatorDb.loadSimulatorReview(profileId, sessionParam);
    if (questions) return <SimulatorReview questions={questions} sessionId={sessionParam} />;
    // Sesión inexistente/ajena/no terminada: cae a la entrada normal.
  }

  // 2) ¿Hay una sesión de simulacro vigente que retomar?
  const state = await simulatorDb.loadSimulatorState(profileId);

  if (state.kind === 'expired') {
    // El tiempo real (server-side) ya se agotó: se cierra y va a resultados.
    await sessionsDb.finishSession({
      userProfileId: profileId,
      sessionId: state.sessionId,
      reason: 'TIMEOUT',
    });
    redirect(`/simulador?view=result&session=${state.sessionId}`);
  }

  if (state.kind === 'active') {
    return <SimulatorApp initial={{ kind: 'active', payload: state.payload }} />;
  }

  // 3) Entrada nueva: muro suave primero.
  const access = await simulatorDb.evaluateSimulatorAccess(profileId);
  if (!access.decision.allowed) {
    redirect(`/paywall?trigger=${access.decision.trigger}&return=%2Fsimulador`);
  }

  const meta = await simulatorDb.loadSimulatorEntryMeta(profileId);
  if (!meta) return <NoTargetMessage />;

  return (
    <SimulatorApp
      initial={{
        kind: 'entry',
        isFreeFirstTime: access.isFreeFirstTime,
        examName: meta.examName,
        totalQuestions: meta.totalQuestions,
        durationMins: meta.durationMins,
      }}
    />
  );
}

function NoTargetMessage() {
  const copy = noTargetChosen('simulacro');
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Tino state={copy.state} size={72} />
      <h1 className="font-display text-xl font-bold text-text-primary">
        Primero elige tu examen
      </h1>
      <p className="text-sm text-text-secondary">{copy.message}</p>
      <Link
        href="/onboarding"
        className="inline-flex min-h-touch items-center font-semibold text-brand-soft hover:underline"
      >
        Completar mi perfil
      </Link>
    </main>
  );
}
