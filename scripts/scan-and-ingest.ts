/**
 * scripts/scan-and-ingest.ts — Escáner de ingesta continua (F2b)
 *
 * El mecanismo PERMANENTE que detecta material fuente nuevo y lo convierte en
 * fragmentos anclables. Cualquier sesión futura lo invoca antes de generar:
 *
 *   pnpm content:scan-sources [--dry-run] [--no-classify]
 *
 * Flujo:
 *   1. Descubre archivos en docs/guias/ (canónica), la raíz del repo, y toda
 *      carpeta cuyo nombre contenga fuente|material|guia|source.
 *   2. Detecta NUEVOS o MODIFICADOS por hash SHA-256 de contenido (no por
 *      nombre). Re-ejecutable: lo ya ingerido no se duplica.
 *   3. Extrae (PDF con texto / docx / texto plano; escaneados e imágenes
 *      requieren visión → quedan reportados como pendientes).
 *   4. Fragmenta por sección/párrafos largos, descartando portadas/índices.
 *   5. Registra ContentSource + SourceChunks (classifiedAt=null).
 *   6. Clasifica cada fragmento contra el temario con el modelo (Sonnet).
 *      Sin saldo/API: los fragmentos quedan pendientes y se reporta el costo
 *      estimado; re-correr el escáner los clasifica después.
 *
 * GUARDRAIL: solo offline. Los SourceChunk NUNCA son servibles a usuarios
 * (RLS solo-ADMIN, migración 0007).
 */
import './lib/env';
import { basename } from 'node:path';

import {
  discoverFiles,
  hashFile,
  extractFile,
  chunkPages,
  type DiscoveredFile,
} from './lib/source-scan';
import {
  classifyChunks,
  estimateClassificationCostUsd,
  CLASSIFIER_MODEL,
} from './lib/chunk-classifier';
import {
  findRegisteredSource,
  findSourceByBasename,
  registerScannedSource,
  insertSourceChunks,
  loadUnclassifiedChunks,
  applyChunkClassifications,
  loadTaxonomyTopics,
  topicChunkCoverage,
  disconnect,
} from './lib/content-db';

interface CliArgs {
  dryRun: boolean;
  noClassify: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  return {
    dryRun: argv.includes('--dry-run'),
    noClassify: argv.includes('--no-classify'),
  };
}

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  return /placeholder|your-api-key|FALTA/i.test(key) || key.length < 25;
}

function guessInstitution(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('unam')) return 'UNAM';
  if (n.includes('ipn')) return 'IPN';
  if (n.includes('uam')) return 'UAM';
  if (n.includes('ceneval') || n.includes('exani')) return 'CENEVAL';
  if (n.includes('ecoem')) return 'ECOEMS';
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  console.log('═'.repeat(64));
  console.log('🦉 Acierta — Escáner de ingesta continua de material fuente (F2b)');
  console.log('═'.repeat(64));

  // ── 1-2. Descubrimiento + detección por hash ──
  const files = discoverFiles(repoRoot);
  console.log(`📂 ${files.length} archivo(s) candidatos en el repo`);

  interface NewFile extends DiscoveredFile {
    hash: string;
    /** id de un ContentSource ya registrado pero SIN chunks (reparación). */
    backfillSourceId?: string;
  }
  const newFiles: NewFile[] = [];
  let known = 0;
  let adopted = 0;

  for (const file of files) {
    const hash = hashFile(file.path);
    const registered =
      (await findRegisteredSource(hash, file.relPath)) ??
      (await findSourceByBasename(basename(file.path), hash));
    if (registered) {
      if (registered.adopted) {
        adopted++;
        console.log(`   ↺ conocido (adoptado con hash): ${file.relPath}`);
      }
      if (registered.chunkCount === 0) {
        // Registrado en una corrida anterior pero sin fragmentos (falla
        // previa o adopción pre-F2b): reprocesar solo la fragmentación.
        newFiles.push({ ...file, hash, backfillSourceId: registered.id });
        console.log(`   ♻ REPROCESAR (0 fragmentos): ${file.relPath}`);
      } else {
        known++;
      }
      continue;
    }
    newFiles.push({ ...file, hash });
    console.log(`   ★ NUEVO [${file.folder}]: ${file.relPath} (${(file.sizeBytes / 1e6).toFixed(1)} MB)`);
  }
  console.log(`   ${known} ya registrados con fragmentos (${adopted} adoptados con hash en esta corrida)`);

  // ── 3-5. Extracción, fragmentación y registro ──
  let chunksCreated = 0;
  const pendingVision: string[] = [];
  const emptySources: string[] = [];

  const hashesThisRun = new Set<string>();
  for (const file of newFiles) {
    process.stdout.write(`   ⛏ extrayendo ${file.relPath} ... `);
    try {
      // Duplicado por contenido DENTRO de la corrida (misma guía en dos rutas)
      if (hashesThisRun.has(file.hash)) {
        console.log('duplicado por contenido de otro archivo de esta corrida — omitido');
        continue;
      }
      const extraction = await extractFile(file);
      if (extraction.kind === 'image' || extraction.kind === 'pdf-scanned') {
        pendingVision.push(`${file.relPath} (${extraction.kind})`);
        console.log(`${extraction.kind} → requiere visión (pendiente)`);
        continue;
      }
      const chunks = chunkPages(extraction.pages);
      if (chunks.length === 0) {
        emptySources.push(file.relPath);
        console.log('sin fragmentos útiles (solo portadas/índices)');
        continue;
      }
      console.log(`${extraction.pages.length} págs → ${chunks.length} fragmentos`);
      if (!args.dryRun) {
        const sourceId =
          file.backfillSourceId ??
          (await registerScannedSource({
            name: basename(file.path),
            fileRef: file.relPath,
            contentHash: file.hash,
            institution: guessInstitution(file.relPath),
          }));
        chunksCreated += await insertSourceChunks(sourceId, chunks);
      } else {
        chunksCreated += chunks.length;
      }
      hashesThisRun.add(file.hash);
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      const firstLine = message.split('\n').find((l) => l.trim().length > 0) ?? 'error desconocido';
      console.log(`ERROR: ${firstLine.trim()}`);
    }
  }

  // ── 6. Clasificación contra el temario ──
  let classified = 0;
  let outOfSyllabus = 0;
  let classifyCostUsd = 0;
  let pendingClassification = 0;
  let estimatedPendingCost = 0;

  if (!args.dryRun) {
    const pending = await loadUnclassifiedChunks();
    const topics = await loadTaxonomyTopics();
    if (pending.length > 0 && !args.noClassify) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const estimate = estimateClassificationCostUsd(pending, topics.length);
      if (isPlaceholderKey(apiKey)) {
        pendingClassification = pending.length;
        estimatedPendingCost = estimate;
        console.log(`\n⚠️ Sin ANTHROPIC_API_KEY: ${pending.length} fragmentos quedan SIN clasificar.`);
      } else {
        console.log(`\n🧠 Clasificando ${pending.length} fragmento(s) con ${CLASSIFIER_MODEL} (~$${estimate.toFixed(2)} USD)...`);
        try {
          const run = await classifyChunks(pending, topics, apiKey as string);
          await applyChunkClassifications(run.assignments);
          classified = run.assignments.filter((a) => a.topicId !== null).length;
          outOfSyllabus = run.assignments.filter((a) => a.topicId === null).length;
          classifyCostUsd = run.costUsd;
        } catch (err) {
          const msg = (err as Error).message;
          pendingClassification = pending.length;
          estimatedPendingCost = estimate;
          if (/credit balance/i.test(msg)) {
            console.log('⛔ SALDO INSUFICIENTE en la cuenta de API — clasificación detenida.');
          } else {
            console.log(`⛔ Clasificación falló: ${msg.split('\n')[0]}`);
          }
        }
      }
    } else if (pending.length > 0) {
      pendingClassification = pending.length;
      estimatedPendingCost = estimateClassificationCostUsd(pending, topics.length);
    }
  }

  // ── Reporte final ──
  const coverage = args.dryRun ? null : await topicChunkCoverage();
  console.log('═'.repeat(64));
  console.log('📊 REPORTE DEL ESCANEO');
  console.log(`   Candidatos encontrados:      ${files.length} (${known} ya registrados)`);
  console.log(`   Archivos NUEVOS:             ${newFiles.length}`);
  for (const f of newFiles) console.log(`      • [${f.folder}] ${f.relPath}`);
  console.log(`   Fragmentos creados:          ${chunksCreated}${args.dryRun ? ' (dry-run, no escritos)' : ''}`);
  if (pendingVision.length > 0) {
    console.log(`   Pendientes de visión (API):  ${pendingVision.length}`);
    for (const p of pendingVision) console.log(`      • ${p}`);
  }
  if (emptySources.length > 0) {
    console.log(`   Sin contenido útil:          ${emptySources.join(', ')}`);
  }
  if (classified + outOfSyllabus > 0) {
    console.log(`   Clasificados:                ${classified} a tema · ${outOfSyllabus} fuera de temario ($${classifyCostUsd.toFixed(3)} USD)`);
  }
  if (pendingClassification > 0) {
    console.log(`   ⏳ SIN clasificar:            ${pendingClassification} fragmentos (costo estimado: ~$${estimatedPendingCost.toFixed(2)} USD — re-correr el escáner con saldo/API)`);
  }
  if (coverage) {
    console.log(`   Temario: ${coverage.withChunks}/${coverage.totalTopics} temas CON fragmentos · ${coverage.withoutChunks} sin fragmentos`);
  }
  console.log('═'.repeat(64));
}

main()
  .catch((err) => {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
