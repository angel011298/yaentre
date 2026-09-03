# SEO — YaEntre

> Fase **G68** (2026-09-02). Objetivo: que el sitio sea correctamente
> indexable y aparezca en las búsquedas relevantes ("cómo entrar a la UNAM",
> "aciertos mínimos", "guía examen IPN", "simulador examen IPN", …), que son
> el canal de adquisición más barato del producto.
>
> Modelo real: `claude-sonnet-5`.

Este documento es la referencia viva de SEO técnico. Complementa
`docs/AUDITORIA_FRONTEND.md` (rendimiento, G62) y `docs/ESTADO.md`.

---

## 0. Resumen ejecutivo

| Criterio | Estado |
|---|---|
| Metadatos completos en todas las páginas públicas | ✅ |
| Mapa del sitio y reglas de indexación correctas | ✅ |
| Páginas privadas excluidas de indexación | ✅ (3 capas: redirect + `robots.txt` + `noindex`) |
| Datos estructurados (Organización, Producto, FAQ) | ✅ |
| Estructura de encabezados jerárquica | ✅ verificada |
| URLs limpias y descriptivas | ✅ verificada |
| Velocidad (Core Web Vitals) | ✅ atendida en G62, sin regresión |
| Verificación en Search Console / Bing | 🔧 **acción del dueño** — ver §7 |

`pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test:unit` (526/526) en
verde. **No se tocó `prisma/schema.prisma`.**

---

## 1. Metadatos por página pública

`metadataBase` sale de `getSiteUrl()` (`src/lib/auth/site-url.ts`): en
producción es `https://yaentre.com`; si `NEXT_PUBLIC_SITE_URL` llegara a
faltar, el código cae a ese dominio en vez de a `localhost` (red de seguridad
nueva en G68 — antes un canónico roto habría apuntado todo a localhost).

El `<title>` usa plantilla en `app/layout.tsx`: `%s — YaEntre`. Cada página
pasa solo su parte; la landing usa `title.absolute`.

| Ruta | `<title>` | `description` (resumen) | canonical | OG/Twitter | `robots` |
|---|---|---|---|---|---|
| `/` | YaEntre — Prepárate para tu examen de admisión a la UNAM, el IPN, la UAM y el CENEVAL | Simulador fiel + Entrómetro + ruta adaptativa; empieza gratis | `/` | ✅ completo + imagen | index |
| `/precios` | Precios y planes — YaEntre | 4 planes, qué incluye cada uno, pago OXXO/SPEI | `/precios` | ✅ completo + imagen | index |
| `/registro` | Crea tu cuenta gratis — YaEntre | Regístrate gratis, empieza tu diagnóstico | `/registro` | ✅ completo + imagen | index |
| `/login` | Inicia sesión — YaEntre | Entra y sigue tu preparación | `/login` | heredado del layout | index |
| `/legal/privacidad` | Aviso de privacidad — YaEntre | — | `/legal/privacidad` | heredado | **noindex** (ver §6) |
| `/legal/terminos` | Términos y condiciones — YaEntre | — | `/legal/terminos` | heredado | **noindex** (ver §6) |
| `/recuperar-password` | Recuperar contraseña — YaEntre | — | — | heredado | **noindex, nofollow** |
| `/actualizar-password` | Crear nueva contraseña — YaEntre | — | — | heredado | **noindex, nofollow** (llega con token) |

**Redes sociales / WhatsApp:** todas las páginas indexables emiten el juego
completo de `og:*` (`type`, `site_name`, `locale=es_MX`, `url`, `title`,
`description`, `image` 1200×630) y `twitter:card=summary_large_image` con su
imagen. La imagen se genera al vuelo con `next/og` (`app/opengraph-image.tsx`
+ `app/twitter-image.tsx`, que la reexporta) — gradiente de marca + 🦉 +
"YaEntre" + tagline, sin depender de un archivo de diseño.

> ⚠️ **Detalle de Next.js que costó un ciclo:** `openGraph` **no** se fusiona
> en profundidad. Si una página define su `openGraph`, reemplaza por completo
> el del layout raíz, incluida la imagen que Next inyecta desde el archivo.
> Por eso las páginas que personalizan OG lo hacen vía
> `openGraphFor()` (`src/lib/seo/metadata.ts`), que reinyecta
> `type`/`siteName`/`locale`/`images`. Las que no lo personalizan (login,
> legales) heredan el del layout sin problema.

Meta adicionales del layout raíz: `keywords` (10 términos de intención:
"examen de admisión UNAM/IPN", "aciertos mínimos UNAM", "guía examen IPN",
"cómo entrar a la UNAM/IPN", "preparación EXANI II CENEVAL", …),
`applicationName`, `authors`/`creator`/`publisher`, `category: education`,
`formatDetection: { telephone: false }`, y `robots.googleBot` con
`max-image-preview: large` + `max-snippet: -1` (habilita miniaturas grandes y
snippets completos en resultados y previews).

---

## 2. Mapa del sitio y reglas de indexación

### `app/sitemap.ts` → `/sitemap.xml`

Solo las 4 páginas públicas indexables: `/` (prioridad 1), `/precios` (0.9),
`/registro` (0.7), `/login` (0.3). `lastModified` es una **fecha real**
(`LAST_CONTENT_UPDATE`), no `new Date()` — un "modificado ahora" en cada
petición es ruido para el rastreador. Actualizar esa constante cuando cambie
el copy público.

Las legales quedan fuera a propósito (§6). Las privadas nunca entran.

### `app/robots.ts` → `/robots.txt`

`Allow: /` y `Disallow` de toda la superficie autenticada/utilitaria:

```
/app$   /app/   /tutor   /admin   /api/   /monitoring   /simulador
/practicar   /diagnostico   /onboarding   /checkout   /paywall
/auth/   /actualizar-password   /recuperar-password
```

- `/app$` + `/app/` en vez de `/app` a secas: este último también bloquearía
  `/apple-icon` y `/apple-touch-icon` (arrancan con "/app").
- `/monitoring` es el túnel de Sentry (`tunnelRoute`).
- Incluye `Host:` y `Sitemap:` absolutos (desde `getSiteUrl()`).

### Exclusión de páginas privadas — 3 capas independientes

1. **Redirect:** `proxy.ts` + los guards de cada layout mandan a
   `/login?next=…` a cualquier visitante sin sesión. Un rastreador anónimo
   **nunca ve contenido indexable** en `/app`, `/tutor`, `/admin`,
   `/simulador`, `/practicar`, `/paywall`, `/onboarding`, `/diagnostico`
   (verificado: los 8 responden 307). 
2. **`robots.txt`:** listado de arriba — no las rastrea.
3. **`noindex` por metadata:** `app/(app)/layout.tsx`, `app/onboarding/layout.tsx`,
   `app/tutor/layout.tsx`, `app/admin/layout.tsx` y `app/simulador/page.tsx`
   emiten `robots: { index: false, follow: false }`, que se hereda a todas
   sus rutas hijas. Cinturón para cualquier variante cacheada/pública futura.

---

## 3. Datos estructurados (JSON-LD)

Constructores puros en `src/lib/seo/structured-data.ts`, renderizados con
`<JsonLd>` (`src/lib/seo/JsonLd.tsx`, escapa `<` — la CSP los permite porque
`type="application/ld+json"` no es JS ejecutable).

| Página | Bloques |
|---|---|
| `/` | `EducationalOrganization` (con `@id` estable `#organization`, nombre, logo, `image`, `email`, `areaServed: México`, `contactPoint`), `WebSite` (`publisher` → la organización), `FAQPage` (las 8 preguntas de la landing) |
| `/precios` | `Product` "YaEntre" con `brand`, `category`, y un `Offer` por plan (**Free $0**, Mensual, Pase de Temporada, Premium) con el precio de la **temporada vigente** en pesos MXN, `priceCurrency: MXN`, `availability: InStock`, `seller` → la organización |

- El `FAQPage` y el acordeón visible comparten **una sola fuente**:
  `src/lib/marketing/faq-data.ts` (extraído de `Faq.tsx` en G68) — el texto
  que lee Google y el que ve el usuario no pueden divergir.
- El `Product` **no** lleva `aggregateRating` ni `review` — no hay reseñas
  reales todavía y no se inventan. Google mostrará un aviso "no crítico" en el
  test de resultados enriquecidos; el marcado sigue siendo válido y ayuda a
  entender el producto. Añadir `aggregateRating` cuando haya reseñas reales
  (p. ej. de la beta cerrada, `docs/BETA_FEEDBACK.md`).
- Verificar en <https://search.google.com/test/rich-results> tras el deploy.

---

## 4. Estructura de encabezados

Verificada extrayendo la secuencia de `<hN>` del HTML servido:

- **`/`** → `h1` (Hero) · `h2` Diferenciadores → `h3`×4 · `h2` Sección padres
  → `h3`×3 · `h2` CTA · `h2` FAQ. Un solo `h1`, sin saltos de nivel.
- **`/precios`** → `h1` · `h2` "Planes y precios" (`sr-only`, nuevo en G68)
  → `h3`×4 (tarjetas de plan, antes eran `<p>`) · `h2` "Qué incluye cada
  plan". Sin saltos.
- **Auth** (`/registro`, `/login`, recuperar/actualizar) → `AuthShell` emite
  el `h1` del título. Sin más encabezados (formularios cortos).
- **Legales** → `h1` + `h2` numerados por sección.

Cada `<section>` relevante ganó `aria-labelledby` apuntando a su encabezado.

---

## 5. URLs

Todas las URLs públicas ya eran limpias, en minúsculas, con guiones, en
español y sin parámetros para enrutar contenido:

```
/            /precios      /registro     /login
/legal/terminos             /legal/privacidad
```

No hay nada que corregir. `trailingSlash` queda en el default (`false`).
`/registro?role=tutor` usa un query param solo para una variante de copy — su
canónico es `/registro` a secas, así Google consolida la señal.

---

## 6. Páginas legales — `noindex` temporal

`/legal/terminos` y `/legal/privacidad` están **construidas** pero contienen
marcadores literales «PLACEHOLDER» / «EDITAR ANTES DE PUBLICAR» (razón social,
domicilio legal, teléfono). Mientras sea así:

- Emiten `robots: { index: false, follow: true }`.
- No están en `sitemap.ts`.

**Cuando el dueño complete los datos legales reales:**
1. Quitar el `robots` de `app/(public)/legal/terminos/page.tsx` y
   `.../privacidad/page.tsx`.
2. Agregar ambas rutas a `app/sitemap.ts` (prioridad ~0.3, `changeFrequency: yearly`).

Indexar las páginas legales da señal de confianza (E-E-A-T) para el sitio
completo; hoy no se hace solo porque el contenido está incompleto.

---

## 7. Verificación en herramientas para administradores web — **acción del dueño**

El código ya soporta la verificación por **meta tag** vía variables de
entorno (además, siempre se puede verificar por **DNS TXT**, que no toca el
código). Ver `.env.example`:

```
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_BING_SITE_VERIFICATION=
```

Si tienen valor, `app/layout.tsx` emite `<meta name="google-site-verification">`
y `<meta name="msvalidate.01">` en todo el sitio. Si están vacías, no se emite
nada (no rompe nada).

### Google Search Console

1. Entrar a <https://search.google.com/search-console> con la cuenta de
   Google del negocio.
2. Agregar propiedad. **Recomendado: tipo "Dominio"** (`yaentre.com`) →
   verificación por **registro DNS TXT** en el proveedor del dominio. Cubre
   `http`, `https`, `www` y subdominios de una sola vez.
   - Alternativa sin DNS: propiedad tipo "Prefijo de URL"
     (`https://yaentre.com`) → método **"Etiqueta HTML"** → copiar **solo** el
     valor de `content="…"` → ponerlo en `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
     en el proyecto de Vercel → **redeploy** → pulsar "Verificar".
3. Ya verificado: **Sitemaps → añadir `sitemap.xml`** → enviar.
4. Opcional pero útil: "Inspección de URL" sobre `https://yaentre.com/` y
   `…/precios` → "Solicitar indexación".

### Bing Webmaster Tools

1. Entrar a <https://www.bing.com/webmasters>.
2. Lo más rápido: **"Importar desde Google Search Console"** (una vez hecho lo
   de arriba) — trae la propiedad ya verificada y el sitemap.
   - Alternativa: agregar `https://yaentre.com` → método **"Etiqueta meta"** →
     valor de `content="…"` → `NEXT_PUBLIC_BING_SITE_VERIFICATION` en Vercel →
     redeploy → "Verificar". O DNS TXT / archivo XML.
3. Enviar `https://yaentre.com/sitemap.xml` en "Sitemaps".

Bing Webmaster también alimenta a DuckDuckGo, Ecosia y Yahoo.

### Requisito previo (para que la verificación signifique algo)

- `NEXT_PUBLIC_SITE_URL=https://yaentre.com` debe estar en las env vars de
  **producción** de Vercel (según `docs/ESTADO.md` ya lo está — el
  `sitemap.xml`/`robots.txt` de producción sirven URLs de `yaentre.com`).
- El deploy de producción debe reflejar este commit para que las meta tags de
  verificación y el JSON-LD estén en vivo.

---

## 8. Velocidad (confirmación de G62)

G62 dejó las 5 pantallas críticas ≥ 85 en Lighthouse móvil (landing 96,
registro 98) y CLS ≤ 0.06. G68 **no introduce JS de cliente**: el JSON-LD se
renderiza en el servidor (~2–4 KB de texto por página, dentro del HTML), los
constructores son funciones puras que corren en RSC, y no se añadió ninguna
dependencia. `pnpm build` sin cambios de tamaño de bundle. Sin regresión.

Pendiente heredado de G62 (no de SEO): re-medir Lighthouse de `/app` y
`/practicar` contra el deploy real (TTFB Vercel↔Supabase co-ubicados) — no
bloquea el SEO porque esas rutas son `noindex`.

---

## 9. La oportunidad más grande que este código NO resuelve

El público busca **respuestas**, no marca: "cómo entrar a la UNAM", "aciertos
mínimos por carrera", "qué viene en el examen del IPN", "guía CENEVAL EXANI
II". Hoy el sitio no tiene una sola página que responda esas preguntas —
`/` y `/precios` son páginas de producto, no de contenido.

Ya existe **materia prima propia** para esas páginas, con fuentes citadas:

- `docs/ACIERTOS_MINIMOS.md` — aciertos mínimos por carrera UNAM/IPN con nivel
  de confianza y fuente oficial (portal de resultados DGAE, transparencia).
- `docs/EXTRACCION_IPN.md`, `docs/EXTRACCION_ECOEMS.md`,
  `docs/FUENTES_ADICIONALES.md` — estructura, temario y formato de cada
  examen.

**Recomendación para una fase futura** (contenido, no infra): una sección
pública `/guias` (o `/blog`) con páginas como:

- "Aciertos mínimos UNAM 2025 por carrera" (tabla + explicación del Entrómetro).
- "Cómo es el examen de admisión del IPN: estructura, temario y consejos".
- "Guía del EXANI II (CENEVAL): qué evalúa y cómo prepararte".

Cada una con su `Article`/`FAQPage` JSON-LD, enlaces internos a `/registro`, y
entrada en el `sitemap.ts`. Es el trabajo con mayor retorno de adquisición
orgánica y encaja con el modelo de contenido del proyecto (todo vía sesiones
de Claude Code, nunca la API de pago).

Otros pendientes menores:
- **Perfiles sociales** (Instagram/TikTok/Facebook): cuando existan, añadir
  sus URLs a `sameAs` en `organizationJsonLd()` — refuerza la entidad de
  marca en el Knowledge Graph.
- **`aggregateRating`** en el `Product` cuando haya reseñas reales.
- Reenviar el sitemap a Search Console tras publicar guías.

---

## 10. Archivos tocados en G68

```
src/lib/auth/site-url.ts            fallback a yaentre.com en producción
src/lib/seo/JsonLd.tsx              (nuevo) componente <script type=ld+json>
src/lib/seo/structured-data.ts      (nuevo) Organization / WebSite / FAQ / Product
src/lib/seo/metadata.ts             (nuevo) openGraphFor()
src/lib/marketing/faq-data.ts       (nuevo) FAQ_ITEMS, fuente única
src/components/marketing/Faq.tsx    consume faq-data, aria-labelledby
app/layout.tsx                      title template, OG/Twitter, keywords, robots, verification
app/twitter-image.tsx               (nuevo) reexporta opengraph-image
app/robots.ts                       superficie privada completa + Host
app/sitemap.ts                      lastModified fijo, comentario legales
app/(public)/page.tsx               metadata keyword-rich + JSON-LD (Org/WebSite/FAQ)
app/(public)/precios/page.tsx       metadata + Product JSON-LD + h2/h3
app/(public)/registro/page.tsx      (nuevo) metadata
app/(public)/login/page.tsx         (nuevo) metadata
app/(public)/recuperar-password/page.tsx     (nuevo) metadata noindex
app/(public)/actualizar-password/page.tsx    (nuevo) metadata noindex
app/(public)/legal/{terminos,privacidad}/page.tsx   canonical + nota noindex
app/(app)/layout.tsx  app/onboarding/layout.tsx  app/tutor/layout.tsx
app/admin/layout.tsx  app/simulador/page.tsx     robots noindex
app/tutor/page.tsx  app/(app)/app/{progreso,perfil}/page.tsx   títulos a plantilla
.env.example                        NEXT_PUBLIC_{GOOGLE,BING}_SITE_VERIFICATION
```
