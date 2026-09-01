import { Prisma } from '@prisma/client';

/**
 * Contrato compartido de los respaldos de CONTENIDO (G61).
 *
 * El banco de reactivos es el activo más valioso del producto — meses de
 * generación y verificación adversarial. El plan gratuito de Supabase NO da
 * respaldos automáticos accesibles (ver docs/RESPALDOS.md), así que este
 * archivo define un respaldo lógico propio: un JSON versionable que permite
 * reconstruir TODO el contenido desde cero contra una base vacía.
 *
 * Cubre exactamente: reactivos (+opciones), explicaciones por capas, pasajes
 * de comprensión de lectura, taxonomía completa (institución → tema + carreras)
 * y las fuentes (ContentSource + SourceChunk + trazabilidad).
 *
 * NO cubre (a propósito): datos de usuario, sesiones, pagos, reportes de
 * reactivos (dato de usuario), ni el contenido de Fase 2 (`content_items` /
 * `professors`, INACTIVO y vacío). Esos dependen del respaldo/PITR de
 * Supabase — ver docs/RESPALDOS.md §6.
 */

export const BACKUP_FORMAT = 'yaentre-content-backup';
export const BACKUP_VERSION = 1;

/**
 * Modelos de contenido en orden SEGURO de inserción (padres antes que hijos).
 * El importador recorre esta lista tal cual; el exportador también, para que el
 * archivo salga siempre con las secciones en el mismo orden (diffs de git
 * limpios).
 */
export const CONTENT_MODELS = [
  'Institution',
  'ContentSource',
  'Level',
  'Exam',
  'Area',
  'Career',
  'Subject',
  'Topic',
  'Passage',
  'SourceChunk',
  'Question',
  'QuestionSourceChunk',
  'ExplanationLayer',
] as const;

export type ContentModel = (typeof CONTENT_MODELS)[number];

/** Nombre del delegate de Prisma para un modelo (`Institution` → `institution`). */
export function delegateName(model: ContentModel): string {
  return model[0].toLowerCase() + model.slice(1);
}

export interface FieldMeta {
  /** Columnas de tipo DateTime (se codifican como `{ "$d": iso }` en el JSON). */
  dateFields: string[];
  /** Columnas de tipo Json (un `null` en el archivo ⇒ SQL NULL al importar). */
  jsonFields: string[];
  /** Columnas de la clave primaria (para ordenar determinísticamente). */
  pk: string[];
}

/**
 * Metadatos de columnas derivados del DMMF de Prisma en runtime — CERO listas
 * hardcodeadas que puedan quedar desalineadas del schema. Si el schema cambia,
 * esto lo refleja solo.
 */
export function fieldMeta(model: ContentModel): FieldMeta {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === model);
  if (!m) throw new Error(`Modelo no encontrado en el DMMF de Prisma: ${model}`);
  const cols = m.fields.filter((f) => f.kind !== 'object');
  return {
    dateFields: cols.filter((f) => f.type === 'DateTime').map((f) => f.name),
    jsonFields: cols.filter((f) => f.type === 'Json').map((f) => f.name),
    pk: m.primaryKey ? [...m.primaryKey.fields] : ['id'],
  };
}

const DATE_TAG = '$d';

/**
 * Codifica una fila para el JSON: los `Date` de columnas conocidas pasan a
 * `{ "$d": "<iso>" }`. Solo se tocan columnas DateTime de nivel superior —
 * jamás se recorre el interior de un valor Json (opciones, veredicto de
 * verificación, fuentes de carrera), así que un string que parezca fecha
 * dentro de un jsonb se conserva tal cual.
 */
export function encodeRow(
  row: Record<string, unknown>,
  dateFields: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const f of dateFields) {
    const v = out[f];
    out[f] = v instanceof Date ? { [DATE_TAG]: v.toISOString() } : (v ?? null);
  }
  return out;
}

/**
 * Revierte `encodeRow` para pasar la fila a Prisma: `{ "$d": iso }` → `Date`,
 * y un Json en `null` se OMITE (la columna nullable queda en SQL NULL). Un
 * `updatedAt` (`@updatedAt`) explícito se conserva — Prisma lo respeta en
 * `create`/`createMany`.
 */
export function decodeRow(
  row: Record<string, unknown>,
  meta: FieldMeta,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const f of meta.dateFields) {
    const v = out[f];
    if (v && typeof v === 'object' && DATE_TAG in (v as Record<string, unknown>)) {
      out[f] = new Date((v as Record<string, string>)[DATE_TAG]);
    }
  }
  for (const f of meta.jsonFields) {
    if (out[f] === null || out[f] === undefined) delete out[f];
  }
  return out;
}

export interface BackupManifest {
  format: string;
  version: number;
  exportedAt: string;
  sourceProjectRef: string | null;
  prismaSchemaSha256: string;
  models: string[];
  counts: Record<string, number>;
  totalRows: number;
}

export interface BackupFile extends Record<string, unknown> {
  _manifest: BackupManifest;
}

/** Ref del proyecto Supabase leído de `NEXT_PUBLIC_SUPABASE_URL` (informativo). */
export function projectRefFromEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const m = /https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url);
  return m ? m[1] : null;
}
