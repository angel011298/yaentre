/**
 * Parseo tolerante de la salida del modelo. El system prompt exige un array JSON
 * puro, pero los LLMs a veces envuelven la respuesta en ```json ... ``` o añaden
 * texto. Recuperamos el array de forma defensiva sin confiar ciegamente.
 */

export interface ParseOk {
  ok: true;
  items: unknown[];
}
export interface ParseFail {
  ok: false;
  error: string;
}
export type ParseResult = ParseOk | ParseFail;

/** Quita cercas de markdown (```json ... ```) si el modelo las agregó. */
function stripCodeFences(text: string): string {
  const fence = /^\s*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/i;
  const match = text.match(fence);
  return match ? match[1] : text;
}

/**
 * Aísla el primer array JSON de nivel superior del texto, respetando llaves,
 * corchetes y strings (con escapes). Evita cortar en un `]` que viva dentro de
 * un string. Devuelve el substring `[...]` o null si no hay un array balanceado.
 */
function sliceTopLevelArray(text: string): string | null {
  const start = text.indexOf('[');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '[') {
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

export function parseModelOutput(raw: string): ParseResult {
  const cleaned = stripCodeFences(raw.trim());

  const attempts = [cleaned, sliceTopLevelArray(cleaned)].filter(
    (a): a is string => typeof a === 'string' && a.length > 0,
  );

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return { ok: true, items: parsed };
      }
      // El modelo devolvió un solo objeto en vez de un array: lo envolvemos.
      if (parsed && typeof parsed === 'object') {
        return { ok: true, items: [parsed] };
      }
    } catch {
      // intenta el siguiente candidato
    }
  }

  return {
    ok: false,
    error: 'La respuesta del modelo no contiene un array JSON válido',
  };
}
