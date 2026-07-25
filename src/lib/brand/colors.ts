/**
 * Valores de marca en hex plano (F18). Fuente única para los contadísimos
 * contextos que NO pueden consumir el sistema de diseño real
 * (app/globals.css + tailwind.config.ts): el renderer de `next/og` (Satori,
 * usado por los íconos PWA y la imagen OG) no soporta `var()`, y
 * `Metadata.themeColor`/`manifest.ts` exigen strings literales, no CSS. En
 * cualquier otro lugar (componentes React normales) usar los tokens de
 * Tailwind (`bg-brand`, `text-brand`, etc.) o `var(--brand-primary)` en SVG
 * — NUNCA importar de aquí.
 */
export const BRAND_PRIMARY_HEX = '#7C3AED';
export const BRAND_PRIMARY_HOVER_HEX = '#6D28D9';
export const BG_BASE_DARK_HEX = '#0F0F14';

export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND_PRIMARY_HEX} 0%, ${BRAND_PRIMARY_HOVER_HEX} 100%)`;
