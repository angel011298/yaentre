/**
 * upload-guias.ts — Sube los PDFs de docs/guias/ al bucket público
 * `guias-oficiales` de Supabase Storage. Canónico: usa supabase-js con la
 * SERVICE ROLE (bypassa RLS de storage). Idempotente (upsert).
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Uso: npx tsx scripts/upload-guias.ts
 *
 * Nota (F1): la primera carga se hizo con una política temporal + anon key
 * porque el service_role no estaba disponible. Este script es la vía correcta
 * y re-ejecutable. El límite de tamaño del plan gratuito de Supabase es 50 MB;
 * archivos mayores (p.ej. Guia_IPN.pdf ~80 MB) requieren plan de pago.
 */
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUCKET = 'guias-oficiales';
const DIR = join(process.cwd(), 'docs', 'guias');
const MAX_FREE = 50 * 1024 * 1024;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.startsWith('FALTA')) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  for (const f of files) {
    const path = join(DIR, f);
    const size = statSync(path).size;
    if (size > MAX_FREE) {
      console.log(`SKIP (>${MAX_FREE / 1024 / 1024}MB, plan de pago) ${f}`);
      continue;
    }
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(f, readFileSync(path), { contentType: 'application/pdf', upsert: true });
    console.log(error ? `ERROR ${f}: ${error.message}` : `OK   ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
