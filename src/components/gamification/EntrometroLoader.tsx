/**
 * `EntrometroLoader` — alias histórico de `Entrometro`.
 *
 * G62 (rendimiento): antes esto era un `next/dynamic` con `ssr:false` + un
 * esqueleto `loading`. Ese patrón METÍA layout shift en el dashboard y en la
 * pantalla de resultados: el servidor mandaba un esqueleto de ~188px y, al
 * hidratar, el cliente lo cambiaba por el `Entrometro` real (~240-260px según
 * haya delta semanal / meta de carrera), empujando todo lo de abajo — CLS
 * medido de 0.30 en `/app`.
 *
 * `@number-flow/react` es SSR-safe desde 0.4 (renderiza el número estático en
 * el servidor y solo anima al hidratar), así que el anillo entero puede
 * renderizarse server-side: cero esqueleto, cero swap, cero CLS, y el número
 * central entra ya pintado en el HTML inicial (candidato a LCP temprano). El
 * costo es ~8KB de `@number-flow/react` en el bundle inicial de la ruta en vez
 * de un chunk aparte — un intercambio favorable frente a un CLS en "poor".
 *
 * Se conserva el nombre `EntrometroLoader` para no tocar los 3 call sites
 * (dashboard, resultados de diagnóstico, resultados de simulacro).
 */
export { Entrometro as EntrometroLoader } from './Entrometro';
