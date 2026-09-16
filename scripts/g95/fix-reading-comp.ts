/**
 * scripts/g95/fix-reading-comp.ts — Reparación editorial (G95)
 *
 * Los 6 reactivos de Comprensión lectora del lote de G93 (pool UNAM:ESPANOL)
 * donde la clave es la opción ESTRICTAMENTE más larga (6/8 = 75%, p=0.42%,
 * hallazgo de G94 — ver docs/ESTADO.md §G94.6). Recorta el texto de la CLAVE
 * a su núcleo (nunca alarga los distractores, regla de G77), sin cambiar el
 * significado ni la letra correcta, y devuelve el reactivo a verificación
 * ciega: isVerified=false Y verification=DbNull (loadPendingQuestionsWithContext
 * exige ambas condiciones — content-db.ts).
 *
 * Uso: npx tsx scripts/g95/fix-reading-comp.ts [--apply]
 * Sin --apply: solo imprime el antes/después y las longitudes, no escribe.
 */
import '../lib/env';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OptionJson {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

const EDITS: { id: string; correctId: string; newText: string }[] = [
  {
    id: 'cmu3g9cbv0003lgevee9bcuss',
    correctId: 'B',
    newText: 'Explica el fenómeno migratorio de la mariposa monarca hacia México y sus mayores amenazas.',
  },
  {
    id: 'cmu3g9e7m000dlgev1ibg5mwl',
    correctId: 'B',
    newText: 'la generación más longeva, la única que logra llegar hasta México.',
  },
  {
    id: 'cmu3g9f5g000ilgevrq8mrvnw',
    correctId: 'C',
    newText: 'La deforestación de los sitios de hibernación y la pérdida de algodoncillo.',
  },
  {
    id: 'cmu3g9g36000nlgev95d99zi6',
    correctId: 'A',
    newText: 'Mariana descubre, mientras dibuja, una perspectiva distinta de la ciudad.',
  },
  {
    id: 'cmu3g9hzk000xlgeviscoway5',
    correctId: 'B',
    newText: 'Porque quedó absorta contemplando la ciudad desde arriba.',
  },
  {
    id: 'cmu3g9ixa0012lgevcvbf7h6e',
    correctId: 'D',
    newText: 'comparar la azotea con un lugar donde el sonido se oye amortiguado.',
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`Modo: ${apply ? 'APLICAR CAMBIOS' : 'DRY-RUN (pasa --apply para escribir)'}`);
  console.log('─'.repeat(100));

  for (const edit of EDITS) {
    const q = await prisma.question.findUniqueOrThrow({ where: { id: edit.id } });
    const options = q.options as unknown as OptionJson[];
    const correct = options.find((o) => o.id === edit.correctId);
    if (!correct || !correct.isCorrect) {
      throw new Error(`${edit.id}: la opción ${edit.correctId} no existe o no es la correcta — abortar.`);
    }
    const incorrectLens = options.filter((o) => !o.isCorrect).map((o) => o.text.length);
    const minIncorrect = Math.min(...incorrectLens);
    const maxIncorrect = Math.max(...incorrectLens);
    const oldLen = correct.text.length;
    const newLen = edit.newText.length;
    const stillLongest = newLen > maxIncorrect;
    const nowShortest = newLen < minIncorrect;

    console.log(`ID ${edit.id} — opción ${edit.correctId}`);
    console.log(`  ANTES (${oldLen}): ${correct.text}`);
    console.log(`  DESPUÉS (${newLen}): ${edit.newText}`);
    console.log(`  Distractores: [${incorrectLens.join(', ')}] (min=${minIncorrect}, max=${maxIncorrect})`);
    console.log(`  ¿Sigue siendo la más larga?: ${stillLongest ? '❌ SÍ — revisar' : '✅ no'}`);
    console.log(`  ¿Pasó a ser la más corta?: ${nowShortest ? '⚠️  sí' : 'no'}`);
    console.log('');

    if (stillLongest) {
      throw new Error(`${edit.id}: el texto nuevo SIGUE siendo la opción más larga — hay que recortar más antes de aplicar.`);
    }

    if (apply) {
      const newOptions = options.map((o) => (o.id === edit.correctId ? { ...o, text: edit.newText } : o));
      await prisma.question.update({
        where: { id: edit.id },
        data: {
          options: newOptions as unknown as Prisma.InputJsonValue,
          isVerified: false,
          verification: Prisma.DbNull,
        },
      });
      console.log(`  💾 actualizado: isVerified=false, verification=NULL (re-encolado para verificación ciega)`);
      console.log('');
    }
  }

  console.log('─'.repeat(100));
  console.log(apply ? '✅ 6 reactivos actualizados.' : 'Dry-run completo — nada escrito.');
}

main()
  .catch((err) => {
    console.error('❌', err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
