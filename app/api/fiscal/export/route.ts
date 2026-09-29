import { NextResponse } from 'next/server';
import { errorResponse, jsonError } from '@/lib/api/respond';
import { parseFiscalMonth } from '@/lib/api/fiscal-params';
import { buildExportRows, toCsv } from '@/lib/admin/fiscal-export';
import { buildMonthlyFiscal, monthKey } from '@/lib/admin/fiscal';
import { logAdminAction } from '@/lib/admin/audit-log';
import { requireCapability } from '@/lib/auth/guards';
import { readExportInput } from '@/lib/db/fiscal';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * GET /api/fiscal/export?month=2026-10 — las partidas del mes en CSV, para el
 * CFDI global mensual. SOLO LECTURA: `fiscal.read`.
 *
 * 🔒 El archivo NO lleva datos personales (ni nombre, ni correo, ni identificador
 * de cuenta): una factura global al público en general no los necesita y el
 * archivo sale del sistema hacia una persona externa.
 *
 * Cada descarga queda en la bitácora ANTES de entregar el archivo: sacar los
 * ingresos del negocio del sistema es una operación que debe dejar rastro. La
 * respuesta es `no-store` y `attachment`, con BOM para que Excel lea los acentos.
 */
/**
 * Marca de orden de bytes UTF-8, escrita como ESCAPE y no como el carácter: un
 * BOM literal es invisible en el editor, en `git diff` y en `grep`, y basta que
 * un formateador lo quite para que Excel lea mal TODOS los acentos sin que nada
 * lo delate (misma clase de defecto que el backspace de `security:authz`, G99).
 */
const UTF8_BOM = '\uFEFF';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { profile, authUser } = await requireCapability('fiscal.read');

    const gate = await consumeRateLimit('FISCAL_READ', profile.id);
    if (!gate.allowed) {
      return jsonError('RATE_LIMIT', 'Descargaste muchos archivos seguidos. Espera un momento.', 429);
    }

    const parsed = parseFiscalMonth(new URL(request.url).searchParams.get('month'), new Date());
    if (!parsed.ok) return jsonError('VALIDATION', 'Elige un mes válido con el formato AAAA-MM (no futuro).', 400);
    const ref = parsed.month;

    const input = await readExportInput(ref);
    const rows = buildExportRows(ref, input);
    const month = buildMonthlyFiscal(ref, {
      payments: input.payments.map((p) => ({ amountCents: p.amountCents, paidAt: p.paidAt })),
      refunds: input.refunds.map((r) => ({ amountCents: r.amountCents, occurredAt: r.occurredAt })),
      classes: input.classes,
    });

    await logAdminAction(
      'fiscal.exported',
      { userProfileId: profile.id, email: authUser.email },
      { targetKind: 'system', metadata: { month: monthKey(ref), rows: rows.length } }
    );

    const csv = toCsv(rows, {
      grossCents: month.ownIncomeGrossCents,
      baseCents: month.baseCents,
      ivaCents: month.ivaCents,
    });

    return new NextResponse(UTF8_BOM + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="yaentre-fiscal-${monthKey(ref)}.csv"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return errorResponse(err, { route: 'fiscal.export' });
  }
}
