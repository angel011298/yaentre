/**
 * Imagen para la tarjeta de Twitter/X (G68). Es exactamente la misma que la
 * de Open Graph — se reexporta el generador de `opengraph-image.tsx` en vez
 * de duplicar el diseño. Sin este archivo, `twitter:image` quedaría sin
 * definir en varios clientes.
 */
export { default, alt, size, contentType } from './opengraph-image';
