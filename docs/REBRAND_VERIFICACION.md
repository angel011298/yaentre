# Verificación final del rebrand a YaEntre (Fase R5)

> Ejecutada: 2026-08-21 · Control de calidad de las fases R1→R4.
> Marca anterior: **Acierta** / feature **Aciertómetro**.
> Marca actual: **YaEntre** / feature **Entrómetro** · dominio **yaentre.com**.

## Veredicto

**El rebrand está completo y consistente. No queda ningún residuo de la marca anterior fuera de 6 categorías legítimas, todas verificadas una por una y documentadas abajo.** La suite completa pasa en verde y el contenido educativo quedó demostrablemente intacto.

---

## 1. Suite completa (criterio 1)

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | ✅ verde (`tsc --noEmit`, sin salida) |
| `pnpm lint` | ✅ verde (`eslint .`, sin salida) |
| `pnpm test:unit` | ✅ **464 tests / 51 archivos, 464 passed**, 51.67s |
| `pnpm build` | ✅ producción OK, 33 rutas registradas (`exit code 0`) |

El build de producción incluye correctamente las rutas renombradas y estáticas: `/legal/privacidad`, `/legal/terminos`, `/manifest.webmanifest`, `/opengraph-image`, `/precios`, `/robots.txt`, `/sitemap.xml`.

---

## 2. Búsqueda exhaustiva de residuos (criterio 2)

Barrido case-insensitive de `acierta` sobre **todo el repositorio**, incluyendo archivos ocultos y no rastreados (`rg -i --hidden --no-ignore`), excluyendo únicamente `node_modules/`, `.git/`, `.next/`, `pnpm-lock.yaml`, `tsconfig.tsbuildinfo`, `test-results/`, `playwright-report/`, y los secretos `.env`/`.env.local` (que esta sesión no lee por política del proyecto).

**Resultado: 18 archivos con coincidencias, 0 son marca vieja sin corregir.** Clasificación completa:

| # | Categoría | Ocurrencias | Clasificación | Por qué se conserva |
|---|---|---:|---|---|
| A | Nombres de archivo `*_Acierta_v1.0.md` | 43 | **LEGÍTIMO — referencia real** | Los 5 documentos físicos **no se renombraron** (decisión explícita de R3, tarea 4). Cada una de estas 43 menciones apunta a un archivo que existe con ese nombre exacto; "corregirlas" rompería toda referencia cruzada del repo. |
| B | Roles de Postgres `acierta_ci` / `acierta_prod` | 8 | **LEGÍTIMO — infraestructura viva** | Roles reales en Supabase (dev y producción). El texto describe infraestructura que existe hoy con ese nombre; renombrar el comentario sin ejecutar `ALTER ROLE` haría que el comentario mintiera. Migrarlos es cambio de infra, no de texto. |
| C | URL `acierta.vercel.app` | 5 | **LEGÍTIMO — URL de producción real** | Sigue siendo la URL en vivo hoy (el proyecto de Vercel no se renombró a propósito). Aparece en checklists accionables (`STRIPE_LIVE_CHECKLIST`, `SERVICE_CREDENTIALS_CHECKLIST`); cambiarla los volvería instrucciones incorrectas. |
| D | `.vercel/project.json` → `"projectName":"acierta"` | 1 | **LEGÍTIMO — autogenerado** | Lo escribe el CLI de Vercel (`vercel link`). No se edita a mano; se regenera solo si algún día se renombra el proyecto. |
| E | Comentarios `Aciertómetro` en `prisma/migrations/0005_add_career_confidence.sql` | 2 | **LEGÍTIMO — checksum congelado** | Prisma verifica el checksum de cada migración ya aplicada. Editar el archivo (aunque sea solo un comentario) provocaría el error de "migración modificada después de aplicarse" en el próximo `prisma migrate`. Mismo criterio ya aplicado en R2 a `0009_security_hardening_f22.sql`. |
| F | `"Se acierta por coincidencia léxica"` en `docs/content-batches/g3e-veredictos-ipn-medbio-biologia.json` | 1 | **COMÚN — gramática, NO marca** | Es el verbo *acertar* conjugado, dentro del razonamiento de un verificador adversarial sobre un reactivo de Biología IPN. Idéntico al único caso COMÚN que identificó R1. **No debe tocarse jamás.** |
| G | `docs/ESTADO.md` (filas históricas F0-G10/R1-R4) | 28 | **LEGÍTIMO — registro histórico** | Documenta qué pasó cuando el producto sí se llamaba Acierta. Reescribirlo falsificaría el historial del proyecto. |
| H | `docs/REBRAND_INVENTARIO.md` | 84 | **LEGÍTIMO — auditoría de R1** | Es el informe que enumera *dónde decía* "Acierta". Reescribirlo lo volvería auto-referencialmente incoherente. |

**Residuos de marca vieja que requerían corrección: 0.**

---

## 3. Contenido educativo intacto (criterio 3)

Esta era la verificación de mayor riesgo: que el reemplazo automatizado de R2-R4 no hubiera mutilado español común dentro de reactivos o explicaciones.

### 3.1 Ningún archivo de contenido fue tocado

```
git diff --stat 0e5a3aa..HEAD -- docs/content-batches/ prisma/seed/ prisma/migrations/
→ (vacío)
```

Cero lotes de reactivos, cero seeds de taxonomía, cero migraciones modificadas desde G10 (el commit inmediatamente anterior al rebrand).

### 3.2 El único caso COMÚN es byte-idéntico

```
md5 G10  (pre-rebrand): cbe7dfdedf7c727a3f03ff52c512f05e
md5 HEAD (post-rebrand): cbe7dfdedf7c727a3f03ff52c512f05e
```

El archivo de veredictos que contiene *"Se acierta por coincidencia léxica, sin inmunología"* no cambió ni un byte. Confirmado además en vivo contra la base de datos real durante R4 (450 preguntas, 1,350 explicaciones, 9 `ContentSource`, 308 nombres de taxonomía → 0 marca, 1 COMÚN intacto).

### 3.3 Ninguna palabra española quedó mutilada

La regla de reemplazo de R2 fue `/acierta(?!_ci|_prod)/g → 'yaentre'`. El riesgo real era que una forma verbal la absorbiera (p. ej. *"aciertan"* → *"yaentren"*). Búsqueda dirigida de tokens mutilados:

```
rg -i "yaentre(s|n|o|ndo|ba)\b|minYaEntre|YaEntreos"
→ (sin resultados)
```

No existe ni una sola palabra mutilada en todo el repositorio.

### 3.4 El sustantivo `aciertos` sobrevivió sin pérdidas

`aciertos` es la palabra más frecuente de esta familia en un producto de examen de admisión, y difiere de `acierta` en una sola letra (`aciert-**o**-s` vs `aciert-**a**`). Conteo por archivo, G10 vs HEAD:

- **Ningún archivo preexistente perdió ocurrencias de `aciertos`.**
- Único delta: `docs/ESTADO.md` 8 → 9, por las filas nuevas que documentan las fases R (crecimiento esperado, no pérdida).
- Los 4 archivos renombrados conservaron su conteo **exacto**:

| Archivo original → renombrado | `aciertos` antes | después |
|---|---:|---:|
| `Aciertometro.tsx` → `Entrometro.tsx` | 3 | 3 |
| `AciertometroHistoryChart.tsx` → `EntrometroHistoryChart.tsx` | 2 | 2 |
| `aciertometro.ts` → `entrometro.ts` | 13 | 13 |
| `aciertometro.test.ts` → `entrometro.test.ts` | 21 | 21 |

Los 3 únicos archivos de contenido/plantilla tocados por el rebrand cambiaron **solo la marca**, verificado con `git diff --word-diff`:

- `prisma/seed.ts` — `"Sembrando taxonomía de Acierta"` → `"…de YaEntre"` (un `console.log`)
- `scripts/prompts/_base.md` — `"(sistema pedagógico de Acierta)"` → `"…de YaEntre"` (encabezado de prompt)
- `scripts/extraction/uam_cbi.taxonomy.json` — `Aciertómetro` → `Entrómetro` dentro de `weightsNote`; **los `questionWeight` y los nombres de materia no se tocaron**

---

## 4. Consistencia de "Entrómetro" (criterio 4)

### 4.1 Cero rastros de "Aciertómetro" en código y UI

Búsqueda de `aciert[oó]metro` en todo el repo → las **únicas** coincidencias están en:
- `docs/ESTADO.md` (historial de fases F5-F18, G10 — registro histórico)
- `docs/REBRAND_INVENTARIO.md` (auditoría de R1)
- `prisma/migrations/0005_*.sql` (2 comentarios, checksum congelado — categoría E)

**Cero en `src/`, `app/`, `tests/`, `scripts/`, `public/`, `prisma/schema.prisma`.**

### 4.2 Las 4 variantes son las correctas y no se mezclan

| Variante | Ocurrencias | Uso |
|---|---:|---|
| `Entrómetro` | 117 | Prosa y texto visible al usuario (con acento, español correcto) |
| `Entrometro` | 95 | Identificadores de JS/TS (`Entrometro`, `EntrometroLoader`, `EntrometroTarget`, `formatEntrometroTarget`…) |
| `entrometro` | 24 | Nombres de archivo e imports (`entrometro.ts`) |
| `ENTRÓMETRO` | 1 | Diagrama ASCII del `UIUX_Spec` |

Este patrón replica exactamente el que tenía `Aciertómetro` antes del rebrand: acento en texto humano, sin acento en identificadores. **No hay mezcla ni inconsistencia.**

---

## 5. Verificación visual en pantalla (criterio 5)

Servidor de **producción** (`pnpm build && pnpm start` en `localhost:3000`), no `next dev` — el proyecto tiene un bug documentado del escáner CSS de Tailwind 4 en modo dev (ver `ESTADO.md`, notas de F11/F12), así que la verificación fiel se hace contra el build real.

### 5.1 HTML realmente servido — barrido de las 12 rutas públicas

| Ruta | `acierta` | `yaentre` | `Entrómetro` |
|---|---:|---:|---:|
| `/` | **0** | 27 | 9 |
| `/precios` | **0** | 30 | 3 |
| `/legal/terminos` | **0** | 70 | 12 |
| `/legal/privacidad` | **0** | 38 | 10 |
| `/login` | **0** | 12 | — |
| `/registro` | **0** | 12 | — |
| `/recuperar-password` | **0** | 12 | — |
| `/manifest.webmanifest` | **0** | 2 | — |
| `/robots.txt` | **0** | 0 | — |
| `/sitemap.xml` | **0** | 0 | — |
| `/tutor` | **0** | 0 | — |
| `/paywall` | **0** | 12 | — |

Cero ocurrencias de `Aciert.metro` en el HTML servido de las 4 rutas con contenido.

> Nota metodológica: un primer conteo reportó `Entrómetro = 0` en todas las rutas. **Era un artefacto de mi propia búsqueda**, no un defecto: el patrón `entr[oó]metro` falla a nivel de bytes porque `ó` ocupa 2 bytes en UTF-8. Al repetirlo con un patrón seguro (`Entr.{1,2}metro`) aparecieron las 34 ocurrencias correctas, todas escritas `Entrómetro`. Se documenta porque un falso negativo silencioso habría sido fácil de dar por bueno.

### 5.2 Confirmación visual

- **Landing** — wordmark **YaEntre** en el header con el morado de marca (`#7C3AED`), tokens de Tailwind aplicados correctamente, banner Early Bird, hero *"No es otro curso con videos"*, "Entrómetro activo", FAQ *"¿Cómo funciona YaEntre?"*. Cero rastro de la marca vieja.
- **Manifest PWA** — `{"name":"YaEntre","short_name":"YaEntre",…}`, `theme_color` `#7C3AED` intacto.
- **Open Graph image** (`/opengraph-image`, generada en runtime) — renderiza **"YaEntre"** grande con Tino el tecolote sobre el gradiente de marca.
- **Términos y condiciones** — renderiza las 13 secciones completas con la sustancia legal intacta (garantía Premium al 50%, umbral de 15 sesiones/20 min, jurisdicción CDMX, Stripe PCI-DSS) y `hola@yaentre.com` como contacto.
- **Página de login** — `AuthShell` en tema oscuro renderiza correctamente, sin regresión visual.

### 5.3 Límite honesto: el dashboard autenticado no se verificó en pantalla

`/app` redirige correctamente a `/login?next=%2Fapp` — el guard de autenticación funciona. **No pude entrar visualmente al dashboard**: requiere una sesión real, y crear cuentas o escribir contraseñas está fuera de lo que esta sesión puede hacer; además el registro real sigue bloqueado por el rate-limit de correo de Supabase en plan gratuito (bloqueo preexistente documentado en G7/G9, ajeno al rebrand).

Lo que sí se verificó de la zona autenticada, en fuente y a través del build exitoso — son los **únicos** elementos que llevan marca ahí:

```
src/components/dashboard/Sidebar.tsx:15        YaEntre
src/components/dashboard/TopBar.tsx:19         YaEntre
src/components/dashboard/AppFooter.tsx:11      © {year} YaEntre. YaEntre no está afiliado…
src/components/profile/ProfileBadges.tsx:4     '🏅 Fundador YaEntre'
src/components/tutor/ParentShell.tsx:28        YaEntre · Panel del tutor
app/admin/layout.tsx:34                        🦉 YaEntre — Admin
```

Y un barrido de `acierta|aciert.metro` sobre `src/components/dashboard/`, `src/components/profile/`, `src/components/tutor/`, `app/admin/` y `app/(app)/` devolvió **cero coincidencias**.

---

## 6. Problemas encontrados y corregidos en esta fase

R5 encontró **3 afirmaciones obsoletas** — ninguna es un residuo de marca, pero las tres eran factualmente falsas tras la compra del dominio en R4, y viven en documentos accionables que alguien seguirá al pie de la letra en R6.

| Archivo | Decía (falso) | Corregido a |
|---|---|---|
| `docs/ESTADO.md` §URL de producción | *"Se sustituirá por el dominio propio **cuando se compre**"* | Aclara que `yaentre.com` **ya se compró** (Akky, 21-ago-2026, orden `20260821697888`) y que lo pendiente es apuntarlo por DNS en R6. Añade además por qué el proyecto de Vercel sigue llamándose `acierta`. |
| `docs/SERVICE_CREDENTIALS_CHECKLIST.md:61` | *"no se puede verificar `yaentre.com` porque **el dominio aún no se compra**"* | El bloqueo ya no es la compra sino publicar SPF/DKIM en el panel DNS de Akky. Se conserva la vía temporal (`onboarding@resend.dev`) con la condición de salida corregida. |
| `docs/STRIPE_LIVE_CHECKLIST.md:182` | *"(`yaentre.com` u otro, **la decisión de nombre sigue abierta**) todavía no está comprado"* | El nombre ya no está abierto ni pendiente de compra; el título de la sección pasó de *"dominio propio pendiente"* a *"dominio comprado, falta conectarlo a Vercel"*. |

Ninguna corrección tocó código; las tres son documentación accionable.

---

## 7. Pendientes conocidos (fuera del alcance del rebrand)

No son defectos de R1-R5; se listan para que no se confundan con residuos:

1. **DNS sin conectar** — `yaentre.com` está comprado pero no apunta a Vercel. Es exactamente la fase R6.
2. **Stripe y Resend sin configurar en sus dashboards** — ambos redirigen a login, sin sesión activa. Bloqueo heredado de G6/G7/G9; requiere que el dueño inicie sesión.
3. **Referencia rota preexistente** — `Plan_Implementacion_Acierta_v1.0.md` cita `/docs/TRD_Acierta_v1.0.md` 3 veces y ese archivo no existe. Detectado en R1, anterior al rebrand, nunca estuvo en alcance.
4. **Placeholders legales** — `terminos`/`privacidad` conservan su aviso `EDITAR ANTES DE PUBLICAR` (razón social y domicilio). Decisión de negocio, no de marca.
5. **Los 5 documentos `*_Acierta_v1.0.md` conservan su nombre de archivo.** Renombrarlos es un cambio mecánico posible en el futuro, pero exige actualizar 43 referencias cruzadas en el mismo commit.

---

## Confirmación explícita

> **No queda ningún residuo de la marca "Acierta" ni del feature "Aciertómetro" en el código, la interfaz, los assets, la configuración ni la documentación activa del proyecto, fuera de las 6 categorías legítimas clasificadas en §2 (nombres de archivo reales, infraestructura viva, URL de producción real, archivo autogenerado, migración con checksum congelado, y un único uso gramatical del verbo *acertar*).**
>
> **El contenido educativo — 450 reactivos, 1,350 explicaciones y la taxonomía completa — está demostrablemente intacto: ni un byte modificado, ni una palabra española mutilada.**

---

*Fin de la verificación · Fase R5 · Suite: typecheck ✅ · lint ✅ · 464 tests ✅ · build ✅*
