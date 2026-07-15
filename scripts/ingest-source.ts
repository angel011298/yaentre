/**
 * scripts/ingest-source.ts — Ingesta re-ejecutable de guías oficiales (CC-09)
 *
 * Etapa 0 del pipeline de contenido: convierte UNA guía oficial en (1) temario
 * real sembrado, (2) pesos oficiales por materia derivados del conteo real del
 * examen muestra, y (3) reactivos oficiales marcados OFFICIAL_SAMPLE +
 * CALIBRATION_ONLY (uso interno, NUNCA servibles a usuarios).
 *
 * GUARDRAIL: este script SOLO corre offline (tsx). No llama a Anthropic.
 *
 * DISEÑO: la extracción con visión (render del PDF a imagen → lectura fiel del
 * temario, examen muestra y clave) es un paso previo humano+Claude que produce
 * artefactos JSON en scripts/extraction/<fuente>.taxonomy.json y
 * <fuente>.questions.json. Este script aplica esos artefactos a la DB de forma
 * DETERMINISTA e IDEMPOTENTE (por externalRef). Separar extracción (no
 * determinista, requiere visión) de aplicación (determinista, re-ejecutable) es
 * lo que hace la ingesta reproducible por guía sin romper lo anterior.
 *
 * Uso:
 *   pnpm content:ingest --source <ecoems|ipn> [--dry-run]
 *   pnpm content:ingest --pdf <ruta> --institution <UNAM|IPN> --level <MEDIA_SUPERIOR|SUPERIOR> --year <YYYY> [--scanned] [--dry-run]
 *
 * La forma --pdf/--institution/... documenta la invocación canónica de la
 * tarea; internamente resuelve el artefacto de extracción por --source (o por
 * el nombre base del PDF). Si el artefacto no existe, aborta pidiéndolo (no
 * inventa contenido).
 */
import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { existsSync } from 'node:fs';

import {
  loadJson,
  validateTaxonomy,
  validateQuestions,
  type TaxonomyArtifact,
  type QuestionsArtifact,
} from './lib/ingest-artifact';
import {
  upsertContentSource,
  seedTaxonomy,
  ingestSampleQuestions,
} from './lib/ingest-db';
import { disconnect } from './lib/content-db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTRACTION_DIR = join(__dirname, 'extraction');

interface CliArgs {
  source: string;
  dryRun: boolean;
  scanned: boolean;
}

/** Mapea el nombre base de un PDF conocido a su slug de artefacto. */
function pdfToSource(pdfPath: string): string | null {
  const base = basename(pdfPath).toLowerCase();
  if (base.includes('ecoem')) return 'ecoems';
  if (base.includes('ipn')) return 'ipn';
  return null;
}

function parseArgs(argv: string[]): CliArgs {
  let source = '';
  let pdf = '';
  let dryRun = false;
  let scanned = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') source = argv[++i] ?? '';
    else if (a === '--pdf') pdf = argv[++i] ?? '';
    else if (a === '--institution' || a === '--level' || a === '--year') i++; // documentados; el artefacto los porta
    else if (a === '--dry-run') dryRun = true;
    else if (a === '--scanned') scanned = true;
  }

  if (!source && pdf) {
    const resolved = pdfToSource(pdf);
    if (resolved) source = resolved;
  }
  if (!source) {
    throw new Error('Falta --source <ecoems|ipn> (o --pdf de una guía conocida).');
  }
  return { source, dryRun, scanned };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const taxPath = join(EXTRACTION_DIR, `${args.source}.taxonomy.json`);
  const qPath = join(EXTRACTION_DIR, `${args.source}.questions.json`);

  if (!existsSync(taxPath)) {
    throw new Error(
      `No existe el artefacto de extracción: ${taxPath}\n` +
        `La extracción con visión es un paso previo; genera el artefacto antes de ingerir.`,
    );
  }

  const taxonomy = loadJson<TaxonomyArtifact>(taxPath);
  const taxErrors = validateTaxonomy(taxonomy);
  if (taxErrors.length) {
    console.error('❌ Errores en taxonomía:');
    taxErrors.forEach((e) => console.error('   • ' + e));
    process.exit(1);
  }

  let questions: QuestionsArtifact | null = null;
  if (existsSync(qPath)) {
    questions = loadJson<QuestionsArtifact>(qPath);
    const qErrors = validateQuestions(questions);
    if (qErrors.length) {
      console.error('❌ Errores en reactivos:');
      qErrors.forEach((e) => console.error('   • ' + e));
      process.exit(1);
    }
  }

  console.log(`\n📚 Ingesta de fuente: ${taxonomy.source.name}`);
  console.log(`   externalRef: ${taxonomy.source.externalRef}`);
  console.log(`   examen: ${taxonomy.exam.name} (${taxonomy.exam.totalQuestions} reactivos)`);
  console.log(`   pesos oficiales por materia: sí (derivados del conteo real)`);
  if (questions) {
    console.log(`   reactivos muestra: ${questions.questions.length} (OFFICIAL_SAMPLE + CALIBRATION_ONLY)`);
  }

  if (args.dryRun) {
    console.log('\n🟡 --dry-run: validación OK, NO se escribió en la DB.');
    return;
  }

  const contentSourceId = await upsertContentSource(taxonomy);
  const tax = await seedTaxonomy(taxonomy);

  console.log('\n✅ Taxonomía sembrada:');
  console.log(`   áreas: ${tax.areasUpserted}, materias: ${tax.subjectsUpserted}, temas: ${tax.topicsUpserted}, carreras: ${tax.careersUpserted}`);
  if (tax.weightsCorrected.length) {
    console.log('   pesos corregidos con datos oficiales:');
    tax.weightsCorrected.forEach((w) =>
      console.log(`     • ${w.subject}: ${w.from ?? 'nuevo'} → ${w.to}`),
    );
  }

  if (questions) {
    const res = await ingestSampleQuestions(questions, contentSourceId, taxonomy.exam.year);
    console.log(`\n✅ Reactivos oficiales: ${res.upserted} insertados/actualizados, ${res.passages} pasajes.`);
    if (res.omitted.length) {
      console.log(`   ⚠️  Omitidos (${res.omitted.length}):`);
      res.omitted.forEach((o) => console.log(`     • ${o.ref}: ${o.reason}`));
    }
  }

  console.log('\n🎉 Ingesta completada.');
}

main()
  .catch((e) => {
    console.error('❌ Error en la ingesta:', e.message);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
