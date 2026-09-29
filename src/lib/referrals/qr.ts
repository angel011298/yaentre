import { deflateSync } from 'node:zlib';
import QRCode from 'qrcode';
import { referralUrl } from './code';

/**
 * QR DEL ENLACE DE REFERIDO — Bloque 3 (ESPECIFICACION_QR_COMISIONES §3.2-3.3).
 *
 * Se genera EN EL SERVIDOR con la librería `qrcode` (nunca un servicio externo:
 * el código de una persona no sale a un tercero). La librería calcula la matriz
 * de módulos; el PNG se compone aquí —en vez de `QRCode.toBuffer`— por una razón
 * concreta: la spec (§3.2) pide el logo de YaEntre/Tino EN EL CENTRO, y
 * `toBuffer` no lo admite. Escribir el PNG a mano son ~30 líneas (`node:zlib` +
 * CRC32) y no agrega ninguna dependencia.
 *
 * ── El logo no puede romper el escaneo ─────────────────────────────────────
 *
 * Corrección de errores nivel H (30 %): el QR sigue leyéndose con hasta ~30 % de
 * las palabras código dañadas. El logo ocupa `LOGO_RATIO` del LADO (18 % ⇒ ≈ 3 %
 * del área), muy por debajo del margen. Esto NO se da por hecho: la prueba
 * (`tests/referrals/qr.test.ts`) DECODIFICA el PNG generado con un lector real
 * (jsQR) y comprueba que devuelve el enlace exacto — y que un logo enorme sí
 * lo rompe, para que el verde signifique algo.
 */

/** Marca YaEntre (UIUX Spec). */
export const QR_DARK = '#7C3AED';
export const QR_LIGHT = '#FFFFFF';
export const QR_WIDTH_PX = 400;
export const QR_MARGIN_MODULES = 2;
/** Lado del logo como fracción del lado del QR. */
export const LOGO_RATIO = 0.18;

interface Matrix {
  size: number;
  get(row: number, col: number): number | boolean;
}

type Rgb = readonly [number, number, number];

function hex(color: string): Rgb {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ─────────────────────────────── Codificador PNG ───────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  typeAndData.copy(out, 4);
  out.writeUInt32BE(crc32(typeAndData), 8 + data.length);
  return out;
}

/** PNG de 8 bits por canal, RGB, sin entrelazado. `rgb` = width × height × 3 bytes. */
export function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro «ninguno»
    Buffer.from(rgb.buffer, rgb.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─────────────────────────────── Dibujo ───────────────────────────────

/** Distancia con signo a un cuadrado redondeado centrado (negativa adentro). */
function roundedBoxSdf(px: number, py: number, half: number, radius: number): number {
  const dx = Math.abs(px) - (half - radius);
  const dy = Math.abs(py) - (half - radius);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius;
}

const circleSdf = (px: number, py: number, cx: number, cy: number, r: number) => Math.hypot(px - cx, py - cy) - r;

/** Triángulo (pico del tecolote) como intersección de tres semiplanos; suficiente para un icono de 70 px. */
function beakSdf(px: number, py: number, cx: number, cy: number, r: number): number {
  const dy = py - cy;
  const half = r * (1 - dy / (r * 1.6)) * 0.6;
  return Math.max(Math.abs(px - cx) - Math.max(half, 0), dy - r * 1.1, -dy - r * 0.05);
}

/** Cobertura 0..1 de una forma con distancia `d` (píxel de borde suavizado). */
const coverage = (d: number) => Math.min(1, Math.max(0, 0.5 - d));

function blend(buf: Uint8Array, offset: number, color: Rgb, alpha: number): void {
  if (alpha <= 0) return;
  for (let i = 0; i < 3; i++) buf[offset + i] = Math.round(buf[offset + i] * (1 - alpha) + color[i] * alpha);
}

/**
 * Tino, en pequeño: cara violeta con dos ojos blancos de pupila oscura y pico
 * ámbar, sobre una placa blanca de esquinas redondeadas. Es una marca, no una
 * ilustración: a 70 px solo se ven las formas grandes.
 */
function drawLogo(buf: Uint8Array, width: number, boxPx: number): void {
  const c = width / 2;
  const half = boxPx / 2;
  const brand = hex(QR_DARK);
  const white = hex(QR_LIGHT);
  const dark: Rgb = [30, 27, 46];
  const amber: Rgb = [245, 158, 11];

  const face = half * 0.72;
  const eyeR = half * 0.27;
  const eyeDx = half * 0.32;
  const eyeY = -half * 0.1;

  for (let y = Math.floor(c - half) - 1; y <= Math.ceil(c + half) + 1; y++) {
    for (let x = Math.floor(c - half) - 1; x <= Math.ceil(c + half) + 1; x++) {
      const px = x + 0.5 - c;
      const py = y + 0.5 - c;
      const o = (y * width + x) * 3;

      blend(buf, o, white, coverage(roundedBoxSdf(px, py, half, half * 0.28)));
      blend(buf, o, brand, coverage(circleSdf(px, py, 0, 0, face)));
      blend(buf, o, white, coverage(circleSdf(px, py, -eyeDx, eyeY, eyeR)));
      blend(buf, o, white, coverage(circleSdf(px, py, eyeDx, eyeY, eyeR)));
      blend(buf, o, dark, coverage(circleSdf(px, py, -eyeDx, eyeY, eyeR * 0.5)));
      blend(buf, o, dark, coverage(circleSdf(px, py, eyeDx, eyeY, eyeR * 0.5)));
      blend(buf, o, amber, coverage(beakSdf(px, py, 0, eyeY + eyeR * 0.9, eyeR * 0.75)));
    }
  }
}

export interface RenderOptions {
  widthPx?: number;
  marginModules?: number;
  /** Lado del logo / lado del QR. `0` = sin logo. */
  logoRatio?: number;
  dark?: string;
  light?: string;
}

/** Compone el PNG de una matriz de módulos. Puro: la matriz llega hecha. */
export function renderQrPng(matrix: Matrix, options: RenderOptions = {}): Buffer {
  const { widthPx = QR_WIDTH_PX, marginModules = QR_MARGIN_MODULES, logoRatio = LOGO_RATIO } = options;
  const dark = hex(options.dark ?? QR_DARK);
  const light = hex(options.light ?? QR_LIGHT);

  const modulesAcross = matrix.size + marginModules * 2;
  const scale = Math.max(1, Math.floor(widthPx / modulesAcross));
  const size = modulesAcross * scale;

  const rgb = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / scale) - marginModules;
    for (let x = 0; x < size; x++) {
      const col = Math.floor(x / scale) - marginModules;
      const inside = row >= 0 && col >= 0 && row < matrix.size && col < matrix.size;
      const color = inside && matrix.get(row, col) ? dark : light;
      const o = (y * size + x) * 3;
      rgb[o] = color[0];
      rgb[o + 1] = color[1];
      rgb[o + 2] = color[2];
    }
  }

  if (logoRatio > 0) drawLogo(rgb, size, Math.round(matrix.size * scale * logoRatio));
  return encodePng(size, size, rgb);
}

/**
 * El QR de un código, como PNG de ~400 px con el logo al centro. Nivel de
 * corrección H: sin él, el logo taparía datos.
 */
export async function generateReferralQR(code: string, siteUrl: string, options: RenderOptions = {}): Promise<Buffer> {
  const qr = QRCode.create(referralUrl(code, siteUrl), { errorCorrectionLevel: 'H' });
  return renderQrPng(qr.modules, options);
}
