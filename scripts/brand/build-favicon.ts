/**
 * scripts/brand/build-favicon.ts — Marca v1.0 (G102).  `pnpm brand:favicon`
 *
 * Genera, desde `faviconSvg()` de `src/lib/brand/logo-mark.ts`:
 *   - `app/icon.svg`     — el favicon vectorial (Next lo enlaza solo).
 *   - `app/favicon.ico`  — 16, 32 y 48 px, para navegadores y lectores que
 *                          piden `/favicon.ico` a ciegas.
 *
 * El .ico se rasteriza con el Chromium de Playwright (ya es dependencia del
 * proyecto; sin `sharp` ni binarios nuevos) y se empaqueta a mano: un .ico
 * moderno es una cabecera de 6 bytes, 16 por imagen y los PNG tal cual.
 * Se versionan los dos archivos generados; este script solo hace falta si el
 * logo cambia. `tests/brand/logo-mark.test.ts` falla si `app/icon.svg` deja
 * de coincidir con `faviconSvg()`.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { faviconSvg } from '../../src/lib/brand/logo-mark';

const SIZES = [16, 32, 48] as const;
const ROOT = process.cwd();

async function rasterize(svg: string, size: number): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:transparent">${sized}</body></html>`
    );
    return await page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
  } finally {
    await browser.close();
  }
}

function packIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // 1 = ícono
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // sin paleta
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por píxel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main() {
  const svg = faviconSvg();
  writeFileSync(join(ROOT, 'app/icon.svg'), `${svg}\n`);

  const images = [];
  for (const size of SIZES) images.push({ size, png: await rasterize(svg, size) });
  const ico = packIco(images);
  writeFileSync(join(ROOT, 'app/favicon.ico'), ico);

  console.log(
    `app/icon.svg (${svg.length} B) y app/favicon.ico (${ico.length} B: ${images
      .map((i) => `${i.size}px=${i.png.length} B`)
      .join(', ')})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
