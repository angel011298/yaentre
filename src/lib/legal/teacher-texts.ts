/**
 * Textos que el PROFESOR acepta en el onboarding y sus VERSIONES — Bloque 2
 * (spec §3.1: contrato de comisión mercantil, NDA y política de grabación).
 *
 * Mismo criterio que `consent-texts.ts` (Bloque 1): este módulo es el ÚNICO
 * lugar donde viven los textos y las versiones con las que se sella la
 * aceptación. `Teacher.contractVersion` guarda la versión que aceptó cada
 * profesor, así queda registro de QUÉ texto exacto firmó, no solo de que firmó.
 *
 * ── Punto de integración para la sesión CLO ──────────────────────────────────
 *
 * Los textos DEFINITIVOS los produce la sesión CLO. Reemplaza el contenido de
 * las constantes marcadas `TODO(CLO)` y sube la versión SOLO si el cambio altera
 * lo que el profesor acepta: subirla hace que las aceptaciones nuevas se sellen
 * con la versión nueva; las viejas conservan la suya (evidencia histórica).
 *
 * ── Lenguaje obligatorio (contexto maestro §3.2, §8 y spec §13) ─────────────
 *
 *  · «profesores independientes verificados en YaEntre» — nunca «nuestros
 *    profesores» ni «equipo docente».
 *  · El pago se llama «liquidación de comisión mercantil» — nunca «sueldo»,
 *    «salario», «nómina» ni «honorarios».
 *  · Nunca «garantía»; nunca «próximamente» sobre algo que no existe.
 *  · Ninguna clase presencial: activaría el Cap. IX Bis LFT.
 */

/** Versión del contrato de adhesión (comisión mercantil). Sube al reemplazar el texto. */
export const TEACHER_CONTRACT_VERSION = '2026-10-draft';
/** Versión del acuerdo de confidencialidad. */
export const TEACHER_NDA_VERSION = '2026-10-draft';
/** Versión de la política de grabación de clases. */
export const TEACHER_RECORDING_POLICY_VERSION = '2026-10-draft';

export interface TeacherAgreement {
  key: 'contract' | 'nda' | 'recording';
  title: string;
  /** Resumen que se ve JUNTO a la casilla, antes del control (contexto maestro §8). */
  summary: string;
  /** Texto completo. PLACEHOLDER hasta que CLO entregue el definitivo. */
  body: string;
  version: string;
}

export const TEACHER_AGREEMENTS: readonly TeacherAgreement[] = [
  {
    key: 'contract',
    title: 'Contrato de comisión mercantil (adhesión)',
    summary:
      'Actúas como profesor independiente verificado en YaEntre: tú prestas el servicio directamente al alumno ' +
      'y YaEntre actúa como comisionista. Recibes una liquidación de comisión mercantil por cada clase impartida.',
    // TODO(CLO): texto definitivo del contrato de adhesión (arts. 273-308 del Código de Comercio).
    body:
      'PLACEHOLDER (texto definitivo lo entrega CLO). Contrato de adhesión de comisión mercantil entre el ' +
      'profesor independiente y YaEntre: objeto, comisión de 25% sobre el valor de la clase, reserva de ' +
      'desempeño de 15% retenida 30 días naturales con fecha de liberación visible, prohibición de clases ' +
      'presenciales y de agendar o cobrar fuera de la plataforma, y terminación.',
    version: TEACHER_CONTRACT_VERSION,
  },
  {
    key: 'nda',
    title: 'Acuerdo de confidencialidad',
    summary:
      'Te comprometes a tratar con confidencialidad los contenidos de YaEntre y los datos de los alumnos ' +
      'que conozcas por las clases, muchos de ellos menores de edad.',
    // TODO(CLO): texto definitivo del NDA.
    body:
      'PLACEHOLDER (texto definitivo lo entrega CLO). Acuerdo de confidencialidad sobre contenidos y datos ' +
      'personales de alumnos.',
    version: TEACHER_NDA_VERSION,
  },
  {
    key: 'recording',
    title: 'Política de grabación de clases',
    summary:
      'Las clases se pueden grabar SOLO con el consentimiento del alumno (o de su tutor si es menor de edad). ' +
      'Las grabaciones tienen control de acceso y se conservan por un plazo determinado.',
    // TODO(CLO): texto definitivo. Debe nombrar a Google como encargado del tratamiento y el plazo de retención.
    body:
      'PLACEHOLDER (texto definitivo lo entrega CLO). Política de grabación: consentimiento previo, ' +
      'finalidad educativa y de control de calidad, control de acceso, plazo de retención, y Google como ' +
      'encargado del tratamiento.',
    version: TEACHER_RECORDING_POLICY_VERSION,
  },
];
