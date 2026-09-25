import { z } from 'zod';

/**
 * G65 — cotas de longitud en el borde de auth.
 *
 * `MAX_PASSWORD_LENGTH` = 72 no es capricho: bcrypt (el algoritmo que usa
 * Supabase Auth) TRUNCA en silencio a 72 bytes. Sin la cota, alguien que
 * elige una frase de 90 caracteres cree tener una contraseña más fuerte de la
 * que realmente se guarda, y dos contraseñas distintas que compartan los
 * primeros 72 bytes abren la misma cuenta. Mejor rechazarla y decirlo.
 *
 * El correo se acota a 254 (RFC 5321) para que ninguna cadena arbitraria del
 * exterior llegue larga a la base ni a la llave del límite de tasa.
 */
export const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(MAX_EMAIL_LENGTH, 'Ese correo es demasiado largo.')
  .email('Ingresa un correo válido.');

const newPasswordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(MAX_PASSWORD_LENGTH, `La contraseña no puede pasar de ${MAX_PASSWORD_LENGTH} caracteres.`);

export const signUpSchema = z.object({
  email: emailField,
  password: newPasswordField,
  acceptTerms: z.string().refine(
    (val) => val === 'on',
    'Debes aceptar los términos y condiciones para continuar.'
  ),
  // Bloque 1 — registro de ALUMNO: fecha de nacimiento + declaración de que es
  // verídica. Opcionales en el schema porque el registro de TUTOR (adulto) no
  // los pide; el Server Action los EXIGE cuando el rol es STUDENT y valida la
  // edad con `parseDeclaredBirthDate` (bloqueo < 15 años). El formato lo revisa
  // ahí porque depende de `now` y devuelve motivos de rechazo específicos.
  birthDate: z.string().optional(),
  ageDeclaration: z.string().optional(),
});

export const signInSchema = z.object({
  email: emailField,
  // Sin `max` a propósito: aquí no se CREA una contraseña, se compara. Cortar
  // la entrada dejaría fuera a quien ya tenga una más larga de 72.
  password: z.string().min(1, 'Ingresa tu contraseña.').max(1024),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const updatePasswordSchema = z.object({
  password: newPasswordField,
});
