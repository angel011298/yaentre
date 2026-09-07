/** scripts/g71/resend.ts — G71. Lector de la API de Resend (G70b §6). */
import './env';

const KEY = process.env.RESEND_API_KEY;

export async function listEmails(limit = 10) {
  const res = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as { data: Array<Record<string, unknown>> };
}

export async function getEmail(id: string) {
  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as Record<string, unknown>;
}

if (process.argv[1]?.endsWith('resend.ts')) {
  const id = process.argv[2];
  (async () => {
    if (id) {
      const e = await getEmail(id);
      console.log(JSON.stringify({ ...e, html: undefined }, null, 2));
      console.log('\n--- enlaces ---');
      for (const m of String(e.html ?? '').matchAll(/href="([^"]+)"/g)) console.log(m[1]);
    } else {
      const { data } = await listEmails(15);
      for (const e of data) console.log(`${String(e.created_at).slice(0, 19)}  ${String(e.last_event).padEnd(10)} ${String(e.to)}  ${String(e.subject)}  ${e.id}`);
    }
  })();
}
