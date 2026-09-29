import { z } from 'zod';
import { availabilitySchema, normalizeAvailability, type AvailabilityBlock } from './availability';
import {
  containsContactInfo,
  normalizeMxPhone,
  validateClabe,
  validateCurp,
  validateRfc,
} from './identity';
import { SUBJECT_KEYS, isSubjectKey, type SubjectKey } from './tariff';

/**
 * ONBOARDING / KYC DEL PROFESOR — Bloque 2 (spec §3). Módulo PURO.
 *
 * Aquí viven dos cosas: la REGLA del carril de pago (spec §3.2, tal cual) y el
 * esquema con el que la solicitud entra al servidor. El dueño de la solicitud
 * NUNCA viene en el cuerpo: sale del guard de la acción (guardrail de
 * CLAUDE.md), por eso este esquema no tiene ningún identificador de persona.
 */

export type PaymentRail = 'ASIMILADOS' | 'COMISION_MERCANTIL';

/**
 * Regla del carril de pago (spec §3.2). Carril A SOLO si el profesor:
 *   1. dice que SÍ puede facturar,
 *   2. dio su RFC, y
 *   3. subió su Constancia de Situación Fiscal.
 * En cualquier otro caso —incluido «no respondió»— es Carril B (asimilados), el
 * DEFAULT. Estrategia de la spec: incentivar el A sin ofender, porque cada
 * profesor que factura saca su ingreso del techo RESICO de Ángel.
 */
export function determinePaymentRail(
  canInvoice: boolean,
  rfc?: string | null,
  csfPath?: string | null
): PaymentRail {
  if (canInvoice && rfc && csfPath) return 'COMISION_MERCANTIL';
  return 'ASIMILADOS';
}

/**
 * La pregunta de RFC, con la redacción EXACTA de la spec §3.2. No se pregunta
 * «¿tienes RFC?» (suena a juicio): se pregunta si puede facturar, y la opción
 * «no» se responde con calidez y un camino para darse de alta.
 */
export const RFC_QUESTION = {
  question: '¿Puedes emitir facturas por tus servicios?',
  yes: {
    label: 'Sí, tengo RFC y puedo facturar',
    hint: '¡Genial! Es la opción más ágil para ambos.',
  },
  no: {
    label: 'No por el momento',
    hint:
      'No hay problema — operamos con un esquema que no te pide facturar. Si quieres darte de alta en RFC ' +
      '(es gratis y rápido en sat.gob.mx), te podemos guiar.',
  },
} as const;

// ───────────────────────────── Esquema de la solicitud ─────────────────────────────

/** Ruta del PDF de la CSF en el bucket privado: `<carpeta del profesor>/<uuid>.pdf`. */
export const CSF_PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/;

const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;

const personName = (field: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${field}: mínimo ${min} caracteres.`)
    .max(max, `${field}: máximo ${max} caracteres.`)
    .regex(NAME_RE, `${field}: solo letras, espacios, punto, apóstrofo y guion.`);

export interface TeacherApplication {
  fullName: string;
  publicName: string;
  bio: string | null;
  phone: string;
  curp: string;
  clabe: string;
  bankName: string;
  canInvoice: boolean;
  rfc: string | null;
  csfDocumentPath: string | null;
  subjects: SubjectKey[];
  availability: AvailabilityBlock[];
  paymentRail: PaymentRail;
}

/**
 * Esquema de la solicitud. Es una FÁBRICA porque validar la CURP necesita la
 * fecha de hoy (mayoría de edad): el `now` entra como parámetro para que la
 * validación siga siendo determinista y testeable.
 */
export function buildTeacherApplicationSchema(now: Date) {
  return z
    .object({
      fullName: personName('Nombre completo', 5, 120).refine(
        (v) => v.split(/\s+/).length >= 2,
        'Escribe tu nombre y al menos un apellido.'
      ),
      publicName: personName('Nombre público', 2, 40).refine(
        (v) => !containsContactInfo(v),
        'El nombre público no puede incluir datos de contacto.'
      ),
      bio: z
        .string()
        .trim()
        .max(500, 'La presentación no puede pasar de 500 caracteres.')
        .optional()
        .transform((v) => (v ? v : null))
        .refine((v) => v === null || !containsContactInfo(v), {
          message:
            'Tu presentación no puede incluir teléfonos, correos, redes ni enlaces: las clases se agendan y se pagan dentro de YaEntre.',
        }),
      phone: z
        .string()
        .trim()
        .transform((v, ctx) => {
          const normalized = normalizeMxPhone(v);
          if (!normalized) {
            ctx.addIssue({ code: 'custom', message: 'Ingresa un teléfono de 10 dígitos.' });
            return z.NEVER;
          }
          return normalized;
        }),
      curp: z.string().transform((v, ctx) => {
        const r = validateCurp(v, now);
        if (r.ok) return r.curp;
        const message =
          r.reason === 'UNDERAGE'
            ? 'Para dar clases en YaEntre necesitas ser mayor de edad.'
            : r.reason === 'CHECK_DIGIT'
              ? 'Revisa tu CURP: el último dígito no coincide.'
              : r.reason === 'DATE'
                ? 'Revisa tu CURP: la fecha de nacimiento no es válida.'
                : 'Ingresa una CURP válida de 18 caracteres.';
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }),
      clabe: z.string().transform((v, ctx) => {
        const r = validateClabe(v);
        if (r.ok) return r.clabe;
        ctx.addIssue({
          code: 'custom',
          message:
            r.reason === 'CHECK_DIGIT'
              ? 'Revisa tu CLABE: el último dígito no coincide.'
              : 'La CLABE interbancaria tiene 18 dígitos.',
        });
        return z.NEVER;
      }),
      bankName: z.string().trim().min(2, 'Escribe el nombre de tu banco.').max(60),
      canInvoice: z.boolean(),
      rfc: z.string().trim().optional(),
      csfDocumentPath: z.string().trim().optional(),
      subjects: z
        .array(z.string())
        .min(1, 'Elige al menos una materia.')
        .max(SUBJECT_KEYS.length)
        .refine((list) => list.every(isSubjectKey), 'Materia no válida.')
        .refine((list) => new Set(list).size === list.length, 'Materia repetida.')
        .transform((list) => list as SubjectKey[]),
      availability: availabilitySchema
        .min(1, 'Agrega al menos un bloque de disponibilidad.')
        .transform((blocks) => normalizeAvailability(blocks)),
      acceptContract: z.literal(true, { message: 'Debes aceptar el contrato de comisión mercantil.' }),
      acceptNda: z.literal(true, { message: 'Debes aceptar el acuerdo de confidencialidad.' }),
      acceptRecordingPolicy: z.literal(true, { message: 'Debes aceptar la política de grabación de clases.' }),
    })
    .superRefine((data, ctx) => {
      if (!data.canInvoice) return;
      // «Sí puedo facturar» compromete RFC y constancia: sin ellos, o se
      // completan o se contesta «No por el momento».
      const rfc = data.rfc ? validateRfc(data.rfc) : null;
      if (!rfc || !rfc.ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['rfc'],
          message:
            rfc && !rfc.ok && rfc.reason === 'GENERIC'
              ? 'Ese RFC genérico no sirve para facturar tus servicios.'
              : 'Ingresa tu RFC de persona física (13 caracteres) o elige «No por el momento».',
        });
      }
      if (!data.csfDocumentPath || !CSF_PATH_RE.test(data.csfDocumentPath)) {
        ctx.addIssue({
          code: 'custom',
          path: ['csfDocumentPath'],
          message: 'Sube tu Constancia de Situación Fiscal en PDF o elige «No por el momento».',
        });
      }
    })
    .transform((data): TeacherApplication => {
      // Quien contestó «No» no lleva RFC ni constancia aunque el formulario los
      // haya mandado: el carril lo decide `determinePaymentRail`, no la UI.
      const rfc = data.canInvoice && data.rfc ? (validateRfc(data.rfc) as { ok: true; rfc: string }).rfc : null;
      const csf = data.canInvoice ? (data.csfDocumentPath ?? null) : null;
      return {
        fullName: data.fullName,
        publicName: data.publicName,
        bio: data.bio,
        phone: data.phone,
        curp: data.curp,
        clabe: data.clabe,
        bankName: data.bankName,
        canInvoice: data.canInvoice,
        rfc,
        csfDocumentPath: csf,
        subjects: data.subjects,
        availability: data.availability,
        paymentRail: determinePaymentRail(data.canInvoice, rfc, csf),
      };
    });
}

// ───────────────────────── Actualización de datos propios ─────────────────────────

export interface TeacherUpdateData {
  clabe?: string;
  bankName?: string;
  phone?: string;
  bio?: string | null;
  publicName?: string;
  availability?: AvailabilityBlock[];
  subjects?: SubjectKey[];
}

/**
 * Esquema de `PATCH /api/teachers/me` (spec §11: «actualizar datos, CLABE,
 * disponibilidad»). Es ESTRICTO: un campo que no está en la lista se rechaza con
 * 400 en vez de ignorarse en silencio. Un cliente que manda `level`, `rfc`,
 * `curp` o el identificador de otro profesor recibe un error claro —no un «ok»
 * que hizo otra cosa—, y ningún campo sensible se cuela por descuido.
 *
 * Lo que NO se puede cambiar por aquí, a propósito:
 *   · `level`  — solo por mérito automático (spec §4);
 *   · `curp`, `rfc`, carril — son la identidad fiscal: cambiarlos exige volver a
 *     pasar por la revisión del admin, no un PATCH;
 *   · `status` — la visibilidad se cambia con su propia acción.
 */
export function buildTeacherUpdateSchema() {
  return z
    .object({
      clabe: z
        .string()
        .transform((v, ctx) => {
          const r = validateClabe(v);
          if (r.ok) return r.clabe;
          ctx.addIssue({
            code: 'custom',
            message:
              r.reason === 'CHECK_DIGIT'
                ? 'Revisa tu CLABE: el último dígito no coincide.'
                : 'La CLABE interbancaria tiene 18 dígitos.',
          });
          return z.NEVER;
        })
        .optional(),
      bankName: z.string().trim().min(2, 'Escribe el nombre de tu banco.').max(60).optional(),
      phone: z
        .string()
        .trim()
        .transform((v, ctx) => {
          const normalized = normalizeMxPhone(v);
          if (!normalized) {
            ctx.addIssue({ code: 'custom', message: 'Ingresa un teléfono de 10 dígitos.' });
            return z.NEVER;
          }
          return normalized;
        })
        .optional(),
      bio: z
        .string()
        .trim()
        .max(500, 'La presentación no puede pasar de 500 caracteres.')
        .transform((v) => (v ? v : null))
        .refine((v) => v === null || !containsContactInfo(v), {
          message:
            'Tu presentación no puede incluir teléfonos, correos, redes ni enlaces: las clases se agendan y se pagan dentro de YaEntre.',
        })
        .optional(),
      publicName: personName('Nombre público', 2, 40)
        .refine((v) => !containsContactInfo(v), 'El nombre público no puede incluir datos de contacto.')
        .optional(),
      availability: availabilitySchema
        .min(1, 'Agrega al menos un bloque de disponibilidad.')
        .transform((blocks) => normalizeAvailability(blocks))
        .optional(),
      subjects: z
        .array(z.string())
        .min(1, 'Elige al menos una materia.')
        .max(SUBJECT_KEYS.length)
        .refine((list) => list.every(isSubjectKey), 'Materia no válida.')
        .refine((list) => new Set(list).size === list.length, 'Materia repetida.')
        .transform((list) => list as SubjectKey[])
        .optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, 'No mandaste ningún cambio.')
    .transform((data): TeacherUpdateData => data);
}
