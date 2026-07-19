/**
 * smoke-guardrail.ts (F1) — Prueba viva del guardrail de contenido servible.
 *
 * Corre el helper REAL loadServableQuestionsByTopic contra la DB y verifica
 * que un reactivo usage=CALIBRATION_ONLY NO se devuelva y uno SERVABLE SÍ.
 * Los reactivos de prueba (smoke_calibration / smoke_servable) se insertan y
 * borran vía el conector (owner) porque questions tiene RLS sin política de
 * escritura para roles normales. Este script solo LEE (como el rol de app).
 */
import { prisma } from '../src/lib/db/prisma';
import { loadServableQuestionsByTopic } from '../src/lib/db/question-read';

async function main() {
  const cal = await prisma.question.findUnique({ where: { id: 'smoke_calibration' } });
  if (!cal) throw new Error('Falta smoke_calibration; insértalo vía el conector primero.');

  const ids = (await loadServableQuestionsByTopic(cal.topicId)).map((q) => q.id);
  const calibrationLeaked = ids.includes('smoke_calibration');
  const servableVisible = ids.includes('smoke_servable');

  console.log(`topic probado: ${cal.topicId}`);
  console.log(`CALIBRATION_ONLY devuelto por el helper: ${calibrationLeaked} (esperado: false)`);
  console.log(`SERVABLE devuelto por el helper:        ${servableVisible} (esperado: true)`);

  await prisma.$disconnect();
  if (calibrationLeaked) throw new Error('FUGA: el guardrail devolvió un reactivo CALIBRATION_ONLY');
  if (!servableVisible) throw new Error('El helper no devolvió el reactivo SERVABLE de control');
  console.log('OK Guardrail: CALIBRATION_ONLY excluido, SERVABLE incluido.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
