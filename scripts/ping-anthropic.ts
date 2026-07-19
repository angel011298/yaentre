/**
 * ping-anthropic.ts — Prueba de humo de la API de Anthropic (offline/scripts).
 * Hace una llamada mínima (1 token de salida) para confirmar que
 * ANTHROPIC_API_KEY funciona. NO se usa en runtime (regla del proyecto).
 *
 * Uso: npx tsx scripts/ping-anthropic.ts
 */
import Anthropic from '@anthropic-ai/sdk';

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith('FALTA') || key.includes('placeholder')) {
    throw new Error('Falta una ANTHROPIC_API_KEY real en .env.local (console.anthropic.com).');
  }
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'ping' }],
  });
  console.log('✅ Anthropic respondió. stop_reason:', res.stop_reason, '· modelo:', res.model);
}

main().catch((e) => {
  console.error('❌', e.message ?? e);
  process.exit(1);
});
