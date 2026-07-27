import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Ingresa un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  acceptTerms: z.string().refine(
    (val) => val === 'on',
    'Debes aceptar los términos y condiciones para continuar.'
  ),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Ingresa un correo válido.'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});
