/**
 * scripts/scan-and-ingest.ts — Escáner de ingesta continua (F2b)
 *
 * El mecanismo PERMANENTE que detecta material fuente nuevo y lo convierte en
 * fragmentos anclables. Cualquier sesión futura lo invoca antes de generar:
 *
 *   pnpm content:scan-sources [--dry-run]
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
 *   6. Reporta cuántos fragmentos quedan sin clasificar. La clasificación en
 *      sí ocurre vía sesión de Claude Code (G2): correr después
 *      `pnpm content:classify-export` → clasificar en una sesión →
 *      `pnpm content:classify-apply` (ver scripts/lib/chunk-classifier.ts).
 *
 * GUARDRAIL: solo offline. Los SourceChunk NUNCA son servibles a usuarios
 * (RLS solo-ADMIN, migración 0007). Cero llamadas a red o a la API de
 * Anthropic — la clasificación ya no ocurre dentro de este script (G2).
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
  findRegisteredSource,
  findSourceByBasename,
  registerScannedSource,
  insertSourceChunks,
  loadUnclassifiedChunks,
  topicChunkCoverage,
  disconnect,
} from './lib/content-db';

interface CliArgs {
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  return {
    dryRun: argv.includes('--dry-run'),
  };
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

  // ── 6. Reporte de pendientes de clasificación (G2: vía sesión, no API) ──
  const pendingClassification = args.dryRun ? 0 : (await loadUnclassifiedChunks()).length;

  // ── Reporte final ──
  const coverage = args.dryRun ? null : await topicChunkCoverage();
  console.log('═'.repeat(64));
  console.log('📊 REPORTE DEL ESCANEO');
  console.log(`   Candidatos encontrados:      ${files.length} (${known} ya registrados)`);
  console.log(`   Archivos NUEVOS:             ${newFiles.length}`);
  for (const f of newFiles) console.log(`      • [${f.folder}] ${f.relPath}`);
  console.log(`   Fragmentos creados:          ${chunksCreated}${args.dryRun ? ' (dry-run, no escritos)' : ''}`);
  if (pendingVision.length > 0) {
    console.log(`   Pendientes de visión (sesión): ${pendingVision.length}`);
    for (const p of pendingVision) console.log(`      • ${p}`);
  }
  if (emptySources.length > 0) {
    console.log(`   Sin contenido útil:          ${emptySources.join(', ')}`);
  }
  if (pendingClassification > 0) {
    console.log(`   ⏳ SIN clasificar:            ${pendingClassification} fragmentos`);
    console.log('      → pnpm content:classify-export  (clasificar vía sesión de Claude Code)');
    console.log('      → pnpm content:classify-apply --file <respuestas.json>');
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
