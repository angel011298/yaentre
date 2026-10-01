/**
 * scripts/g100/blind-lot.ts — verificación CIEGA de un lote ANTES de tocar la base (G100).
 *
 * El reemplazo de reactivos anclados a guías CENEVAL exige que cada reactivo
 * nuevo lo resuelva a ciegas una segunda sesión que no vio el prompt de
 * generación. Esta herramienta hace ese paso sobre los archivos JSON del lote
 * (sin DB, sin red, sin API de pago):
 *
 *   tsx scripts/g100/blind-lot.ts export <carpeta-del-lote> <salida.json>
 *     Escribe SOLO lo que vería un sustentante: enunciado, pasaje y opciones
 *     BARAJADAS (semilla = id del reactivo). Nunca `isCorrect` ni explicaciones.
 *
 *   tsx scripts/g100/blind-lot.ts check <carpeta-del-lote> <respuestas.json> <informe.json>
 *     Compara lo que eligió el verificador contra la clave, traduciendo la letra
 *     barajada a su texto. Un reactivo se APRUEBA solo si el verificador eligió
 *     la clave, con confianza ≥ 0.85 y sin `problems`. Sale con código 1 si algo
 *     no se aprueba: un rojo alcanzable (G71 §6 D6).
 *
 * El id de cada reactivo es el hash de su enunciado normalizado (+ pasaje), el
 * mismo al exportar y al comprobar, para que el informe sobreviva a la
 * inserción: `apply-verdicts` lo traduce después al id real de la base.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}
interface Draft {
  stem: string;
  options: Option[];
  difficulty: string;
  format: string;
  passage: { ref: string; title: string | null; content: string } | null;
}
interface LotEntry {
  hash: string;
  file: string;
  draft: Draft;
}

const MIN_CONFIDENCE = 0.85;
const LABELS = ['A', 'B', 'C', 'D'];

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function lotHash(d: { stem: string; passage: { ref: string } | null }): string {
  return createHash('sha256')
    .update(normalize(d.stem) + '|' + (d.passage?.ref ?? ''))
    .digest('hex')
    .slice(0, 12);
}

/**
 * Huella del reactivo TAL COMO lo vio el verificador: enunciado, pasaje y las
 * opciones EN SU ORDEN con su clave. Va en el informe para que editar una
 * opción después de verificar —sin cambiar el enunciado, que es lo único que
 * entra al id— deje el informe desfasado y haya que volver a verificar.
 */
export function fingerprint(d: Draft): string {
  return createHash('sha256')
    .update(JSON.stringify({ s: d.stem, p: d.passage?.content ?? null, o: d.options.map((o) => [o.text, o.isCorrect]) }))
    .digest('hex')
    .slice(0, 16);
}

function loadLot(dir: string): LotEntry[] {
  const out: LotEntry[] = [];
  for (const file of readdirSync(dir).filter((f) => /^\d.*\.json$/.test(f)).sort()) {
    const arr = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Draft[];
    for (const draft of arr) out.push({ hash: lotHash(draft), file, draft });
  }
  const seen = new Set<string>();
  for (const e of out) {
    if (seen.has(e.hash)) throw new Error(`Hash duplicado (enunciado repetido): ${e.draft.stem.slice(0, 60)}`);
    seen.add(e.hash);
  }
  return out;
}

/** Baraja determinista (xorshift sembrado por el hash): la misma baraja al exportar y al comprobar. */
export function shuffledOrder(hash: string): number[] {
  let state = parseInt(hash.slice(0, 8), 16) || 1;
  const next = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const MATH_FILE = /ecuaciones|cinematica|polinomios/;

function exportBlind(dir: string, outPath: string): void {
  const lot = loadLot(dir);
  const items = lot.map((e) => {
    const order = shuffledOrder(e.hash);
    return {
      questionId: e.hash,
      format: e.draft.format,
      requiresCalculation: MATH_FILE.test(e.file),
      passage: e.draft.passage ? { title: e.draft.passage.title, content: e.draft.passage.content } : null,
      stem: e.draft.stem,
      options: order.map((orig, slot) => ({ label: LABELS[slot], text: e.draft.options[orig].text })),
    };
  });
  const raw = JSON.stringify(items, null, 2);
  // Guardia estructural: el archivo ciego no puede contener la clave ni las explicaciones.
  if (/isCorrect|explanations|layer1|layer2|layer3/.test(raw)) {
    throw new Error('El lote ciego contiene campos que revelan la clave: abortado.');
  }
  writeFileSync(outPath, raw + '\n', 'utf8');
  console.log(`Lote ciego: ${items.length} reactivo(s) → ${outPath}`);
}

interface Verdict {
  questionId: string;
  chosenOption: string;
  confidence: number;
  reasoning?: string;
  usedCalculation?: boolean;
  model?: string;
  problems?: string[];
}

function checkBlind(dir: string, verdictsPath: string, reportPath: string): void {
  const lot = loadLot(dir);
  const verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8')) as Verdict[];
  const byId = new Map(verdicts.map((v) => [v.questionId, v]));
  const rows = lot.map((e) => {
    const v = byId.get(e.hash);
    if (!v) return { hash: e.hash, file: e.file, fingerprint: fingerprint(e.draft), status: 'SIN_VEREDICTO' as const };
    const slot = LABELS.indexOf(String(v.chosenOption).toUpperCase());
    const order = shuffledOrder(e.hash);
    const chosen = slot >= 0 ? e.draft.options[order[slot]] : undefined;
    const problems = v.problems ?? [];
    const ok = chosen?.isCorrect === true && v.confidence >= MIN_CONFIDENCE && problems.length === 0;
    return {
      hash: e.hash,
      file: e.file,
      fingerprint: fingerprint(e.draft),
      difficulty: e.draft.difficulty,
      status: ok ? ('APROBADO' as const) : ('NO_APROBADO' as const),
      chosenIsKey: chosen?.isCorrect === true,
      confidence: v.confidence,
      model: v.model ?? null,
      usedCalculation: v.usedCalculation ?? false,
      problems,
    };
  });
  const extra = verdicts.filter((v) => !lot.some((e) => e.hash === v.questionId)).map((v) => v.questionId);
  const approved = rows.filter((r) => r.status === 'APROBADO').length;
  writeFileSync(
    reportPath,
    JSON.stringify({ total: rows.length, approved, minConfidence: MIN_CONFIDENCE, extraVerdictIds: extra, rows }, null, 2) + '\n',
    'utf8',
  );
  console.log(`Aprobados ${approved}/${rows.length} (umbral de confianza ${MIN_CONFIDENCE}) → ${reportPath}`);
  for (const r of rows.filter((x) => x.status !== 'APROBADO')) {
    console.log(`  ✗ ${r.hash} ${r.file}: ${r.status}`);
  }
  if (extra.length > 0) console.log(`  ⚠️  ${extra.length} veredicto(s) de ids que no están en el lote`);
  if (approved !== rows.length || extra.length > 0) process.exitCode = 1;
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const [, , cmd, a, b, c] = process.argv;
  if (cmd === 'export' && a && b) exportBlind(a, b);
  else if (cmd === 'check' && a && b && c) checkBlind(a, b, c);
  else {
    console.error('Uso: blind-lot.ts export <lote> <salida.json> | check <lote> <respuestas.json> <informe.json>');
    process.exitCode = 1;
  }
}
