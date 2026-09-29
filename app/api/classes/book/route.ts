import { jsonOk, readJson } from '@/lib/api/respond';
import { studentRoute } from '@/lib/api/route-context';
import { bookClass } from '@/lib/classes/booking';
import { bookSchema } from '@/lib/classes/schemas';
import { getStripe } from '@/lib/stripe/client';

/**
 * POST /api/classes/book (spec §11 + §6.1). El alumno sale del guard; el cuerpo
 * NO acepta ningún identificador de persona. Responde 202 cuando el cobro con la
 * tarjeta guardada está en curso: la clase queda BOOKED cuando llega el webhook,
 * y la pantalla lo consulta en `GET /api/classes/{id}`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = studentRoute('classes.book', { requireOpen: true }, async (ctx, request) => {
  const body = bookSchema.parse(await readJson(request));
  const result = await bookClass(
    { profileId: ctx.profile.id, email: ctx.authUser.email ?? null, birthDate: ctx.profile.birthDate },
    body,
    { stripe: getStripe(), now: new Date() }
  );
  return jsonOk(result, result.status === 'PROCESSING' ? 202 : 200);
});
