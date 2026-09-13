import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresiones de los bugs REALES encontrados en el smoke test de producción
 * de G10. Cada bloque documenta el fallo original para que no reaparezca.
 */

// ─────────────── BUG G10-1: un tutor atrapado en el asistente de alumno ───────────────

/**
 * Antes: `requireOnboarding` comprobaba SOLO el onboarding, nunca el rol. Un
 * tutor (role=PARENT) tiene `onboardingStep=0` de por vida — nunca pasa por el
 * asistente, que es de ALUMNO — así que el guard lo mandaba a `/onboarding`.
 *
 * `(app)/layout.tsx` ya cubría sus rutas comprobando el rol ANTES del
 * onboarding (y su comentario documenta exactamente este riesgo), pero
 * `/simulador` vive FUERA del grupo `(app)` a propósito (pantalla aislada, sin
 * nav) y su única defensa era `requireOnboarding`. Resultado, reproducido en
 * producción: un tutor que abría /simulador aterrizaba en "¿Qué examen vas a
 * presentar?" sin ninguna salida de vuelta a /tutor.
 *
 * El orden importa: rol PRIMERO, onboarding después.
 */

const redirectMock = vi.fn((dest: string) => {
  // `redirect()` de Next.js nunca retorna: lanza. Reproducirlo es lo que
  // permite afirmar CUÁL redirección ocurrió primero.
  throw new Error(`REDIRECT:${dest}`);
});

const findUniqueMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (dest: string) => redirectMock(dest),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { userProfile: { findUnique: (...a: unknown[]) => findUniqueMock(...a) } },
}));

vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: () => getUserMock() } }),
}));

// G73b: `guards.ts` importa `@/lib/observability/report`, que a su vez hace
// `import * as Sentry from '@sentry/nextjs'`. Un test unitario del guard no
// tiene por qué inicializar el SDK real —medido: 672 ms de carga de grafo con
// caché tibia y sin contención— así que se sustituye por un doble inerte.
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  withScope: vi.fn(),
}));

// El módulo se carga UNA vez, en ámbito de módulo, no dentro de un `it`.
//
// Antes estaba dentro de la prueba, y eso le cobraba la carga del grafo al
// presupuesto de 5 s del PRIMER test del archivo. Con la caché de
// transformación fría y los 61 archivos de la suite compitiendo en paralelo,
// esa carga llegó a 23.4 s y solo esa prueba se caía — verde al correrla en
// aislamiento y verde en la siguiente corrida con la caché ya tibia. Un rojo
// intermitente enseña a ignorar la prueba (CLAUDE.md, G69 §8.4), así que se
// corrige la causa —medir la conducta, no al cargador— en vez de subir el
// número. Mismo patrón que `tests/stripe/webhook-route.test.ts`.
const { requireOnboarding } = await import('@/lib/auth/guards');

async function callRequireOnboarding() {
  return requireOnboarding();
}

describe('BUG G10-1 — un tutor nunca debe caer en el asistente de alumno', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-uid', email: 't@x.mx' } } });
  });

  it('PARENT con onboardingStep=0 va a /tutor, NO a /onboarding', async () => {
    findUniqueMock.mockResolvedValue({ id: 'p1', userId: 'auth-uid', role: 'PARENT', onboardingStep: 0 });

    await expect(callRequireOnboarding()).rejects.toThrow('REDIRECT:/tutor');
    expect(redirectMock).toHaveBeenCalledWith('/tutor');
    expect(redirectMock).not.toHaveBeenCalledWith('/onboarding');
  });

  it('el rol se comprueba ANTES que el onboarding (orden, no solo destino)', async () => {
    // Un PARENT con onboarding "completo" tampoco pertenece a rutas de alumno.
    findUniqueMock.mockResolvedValue({ id: 'p1', userId: 'auth-uid', role: 'PARENT', onboardingStep: 3 });

    await expect(callRequireOnboarding()).rejects.toThrow('REDIRECT:/tutor');
  });

  it('un STUDENT sin terminar el onboarding SIGUE yendo a /onboarding', async () => {
    findUniqueMock.mockResolvedValue({ id: 's1', userId: 'auth-uid', role: 'STUDENT', onboardingStep: 1 });

    await expect(callRequireOnboarding()).rejects.toThrow('REDIRECT:/onboarding');
  });

  it('un STUDENT con onboarding completo pasa sin redirección', async () => {
    const perfil = { id: 's1', userId: 'auth-uid', role: 'STUDENT', onboardingStep: 3 };
    findUniqueMock.mockResolvedValue(perfil);

    const res = await callRequireOnboarding();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(res.profile).toEqual(perfil);
  });
});
