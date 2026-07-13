import { seedUnam } from './seed/unam';

/**
 * Seed principal de Prisma. Ejecutado por `pnpm prisma db seed`.
 * Orquesta los seeds de todas las instituciones (MVP: solo UNAM).
 *
 * Idempotente: corre múltiples veces sin duplicar datos (vía upsert).
 */
async function main() {
  console.log('🌱 Sembrando taxonomía de Acierta...\n');

  try {
    await seedUnam();
    console.log('\n✅ Seed completado exitosamente');
  } catch (e) {
    console.error('❌ Error durante seed:', e);
    process.exit(1);
  }
}

main();
