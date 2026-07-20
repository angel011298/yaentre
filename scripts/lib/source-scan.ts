import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { PDFParse } from 'pdf-parse';

/**
 * Escáner de material fuente (F2b) — capa PURA de descubrimiento y extracción.
 * Sin DB y sin API: detecta archivos candidatos, calcula su hash de contenido,
 * extrae texto (PDF con texto / docx / texto plano) y lo divide en fragmentos
 * útiles por página/sección. La clasificación por tema (modelo) y el registro
 * en DB viven en otras capas (chunk-classifier.ts / content-db.ts).
 */

export type SourceKind = 'pdf' | 'pdf-scanned' | 'docx' | 'image' | 'text';

export interface DiscoveredFile {
  path: string; // absoluto
  relPath: string; // relativo al repo, para reporte/fileRef
  folder: string; // carpeta de origen (para el reporte)
  ext: string;
  sizeBytes: number;
}

export interface ExtractedPage {
  num: number; // página o sección (1-based)
  text: string;
}

export interface ExtractionResult {
  kind: SourceKind;
  pages: ExtractedPage[];
  totalChars: number;
}

export interface RawChunk {
  text: string;
  excerpt: string;
  locationRef: string;
}

const SOURCE_EXTS = new Set(['.pdf', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp']);
/** En la raíz del repo solo material real (los .md/.txt de raíz son del repo). */
const ROOT_EXTS = new Set(['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp']);
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.next', '.claude', 'dist', 'build', 'coverage', 'public',
]);
const FOLDER_NAME_PATTERN = /fuente|material|guia|source/i;

/**
 * Descubre archivos candidatos en el orden canónico:
 * (a) docs/guias/ (recursivo), (b) raíz del repo (solo archivos sueltos),
 * (c) cualquier carpeta del repo cuyo nombre contenga fuente|material|guia|source.
 * Devuelve lista deduplicada por path.
 */
export function discoverFiles(repoRoot: string): DiscoveredFile[] {
  const found = new Map<string, DiscoveredFile>();

  const addFile = (abs: string, folder: string, allowed: Set<string>) => {
    const ext = extname(abs).toLowerCase();
    if (!allowed.has(ext)) return;
    if (found.has(abs)) return;
    const st = statSync(abs);
    found.set(abs, {
      path: abs,
      relPath: relative(repoRoot, abs).replace(/\\/g, '/'),
      folder,
      ext,
      sizeBytes: st.size,
    });
  };

  const walkDir = (dir: string, folderLabel: string, allowed: Set<string>, depth = 0) => {
    if (depth > 3 || !existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) walkDir(abs, folderLabel, allowed, depth + 1);
      } else {
        addFile(abs, folderLabel, allowed);
      }
    }
  };

  // (a) docs/guias — ubicación canónica
  walkDir(join(repoRoot, 'docs', 'guias'), 'docs/guias', SOURCE_EXTS);

  // (b) raíz del repo — solo archivos sueltos (no recursivo)
  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (entry.isFile()) addFile(join(repoRoot, entry.name), '(raíz)', ROOT_EXTS);
  }

  // (c) carpetas con nombre de material fuente, en todo el repo (superficial)
  const findSourceFolders = (dir: string, depth = 0) => {
    if (depth > 2) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue;
      const abs = join(dir, entry.name);
      if (FOLDER_NAME_PATTERN.test(entry.name)) {
        walkDir(abs, relative(repoRoot, abs).replace(/\\/g, '/'), SOURCE_EXTS);
      } else {
        findSourceFolders(abs, depth + 1);
      }
    }
  };
  findSourceFolders(repoRoot);

  return [...found.values()];
}

/** SHA-256 hex del contenido del archivo (detección por contenido, no nombre). */
export function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Umbral: un PDF cuyo texto extraído promedia menos de esto por página se
 *  considera escaneado (requiere visión, no extraíble localmente). */
const SCANNED_CHARS_PER_PAGE = 120;

/** Postgres TEXT no acepta el byte nulo (U+0000); algunos PDFs lo emiten. */
function sanitize(text: string): string {
  return text.split(String.fromCharCode(0)).join('');
}

export async function extractFile(file: DiscoveredFile): Promise<ExtractionResult> {
  switch (file.ext) {
    case '.pdf': {
      const parser = new PDFParse({ data: new Uint8Array(readFileSync(file.path)) });
      try {
        const result = await parser.getText();
        const pages: ExtractedPage[] = result.pages.map((p) => ({
          num: p.num,
          text: sanitize(p.text ?? '').trim(),
        }));
        const totalChars = pages.reduce((n, p) => n + p.text.length, 0);
        const kind: SourceKind =
          pages.length > 0 && totalChars / pages.length < SCANNED_CHARS_PER_PAGE
            ? 'pdf-scanned'
            : 'pdf';
        return { kind, pages, totalChars };
      } finally {
        await parser.destroy();
      }
    }
    case '.docx': {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ path: file.path });
      const text = sanitize(value).trim();
      // docx no trae paginación confiable: secciones por bloques grandes
      const sections = text.split(/\n{3,}/).filter((s) => s.trim().length > 0);
      return {
        kind: 'docx',
        pages: sections.map((s, i) => ({ num: i + 1, text: s.trim() })),
        totalChars: text.length,
      };
    }
    case '.txt':
    case '.md': {
      const text = sanitize(readFileSync(file.path, 'utf8')).trim();
      return { kind: 'text', pages: [{ num: 1, text }], totalChars: text.length };
    }
    default:
      // Imágenes: requieren visión (API) — el caller decide qué hacer
      return { kind: 'image', pages: [], totalChars: 0 };
  }
}

// ── Chunking ──────────────────────────────────────────────────────────

const CHUNK_MIN = 350; // chars útiles mínimos para que un fragmento valga
const CHUNK_MAX = 1800; // tamaño objetivo máximo (por sección/párrafos largos)

/** Cita breve para UI: primeras ~200 chars limpias en frontera de palabra. */
export function makeExcerpt(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max)}…`;
}

/**
 * Heurística de basura: portadas, índices, directorios, páginas legales.
 * No crea registros para fragmentos sin contenido enseñable.
 */
export function isJunkChunk(text: string): boolean {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length < CHUNK_MIN) return true;

  // Densidad alfabética baja (tablas de puntos, folios, índices numéricos)
  const letters = (clean.match(/[a-záéíóúñüA-ZÁÉÍÓÚÑÜ]/g) ?? []).length;
  if (letters / clean.length < 0.55) return true;

  // Índice/TOC: muchas líneas que terminan en número de página o puntos guía
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 5) {
    const tocLike = lines.filter((l) => /(\.{3,}|\s\d{1,3})$/.test(l)).length;
    if (tocLike / lines.length > 0.6) return true;
  }

  // Página mayormente en MAYÚSCULAS (portadas, separadores de sección)
  const upper = (clean.match(/[A-ZÁÉÍÓÚÑÜ]/g) ?? []).length;
  if (letters > 0 && upper / letters > 0.7) return true;

  return false;
}

/**
 * Divide páginas en fragmentos por párrafos, agrupando hasta CHUNK_MAX chars
 * (por sección o párrafo largo — nunca oración por oración). Cada fragmento
 * conserva su página de origen como locationRef.
 */
export function chunkPages(pages: ExtractedPage[]): RawChunk[] {
  const chunks: RawChunk[] = [];
  for (const page of pages) {
    if (!page.text) continue;
    const paragraphs = page.text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    let buffer = '';
    const flush = () => {
      if (!buffer) return;
      if (!isJunkChunk(buffer)) {
        chunks.push({
          text: buffer.trim(),
          excerpt: makeExcerpt(buffer),
          locationRef: `p. ${page.num}`,
        });
      }
      buffer = '';
    };

    for (const para of paragraphs) {
      if (buffer && buffer.length + para.length + 2 > CHUNK_MAX) flush();
      buffer = buffer ? `${buffer}\n\n${para}` : para;
      // Un párrafo gigante solo se corta en frontera de párrafo: si él solo
      // excede el máximo, va como fragmento propio.
      if (buffer.length >= CHUNK_MAX) flush();
    }
    flush();
  }
  return chunks;
}
