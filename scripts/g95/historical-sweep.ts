/**
 * scripts/g95/historical-sweep.ts — Barrido retrospectivo de LENGTH_BIAS_SUBGROUP (G95)
 *
 * Tarea 4 de G95: correr el validador NUEVO (subgrupo por tema/formato +
 * umbral de lote completo `>=`) contra TODOS los lotes ya publicados, para
 * ver si algún otro lote además del de G93/G94 (Comprensión lectora,
 * UNAM:ESPANOL) tiene una concentración de sesgo por subgrupo que el
 * chequeo de LOTE COMPLETO nunca habría atrapado.
 *
 * No hay una tabla "lote" en el schema — cada `content-insert-drafts.ts`
 * inserta un grupo de reactivos de una materia en un puñado de llamadas muy
 * seguidas (segundos entre sí, según `createdAt`). Este script reconstruye
 * los lotes agrupando `Question` por `Subject` y partiendo por HUECO de
 * tiempo: dos reactivos del mismo Subject separados por más de
 * `CLUSTER_GAP_MS` pertenecen a inserciones distintas (fases distintas,
 * normalmente días aparte). Mismo criterio que G77 usó a mano para
 * reconstruir el lote de Inglés UNAM desde `backups/content-bank.json`.
 *
 * Fuente: `backups/content-bank.json` (retención vía git, G61) — no toca la
 * DB. Los datos del backup SÍ traen `isCorrect` (no es un archivo ciego),
 * así que no hace falta ningún paso de verificación aquí: es un análisis
 * retrospectivo sobre contenido YA resuelto.
 *
 * Uso: npx tsx scripts/g95/historical-sweep.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { analyzeLot, type LotItem, type LotOption } from '../lib/lot-validation';

interface BackupQuestion {
  id: string;
  topicId: string;
  options: LotOption[];
  difficulty: string;
  format: string;
  passageId: string | null;
  createdAt: { $d: string } | string;
}
interface BackupTopic {
  id: string;
  subjectId: string;
  name: string;
}
interface BackupSubject {
  id: string;
  name: string;
  sharedContentKey: string | null;
}
interface BackupFile {
  Question: BackupQuestion[];
  Topic: BackupTopic[];
  Subject: BackupSubject[];
}

const CLUSTER_GAP_MS = 60 * 60 * 1000; // 1 hora — separa inserciones de fases distintas
const MIN_CLUSTER_SIZE = 8; // por debajo de esto ningún subgrupo interno llegaría a MIN_SIZE=4 dos veces

function getTime(q: BackupQuestion): number {
  const raw = typeof q.createdAt === 'string' ? q.createdAt : q.createdAt.$d;
  return new Date(raw).getTime();
}

function clusterByGap(questions: BackupQuestion[]): BackupQuestion[][] {
  const sorted = [...questions].sort((a, b) => getTime(a) - getTime(b));
  const clusters: BackupQuestion[][] = [];
  let current: BackupQuestion[] = [];
  let prevTime: number | null = null;
  for (const q of sorted) {
    const t = getTime(q);
    if (prevTime !== null && t - prevTime > CLUSTER_GAP_MS) {
      clusters.push(current);
      current = [];
    }
    current.push(q);
    prevTime = t;
  }
  if (current.length > 0) clusters.push(current);
  return clusters;
}

function main() {
  const backupPath = join(process.cwd(), 'backups', 'content-bank.json');
  const data = JSON.parse(readFileSync(backupPath, 'utf8')) as BackupFile;

  const topicById = new Map(data.Topic.map((t) => [t.id, t]));
  const subjectById = new Map(data.Subject.map((s) => [s.id, s]));

  const bySubject = new Map<string, BackupQuestion[]>();
  for (const q of data.Question) {
    const topic = topicById.get(q.topicId);
    if (!topic) continue;
    const arr = bySubject.get(topic.subjectId);
    if (arr) arr.push(q);
    else bySubject.set(topic.subjectId, [q]);
  }

  console.log('─'.repeat(100));
  console.log('🦉 YaEntre — Barrido retrospectivo LENGTH_BIAS_SUBGROUP (G95)');
  console.log(`   ${data.Question.length} reactivos totales · ${bySubject.size} materias`);
  console.log('─'.repeat(100));

  let clustersAnalyzed = 0;
  let clustersWithSubgroupHit = 0;
  let clustersWithLotLevelHit = 0;
  const flaggedSummaries: string[] = [];

  for (const [subjectId, qs] of bySubject) {
    const subject = subjectById.get(subjectId);
    const label = subject ? `${subject.name}${subject.sharedContentKey ? ` (${subject.sharedContentKey})` : ''}` : subjectId;
    const clusters = clusterByGap(qs);

    for (const cluster of clusters) {
      if (cluster.length < MIN_CLUSTER_SIZE) continue;
      clustersAnalyzed++;

      const items: LotItem[] = cluster.map((q) => ({
        options: q.options,
        format: q.format,
        difficulty: q.difficulty,
        explanations: [],
        passageRef: q.passageId,
        topic: topicById.get(q.topicId)?.name ?? null,
      }));

      const report = analyzeLot(items);
      const startDate = new Date(getTime(cluster[0])).toISOString().slice(0, 10);
      const endDate = new Date(getTime(cluster[cluster.length - 1])).toISOString().slice(0, 10);
      const window = startDate === endDate ? startDate : `${startDate}..${endDate}`;

      const lotLevelHits = report.violations.filter((v) => v.code === 'LENGTH_BIAS');
      const subgroupHits = report.violations.filter((v) => v.code === 'LENGTH_BIAS_SUBGROUP');

      if (lotLevelHits.length > 0) clustersWithLotLevelHit++;
      if (subgroupHits.length > 0) clustersWithSubgroupHit++;

      if (lotLevelHits.length > 0 || subgroupHits.length > 0) {
        const header = `${label} — ${window} — n=${cluster.length} (lengthBias lote: más-larga ${(report.lengthBias.longestShare * 100).toFixed(1)}%, más-corta ${(report.lengthBias.shortestShare * 100).toFixed(1)}%)`;
        console.log(header);
        flaggedSummaries.push(header);
        for (const v of lotLevelHits) {
          console.log(`   [LOTE][${v.severity.toUpperCase()}] ${v.detail}`);
          flaggedSummaries.push(`   [LOTE][${v.severity.toUpperCase()}] ${v.detail}`);
        }
        for (const v of subgroupHits) {
          console.log(`   [SUBGRUPO][${v.severity.toUpperCase()}] ${v.detail}`);
          flaggedSummaries.push(`   [SUBGRUPO][${v.severity.toUpperCase()}] ${v.detail}`);
        }
        console.log('');
      }
    }
  }

  console.log('─'.repeat(100));
  console.log(`Clusters analizados (n>=${MIN_CLUSTER_SIZE}): ${clustersAnalyzed}`);
  console.log(`  con aviso/rechazo de LOTE completo (LENGTH_BIAS, ya con >=): ${clustersWithLotLevelHit}`);
  console.log(`  con aviso/rechazo de SUBGRUPO (LENGTH_BIAS_SUBGROUP, nuevo en G95): ${clustersWithSubgroupHit}`);
  console.log('─'.repeat(100));
}

main();
