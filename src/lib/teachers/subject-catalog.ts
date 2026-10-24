import type { ClassTrack } from '@prisma/client';
import { BASE_RATES, BASE_RATES_REGULARIZACION } from './tariff';

/**
 * G103 — catálogo de materias de las clases en vivo, por pista (spec §2.10:
 * «tabla/constante editable, no hardcodeado en UI»). Las claves son las de las
 * tablas B del tabulador; aquí solo vive el nombre visible. Una materia nueva
 * se agrega en `tariff.ts` (con su tarifa) y aquí (con su nombre); la
 * interfaz, el alta del profesor y el directorio salen de esta lista.
 *
 * Las de REGULARIZACION llevan prefijo `reg_`: la misma materia en dos pistas
 * es una clave distinta, así que un profesor puede dar «Matemáticas» de
 * admisión sin dar la de regularización (o al revés).
 */
const LABELS: Record<string, string> = {
  matematicas: 'Matemáticas',
  fisica: 'Física',
  quimica: 'Química',
  biologia: 'Biología',
  espanol: 'Español',
  ingles: 'Inglés',
  historia: 'Historia',
  geografia: 'Geografía',
  filosofia: 'Filosofía',
  literatura: 'Literatura',
  habilidad_verbal: 'Habilidad verbal',
  habilidad_matematica: 'Habilidad matemática',
  ciencias_sociales: 'Ciencias sociales',
  razonamiento: 'Razonamiento',
  reg_matematicas: 'Matemáticas',
  reg_algebra: 'Álgebra',
  reg_calculo: 'Cálculo',
  reg_estadistica: 'Estadística',
  reg_fisica: 'Física',
  reg_quimica: 'Química',
  reg_biologia: 'Biología',
  reg_espanol: 'Español',
  reg_ingles: 'Inglés',
  reg_historia: 'Historia',
  reg_geografia: 'Geografía',
};

export const TRACK_LABELS: Record<ClassTrack, string> = {
  ADMISION: 'Preparación para el examen de admisión',
  REGULARIZACION: 'Regularización',
};

export interface CatalogSubject {
  key: string;
  label: string;
  track: ClassTrack;
}

export function subjectsForTrack(track: ClassTrack): CatalogSubject[] {
  const table = track === 'REGULARIZACION' ? BASE_RATES_REGULARIZACION : BASE_RATES;
  return Object.keys(table).map((key) => ({ key, label: LABELS[key] ?? key, track }));
}

export function subjectLabel(subjectKey: string): string {
  return LABELS[subjectKey] ?? subjectKey;
}

export function isCatalogSubject(track: ClassTrack, subjectKey: string): boolean {
  return subjectsForTrack(track).some((s) => s.key === subjectKey);
}
