import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * G98 — la acción de checkout con la venta CERRADA.
 *
 * La pregunta que responde esta prueba no es "¿devuelve un error?", sino algo
 * más fuerte: **¿llega a tocar Stripe o la base?**. Por eso el doble de Stripe
 * y el de la capa de datos no son silenciosos: registran cada llamada, y el
 * camino cerrado exige que ese registro quede VACÍO. Si mañana alguien mueve
 * la guarda tres líneas más abajo —después de crear el Customer, o después de
 * la fila PENDING que consume una licencia Early Bird—, esta prueba se pone
 * roja aunque el `ActionResult` siga diciendo `SALES_CLOSED`.
 *
 * El rojo es alcanzable y se demuestra: un bloque quita la guarda del entorno
 * (`SALES_OPEN=true` fuera de producción) y comprueba que ENTONCES sí se llama
 * a Stripe. Una prueba que solo mira el camino cerrado no distingue "bien
 * cerrado" de "el doble nunca se usa para nada" (G71 §6 D6).
 */

const stripeCalls: string[] = [];
const dbCalls: string[] = [];

vi.mock('@/lib/auth/guards', () => ({
  requireVerifiedForPurchase: vi.fn(async () => ({
    authUser: { email: 'alumna@acierta-test.mx' },
    // Bloque 1: perfil de una persona ADULTA con fecha de nacimiento declarada,
    // para que el checkout no se detenga por el gate de menores en este test —
    // que verifica el interruptor de venta (G98), no la protección de menores.
    profile: { id: 'prof_g98', birthDate: new Date('2000-01-01T00:00:00Z') },
  })),
  requireUser: vi.fn(async () => ({
    authUser: { email: 'alumna@acierta-test.mx' },
    profile: { id: 'prof_g98' },
  })),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    customers: {
      create: async () => {
        stripeCalls.push('customers.create');
        return { id: 'cus_g98' };
      },
    },
    checkout: {
      sessions: {
        create: async () => {
          stripeCalls.push('checkout.sessions.create');
          return { id: 'cs_g98', url: 'https://checkout.stripe.test/cs_g98', customer: 'cus_g98' };
        },
      },
    },
  }),
}));

vi.mock('@/lib/db/billing', () => ({
  resolveEffectiveSeason: async () => {
    dbCalls.push('resolveEffectiveSeason');
    return 'EARLY_BIRD';
  },
  createPendingSubscription: async () => {
    dbCalls.push('createPendingSubscription');
  },
}));

vi.mock('@/lib/db/notifications', () => ({
  setNotificationPreference: vi.fn(async () => {
    dbCalls.push('setNotificationPreference');
  }),
}));

vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));

vi.mock('@/lib/analytics/server', () => ({
  trackServerEvent: vi.fn(async () => {}),
}));

vi.mock('@/lib/auth/site-url', () => ({ getSiteUrl: () => 'https://yaentre.test' }));

// Import a nivel de MÓDULO, no dentro de un `it` (G73b): el presupuesto de
// tiempo de cada prueba debe medir aserciones, no la carga del grafo.
const { startCheckoutAction, notifyWhenSalesOpenAction } = await import('@/app/actions/checkout');
const { setNotificationPreference } = await import('@/lib/db/notifications');
const { consumeRateLimit } = await import('@/lib/rate-limit/store');

const ORIGINAL = {
  salesOpen: process.env.SALES_OPEN,
  vercelEnv: process.env.VERCEL_ENV,
  stripeKey: process.env.STRIPE_SECRET_KEY,
};

function setEnv(salesOpen?: string, vercelEnv?: string, stripeKey?: string) {
  if (salesOpen === undefined) delete process.env.SALES_OPEN;
  else process.env.SALES_OPEN = salesOpen;
  if (vercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = vercelEnv;
  if (stripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = stripeKey;
}

beforeEach(() => {
  stripeCalls.length = 0;
  dbCalls.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  setEnv(ORIGINAL.salesOpen, ORIGINAL.vercelEnv, ORIGINAL.stripeKey);
});

describe('startCheckoutAction — venta cerrada', () => {
  const CLOSED_CASES: Array<[string, string | undefined, string | undefined, string | undefined]> = [
    ['SALES_OPEN ausente', undefined, undefined, 'sk_test_g98'],
    ['SALES_OPEN=false', 'false', undefined, 'sk_test_g98'],
    ['SALES_OPEN ausente en producción con llave real', undefined, 'production', 'sk_live_g98'],
    ['SALES_OPEN=true en producción con llave de PRUEBA', 'true', 'production', 'sk_test_g98'],
    ['SALES_OPEN=true en producción SIN llave', 'true', 'production', undefined],
  ];

  for (const [name, salesOpen, vercelEnv, key] of CLOSED_CASES) {
    it(`${name}: rechaza con SALES_CLOSED y NO toca Stripe ni la base`, async () => {
      setEnv(salesOpen, vercelEnv, key);

      const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });

      expect(res.ok).toBe(false);
      if (res.ok) throw new Error('inalcanzable');
      expect(res.code).toBe('SALES_CLOSED');
      expect(res.message).toMatch(/preventa/i);

      // Lo que de verdad importa: ni una llamada a Stripe, ni una escritura.
      expect(stripeCalls).toEqual([]);
      expect(dbCalls).toEqual([]);
    });
  }

  it('no consume una licencia Early Bird: `createPendingSubscription` nunca corre', async () => {
    setEnv('false', 'production', 'sk_test_g98');
    await startCheckoutAction({ plan: 'PREMIUM', art56Consent: true });
    expect(dbCalls).not.toContain('createPendingSubscription');
  });

  it('el rechazo no depende de un plan válido — cierra antes que la validación', async () => {
    setEnv(undefined, undefined, 'sk_test_g98');
    const res = await startCheckoutAction({ plan: 'PLAN_QUE_NO_EXISTE' as never, art56Consent: true });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('inalcanzable');
    expect(res.code).toBe('SALES_CLOSED');
    expect(stripeCalls).toEqual([]);
  });
});

describe('startCheckoutAction — el rojo es alcanzable (G71 §6 D6)', () => {
  it('con la venta ABIERTA, la misma acción SÍ llama a Stripe y crea la fila PENDING', async () => {
    setEnv('true', 'preview', 'sk_test_g98');

    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });

    expect(res.ok).toBe(true);
    // Si los dobles estuvieran muertos, este bloque fallaría: es la prueba de
    // que los `expect(stripeCalls).toEqual([])` de arriba comprueban algo.
    expect(stripeCalls).toEqual(['customers.create', 'checkout.sessions.create']);
    expect(dbCalls).toContain('createPendingSubscription');
  });
});

describe('notifyWhenSalesOpenAction — el consentimiento de MARKETING', () => {
  it('guarda MARKETING=true para el perfil del guard, sin recibir ningún id', async () => {
    setEnv('false', undefined, 'sk_test_g98');

    const res = await notifyWhenSalesOpenAction();

    expect(res.ok).toBe(true);
    expect(setNotificationPreference).toHaveBeenCalledWith('prof_g98', 'MARKETING', true);
    // La firma no admite argumentos: no hay forma de colar un `userProfileId`
    // por el borde (guardrail de CLAUDE.md, verificado por `security:authz`).
    expect(notifyWhenSalesOpenAction.length).toBe(0);
  });

  it('usa el limitador COMPARTIDO de Postgres, no el de memoria', async () => {
    setEnv('false', undefined, 'sk_test_g98');
    await notifyWhenSalesOpenAction();
    expect(consumeRateLimit).toHaveBeenCalledWith('SALES_WAITLIST', 'prof_g98');
  });

  it('si el limitador bloquea, NO escribe el consentimiento', async () => {
    setEnv('false', undefined, 'sk_test_g98');
    vi.mocked(consumeRateLimit).mockResolvedValueOnce({
      allowed: false,
      hits: 99,
      retryAfterSecs: 120,
    });

    const res = await notifyWhenSalesOpenAction();

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('inalcanzable');
    expect(res.code).toBe('RATE_LIMIT');
    expect(setNotificationPreference).not.toHaveBeenCalled();
  });

  it('no inicia ningún checkout: Stripe queda intacto', async () => {
    setEnv('false', undefined, 'sk_test_g98');
    await notifyWhenSalesOpenAction();
    expect(stripeCalls).toEqual([]);
  });
});
