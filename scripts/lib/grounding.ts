/**
 * Anclaje de la generación en fragmentos fuente (F2b) — lógica PURA.
 *
 * Cuando un tema tiene SourceChunks, el generador los recibe numerados como
 * contexto OBLIGATORIO y cada reactivo debe citar cuál(es) usó (campo
 * sourceChunks del draft, índices 1-based). Un draft que no cita un fragmento
 * válido cuando había fragmentos disponibles SE RECHAZA (no se inserta).
 * Sin fragmentos: se genera con el temario y se marca TEMARIO_ONLY.
 */

export interface GroundingChunk {
  id: string;
  text: string;
  locationRef: string | null;
  sourceName: string;
}

/** Bloque de contexto que se anexa al user prompt del generador. */
export function buildGroundingBlock(chunks: GroundingChunk[]): string {
  const lines: string[] = [
    '',
    'FRAGMENTOS FUENTE (material real del tema — tu ÚNICA base de contenido):',
  ];
  chunks.forEach((c, i) => {
    const loc = c.locationRef ? `, ${c.locationRef}` : '';
    lines.push('', `[FUENTE ${i + 1}] (${c.sourceName}${loc})`, c.text);
  });
  lines.push(
    '',
    'REGLA OBLIGATORIA: cada reactivo debe derivarse del contenido de uno o',
    'más FRAGMENTOS FUENTE de arriba, y declararlo en su campo "sourceChunks"',
    `(array de números 1-${chunks.length}). Un reactivo sin "sourceChunks" válido será`,
    'descartado. No inventes contenido que no esté respaldado por un fragmento.',
  );
  return lines.join('\n');
}

export interface CitationResolution {
  ok: boolean;
  chunkIds: string[];
  error?: string;
}

/**
 * Valida las citas de un draft contra los fragmentos disponibles y las
 * resuelve a ids de SourceChunk. Con fragmentos disponibles, exigir ≥1 cita
 * válida; los índices fuera de rango invalidan el draft (señal de alucinación).
 */
export function resolveCitations(
  cited: number[] | undefined,
  available: GroundingChunk[],
): CitationResolution {
  if (available.length === 0) {
    return { ok: true, chunkIds: [] }; // sin fuentes: TEMARIO_ONLY, sin citas
  }
  const citations = cited ?? [];
  if (citations.length === 0) {
    return {
      ok: false,
      chunkIds: [],
      error: `Sin cita de fragmento fuente (había ${available.length} disponibles)`,
    };
  }
  const invalid = citations.filter((n) => n < 1 || n > available.length);
  if (invalid.length > 0) {
    return {
      ok: false,
      chunkIds: [],
      error: `Citas fuera de rango: [${invalid.join(', ')}] (válidas: 1-${available.length})`,
    };
  }
  const chunkIds = [...new Set(citations.map((n) => available[n - 1].id))];
  return { ok: true, chunkIds };
}
