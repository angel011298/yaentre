/**
 * Stub de `server-only` para Vitest (F19).
 *
 * El paquete real lanza al importarse fuera de un React Server Component —
 * esa es justo la protección que queremos conservar en el build de Next
 * (`STRIPE_SECRET_KEY` nunca debe cruzar al bundle del cliente). Pero las
 * pruebas de integración de Route Handlers corren en Node, no en RSC, así que
 * necesitan poder importar esos módulos. El alias vive SOLO en
 * `vitest.config.ts`: el build de producción sigue usando el paquete real.
 */
export {};
