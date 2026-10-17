import type { ConfidenceLevel } from '@prisma/client';
import { formatEntrometroTarget } from '@/lib/adaptive/entrometro';
import { campusesFor, nonDefaultModalities } from './career-catalog';

/**
 * G101 — lo que el selector de carrera necesita de cada opción. Puro: lo
 * arman el onboarding (servidor) y el perfil (servidor) con la MISMA función,
 * para que la carrera se vea igual en los dos lados.
 */
export interface CareerPickerItem {
  id: string;
  name: string;
  /** Planteles / unidades académicas, del catálogo oficial. */
  campuses: readonly string[];
  /** Sistemas además del presencial («Abierto», «A distancia»…). */
  extraModalities: readonly string[];
  /** Meta de aciertos, solo si hay dato documentado. */
  target: { label: string; qualifier: string } | null;
}

export interface CareerRow {
  id: string;
  name: string;
  minAciertos: number | null;
  minAciertosYear: number | null;
  minAciertosConfidence: ConfidenceLevel | null;
}

export function toCareerPickerItems(areaCode: string, careers: readonly CareerRow[]): CareerPickerItem[] {
  return careers
    .map((c) => {
      const t = formatEntrometroTarget(c);
      return {
        id: c.id,
        name: c.name,
        campuses: campusesFor(areaCode, c.name),
        extraModalities: nonDefaultModalities(areaCode, c.name),
        target: t.hasTarget ? { label: t.label, qualifier: t.qualifier } : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Minúsculas y sin acentos: «ingenieria» encuentra «Ingeniería». */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Filtra por nombre O plantel, con todas las palabras de la búsqueda (en
 * cualquier orden): «comp fes» encuentra «Ingeniería en Computación · FES
 * Aragón». Consulta vacía ⇒ todas.
 */
export function filterCareers(items: readonly CareerPickerItem[], query: string): CareerPickerItem[] {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((item) => {
    const haystack = normalizeForSearch([item.name, ...item.campuses].join(' '));
    return words.every((w) => haystack.includes(w));
  });
}
