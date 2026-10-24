import { LOCAL } from './stack-env';

/**
 * G103 — cuentas de prueba de la pila LOCAL. Las contraseñas se generan en
 * cada corrida (`global-setup.ts`) y viajan solo por el entorno del proceso:
 * nunca se escriben a disco ni existen fuera del Auth local.
 */
export const PERSONAS = {
  admin: { email: LOCAL.masterAdminEmail, role: 'ADMIN' as const },
  profe: { email: `profe@${LOCAL.emailDomain}`, role: 'STUDENT' as const },
  premium: { email: `premium@${LOCAL.emailDomain}`, role: 'STUDENT' as const },
  libre: { email: `libre@${LOCAL.emailDomain}`, role: 'STUDENT' as const },
  vence: { email: `vence@${LOCAL.emailDomain}`, role: 'STUDENT' as const },
};
export type PersonaName = keyof typeof PERSONAS;

export function passwordOf(name: PersonaName): string {
  const pw = process.env[`E2E_PW_${name.toUpperCase()}`];
  if (!pw) throw new Error(`Sin contraseña para ${name}: ¿corrió global-setup?`);
  return pw;
}
