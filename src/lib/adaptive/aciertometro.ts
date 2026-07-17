import type { ConfidenceLevel } from '@prisma/client';

/**
 * Presentación del Aciertómetro (CC-13). El motor adaptativo completo
 * (CC-11) no existe todavía en este repo — este módulo es el CONTRATO que
 * ese motor debe usar para mostrar la meta de aciertos de una carrera:
 * `Career.minAciertos` es un arranque en frío por triangulación multi-fuente
 * (ver docs/ACIERTOS_MINIMOS.md), nunca un dato garantizado. La regla de
 * diseño no negociable: la meta SIEMPRE se presenta calificada por su
 * confianza ("estimada", "preliminar"), nunca como una cifra absoluta.
 */

export interface AciertometroTarget {
  minAciertos: number | null;
  minAciertosYear: number | null;
  minAciertosConfidence: ConfidenceLevel | null;
}

export interface AciertometroDisplay {
  hasTarget: boolean;
  /** Cifra principal a mostrar, ya con el prefijo "~" (nunca un número pelón). */
  label: string;
  /** Calificador corto junto al número, p. ej. "Meta estimada". */
  qualifier: string;
  /** Texto largo para tooltip/detalle: de dónde sale el dato y sus límites. */
  disclaimer: string;
}

const NO_TARGET: AciertometroDisplay = {
  hasTarget: false,
  label: '',
  qualifier: '',
  disclaimer:
    'Aún no tenemos una meta de referencia para esta carrera. Sigue practicando: tu progreso se mide igual.',
};

export function formatAciertometroTarget(target: AciertometroTarget): AciertometroDisplay {
  if (target.minAciertos == null) {
    return NO_TARGET;
  }

  const label = `~${target.minAciertos} aciertos`;
  const yearNote = target.minAciertosYear ? ` (ciclo ${target.minAciertosYear})` : '';

  switch (target.minAciertosConfidence) {
    case 'HIGH':
      return {
        hasTarget: true,
        label,
        qualifier: 'Meta estimada',
        disclaimer: `Basada en resultados oficiales${yearNote}. Los cortes cambian cada ciclo según la demanda — esto es una referencia, no una garantía.`,
      };
    case 'MED':
      return {
        hasTarget: true,
        label,
        qualifier: 'Meta estimada',
        disclaimer: `Estimación con confianza media${yearNote}: coinciden al menos 2 fuentes públicas, pero no hay un dato oficial confirmado. Tómala como referencia, no como un número exacto.`,
      };
    case 'LOW':
      return {
        hasTarget: true,
        label,
        qualifier: 'Meta preliminar',
        disclaimer: `Dato preliminar${yearNote}: las fuentes públicas encontradas no coinciden entre sí, así que usamos la más exigente para no subestimar tu meta. Se irá afinando con más datos.`,
      };
    case null:
    default:
      // minAciertos existe pero sin confianza registrada (dato heredado sin
      // triangular) — tratarlo como el nivel más bajo, no como HIGH por defecto.
      return {
        hasTarget: true,
        label,
        qualifier: 'Meta preliminar',
        disclaimer: `Dato preliminar${yearNote} sin verificación de fuentes registrada. Se irá afinando con más datos.`,
      };
  }
}
