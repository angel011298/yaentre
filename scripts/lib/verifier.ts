import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { runInNewContext } from 'node:vm';

/**
 * Verificador adversarial (F2) — el mecanismo que sustituye a cualquier
 * revisor humano, para siempre.
 *
 * Un SEGUNDO modelo independiente (Fable 5; el generador usa Sonnet) recibe el
 * reactivo COMO LO VERÍA UN SUSTENTANTE: enunciado y opciones, sin la
 * respuesta marcada y sin explicaciones. Lo resuelve desde cero. Para materias
 * de cálculo debe EJECUTAR la operación en código (tool `ejecutar_calculo`,
 * sandbox de node:vm), no solo razonar en texto.
 *
 * GARANTÍA ESTRUCTURAL: buildVerifierPayload() construye el payload por
 * selección explícita de campos (nunca spread). `isCorrect`, `explanations` y
 * cualquier metadato de la respuesta correcta NO EXISTEN en el tipo
 * VerifierPayload, así que no pueden viajar al modelo. El test
 * tests/content/verifier-payload.test.ts inspecciona el payload y los prompts
 * exactos y confirma la ausencia de esos campos.
 */

// ── Modelos (deben ser distintos entre sí y distintos del generador) ──
export const VERIFIER_MODEL = 'claude-fable-5';
export const AUDIT_MODEL = 'claude-opus-4-8'; // tercera pasada (muestreo 5%)

// Precios USD por millón de tokens (referencia claude-api skill, 2026-06).
export const PRICES_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-fable-5': { input: 10, output: 50 },
  'claude-opus-4-8': { input: 5, output: 25 },
};

// ── Payload del verificador: SOLO lo que un sustentante vería ──

export interface VerifierOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  imageUrl?: string | null;
}

export interface VerifierPayload {
  stem: string;
  options: VerifierOption[];
  format: string;
  subject: string;
  topic: string;
  institution: string;
  passage?: string | null;
}

/** Reactivo de entrada (draft del generador o fila de la DB). */
export interface VerifiableQuestion {
  stem: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
    imageUrl?: string | null;
  }>;
  format?: string;
  passageContent?: string | null;
}

export interface VerifierContext {
  subject: string;
  topic: string;
  institution: string;
}

/**
 * Construye el payload por SELECCIÓN EXPLÍCITA de campos. isCorrect y
 * explanations quedan fuera por construcción — el tipo de retorno no los
 * admite y este es el único camino hacia el prompt del verificador.
 */
export function buildVerifierPayload(
  question: VerifiableQuestion,
  ctx: VerifierContext,
): VerifierPayload {
  return {
    stem: question.stem,
    options: question.options.map((o) => ({
      id: o.id as VerifierOption['id'],
      text: o.text,
      imageUrl: o.imageUrl ?? null,
    })),
    format: question.format ?? 'MULTIPLE_CHOICE',
    subject: ctx.subject,
    topic: ctx.topic,
    institution: ctx.institution,
    passage: question.passageContent ?? null,
  };
}

// ── Materias de cálculo: la verificación DEBE ejecutar código ──

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

const CALC_SUBJECT_KEYS = ['matematica', 'fisica', 'quimica', 'aritmetica', 'calculo', 'algebra'];

export function isCalcSubject(subject: string): boolean {
  const n = normalize(subject);
  return CALC_SUBJECT_KEYS.some((k) => n.includes(k));
}

// ── Prompts exactos (expuestos para el test de ausencia de respuesta) ──

export function renderVerifierSystem(payload: VerifierPayload): string {
  const calcRule = isCalcSubject(payload.subject)
    ? [
        '',
        'REGLA OBLIGATORIA DE CÁLCULO: esta materia involucra cálculo numérico.',
        'DEBES ejecutar cada operación aritmética/algebraica relevante con la',
        'herramienta `ejecutar_calculo` (JavaScript) ANTES de elegir tu opción.',
        'No confíes en aritmética mental para el resultado final.',
      ].join('\n')
    : '';

  return [
    'Eres un sustentante experto resolviendo un reactivo de examen de admisión',
    `(${payload.institution} · ${payload.subject} · ${payload.topic}).`,
    '',
    'NO conoces la respuesta "oficial" — no existe para ti. Resuelve el',
    'reactivo desde cero, con rigor, como si tu ingreso dependiera de ello.',
    calcRule,
    '',
    'Además de resolverlo, audita la calidad del reactivo. Tipos de problema:',
    '- AMBIGUOUS_STEM: el enunciado es ambiguo o le falta información',
    '- MULTIPLE_VALID: más de una opción es defendible como correcta',
    '- NONE_VALID: ninguna opción es correcta',
    '- WEAK_DISTRACTORS: distractores triviales o poco creíbles',
    '- OFF_SYLLABUS: el contenido no corresponde al tema/temario declarado',
    '- OTHER: cualquier otro defecto (descríbelo)',
    '',
    'Cuando termines, responde ÚNICAMENTE con un objeto JSON (sin markdown):',
    '{',
    '  "chosenOption": "A" | "B" | "C" | "D",',
    '  "confidence": <número 0 a 1: probabilidad de que TU elección sea correcta>,',
    '  "reasoning": "<tu razonamiento resumido, en español>",',
    '  "problems": [{ "type": "<tipo>", "detail": "<detalle>" }]',
    '}',
    'Si el reactivo está limpio, "problems" es un array vacío. Sé exigente:',
    'un reactivo con cualquier defecto real NO debe publicarse.',
  ].join('\n');
}

export function renderVerifierUser(payload: VerifierPayload): string {
  const lines: string[] = [];
  if (payload.passage) {
    lines.push('TEXTO DE REFERENCIA:', payload.passage, '');
  }
  lines.push(`REACTIVO (formato ${payload.format}):`, payload.stem, '', 'OPCIONES:');
  for (const o of payload.options) {
    const img = o.imageUrl ? ` [imagen: ${o.imageUrl}]` : '';
    lines.push(`${o.id}) ${o.text}${img}`);
  }
  return lines.join('\n');
}

// ── Veredicto ──

export const PROBLEM_TYPES = [
  'AMBIGUOUS_STEM',
  'MULTIPLE_VALID',
  'NONE_VALID',
  'WEAK_DISTRACTORS',
  'OFF_SYLLABUS',
  'CALC_NOT_EXECUTED', // añadido por el runtime, no por el modelo
  'OTHER',
] as const;

const VerdictSchema = z.object({
  chosenOption: z.enum(['A', 'B', 'C', 'D']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  problems: z
    .array(
      z.object({
        type: z.enum(PROBLEM_TYPES),
        detail: z.string(),
      }),
    )
    .default([]),
});

export interface VerifierUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface VerifierVerdict extends z.infer<typeof VerdictSchema> {
  model: string;
  usedCalculation: boolean;
  usage: VerifierUsage;
  verifiedAt: string;
}

// ── Sandbox de cálculo (node:vm, sin acceso a require/fs/red) ──

export function runCalculation(code: string): string {
  try {
    const wrapped = /\breturn\b/.test(code) ? `(function(){\n${code}\n})()` : code;
    const result = runInNewContext(wrapped, { Math }, { timeout: 2000 });
    return JSON.stringify(result) ?? String(result);
  } catch (err) {
    return `ERROR: ${(err as Error).message}`;
  }
}

const CALC_TOOL: Anthropic.Tool = {
  name: 'ejecutar_calculo',
  description:
    'Ejecuta código JavaScript puro (sin imports, sin red; Math disponible) y devuelve el resultado. Úsalo para toda operación aritmética o algebraica del reactivo.',
  input_schema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description:
          'Código JavaScript. El valor de la última expresión (o un return) es el resultado.',
      },
    },
    required: ['code'],
  },
};

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Sin objeto JSON en la respuesta');
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Corre la verificación adversarial real contra la API de Anthropic.
 * Loop manual de tool use: el modelo puede llamar `ejecutar_calculo` cuantas
 * veces necesite; registramos si lo usó (obligatorio en materias de cálculo).
 */
export async function runVerification(
  payload: VerifierPayload,
  opts: { apiKey: string; model?: string },
): Promise<VerifierVerdict> {
  const model = opts.model ?? VERIFIER_MODEL;
  const client = new Anthropic({ apiKey: opts.apiKey });

  const system = renderVerifierSystem(payload);
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: renderVerifierUser(payload) },
  ];

  const usage: VerifierUsage = { inputTokens: 0, outputTokens: 0 };
  let usedCalculation = false;

  // Fable 5: thinking siempre activo (omitir el parámetro). Opus 4.8: activar
  // adaptive explícito. Nunca temperature/budget_tokens (400 en ambos).
  const thinking =
    model === VERIFIER_MODEL ? {} : { thinking: { type: 'adaptive' as const } };

  for (let turn = 0; turn < 12; turn++) {
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      system,
      messages,
      tools: [CALC_TOOL],
      ...thinking,
    });
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;

    if (response.stop_reason === 'refusal') {
      return {
        chosenOption: 'A',
        confidence: 0,
        reasoning: 'El modelo verificador declinó procesar el reactivo (refusal).',
        problems: [{ type: 'OTHER', detail: 'Verificación rechazada por safety del modelo' }],
        model,
        usedCalculation,
        usage,
        verifiedAt: new Date().toISOString(),
      };
    }

    if (response.stop_reason === 'tool_use' || response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      if (response.stop_reason === 'pause_turn') continue;

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'ejecutar_calculo') {
          usedCalculation = true;
          const { code } = block.input as { code: string };
          results.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: runCalculation(code),
          });
        }
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    // end_turn → parsear veredicto
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const parsed = VerdictSchema.parse(extractJson(text));
    const verdict: VerifierVerdict = {
      ...parsed,
      model,
      usedCalculation,
      usage,
      verifiedAt: new Date().toISOString(),
    };

    // Guardrail de cálculo: si la materia lo exige y el modelo no ejecutó
    // ninguna operación, el veredicto NO es confiable → problema estructural.
    if (isCalcSubject(payload.subject) && !usedCalculation) {
      verdict.problems = [
        ...verdict.problems,
        {
          type: 'CALC_NOT_EXECUTED',
          detail: 'Materia de cálculo verificada sin ejecutar código — veredicto no confiable',
        },
      ];
    }
    return verdict;
  }

  throw new Error('Verificación excedió el máximo de turnos de tool use (12)');
}

/**
 * Verificador mock determinista (para --mock y tests E2E sin red).
 * `correctOption` la aporta el orquestador (el mock no la extrae del payload —
 * el payload no la contiene, esa es la garantía que preserva el camino real).
 * Un stem con "[MOCK-FAIL]" simula discrepancia; "[MOCK-DOUBT]" baja confianza.
 */
export function mockVerify(
  payload: VerifierPayload,
  correctOption: 'A' | 'B' | 'C' | 'D',
  model: string = VERIFIER_MODEL,
): VerifierVerdict {
  const fail = payload.stem.includes('[MOCK-FAIL]');
  const doubt = payload.stem.includes('[MOCK-DOUBT]');
  const wrong = correctOption === 'A' ? 'B' : 'A';
  return {
    chosenOption: fail ? (wrong as 'A' | 'B') : correctOption,
    confidence: doubt ? 0.5 : 0.95,
    reasoning: `[MOCK] Resolución simulada del reactivo (${payload.subject}).`,
    problems: [],
    model: `${model} (mock)`,
    usedCalculation: isCalcSubject(payload.subject),
    usage: { inputTokens: 0, outputTokens: 0 },
    verifiedAt: new Date().toISOString(),
  };
}

/** Costo estimado en USD de un uso, según la tabla de precios por modelo. */
export function estimateCostUsd(model: string, usage: VerifierUsage): number {
  const base = model.replace(' (mock)', '');
  const price = PRICES_PER_MTOK[base];
  if (!price) return 0;
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
}
