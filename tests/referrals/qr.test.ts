import { describe, expect, it } from 'vitest';
import { crc32, inflateSync } from 'node:zlib';
import jsQR from 'jsqr';
import { LOGO_RATIO, QR_DARK, QR_LIGHT, generateReferralQR, renderQrPng } from '@/lib/referrals/qr';
import { generateReferralCode } from '@/lib/referrals/code';

/**
 * El QR tiene que ESCANEARSE. Se decodifica el PNG generado con un lector real
 * (jsQR) y se compara con el enlace exacto. El decodificador PNG de abajo es
 * independiente del codificador de `qr.ts`: solo usa `zlib` y el formato.
 */

interface Png {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  chunks: Array<{ type: string; length: number; crcOk: boolean }>;
}

function decodePng(buf: Buffer): Png {
  expect([...buf.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  const chunks: Png['chunks'] = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    const stored = buf.readUInt32BE(pos + 8 + length);
    chunks.push({ type, length, crcOk: crc32(buf.subarray(pos + 4, pos + 8 + length)) === stored });
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8);
      expect(data[9]).toBe(2);
    }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width * 3 + 1)]).toBe(0); // filtro «ninguno»
    for (let x = 0; x < width; x++) {
      const s = y * (width * 3 + 1) + 1 + x * 3;
      const d = (y * width + x) * 4;
      rgba[d] = raw[s];
      rgba[d + 1] = raw[s + 1];
      rgba[d + 2] = raw[s + 2];
      rgba[d + 3] = 255;
    }
  }
  return { width, height, rgba, chunks };
}

const scan = (png: Png) => jsQR(png.rgba, png.width, png.height)?.data ?? null;
const SITE = 'https://yaentre.com';

describe('el PNG', () => {
  it('es un PNG válido: firma, chunks IHDR/IDAT/IEND y CRC correctos', async () => {
    const png = decodePng(await generateReferralQR('AB2CD3EF', SITE));
    expect(png.chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(png.chunks.every((c) => c.crcOk)).toBe(true);
  });

  it('es cuadrado y de ≈ 400 px (spec §3.3: width 400)', async () => {
    const png = decodePng(await generateReferralQR('AB2CD3EF', SITE));
    expect(png.width).toBe(png.height);
    expect(png.width).toBeGreaterThan(360);
    expect(png.width).toBeLessThanOrEqual(400);
  });

  it('usa el violeta de la marca y fondo blanco, con margen blanco en las esquinas', async () => {
    const png = decodePng(await generateReferralQR('AB2CD3EF', SITE));
    const px = (x: number, y: number) => [...png.rgba.slice((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)];
    expect(px(0, 0)).toEqual([255, 255, 255]);
    expect(px(png.width - 1, png.height - 1)).toEqual([255, 255, 255]);
    const colors = new Set<string>();
    for (let i = 0; i < png.rgba.length; i += 4) colors.add(`${png.rgba[i]},${png.rgba[i + 1]},${png.rgba[i + 2]}`);
    const brand = parseInt(QR_DARK.slice(1), 16);
    expect(colors.has(`${(brand >> 16) & 255},${(brand >> 8) & 255},${brand & 255}`)).toBe(true);
    expect(QR_LIGHT).toBe('#FFFFFF');
  });

  it('es determinista: el mismo código da los mismos bytes', async () => {
    const a = await generateReferralQR('AB2CD3EF', SITE);
    const b = await generateReferralQR('AB2CD3EF', SITE);
    expect(a.equals(b)).toBe(true);
    expect((await generateReferralQR('AB2CD3EG', SITE)).equals(a)).toBe(false);
  });
});

describe('se ESCANEA (con el logo puesto)', () => {
  it('devuelve el enlace exacto', async () => {
    const png = decodePng(await generateReferralQR('AB2CD3EF', SITE));
    expect(scan(png)).toBe('https://yaentre.com/r/AB2CD3EF');
  });

  it('para 25 códigos generados al azar', async () => {
    for (let i = 0; i < 25; i++) {
      const code = generateReferralCode();
      expect(scan(decodePng(await generateReferralQR(code, SITE))), code).toBe(`https://yaentre.com/r/${code}`);
    }
  });

  it('para un código largo de Embajador y un sitio de preview', async () => {
    expect(scan(decodePng(await generateReferralQR('PEDRO2026', 'https://yaentre-git-x.vercel.app/')))).toBe(
      'https://yaentre-git-x.vercel.app/r/PEDRO2026'
    );
  });

  it('el logo SÍ está: el centro difiere del QR sin logo, y fuera de su caja son idénticos', async () => {
    const withLogo = decodePng(await generateReferralQR('AB2CD3EF', SITE));
    const without = decodePng(await generateReferralQR('AB2CD3EF', SITE, { logoRatio: 0 }));
    expect(withLogo.width).toBe(without.width);
    const c = Math.floor(withLogo.width / 2);
    const idx = (x: number, y: number) => (y * withLogo.width + x) * 4;
    let centerDiff = 0;
    for (let y = c - 8; y <= c + 8; y++)
      for (let x = c - 8; x <= c + 8; x++) if (withLogo.rgba[idx(x, y)] !== without.rgba[idx(x, y)]) centerDiff++;
    expect(centerDiff).toBeGreaterThan(20);

    const half = Math.round(withLogo.width * LOGO_RATIO) / 2 + 3;
    for (let y = 0; y < withLogo.height; y++)
      for (let x = 0; x < withLogo.width; x++) {
        if (Math.abs(x - c) <= half && Math.abs(y - c) <= half) continue;
        expect(withLogo.rgba[idx(x, y)]).toBe(without.rgba[idx(x, y)]);
      }
  });

  it('EL ROJO ES ALCANZABLE: un logo enorme (60 % del lado) sí rompe el escaneo', async () => {
    const png = decodePng(await generateReferralQR('AB2CD3EF', SITE, { logoRatio: 0.6 }));
    expect(scan(png)).not.toBe('https://yaentre.com/r/AB2CD3EF');
  });

  it('y un QR con la matriz corrompida también falla (el lector no es complaciente)', () => {
    const noise = renderQrPng({ size: 29, get: (r, c) => ((r * 7 + c * 13) % 5 === 0 ? 1 : 0) }, { logoRatio: 0 });
    expect(scan(decodePng(noise))).toBeNull();
  });
});
