import type { SessionMode } from '@prisma/client';

/**
 * Decisión de `SessionMode` por alcance de práctica (F14 tarea 1). Módulo
 * PURO: el schema NO tiene un tercer valor de enum para "una materia" (solo
 * TOPIC_DRILL/AREA_PRACTICE existen — CLAUDE.md prohíbe tocar
 * prisma/schema.prisma sin instrucción explícita), así que "por materia" y
 * "reforzar débiles" (área completa) comparten AREA_PRACTICE; solo "por tema
 * específico" usa TOPIC_DRILL, que le queda exacto al nombre.
 */
export type PracticeScopeKind = 'area' | 'subject' | 'topic';

export function modeForScopeKind(kind: PracticeScopeKind): SessionMode {
  return kind === 'topic' ? 'TOPIC_DRILL' : 'AREA_PRACTICE';
}
