import { z } from 'zod';
import { isCatalogSubject } from './subject-catalog';
import { isValidClabe, isValidCurp, isValidRfcPersonaFisica } from './onboarding';

/**
 * G103 — validación Zod en el borde de las acciones del profesor. Ningún
 * esquema acepta un id de usuario: el dueño sale SIEMPRE del guard
 * (`pnpm security:authz` lo vigila).
 */

const trackSchema = z.enum(['ADMISION', 'REGULARIZACION']);

export const teacherApplicationSchema = z
  .object({
    displayName: z.string().trim().min(3, 'Escribe cómo quieres aparecer (mínimo 3 letras).').max(40),
    bio: z.string().trim().max(600, 'Máximo 600 caracteres.').optional().nullable(),
    fullName: z.string().trim().min(5, 'Escribe tu nombre completo.').max(120),
    curp: z.string().trim().refine(isValidCurp, 'Revisa tu CURP: son 18 caracteres.'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{10,16}$/, 'Escribe un teléfono de 10 dígitos.'),
    clabe: z.string().trim().refine(isValidClabe, 'Revisa tu CLABE: son 18 dígitos y uno no coincide.'),
    bankName: z.string().trim().min(2, 'Escribe el nombre de tu banco.').max(60),
    canInvoice: z.boolean(),
    rfc: z.string().trim().max(13).optional().nullable(),
    subjects: z
      .array(z.object({ subjectKey: z.string().min(2).max(40), track: trackSchema }).strict())
      .min(1, 'Elige al menos una materia.')
      .max(16),
    acceptContract: z.literal(true, 'Acepta el contrato para continuar.'),
    acceptNda: z.literal(true, 'Acepta el acuerdo de confidencialidad para continuar.'),
    acceptRecording: z.literal(true, 'Acepta la política de grabación para continuar.'),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.canInvoice && !(v.rfc && isValidRfcPersonaFisica(v.rfc))) {
      ctx.addIssue({ code: 'custom', path: ['rfc'], message: 'Si facturas, escribe tu RFC (13 caracteres).' });
    }
    for (const s of v.subjects) {
      if (!isCatalogSubject(s.track, s.subjectKey)) {
        ctx.addIssue({ code: 'custom', path: ['subjects'], message: 'Una de las materias no existe.' });
        break;
      }
    }
  });

export type TeacherApplicationRaw = z.input<typeof teacherApplicationSchema>;

export const teacherPublicProfileSchema = z
  .object({
    displayName: z.string().trim().min(3).max(40),
    bio: z.string().trim().max(600).optional().nullable(),
  })
  .strict();

const cuid = z.string().regex(/^c[a-z0-9]{20,40}$/, 'Identificador inválido.');

export const bookClassSchema = z
  .object({
    teacherId: cuid,
    subjectKey: z.string().min(2).max(40).regex(/^[a-z_]+$/),
    track: trackSchema,
    startsAt: z.iso.datetime(),
    durationMinutes: z.union([z.literal(50), z.literal(80)]),
    idempotencyKey: z.uuid(),
    adultDeclared: z.literal(true, 'Confirma que eres mayor de edad para reservar.'),
  })
  .strict();

export type BookClassInput = z.input<typeof bookClassSchema>;

export const classIdSchema = z.object({ classSessionId: cuid }).strict();
