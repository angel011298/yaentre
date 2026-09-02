import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  MAX_PASSWORD_LENGTH,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from '@/lib/auth/schemas';
import { safeInternalPath } from '@/lib/auth/safe-redirect';

/**
 * G65 — Cotas del borde de autenticación.
 */
describe('esquemas de auth (G65)', () => {
  it('rechaza una contraseña NUEVA de más de 72 bytes: bcrypt trunca en silencio', () => {
    // Sin la cota, "Aa1...(72 chars)" y "Aa1...(72 chars)+lo-que-sea" abren la
    // MISMA cuenta, y el usuario cree tener una frase larga que no existe.
    const larga = 'x'.repeat(MAX_PASSWORD_LENGTH + 1);
    expect(signUpSchema.safeParse({ email: 'a@b.mx', password: larga, acceptTerms: 'on' }).success).toBe(
      false
    );
    expect(updatePasswordSchema.safeParse({ password: larga }).success).toBe(false);
    expect(
      signUpSchema.safeParse({ email: 'a@b.mx', password: 'x'.repeat(MAX_PASSWORD_LENGTH), acceptTerms: 'on' })
        .success
    ).toBe(true);
  });

  it('el LOGIN no acota a 72: ahí no se crea la contraseña, se compara', () => {
    // Cortarla aquí dejaría fuera a quien ya tuviera una más larga de 72.
    const larga = 'x'.repeat(200);
    expect(signInSchema.safeParse({ email: 'a@b.mx', password: larga }).success).toBe(true);
    expect(signInSchema.safeParse({ email: 'a@b.mx', password: 'x'.repeat(2000) }).success).toBe(false);
  });

  it('acota el correo a 254 (RFC 5321) — va a la llave del límite de tasa', () => {
    const correoLargo = `${'a'.repeat(250)}@b.mx`;
    expect(forgotPasswordSchema.safeParse({ email: correoLargo }).success).toBe(false);
  });

  it('normaliza el correo a minúsculas: dos cubos de límite para la misma cuenta serían un bypass', () => {
    const parsed = signInSchema.parse({ email: '  Alumno@Ejemplo.MX ', password: 'x' });
    expect(parsed.email).toBe('alumno@ejemplo.mx');
  });
});

describe('safeInternalPath — sigue cerrado tras G65', () => {
  it('acepta rutas internas', () => {
    expect(safeInternalPath('/app/perfil', '/app')).toBe('/app/perfil');
  });

  it('rechaza destinos externos disfrazados', () => {
    for (const malo of ['https://evil.com', '//evil.com', '/\\evil.com', 'evil.com', '/app\nX']) {
      expect(safeInternalPath(malo, '/app')).toBe('/app');
    }
  });
});
