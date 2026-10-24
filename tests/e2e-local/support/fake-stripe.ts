/**
 * G103 — simulador de Stripe para la pila LOCAL de e2e. No es Stripe ni lo
 * pretende: implementa SOLO las llamadas que hace la app (clientes, métodos de
 * pago, PaymentIntents, Checkout, reembolsos) con el formato de la API, más
 * una página de pago simulada y la entrega de webhooks FIRMADOS con el secreto
 * local, como haría Stripe. La app llega aquí únicamente a través de
 * `localStripeApi()` (src/lib/stripe/client.ts), que exige pila local.
 *
 *   npx tsx tests/e2e-local/support/fake-stripe.ts
 *
 * Variables: FAKE_STRIPE_PORT (12111), E2E_APP_URL (http://localhost:3000),
 * STRIPE_WEBHOOK_SECRET (el mismo que recibe el servidor de la app).
 */
import { createHmac } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const PORT = Number(process.env.FAKE_STRIPE_PORT ?? 12111);
const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:3000';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_e2e_local';
const SELF = `http://127.0.0.1:${PORT}`;

type Obj = Record<string, unknown>;
const state = {
  seq: 0,
  customers: new Map<string, Obj>(),
  cards: new Map<string, Obj[]>(),
  paymentIntents: new Map<string, Obj>(),
  sessions: new Map<string, Obj>(),
  charges: new Map<string, Obj>(),
  idempotency: new Map<string, { status: number; body: Obj }>(),
  deliveries: [] as Array<{ id: string; type: string; status: number; objectId: string }>,
};

const id = (prefix: string) => `${prefix}_fake${String(++state.seq).padStart(10, '0')}`;
const now = () => Math.floor(Date.now() / 1000);

// ─── Cuerpo `application/x-www-form-urlencoded` con corchetes (formato del SDK)
function parseForm(body: string): Obj {
  const out: Obj = {};
  for (const pair of body.split('&').filter(Boolean)) {
    const [rawK, rawV = ''] = pair.split('=');
    const key = decodeURIComponent(rawK.replace(/\+/g, ' '));
    const val = decodeURIComponent(rawV.replace(/\+/g, ' '));
    const path = key.match(/[^[\]]+/g) ?? [key];
    let node: Obj | unknown[] = out;
    path.forEach((seg, i) => {
      const last = i === path.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(path[i + 1]);
      const container = node as Record<string, unknown>;
      if (last) container[seg] = val;
      else {
        container[seg] ??= nextIsIndex ? [] : {};
        node = container[seg] as Obj;
      }
    });
  }
  return out;
}

function sign(payload: string): string {
  const t = now();
  const v1 = createHmac('sha256', SECRET).update(`${t}.${payload}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

async function deliver(type: string, object: Obj): Promise<number> {
  const event = {
    id: id('evt'),
    object: 'event',
    api_version: '2025-01-01',
    created: now(),
    livemode: false,
    type,
    data: { object },
  };
  const payload = JSON.stringify(event);
  let status = 0;
  try {
    const res = await fetch(`${APP_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': sign(payload) },
      body: payload,
    });
    status = res.status;
  } catch {
    status = -1;
  }
  state.deliveries.push({ id: event.id, type, status, objectId: String(object.id) });
  return status;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'request-id': id('req') });
  res.end(JSON.stringify(body));
}

function html(res: ServerResponse, body: string) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Simulador de pago (e2e)</title></head><body style="font-family:sans-serif;padding:24px">${body}</body></html>`);
}

function notFound(res: ServerResponse, what: string) {
  json(res, 404, { error: { type: 'invalid_request_error', message: `No such ${what}` } });
}

function amountOf(lineItems: unknown): number | null {
  if (!Array.isArray(lineItems)) return null;
  let total = 0;
  for (const li of lineItems as Obj[]) {
    const pd = li.price_data as Obj | undefined;
    if (!pd) return null; // Price ID configurado: el monto lo resuelve la app
    total += Number(pd.unit_amount) * Number(li.quantity ?? 1);
  }
  return total;
}

function attachCard(customer: string): Obj {
  const pm = { id: id('pm'), object: 'payment_method', type: 'card', customer, card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2034 } };
  state.cards.set(customer, [pm, ...(state.cards.get(customer) ?? [])]);
  return pm;
}

function newCharge(pi: Obj): string {
  const ch = { id: id('ch'), object: 'charge', payment_intent: pi.id, amount: pi.amount, amount_refunded: 0, refunded: false };
  state.charges.set(String(ch.id), ch);
  return String(ch.id);
}

async function api(req: IncomingMessage, res: ServerResponse, path: string, form: Obj, query: URLSearchParams) {
  const m = (re: RegExp) => path.match(re);

  if (req.method === 'POST' && path === '/v1/customers') {
    const c = { id: id('cus'), object: 'customer', email: form.email ?? null, metadata: form.metadata ?? {} };
    state.customers.set(String(c.id), c);
    return json(res, 200, c);
  }

  if (req.method === 'GET' && path === '/v1/payment_methods') {
    const data = state.cards.get(query.get('customer') ?? '') ?? [];
    return json(res, 200, { object: 'list', data: data.slice(0, Number(query.get('limit') ?? 10)), has_more: false, url: '/v1/payment_methods' });
  }

  if (req.method === 'POST' && path === '/v1/payment_intents') {
    const pi: Obj = {
      id: id('pi'),
      object: 'payment_intent',
      amount: Number(form.amount),
      amount_received: 0,
      currency: form.currency ?? 'mxn',
      customer: form.customer ?? null,
      payment_method: form.payment_method ?? null,
      metadata: form.metadata ?? {},
      status: 'requires_payment_method',
      next_action: null,
      created: now(),
    };
    const cards = state.cards.get(String(pi.customer)) ?? [];
    const ok = form.confirm === 'true' && cards.some((c) => c.id === pi.payment_method);
    if (ok) {
      pi.status = 'succeeded';
      pi.amount_received = pi.amount;
      pi.latest_charge = newCharge(pi);
    }
    state.paymentIntents.set(String(pi.id), pi);
    json(res, 200, pi);
    // Como Stripe: el webhook llega DESPUÉS de la respuesta.
    if (ok) setTimeout(() => void deliver('payment_intent.succeeded', pi), 300);
    return;
  }

  let r = m(/^\/v1\/payment_intents\/([^/]+)$/);
  if (req.method === 'GET' && r) {
    const pi = state.paymentIntents.get(r[1]);
    return pi ? json(res, 200, pi) : notFound(res, 'payment_intent');
  }

  if (req.method === 'POST' && path === '/v1/checkout/sessions') {
    const s: Obj = {
      id: id('cs_test'),
      object: 'checkout.session',
      status: 'open',
      payment_status: 'unpaid',
      mode: form.mode ?? 'payment',
      customer: form.customer ?? null,
      customer_email: form.customer_email ?? null,
      currency: 'mxn',
      amount_total: amountOf(form.line_items),
      metadata: form.metadata ?? {},
      payment_intent: null,
      subscription: null,
      payment_method_types: form.payment_method_types ?? ['card'],
      success_url: form.success_url,
      cancel_url: form.cancel_url,
      expires_at: form.expires_at ? Number(form.expires_at) : now() + 3600,
      created: now(),
      // Datos que usa el simulador al «pagar» (no son parte de la respuesta real).
      _paymentIntentMetadata: (form.payment_intent_data as Obj | undefined)?.metadata ?? form.metadata ?? {},
      _saveCard: (form.payment_intent_data as Obj | undefined)?.setup_future_usage != null,
    };
    s.url = `${SELF}/__checkout/${s.id}`;
    state.sessions.set(String(s.id), s);
    return json(res, 200, publicSession(s));
  }

  r = m(/^\/v1\/checkout\/sessions\/([^/]+)$/);
  if (req.method === 'GET' && r) {
    const s = state.sessions.get(r[1]);
    return s ? json(res, 200, publicSession(s)) : notFound(res, 'checkout.session');
  }

  if (req.method === 'POST' && path === '/v1/refunds') {
    const pi = state.paymentIntents.get(String(form.payment_intent));
    if (!pi) return notFound(res, 'payment_intent');
    const ch = state.charges.get(String(pi.latest_charge));
    const amount = form.amount ? Number(form.amount) : Number(pi.amount) - Number(ch?.amount_refunded ?? 0);
    const refund = { id: id('re'), object: 'refund', amount, payment_intent: pi.id, status: 'succeeded', metadata: form.metadata ?? {} };
    json(res, 200, refund);
    if (ch) {
      ch.amount_refunded = Number(ch.amount_refunded) + amount;
      ch.refunded = Number(ch.amount_refunded) >= Number(ch.amount);
      setTimeout(() => void deliver('charge.refunded', { ...ch }), 300);
    }
    return;
  }

  r = m(/^\/v1\/subscriptions\/([^/]+)$/);
  if (r) return json(res, 200, { id: r[1], object: 'subscription', status: 'active', cancel_at_period_end: form.cancel_at_period_end === 'true', items: { data: [] } });

  return json(res, 404, { error: { type: 'invalid_request_error', message: `Ruta no simulada: ${req.method} ${path}` } });
}

function publicSession(s: Obj): Obj {
  return Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('_')));
}

async function pay(sessionId: string): Promise<string | null> {
  const s = state.sessions.get(sessionId);
  if (!s || s.status !== 'open') return null;
  const pi: Obj = {
    id: id('pi'),
    object: 'payment_intent',
    amount: s.amount_total,
    amount_received: s.amount_total,
    currency: 'mxn',
    customer: s.customer,
    metadata: s._paymentIntentMetadata,
    status: 'succeeded',
    created: now(),
  };
  pi.latest_charge = newCharge(pi);
  state.paymentIntents.set(String(pi.id), pi);
  if (s._saveCard && s.customer) attachCard(String(s.customer));
  Object.assign(s, { status: 'complete', payment_status: 'paid', payment_intent: pi.id });
  await deliver('checkout.session.completed', publicSession(s));
  return String(s.success_url).replace('{CHECKOUT_SESSION_ID}', sessionId);
}

async function control(req: IncomingMessage, res: ServerResponse, path: string, form: Obj) {
  let r = path.match(/^\/__checkout\/([^/]+)$/);
  if (req.method === 'GET' && r) {
    const s = state.sessions.get(r[1]);
    if (!s) return html(res, '<p>Sesión inexistente.</p>');
    const total = s.amount_total == null ? 'según el plan' : `$${(Number(s.amount_total) / 100).toFixed(2)} MXN`;
    return html(
      res,
      `<h1>Simulador de pago (e2e)</h1><p>Total: ${total}</p>
       <form method="post" action="/__checkout/${s.id}/pay"><button type="submit">Pagar</button></form>
       <p><a href="${String(s.cancel_url).replace('{CHECKOUT_SESSION_ID}', String(s.id))}">Cancelar</a></p>`
    );
  }
  r = path.match(/^\/__checkout\/([^/]+)\/pay$/);
  if (req.method === 'POST' && r) {
    const next = await pay(r[1]);
    if (!next) return html(res, '<p>La sesión ya no está abierta.</p>');
    res.writeHead(303, { location: next });
    return res.end();
  }
  if (req.method === 'POST' && path === '/__control/card') {
    return json(res, 200, attachCard(String(form.customer)));
  }
  r = path.match(/^\/__control\/expire\/([^/]+)$/);
  if (req.method === 'POST' && r) {
    const s = state.sessions.get(r[1]);
    if (!s) return notFound(res, 'checkout.session');
    s.status = 'expired';
    return json(res, 200, { delivered: await deliver('checkout.session.expired', publicSession(s)) });
  }
  if (req.method === 'GET' && path === '/__control/state') {
    return json(res, 200, {
      sessions: [...state.sessions.values()].map(publicSession),
      paymentIntents: [...state.paymentIntents.values()],
      deliveries: state.deliveries,
    });
  }
  if (req.method === 'GET' && path === '/__health') return json(res, 200, { ok: true });
  return json(res, 404, { error: 'ruta de control desconocida' });
}

createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url ?? '/', SELF);
    const form = req.method === 'GET' ? {} : parseForm(body);
    const idem = req.headers['idempotency-key'];
    const key = typeof idem === 'string' && req.method === 'POST' ? `${url.pathname}:${idem}` : null;
    if (key && state.idempotency.has(key)) {
      const hit = state.idempotency.get(key)!;
      return json(res, hit.status, hit.body);
    }
    if (key) {
      // Guarda la primera respuesta para repetirla igual (semántica de Stripe).
      const original = res.end.bind(res);
      res.end = ((chunk?: unknown) => {
        try {
          state.idempotency.set(key, { status: res.statusCode, body: JSON.parse(String(chunk)) });
        } catch {
          /* respuesta no JSON */
        }
        return original(chunk as never);
      }) as typeof res.end;
    }
    const handler = url.pathname.startsWith('/v1/') ? api(req, res, url.pathname, form, url.searchParams) : control(req, res, url.pathname, form);
    handler.catch((err) => json(res, 500, { error: { type: 'api_error', message: String(err) } }));
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`simulador de Stripe (e2e) en ${SELF}; webhooks → ${APP_URL}/api/webhooks/stripe`);
});
