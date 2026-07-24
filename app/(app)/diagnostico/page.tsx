import { DiagnosticResults } from '@/components/exam/DiagnosticResults';
import { DiagnosticRunner } from '@/components/exam/DiagnosticRunner';
import { Tino } from '@/components/mascot/Tino';
import { requireOnboarding } from '@/lib/auth/guards';
import * as diagnosticDb from '@/lib/db/diagnostic';
import { toRunnerQuestion } from '@/lib/db/diagnostic';
import { diagnosticNotReady } from '@/lib/tino/copy';

/**
 * Ruta del diagnóstico inicial (F7). Server Component: resuelve el estado
 * real de la sesión diagnóstica del alumno en cada visita (nunca confía en
 * estado del cliente) y decide qué mostrar — retomar, resultados, o abrir
 * una sesión nueva si no hay ninguna vigente (primera vez, o la anterior
 * expiró por inactividad >24h).
 */
export default async function DiagnosticoPage() {
  const { profile } = await requireOnboarding();

  let state = await diagnosticDb.loadDiagnosticState(profile.id);

  if (state.kind === 'none') {
    const started = await diagnosticDb.startDiagnosticSession(profile.id);
    if (!started.ok) {
      return <NoContentMessage code={started.code} />;
    }
    state = await diagnosticDb.loadDiagnosticState(profile.id);
  }

  if (state.kind === 'none') {
    // No debería pasar (acabamos de crear la sesión), pero si la carrera
    // vuelve a fallar de forma transitoria, mejor un mensaje claro que un 500.
    return <NoContentMessage code="NO_CONTENT" />;
  }

  if (state.kind === 'completed') {
    const results = await diagnosticDb.loadDiagnosticResultsData(profile.id, state.session);
    return <DiagnosticResults data={results} />;
  }

  const session = state.session;
  const deadline = new Date(session.startedAt.getTime() + session.timeLimitSecs * 1000);
  const questions = session.answers.map((a) => toRunnerQuestion(a.question));
  const initialSelections = session.answers.map((a) => a.selectedOption);

  return (
    <DiagnosticRunner
      sessionId={session.id}
      deadline={deadline}
      questions={questions}
      initialSelections={initialSelections}
    />
  );
}

function NoContentMessage({ code }: { code: diagnosticDb.DiagnosticStartError }) {
  const copy = diagnosticNotReady(code);
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Tino state={copy.state} size={80} />
      <h1 className="font-display text-xl font-bold text-text-primary">
        Todavía estamos preparando tu diagnóstico
      </h1>
      <p className="max-w-sm text-sm text-text-secondary">{copy.message}</p>
    </div>
  );
}
