import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { InviteAndEarn } from '@/components/referrals/InviteAndEarn';
import type { ReferralHistoryItem, ReferralOverview } from '@/lib/db/referrals';

/**
 * «Invita y gana» se pinta con datos reales sin reventar, dice lo que debe decir y
 * NUNCA lo que no (nombres de compradores, marcas de antifraude, «garantía»…).
 * Y un barrido de copy sobre lo que Bloque 3 le muestra a una persona: las palabras
 * que el handoff §3.2/§8 prohíbe en TODO el producto.
 */

const NOW = new Date('2026-11-10T12:00:00.000Z');
const overview: ReferralOverview = {
  code: { id: 'c1', code: 'AB2CD3EF', active: true },
  balanceCents: 30_000,
  nextExpiryAt: new Date('2027-10-01T18:00:00.000Z'),
  pendingCents: 15_000,
  pendingCount: 1,
  successfulCount: 2,
};
const history: ReferralHistoryItem[] = [
  { id: 'a', createdAt: new Date('2026-10-01T12:00:00Z'), commissionCents: 15_000, status: 'ACCRUED', accrueAfter: new Date('2026-10-08T12:00:00Z'), underReview: false, reversedForRefund: false },
  { id: 'b', createdAt: new Date('2026-11-08T12:00:00Z'), commissionCents: 15_000, status: 'PENDING', accrueAfter: new Date('2026-11-15T12:00:00Z'), underReview: false, reversedForRefund: false },
  { id: 'c', createdAt: new Date('2026-11-01T12:00:00Z'), commissionCents: 15_000, status: 'PENDING', accrueAfter: new Date('2026-11-08T12:00:00Z'), underReview: true, reversedForRefund: false },
  { id: 'd', createdAt: new Date('2026-10-20T12:00:00Z'), commissionCents: 15_000, status: 'REVERSED', accrueAfter: new Date('2026-10-27T12:00:00Z'), underReview: false, reversedForRefund: true },
];

const html = (over: Partial<Parameters<typeof InviteAndEarn>[0]> = {}) =>
  renderToStaticMarkup(
    InviteAndEarn({ overview, history, url: 'https://yaentre.com/r/AB2CD3EF', now: NOW, ...over })
  );

describe('InviteAndEarn', () => {
  it('muestra el código, el enlace, el saldo, el próximo vencimiento y los conteos', () => {
    const out = html();
    expect(out).toContain('Invita y gana');
    expect(out).toContain('AB2CD3EF');
    expect(out).toContain('https://yaentre.com/r/AB2CD3EF');
    expect(out).toContain('$300.00'); // crédito disponible
    expect(out).toContain('$150.00'); // en verificación
    expect(out).toContain('1 oct 2027');
    expect(out).toMatch(/Referidos exitosos/);
    expect(out).toContain('/api/referrals/qr/AB2CD3EF?download=1');
  });

  it('cada estado del historial tiene su marca de texto (no solo color)', () => {
    const out = html();
    expect(out).toContain('✓ Acreditado');
    expect(out).toContain('Se acredita en 5 días');
    expect(out).toContain('En verificación');
    expect(out).toContain('Revertido');
    expect(out).toContain('Compra del 1 oct 2026');
  });

  it('NO trae nombres, correos ni ids de compradores, ni marcas de antifraude', () => {
    const out = html().toLowerCase();
    for (const leak of ['fraud', 'velocity', 'antifraude', 'autocompra', '@', 'buyer', 'comprador:']) {
      expect(out.includes(leak), leak).toBe(false);
    }
  });

  it('con el historial vacío lo dice en voz amable', () => {
    expect(html({ history: [] })).toContain('Aún no hay compras con tu enlace');
  });

  it('un código suspendido avisa (role=alert) en lugar de callar', () => {
    const out = html({ overview: { ...overview, code: { id: 'c1', code: 'AB2CD3EF', active: false } } });
    expect(out).toContain('role="alert"');
    expect(out).toContain('suspendido');
  });

  it('sin código todavía: pide recargar en lugar de pintar un enlace roto', () => {
    const out = html({ overview: { ...overview, code: null }, url: null });
    expect(out).toContain('Todavía no pudimos preparar tu código');
    expect(out).not.toContain('/r/');
  });

  it('explica que el crédito NO es dinero y vence a los 12 meses', () => {
    const out = html();
    expect(out).toMatch(/no dinero|no se cambia por efectivo/);
    expect(out).toContain('12 meses');
    expect(out).toContain('7 días');
  });
});

describe('copy prohibido en el producto (handoff §3.2 y §8)', () => {
  const ROOT = process.cwd();
  const TREES = [
    'src/components/referrals', 'src/components/staff', 'src/components/admin/ReferralAdminActions.tsx',
    'src/lib/referrals/presentation.ts', 'src/lib/support/valve.ts',
    'app/(app)/app/invitar', 'app/tutor/invitar', 'app/soporte', 'app/admin/referidos', 'app/fiscal',
  ];
  const BANNED = [/garant[ií]a/i, /pr[oó]ximamente/i, /nuestros profesores/i, /equipo docente/i];

  function walk(path: string, out: string[] = []): string[] {
    if (!existsSync(path)) return out;
    if (statSync(path).isFile()) {
      if (/\.(ts|tsx)$/.test(path)) out.push(path);
      return out;
    }
    for (const e of readdirSync(path)) walk(join(path, e), out);
    return out;
  }

  it('el barrido encuentra archivos', () => {
    expect(TREES.flatMap((t) => walk(join(ROOT, t))).length).toBeGreaterThan(10);
  });

  it('control positivo: los patrones sí detectan las palabras', () => {
    expect(BANNED.some((re) => re.test('Garantía de ingreso'))).toBe(true);
    expect(BANNED.some((re) => re.test('Disponible próximamente'))).toBe(true);
  });

  it('ningún archivo de la interfaz nueva las usa', () => {
    const offenders = TREES.flatMap((t) => walk(join(ROOT, t))).filter((f) => {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      return BANNED.some((re) => re.test(src));
    });
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });
});
