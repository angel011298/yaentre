import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding taxonomía de Acierta...');

  // TODO CC-01: Implementar seed de taxonomía
  // El seed debe poblar:
  // 1. Institution (UNAM, IPN, UAM, CENEVAL)
  // 2. Level (MEDIA_SUPERIOR, SUPERIOR)
  // 3. Exam (con dates de 2027)
  // 4. Area, Career, Subject, Topic
  //
  // Referencia: /docs/Backend_Schema_Acierta_v1.0.md §8

  console.log('✅ Seed completado (placeholder)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
