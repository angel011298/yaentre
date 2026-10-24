/**
 * G103 — banderas del marketplace (spec horarios/cursos/temporalidad).
 *
 * Mismo patrón que `src/lib/onboarding/feature-flags.ts`: un módulo puro que
 * recibe el entorno, y el default es APAGADO — una variable ausente o con
 * cualquier valor distinto de `'true'` no enciende nada. Son variables de
 * SERVIDOR (sin `NEXT_PUBLIC_`): las lee el RSC o la acción y, si una pantalla
 * de cliente necesita saberlo, se le pasa como prop. Así, con un flag apagado
 * la ruta responde 404 y la acción se rechaza en el servidor; esconder un
 * botón no sería un cierre (G98).
 *
 *  - `FEATURE_TEACHER_AVAILABILITY`: marketplace de clases en vivo — alta y
 *    panel del profesor, disponibilidad, directorio, reserva y liquidaciones.
 *  - `FEATURE_REGULARIZACION`: la pista REGULARIZACION de las clases y la
 *    sección /regularizacion (abierta a cuentas sin plan de admisión).
 *  - `FEATURE_COURSES`: marketplace de cursos pregrabados.
 *
 * Encenderlos es decisión de Ángel (textos legales TODO-CLO y profesores
 * reales primero). Orden recomendado: docs/CHECKLIST_DEPLOY_HORARIOS_CURSOS.md.
 */
export interface MarketplaceFlags {
  liveClasses: boolean;
  regularizacion: boolean;
  courses: boolean;
}

type Env = Record<string, string | undefined>;

export function readMarketplaceFlags(env: Env = process.env): MarketplaceFlags {
  return {
    liveClasses: env.FEATURE_TEACHER_AVAILABILITY === 'true',
    regularizacion: env.FEATURE_REGULARIZACION === 'true',
    courses: env.FEATURE_COURSES === 'true',
  };
}

/** ¿Hay algo del marketplace encendido? (panel del profesor, navegación). */
export function anyMarketplaceOn(flags: MarketplaceFlags): boolean {
  return flags.liveClasses || flags.regularizacion || flags.courses;
}

/** La pista de regularización vive sobre el motor de clases: necesita ambos. */
export function regularizacionClassesOn(flags: MarketplaceFlags): boolean {
  return flags.liveClasses && flags.regularizacion;
}

/** ¿Hay algo que mostrar en /regularizacion? (clases de la pista o cursos). */
export function regularizacionSectionOn(flags: MarketplaceFlags): boolean {
  return flags.regularizacion && (flags.liveClasses || flags.courses);
}
