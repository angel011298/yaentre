/**
 * Textos de consentimiento y su VERSIONADO — Bloque 1 (cierre legal).
 *
 * Este módulo es el ÚNICO punto donde viven los textos que el usuario acepta y
 * las VERSIONES con las que se sellan esas aceptaciones. Cuando un consentimiento
 * se guarda en la base (art. 56 en `subscriptions`, o los del tutor en
 * `tutor_consents`), se guarda JUNTO con la versión que estaba vigente aquí —
 * así queda registro de QUÉ texto exacto aceptó la persona, no solo que aceptó.
 *
 * ── Punto de integración para la sesión CLO (handoff §3.4 / Bloque 1 · item 6) ──
 *
 * Los textos definitivos de Términos y Condiciones, Aviso de Privacidad (integral
 * y simplificado), Política de Reembolsos y los textos de consentimiento los
 * PRODUCE la sesión CLO y llegan en un `.md` aparte. Este archivo deja el «dónde»
 * y el «cómo»:
 *
 *   1. Reemplaza el contenido de las constantes marcadas `// TODO(CLO)`.
 *   2. Sube la versión correspondiente (`*_CONSENT_VERSION`) SOLO si el cambio de
 *      texto altera lo que la persona está aceptando. Subir la versión hace que
 *      las aceptaciones nuevas se sellen con la versión nueva; las viejas
 *      conservan la suya (evidencia histórica intacta).
 *   3. Las páginas legales completas viven en `app/(public)/legal/*` (T&C,
 *      privacidad) y `app/(public)/legal/reembolsos` (a crear por CLO) con sus
 *      marcadores «EDITAR ANTES DE PUBLICAR»; están en `noindex` hasta que se
 *      completen.
 *
 * Regla del handoff §8 (guardrails de copy): nunca «garantía», nunca «nuestros
 * profesores»/«equipo docente», nunca «próximamente» sobre algo que no existe.
 */

// ─────────────────────────── Versiones de consentimiento ───────────────────────────

/**
 * Versión del texto del art. 56 LFPC (renuncia al derecho de revocación por
 * prestación inmediata) que se muestra en el checkout. El texto de abajo es el
 * EXACTO fijado en el handoff §3.4 — está confirmado, no es placeholder. Si
 * llega a cambiar, subir esta versión.
 */
export const ART56_CONSENT_VERSION = '2026-10-01';

/**
 * Versión del paquete de consentimientos del TUTOR (datos + marketing +
 * analítica + grabación). Los textos descriptivos de abajo son PLACEHOLDER hasta
 * que CLO entregue los definitivos; subir esta versión al reemplazarlos.
 */
export const TUTOR_CONSENT_VERSION = '2026-10-01-draft';

/**
 * Versión de los documentos legales de cara al público (T&C + Aviso de
 * Privacidad). La usa el registro para sellar la aceptación de términos. Sube
 * cuando CLO publique la versión final (y se quite el `noindex` de las páginas).
 */
export const LEGAL_DOCS_VERSION = '2026-07-26-draft';

// ─────────────────────────── Art. 56 LFPC (checkout) ───────────────────────────

/**
 * Casilla OBLIGATORIA y NO premarcada del checkout (handoff §3.4, texto exacto).
 * El acceso se activa de inmediato al confirmarse el pago, por lo que —por ley—
 * no aplica el derecho de revocación de 10 días hábiles del art. 56 LFPC. Está
 * PROHIBIDO escribir «sin reembolsos» (art. 90-VI LFPC lo tiene por no puesto).
 */
export const ART56_CHECKOUT_CONSENT_TEXT =
  'Entiendo que mi acceso a YaEntre se activa de inmediato al confirmarse el pago, ' +
  'y solicito expresamente que así sea. Acepto que, por tratarse de un servicio que ' +
  'se presta de inmediato, no aplica el derecho de revocación del artículo 56 de la ' +
  'Ley Federal de Protección al Consumidor.';

// ─────────────────────────── Consentimientos del tutor ───────────────────────────

export interface ConsentClause {
  /** Clave estable; NO cambiarla aunque cambie el texto (liga el checkbox al campo). */
  key: 'data' | 'marketing' | 'analytics' | 'recording';
  /** Etiqueta corta junto al checkbox. */
  label: string;
  /** Descripción de qué se acepta. Va ANTES del control (handoff §3.4/§8). */
  description: string;
  /** true = obligatorio para menores (el flujo no continúa sin él). */
  required: boolean;
}

/**
 * Los cuatro consentimientos que el tutor de un menor de 18 otorga en la liga de
 * confirmación (handoff §3.1 «la liga del tutor sirve doble: consentimiento de
 * datos + ratificación del contrato» y §3.4/item 4 «marketing/analítica/
 * grabación»). El de datos es obligatorio; los otros tres son opcionales y
 * granulares (se pueden aceptar por separado).
 *
 * TODO(CLO): reemplazar `description` de cada cláusula por el texto definitivo y
 * subir `TUTOR_CONSENT_VERSION`. El de grabación debe nombrar a Google como
 * encargado (handoff §4.5) cuando el aula/grabación entre en operación (Bloque 2).
 */
export const TUTOR_CONSENT_CLAUSES: readonly ConsentClause[] = [
  {
    key: 'data',
    label: 'Autorizo el tratamiento de datos y confirmo la inscripción',
    // TODO(CLO): texto definitivo (ratificación del contrato + tratamiento de
    // datos del menor conforme a la LFPDPPP vigente, DOF 20-mar-2025).
    description:
      'PLACEHOLDER (texto definitivo lo entrega CLO): Como madre, padre o tutor, ' +
      'autorizo que la persona menor de edad a mi cargo use YaEntre y confirmo ' +
      'que acepto, en su nombre, los Términos y Condiciones y el Aviso de ' +
      'Privacidad. Autorizo el tratamiento de sus datos personales para prestar ' +
      'el servicio educativo.',
    required: true,
  },
  {
    key: 'marketing',
    label: 'Acepto recibir avisos y promociones de YaEntre',
    // TODO(CLO): texto definitivo. Debe decir cómo darse de baja (opt-out).
    description:
      'PLACEHOLDER (texto definitivo lo entrega CLO): Autorizo que YaEntre envíe ' +
      'correos con novedades y promociones. Puedo retirar este consentimiento en ' +
      'cualquier momento desde el perfil o desde el enlace de baja de cada correo.',
    required: false,
  },
  {
    key: 'analytics',
    label: 'Acepto el uso de datos de uso para mejorar el producto',
    // TODO(CLO): texto definitivo (analítica / PostHog como encargado).
    description:
      'PLACEHOLDER (texto definitivo lo entrega CLO): Autorizo el uso de datos de ' +
      'navegación y uso de la plataforma con fines de análisis y mejora del ' +
      'producto.',
    required: false,
  },
  {
    key: 'recording',
    label: 'Acepto la grabación de clases en vivo (cuando estén disponibles)',
    // TODO(CLO): texto definitivo. Debe nombrar a Google como encargado y la
    // política de retención (handoff §4.5). Función inactiva hasta Bloque 2.
    description:
      'PLACEHOLDER (texto definitivo lo entrega CLO): Autorizo que, cuando la ' +
      'persona menor a mi cargo tome clases en vivo, estas se graben para fines ' +
      'educativos y de control de calidad, conforme al Aviso de Privacidad.',
    required: false,
  },
];

/** Solo las claves de los consentimientos opcionales (marketing/analytics/recording). */
export type OptionalTutorConsentKey = Exclude<ConsentClause['key'], 'data'>;
