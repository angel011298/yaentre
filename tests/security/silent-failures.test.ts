import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * G73b — El defecto que G73 destapó no fue un GRANT mal escrito: fue que un
 * control de seguridad podía fallar sin dejar rastro. Estas pruebas fijan las
 * dos garantías que lo impiden en adelante:
 *
 *   1. Un fallo de control SIEMPRE produce un evento de Sentry, aunque la
 *      operación continúe (fail-open).
 *   2. `sendEmail` distingue "no se envió porque no hay credencial" de
 *      "no se envió porque reventó" — antes ambas devolvían `ok: true`.
 *
 * Son pruebas de la MAQUINARIA de observabilidad. Que los controles bloqueen
 * de verdad en producción lo verifica `pnpm security:live` contra
 * https://yaentre.com; un test unitario no puede probar eso y no debe fingir
 * que lo hace (lección de G71 §6 D6).
 */

const captureException = vi.fn();
const withScope = vi.fn((fn: (scope: unknown) => void) => {
  fn({
    setLevel: vi.fn(),
    setTag: vi.fn(),
    setFingerprint: vi.fn(),
    setContext: vi.fn(),
  });
});

vi.mock('@sentry/nextjs', () => ({ captureException, withScope }));

const emailsSend = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: emailsSend };
  },
}));
vi.mock('server-only', () => ({}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('reportControlFailure', () => {
  it('manda el fallo a Sentry aunque la operación siga (fail-open)', async () => {
    const { reportControlFailure } = await import('@/lib/observability/report');
    reportControlFailure('rate_limit', 'fail-open', new Error('42501 permission denied'), {
      scope: 'SIGN_IN',
    });
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('también reporta cuando lo lanzado no es un Error', async () => {
    const { reportControlFailure } = await import('@/lib/observability/report');
    reportControlFailure('auth_session', 'fail-closed', 'cadena suelta');
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('nunca lanza, ni siquiera si Sentry revienta — no puede tumbar lo que reporta', async () => {
    withScope.mockImplementationOnce(() => {
      throw new Error('Sentry caído');
    });
    const { reportControlFailure } = await import('@/lib/observability/report');
    expect(() => reportControlFailure('rate_limit', 'fail-open', new Error('x'))).not.toThrow();
  });

  it('deja rastro en consola aunque Sentry no esté configurado', async () => {
    const spy = vi.spyOn(console, 'error');
    const { reportControlFailure } = await import('@/lib/observability/report');
    reportControlFailure('rate_limit', 'fail-open', new Error('x'), { scope: 'SIGN_IN' });
    expect(spy).toHaveBeenCalled();
  });
});

describe('reportSilentDegradation', () => {
  it('reporta la degradación con nivel de aviso', async () => {
    const { reportSilentDegradation } = await import('@/lib/observability/report');
    reportSilentDegradation('adaptive_selection', new Error('DB caída'), { fallback: 'random' });
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});

describe('sendEmail — el fallo ya no se disfraza de éxito', () => {
  it('sin credencial devuelve mode "logged" y ok:true (modo desarrollo legítimo)', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('VERCEL_ENV', 'development');
    vi.resetModules();
    const { sendEmail } = await import('@/lib/email/client');
    const r = await sendEmail({ to: 'a@b.mx', subject: 's', html: '<p>h</p>' });
    expect(r).toEqual({ ok: true, mode: 'logged' });
    expect(captureException).not.toHaveBeenCalled();
  });

  it('sin credencial EN PRODUCCIÓN sí reporta: ahí no es modo desarrollo', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.resetModules();
    const { sendEmail } = await import('@/lib/email/client');
    await sendEmail({ to: 'a@b.mx', subject: 's', html: '<p>h</p>' });
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('si Resend devuelve error, ok:false y mode "failed" — NO "logged" con ok:true', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.resetModules();
    emailsSend.mockResolvedValueOnce({ error: { message: 'dominio no verificado' }, data: null });
    const { sendEmail } = await import('@/lib/email/client');
    const r = await sendEmail({ to: 'a@b.mx', subject: 's', html: '<p>h</p>' });
    expect(r.ok).toBe(false);
    expect(r.mode).toBe('failed');
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('si la llamada lanza, tampoco propaga: devuelve ok:false y reporta', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.resetModules();
    emailsSend.mockRejectedValueOnce(new Error('ECONNRESET'));
    const { sendEmail } = await import('@/lib/email/client');
    const r = await sendEmail({ to: 'a@b.mx', subject: 's', html: '<p>h</p>' });
    expect(r).toEqual({ ok: false, mode: 'failed' });
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('un envío correcto devuelve mode "sent" y no reporta nada', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.resetModules();
    emailsSend.mockResolvedValueOnce({ error: null, data: { id: 'abc' } });
    const { sendEmail } = await import('@/lib/email/client');
    const r = await sendEmail({ to: 'a@b.mx', subject: 's', html: '<p>h</p>' });
    expect(r).toEqual({ ok: true, mode: 'sent' });
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe('unsubscribeSecret — el respaldo predecible ya no es invisible', () => {
  it('en producción sin CRON_SECRET reporta el fallo de control', async () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.resetModules();
    const { unsubscribeSecret } = await import('@/lib/email/links');
    const secreto = unsubscribeSecret();
    // El respaldo se conserva (si no, el correo dejaría de funcionar del todo)…
    expect(secreto).toBe('dev-only-insecure-unsubscribe-secret');
    // …pero usarlo en producción ya no pasa desapercibido.
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('con CRON_SECRET configurado no reporta nada', async () => {
    vi.stubEnv('CRON_SECRET', 'secreto-real-de-produccion');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.resetModules();
    const { unsubscribeSecret } = await import('@/lib/email/links');
    expect(unsubscribeSecret()).toBe('secreto-real-de-produccion');
    expect(captureException).not.toHaveBeenCalled();
  });

  it('en desarrollo el respaldo es silencioso a propósito', async () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('VERCEL_ENV', 'development');
    vi.resetModules();
    const { unsubscribeSecret } = await import('@/lib/email/links');
    expect(unsubscribeSecret()).toBe('dev-only-insecure-unsubscribe-secret');
    expect(captureException).not.toHaveBeenCalled();
  });
});
