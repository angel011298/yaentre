import type Stripe from 'stripe';

/**
 * CLIENTE DE STRIPE DEL ALUMNO — Bloque 2. El cobro de un click necesita el
 * `Customer` donde vive la tarjeta guardada; el Checkout hospedado de una clase
 * también debe colgar de ese mismo cliente para que la tarjeta que se guarde ahí
 * sirva la próxima vez.
 *
 * Orden de búsqueda (el primero que exista):
 *  1. el cliente de su Premium — el Checkout de Premium lo creó y ahí se guardó
 *     la tarjeta;
 *  2. un cliente ya etiquetado con su perfil (una reserva anterior por Checkout);
 *  3. uno nuevo. Con clave de idempotencia por perfil: dos reservas simultáneas
 *     no crean dos clientes (la búsqueda de Stripe tarda hasta un minuto en
 *     reflejar un cliente recién creado, así que la búsqueda sola no lo evita).
 *
 * El `userProfileId` va en la metadata y NUNCA sale de aquí hacia el cliente:
 * el dueño lo decide el guard del llamador, no un parámetro de la petición.
 */

export type CustomerStripe = {
  customers: Pick<Stripe['customers'], 'search' | 'create'>;
};

// Los ids de perfil son cuid (minúsculas y dígitos). Se valida antes de armar el
// texto de la búsqueda: aunque hoy solo llega un id de la base, una consulta
// armada por concatenación no debe poder torcerse jamás.
const SAFE_PROFILE_ID = /^[a-z0-9]{10,40}$/;

export async function resolveStripeCustomer(
  stripe: CustomerStripe,
  input: { profileId: string; email: string | null; knownCustomerId: string | null }
): Promise<string> {
  if (input.knownCustomerId) return input.knownCustomerId;

  if (!SAFE_PROFILE_ID.test(input.profileId)) {
    throw new Error('Identificador de perfil con formato inesperado');
  }

  const found = await stripe.customers.search({
    query: `metadata['userProfileId']:'${input.profileId}'`,
    limit: 1,
  });
  const existing = found.data[0];
  if (existing) return existing.id;

  const created = await stripe.customers.create(
    {
      ...(input.email ? { email: input.email } : {}),
      metadata: { userProfileId: input.profileId },
    },
    { idempotencyKey: `class-customer:${input.profileId}` }
  );
  return created.id;
}
