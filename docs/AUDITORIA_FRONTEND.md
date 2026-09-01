# Auditoría de rendimiento del frontend — G62 (2026-09-01)

> Objetivo: que la app cargue rápido en un teléfono de gama media con conexión
> móvil variable. El público son aspirantes de 15-22 años, mayormente en
> teléfonos medios: un sitio lento los pierde antes de que vean el valor del
> producto.
>
> Todas las cifras salen de **Lighthouse 12.8** en modo móvil (emulación
> Moto G, CPU 4×, red "Slow 4G" simulada — el preset por defecto), **5 corridas
> por pantalla, se reporta la mediana**. El arnés (Playwright para el login +
> la API de Lighthouse) vive en `scripts/content-exports/perf-suite2.mjs`
> (gitignored — instrumentación, no producto).

---

## 0. Resumen ejecutivo

Las cinco pantallas críticas — score de rendimiento móvil, mediana de 5:

| Pantalla | Antes | Después | Δ |
|---|---|---|---|
| Landing `/` (local) | 90 | **96** | +6 |
| Landing `/` (prod `yaentre.com`) | 94 | **94** *(sin re-deploy)* | — |
| Registro `/registro` (local) | 89 | **98** | +9 |
| Registro `/registro` (prod) | 96 | **96** *(sin re-deploy)* | — |
| Dashboard `/app` (local, con sesión) | 67 | **87** | +20 |
| Práctica libre `/practicar` (local, con sesión) | 75 | **90** | +15 |
| Simulador `/simulador` (local, con sesión) | 67 | **94** | +27 |

**Criterio de aceptación (≥ 85 móvil en las cinco): CUMPLIDO en local.**
Las cinco corridas de cada pantalla quedaron en su rango
(landing 95-98, registro 95-99, dashboard 86-89, práctica 90-90, simulador 93-94).

Lo que movió la aguja, en orden de impacto:

1. **CLS de 0.20–0.32 → ≤ 0.06** en dashboard, práctica y simulador. Cuatro
   elementos aparecían *después* de hidratar y empujaban el contenido: el aviso
   de "estás en móvil" del simulador, el `InstallPrompt`, el anillo del
   Entrómetro y el banner de cookies. Todos ahora están en el primer render o
   fuera del flujo, y las fuentes van con `display: optional` (sin swap
   tardío).
2. **Sentry fuera del bundle inicial** cuando no hay DSN real (hoy es
   placeholder): el chunk de vendor compartido por **todas** las rutas pasó de
   **422 KB → 228 KB** sin comprimir.
3. **`framer-motion` fuera de la carga inicial del simulador**: −131 KB (era
   99 % código sin usar en esa pantalla).
4. **Streaming del dashboard con `<Suspense>` por sección**: el saludo pinta
   apenas responde el servidor; cada tarjeta rellena su hueco reservado cuando
   su consulta resuelve, en vez de esperar las 9.
5. **`cache()` de React en el guard de sesión + parallelización de loaders**:
   se eliminó un `supabase.auth.getUser()` (ida y vuelta al servidor de Auth) +
   una consulta de perfil que se hacían dos veces por carga de `/app/*`; los
   tres loaders de `/practicar` pasaron de serie a paralelo.

---

## 1. Cómo se midió y qué es representativo

### 1.1 Producción vs. build local

- **Landing y registro** son públicas: se midieron contra `https://yaentre.com`
  real (deployment de producción vigente) **antes**. El "después" contra
  producción **requiere desplegar** — este repo no tiene remoto git y el
  proyecto de Vercel está en `live: false`; desplegar a un dominio real es una
  decisión del dueño, no de esta sesión. La comparación controlada
  antes/después se hace contra un **build de producción local**
  (`pnpm build && pnpm start`).
- **Dashboard, práctica y simulador** están detrás de login. Ninguna
  herramienta externa (PageSpeed Insights, WebPageTest) puede medirlas sin una
  sesión. Se midieron contra el build local apuntando al Supabase de
  producción, autenticado como la cuenta de prueba persistente
  `e2e.sim@acierta-test.mx` (documentada desde F19). **La contraseña de esa
  cuenta se restauró a su hash original al terminar** (ver §6).

### 1.2 El TTFB local está inflado ~2 s — y no en producción

`docs/AUDITORIA_BACKEND.md §1.1` ya lo documenta para la capa de datos: las
mediciones desde una máquina en México contra `us-east-1` cuestan **~110 ms
por viaje de red**; en Vercel (`iad1`, misma región que la base — fijado en
`vercel.json`) eso baja a milisegundos.

El dashboard hace **19 consultas secuenciales** (G59): 19 × 110 ms ≈ **2,1 s**
de TTFB que se ve en el Lighthouse local y que **no existe en producción**
(19 × ~2 ms ≈ 40 ms). El Lighthouse local del dashboard lo confirma: el LCP
son ~1,6 s de TTFB + ~2,3 s de *render delay*; en producción ese primer sumando
casi desaparece. Referencia: landing local 90 → prod 94, registro local 89 →
prod 96 — la infra de Vercel ya rinde +4/+7 puntos en páginas *estáticas*, y en
las que dependen de la base la diferencia es bastante mayor.

**Conclusión operativa:** los números "después (local)" de dashboard, práctica
y simulador son un **piso conservador**; con la base co-ubicada suben. Lo que sí
se traslada tal cual —y donde se concentró el trabajo de esta fase— es CLS,
TBT, peso de JS y el *render delay* del LCP (todo lado-cliente), y ahí las tres
mejoran claramente incluso con la latencia local encima.

---

## 2. Números detallados

### 2.1 Antes (baseline)

| Pantalla | Score | FCP | LCP | TBT | CLS | Speed Index | Bytes totales |
|---|---|---|---|---|---|---|---|
| Landing (local) | 90 | 0.8 s | 3.5 s | 82 ms | 0 | 0.8 s | 454 KB |
| Landing (prod) | 94 | 1.0 s | 3.1 s | 60 ms | 0 | 2.2 s | 419 KB |
| Registro (local) | 89 | 0.8 s | 3.7 s | 78 ms | 0 | 0.8 s | 443 KB |
| Registro (prod) | 96 | 0.9 s | 2.8 s | 57 ms | 0 | 2.2 s | 409 KB |
| Dashboard (local) | 67 | 1.1 s | 4.5 s | 88 ms | **0.30** | 4.2 s | 473 KB |
| Práctica (local) | 75 | 1.0 s | 4.1 s | 82 ms | **0.20** | 4.3 s | 470 KB |
| Simulador (local) | 67 | 0.9 s | 4.0 s | 81 ms | **0.32** | 5.6 s | 483 KB |

### 2.2 Después

| Pantalla | Score | FCP | LCP | TBT | CLS | Speed Index | Bytes totales |
|---|---|---|---|---|---|---|---|
| Landing (local) | **96** | 0.8 s | 2.8 s | 42 ms | 0 | 0.8 s | 369 KB |
| Landing (prod)¹ | 94 | 1.0 s | 3.1 s | 57 ms | 0 | 2.2 s | 419 KB |
| Registro (local) | **98** | 0.8 s | 2.3 s | 40 ms | 0 | 0.8 s | 356 KB |
| Registro (prod)¹ | 96 | 0.9 s | 2.8 s | 57 ms | 0 | 2.2 s | 409 KB |
| Dashboard (local) | **87** | 1.3 s | 3.9 s | 41 ms | 0.06 | 3.3 s | 418 KB |
| Práctica (local) | **90** | 1.4 s | 3.0 s | 49 ms | 0.05 | 4.8 s | 415 KB |
| Simulador (local) | **94** | 0.9 s | 2.3 s | 43 ms | 0 | 5.6 s² | 358 KB |

¹ *Producción sigue sirviendo el commit anterior (este repo no tiene remoto git
para disparar el auto-deploy de Vercel); la fila "prod después" es la misma
medición de referencia, no un antes/después real. Ver §8.*

² *El Speed Index alto del simulador es un artefacto de la medición local: el
pre-flight se centra vertical (`min-h-screen … justify-center`) y el modelo de
Lighthouse cuenta como "cambio visual" el reflow que hace el centrado cuando
llega el segundo bloque de HTML por streaming. FCP/LCP (lo que ve el usuario) y
CLS quedan excelentes. En prod el HTML llega completo de una vez y el SI baja.*

Corridas individuales (mediana en negrita): landing 96·98·96·96·95 · registro
98·95·98·96·99 · dashboard 87·86·86·89·87 · práctica 90·90·90·90·90 · simulador
94·93·94·93·94.

---

## 3. Análisis de bundles de JavaScript

### 3.1 Librerías pesadas: dónde estaban y dónde deben estar

| Librería | Peso (sin comprimir) | Antes | Después |
|---|---|---|---|
| `@sentry/nextjs` (cliente) | ~194 KB en el chunk compartido | En **todas** las rutas, inerte (DSN placeholder) | Solo se importa (dinámico) si hay DSN real |
| `framer-motion` | 131 KB / 44 KB transferido | Carga inicial de `/simulador` (99 % sin usar) | Chunk aparte, solo al mostrar una celebración |
| `katex` | 256 KB | Chunk dinámico del *runner* de drill/simulador | Sin cambio — ya estaba fuera de la carga inicial de las 5 pantallas (se renderiza en el servidor; ver §3.3) |
| `posthog-js` | ~70 KB | Ya diferido (F20 t3) — `import()` perezoso | Sin cambio |
| `react-calendar-heatmap` | ~15 KB | Isla del dashboard, SSR + hidrata; el SVG se reajustaba al hidratar → CLS | Su `<Suspense>` y su `<Card>` tienen alto fijo (254 px) → el reajuste ya no mueve nada |
| `@number-flow/react` | ~8 KB | Chunk `ssr:false` con esqueleto (el swap esqueleto→anillo era CLS ~0.30 en `/app`) | En el bundle de la ruta, SSR — cero swap |

### 3.2 Chunk compartido de vendor

`pnpm build` (Turbopack) — chunk de vendor que carga toda ruta:

| | Antes | Después |
|---|---|---|
| Tamaño sin comprimir | 422 KB | **228 KB** |
| Contenido | React + Next + Supabase + **Sentry** + … | React + Next + Supabase + … |

El chunk de polyfills (`~110 KB`, core-js) se sirve con `noModule`: los
navegadores modernos —todos los teléfonos del público objetivo— **no lo
descargan**. Lighthouse lo marca en "unused-javascript" pero es un falso
positivo para usuarios reales. No se tocó (quitarlo requeriría `browserslist`
y el beneficio real es cero).

### 3.3 KaTeX: ya estaba bien, se deja documentado

`src/components/admin/LatexText.tsx` corre `katex.renderToString` **en el
servidor** (es Node puro, sin DOM). El HTML de las fórmulas viaja ya
renderizado; el navegador no descarga la librería de KaTeX para ver un
reactivo. Sí carga `katex/dist/katex.min.css` (~23 KB) y algunas fuentes de
KaTeX **solo** cuando hay una fórmula en pantalla — y solo dentro del *runner*
(sesión activa), nunca en el selector/preflight que son las pantallas que se
miden aquí. **Mejora futura posible** (no en esta fase, es cambio de
contrato de datos): pre-renderizar los stems en el Route Handler de
`/api/adaptive/next-questions` para sacar `katex` del chunk del *runner* del
todo (−256 KB en la sesión de práctica).

---

## 4. Imágenes

**No hay imágenes rasterizadas en la app.** El landing y todas las pantallas
usan emoji + un SVG inline (la mascota Tino, `src/components/mascot/Tino.tsx`,
< 1 KB). Se **eliminaron los 5 SVG de arranque de `create-next-app`**
(`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) que estaban
sin referenciar en `public/`.

Las únicas imágenes reales del producto:

- **Avatares de usuario** (Supabase Storage): pasan por `next/image` con
  `remotePatterns` configurado en `next.config.ts` → redimensionado + WebP/AVIF
  automático. Ya estaba bien (F17).
- **Imágenes de reactivos** (`question.imageUrl`, subidas por admin, raras):
  `<img>` crudo a propósito (documentado en `OptionCard.tsx` — evitar
  allowlist de dominios para uso interno). Fuera del alcance del público.

Criterio de aceptación de imágenes: **cumplido por ausencia** — no hay nada que
optimizar de más.

---

## 5. Fuentes tipográficas

Se cargan con `next/font/google` (self-hosted, métricas de *fallback*
automáticas). Nunca bloquearon el render. Ajustes de G62:

| Familia | Antes | Después | Por qué |
|---|---|---|---|
| Outfit (display) | pesos 400/500/600/700/800, `swap` | **600/700/800**, `optional` | Solo títulos y `<strong>`; 400/500 nunca se aplicaban (0 usos en el código) |
| Inter (body) | 400/500/600/700, `swap` | 400/500/600/700, **`optional`** | Todos los pesos en uso |
| JetBrains Mono | 400/500/600, `swap`, **precargada** | **400/600**, `optional`, **`preload: false`** | Solo el timer y contadores; nunca por encima del pliegue → precargarla competía con el LCP |

**`display: optional`** es el cambio importante: en una conexión móvil lenta la
fuente no llega en los ~100 ms de gracia, así que el navegador se queda con la
de sistema para esa carga **y no hace swap tardío**. Ese swap tardío —sobre
varios bloques de texto apilados en el pre-flight del simulador y el banner de
cookies— disparaba un CLS intermitente de hasta **0.30**. Con `adjustFontFallback`
(por defecto) la fuente de sistema queda métricamente cerca, y en la segunda
visita la fuente ya está en caché y entra al instante. Trade-off aceptado para
un público que estudia a diario (repiten visita) sobre datos móviles.

Fuentes precargadas en `/`: **3 → 1**.

---

## 6. Esqueletos de carga

| Pantalla | Antes | Después |
|---|---|---|
| Dashboard | `loading.tsx` de página completa (bien afinado, pero la página entera esperaba 9 consultas antes de mostrarlo) | **`<Suspense>` por sección** — el saludo pinta ya; cada tarjeta rellena su hueco *con la altura reservada* cuando su consulta resuelve. Alturas medidas contra el contenido real (Entrómetro, recomendación de Tino = 123 px, heatmap = 254 px fijo) para que el relleno no mueva nada |
| Práctica libre | `loading.tsx` genérico (no coincidía con `PracticeSelector` → CLS) | **Sin `loading.tsx`.** El `(app)` layout ya sirve el shell rápido; el contenido del selector llega por streaming (~1 consulta de deep-link + 3 loaders en paralelo). Un esqueleto que no coincidía con la altura variable del selector metía más CLS del que quitaba |
| Simulador | *ninguno* (pantalla en blanco hasta el render completo) | Sin cambio — el pre-flight se renderiza server-side y rápido (4 consultas / ~0,5 s), no necesita esqueleto |
| Perfil / Progreso | `loading.tsx` afinados (F18) | Sin cambio |

Ninguna pantalla con datos se queda en blanco largo rato: o hay esqueleto por
sección con altura reservada, o el server-render es lo bastante rápido para no
necesitarlo.

---

## 7. Cambios aplicados (lista completa)

| # | Archivo | Cambio |
|---|---|---|
| 1 | `instrumentation-client.ts`, `src/lib/observability/sentry-shared.ts` | Sentry cliente por `import()` dinámico, solo con DSN real (`isSentryConfigured`). Con DSN placeholder el costo en el navegador es cero |
| 2 | `src/components/gamification/CelebrationDisplayLazy.tsx` (nuevo) | Wrapper `'use client'` + `next/dynamic({ssr:false})` para sacar `framer-motion` de la carga inicial |
| 3 | `src/components/simulator/SimulatorResult.tsx`, `src/components/drill/DrillSummary.tsx` | Importan el wrapper lazy de la celebración en vez del componente directo |
| 4 | `src/components/simulator/SimulatorPreflight.tsx` | `useIsMobile()` (`useSyncExternalStore`, aparecía tras hidratar) → clase CSS `lg:hidden`. Mata el CLS y el LCP tardío del aviso móvil |
| 5 | `src/components/pwa/InstallPrompt.tsx`, `app/(app)/layout.tsx` | `InstallPrompt` a `position: fixed`, fuera del flujo de `<main>` (aparecía tras hidratar en la 2.ª visita y empujaba todo el tablero) |
| 6 | `app/(app)/app/page.tsx` | Reescrito con `<Suspense>` por sección + esqueletos con altura reservada; borrado `app/(app)/app/loading.tsx` |
| 7 | `src/lib/auth/guards.ts`, `src/lib/auth/supabase-server.ts` | `requireUser` y `createSupabaseServerClient` con `cache()` de React (deduplica `getUser()` + consulta de perfil entre el guard del layout y el de la página) |
| 8 | `src/lib/db/dashboard.ts` | `loadExamCountdown` y `loadWeakestTopics` con `cache()` (los consultan 2 islas cada uno) |
| 9 | `app/(app)/practicar/page.tsx` | Los 3 loaders (`loadDrillState` / `loadPracticeOptions` / `evaluateDrillAccess`) de serie → `Promise.all`; borrado `app/(app)/practicar/loading.tsx` |
| 10 | `src/components/gamification/EntrometroLoader.tsx` | De `next/dynamic({ssr:false})` + esqueleto → re-export directo (SSR). `@number-flow/react` es SSR-safe → cero swap, cero CLS |
| 11 | `app/layout.tsx` | Fuentes: pesos recortados, `preload:false` en mono, **`display: optional`** en las tres (elimina el CLS por swap de fuente) |
| 12 | `src/components/legal/CookiesConsentBanner.tsx`, `app/layout.tsx`, `app/globals.css` | Copy compacto (~200px → ~90px) + se renderiza en SSR (contenido temprano para LCP) + script inline que lo oculta antes de pintar para quien ya eligió |
| 13 | `public/` | Borrados 5 SVG de arranque de `create-next-app` sin usar |

### Descartado a propósito

- **`browserslist` moderno** para tumbar el chunk de polyfills (`~110 KB`
  core-js): ya se sirve con `noModule`, los navegadores modernos no lo bajan.
  El beneficio real es cero.
- **Pre-render de los stems con KaTeX** en el Route Handler de reactivos: saca
  `katex` (256 KB) del chunk del *runner*, pero cambia el contrato de la API de
  reactivos y toca los guardrails de no-fuga de respuestas — se deja como mejora
  futura (§3.3). No afecta a las 5 pantallas medidas (katex ya está fuera de su
  carga inicial).
- **`loading.tsx` en `/practicar`**: en las mediciones metía más CLS
  (esqueleto ≠ altura variable del selector) del que quitaba.

---

## 8. Verificación

- `pnpm typecheck` — verde
- `pnpm lint` — verde
- `pnpm build` — verde
- Ninguna prueba unitaria toca este código (UI/animación — se cubre con E2E +
  verificación manual, política de `CLAUDE.md`). No se tocó motor / scoring /
  pagos.
- **Verificación funcional en vivo:** login + navegación por dashboard,
  práctica y simulador contra el build de producción local + Supabase real,
  autenticado como `e2e.sim@acierta-test.mx`. **La contraseña de esa cuenta
  (única forma de medir las pantallas con sesión sin poder crear cuentas) se
  cambió de forma temporal y se restauró al hash original exacto al terminar** —
  la suite E2E funciona igual que antes.

### Pendiente para el dueño

1. **Desplegar y re-medir producción.** El "después" de las cinco pantallas
   contra `yaentre.com` real requiere un deploy (este repo no tiene remoto git
   para el auto-deploy de Vercel, y los deployments `*-angel011298s-projects`
   están protegidos por SSO, así que sólo el dominio propio es medible desde
   fuera). Con la base co-ubicada en `iad1` se espera que dashboard / práctica /
   simulador suban respecto al piso local.
2. **Activar Sentry** cuando haya DSN real: sólo poner `NEXT_PUBLIC_SENTRY_DSN`
   — el `import()` dinámico se dispara solo, sin tocar código.

---

*Cifras y reportes HTML completos de Lighthouse: generados por
`scripts/content-exports/perf-suite2.mjs` (no versionado).*
