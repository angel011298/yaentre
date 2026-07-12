import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

/**
 * Mapa de nombre de materia (normalizado) → archivo de prompt. Permite que la
 * materia en la DB ("Matemáticas", "Física", "Química", ...) resuelva a su
 * plantilla versionada. Materias sin entrada usan `_default`.
 */
const SUBJECT_FILE_MAP: Record<string, string> = {
  matematicas: 'matematicas',
  matematica: 'matematicas',
  fisica: 'fisica',
  quimica: 'quimica',
  biologia: 'biologia',
  historia: 'historia',
  historiademexico: 'historia',
  historiauniversal: 'historia',
  espanol: 'espanol',
  lenguaje: 'espanol',
  comprensionlectora: 'espanol',
};

function normalizeSubjectName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

function readPromptFile(basename: string): string {
  const path = join(PROMPTS_DIR, `${basename}.md`);
  return readFileSync(path, 'utf8');
}

export interface BuiltPrompt {
  system: string;
  subjectFile: string;
}

export interface PromptContext {
  institution: string;
  level: string;
  area: string;
  subject: string;
  topic: string;
}

/**
 * Construye el system prompt combinando el prompt base (rol + formato) con la
 * plantilla específica de la materia y el contexto taxonómico del tema.
 */
export function buildSystemPrompt(ctx: PromptContext): BuiltPrompt {
  const base = readPromptFile('_base');
  const normalized = normalizeSubjectName(ctx.subject);
  const subjectFile = SUBJECT_FILE_MAP[normalized] ?? '_default';

  let subjectPrompt: string;
  if (existsSync(join(PROMPTS_DIR, `${subjectFile}.md`))) {
    subjectPrompt = readPromptFile(subjectFile);
  } else {
    subjectPrompt = readPromptFile('_default');
  }

  const contextBlock = [
    '# Contexto taxonómico de este lote',
    '',
    `- Institución: ${ctx.institution}`,
    `- Nivel: ${ctx.level}`,
    `- Área: ${ctx.area}`,
    `- Materia: ${ctx.subject}`,
    `- Tema específico: ${ctx.topic}`,
    '',
    `Todos los reactivos de este lote deben pertenecer al tema "${ctx.topic}" de la materia "${ctx.subject}".`,
  ].join('\n');

  const system = [base, '\n---\n', subjectPrompt, '\n---\n', contextBlock].join(
    '\n',
  );

  return { system, subjectFile };
}

export function buildUserPrompt(ctx: PromptContext, count: number): string {
  return [
    `Genera exactamente ${count} reactivo(s) de opción múltiple para el tema "${ctx.topic}"`,
    `(materia: ${ctx.subject}, área: ${ctx.area}, ${ctx.institution} ${ctx.level}).`,
    '',
    'Responde ÚNICAMENTE con el array JSON, sin ningún texto adicional.',
  ].join('\n');
}
