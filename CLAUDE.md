# CLAUDE.md — YaEntre

> Contexto permanente del proyecto para todas las sesiones de Claude Code.
> Léelo completo antes de cualquier tarea. La documentación de detalle vive en `/docs`.

---

## Qué es YaEntre

**YaEntre** (yaentre.com) es una plataforma SaaS web/PWA de preparación autogestionable para los exámenes de admisión **en línea** de la UNAM, IPN, UAM y CENEVAL (EXANI II), niveles Medio Superior y Superior. El diferenciador central es un **simulador fiel del entorno del examen en línea** + un **motor adaptativo determinista** (diagnóstico → ruta personalizada → Entrómetro que predice aciertos). Público: aspirantes de 15-22 años (usuario) y sus padres (pagador). **Launch: 6 de enero de 2027.**

Fase 1 es 100% autogestionable (sin profesores ni clases en vivo). La arquitectura deja lista la Fase 2 (video, livestream, notas de profesor) **inactiva** (`ContentStatus.INACTIVE`).

---

## Repositorio

- **Repo nuevo desde cero.** No hay migración de Certifik PLD; el reúso es conceptual (patrones del motor de preguntas), no de código ni datos.
- **Remoto:** `origin` → **https://github.com/angel011298/yaentre** — **privado** (sin autenticar responde 404, que es lo que GitHub devuelve para un repo privado; un 200 significaría que se volvió público). Rama **`master`**, no `main`. Desde G97 (2026-09-16).
- **El remoto NO está conectado a la integración de Git de Vercel.** El despliegue sigue siendo manual, `vercel --prod` desde la CLI. Un `git push` **no** despliega nada. Conectarlo es una decisión aparte, no la tomes sin instrucción explícita.
- **OS de desarrollo:** Windows (Lenovo). Rutas locales estilo `C:\Users\LENOVO\...`.
- **Gestor de paquetes:** `pnpm` (no usar npm ni yarn).

---

## Documentación de referencia (`/docs`)

Toda decisión de producto y arquitectura está en estos documentos. **Consúltalos según la tarea; no reinventes decisiones ya tomadas.**

| Documento | Para qué |
|---|---|
| `PRD_Acierta_v1.0.md` | Requerimientos de producto, features, criterios de aceptación |
| `UIUX_Spec_Acierta_v1.0.md` | Sistema de diseño, tokens, componentes, mascota Tino |
| `Flujo_App_Acierta_v1.0.md` | Flujos de usuario, estados, edge cases, máquinas de estado |
| `Backend_Schema_Acierta_v1.0.md` | **Schema de Prisma final, enums, índices, RLS, seeds** |
| `Plan_Implementacion_Acierta_v1.0.md` | Sesiones CC, orden de construcción, dependencias |
| `ESTADO.md` | **Estado vivo del proyecto — consultar SIEMPRE antes de cualquier tarea** |
| `ESTADO.md` §G74 | **Guarda de cobertura de contenido (qué área se puede ofrecer y por qué ese umbral) + Lighthouse medido contra el dominio real, pantalla por pantalla** |
| `ESCALA.md` | **Límites reales de cada servicio, consumo medido por recorrido, punto de quiebre, prueba de carga y proyección de costos para 500/1 000/5 000 alumnos (G69)** |
| `CORREOS_AUTH.md` | **Plantillas de correo de Supabase Auth (copia versionada), configuración de URLs y por qué el enlace NO usa `{{ .ConfirmationURL }}` (G70b)** |
| `VERIFICACION_FINAL.md` | **Recorrido completo del producto en producción real en los tres roles (G71): evidencia de red del guardrail de no-filtración, del tiempo server-side, de la activación por webhook y de la privacidad del tutor; los 7 defectos encontrados** |
| `VEREDICTO_LANZAMIENTO.md` | **Veredicto formal de Go/No-Go contra los 3 gates del PRD §14 (G72) — vigente; supera a `LAUNCH_CHECKLIST.md` (snapshot de F24). Stripe en modo PRUEBA (bloqueador absoluto), Vercel Hobby/Supabase free (prohíben/no soportan uso comercial), banco 1 143/1 500 (76%), y los bloqueadores ordenados por urgencia con responsable** |
| `AUDITORIA_SEGURIDAD.md` | **Auditoría de seguridad — G65: autorización, RLS, sesiones, secretos, límites de tasa, datos de menores. G66 (§16): dependencias, `pnpm audit`, cadena de suministro. G67 (§17): extracción del banco, integridad del simulador, abuso del plan gratuito. G73b (§18): auditoría de FALLOS SILENCIOSOS y re-verificación de cada control de G65 por su efecto en producción** |

---

## Stack tecnológico

```
Framework:      Next.js 15 (App Router, RSC) + TypeScript (strict)
Estilos:        Tailwind CSS 4
Animación:      Framer Motion 11
Estado:         RSC + useState; Zustand SOLO en el simulador
Backend/BaaS:   Supabase (PostgreSQL, Auth, Storage)
ORM:            Prisma
Pagos:          Stripe (tarjeta, OXXO, SPEI)
Email:          Resend
Observabilidad: Sentry + PostHog
Deploy:         Vercel (us-east-1)
Fórmulas:       KaTeX
Contenido:      100% vía sesiones de Claude Code, usando la suscripción
                existente — NUNCA la API de pago de Anthropic
```

---

## Comandos

```bash
pnpm dev                      # desarrollo local
pnpm build                    # build de producción
pnpm typecheck                # tsc --noEmit (correr siempre antes de commit)
pnpm lint                     # ESLint
pnpm test:unit                # Vitest (motor, scoring, webhook)
pnpm test:e2e                 # Playwright (simulador)
pnpm security:isolation       # RLS: ataca /rest/v1 con JWT reales (G65)
pnpm security:authz           # autorización de la app cambiando identificadores
pnpm security:session         # caducidad, renovación y cierre de sesión
pnpm security:ratelimit       # el contador distribuido, incluida la concurrencia
pnpm security:headers         # cabeceras contra la URL pública real
pnpm security:deps            # pnpm audit --audit-level=high (G66)
pnpm security:simulator       # navegador real: fuga de la clave y tiempo del servidor (G67/G71)
pnpm security:grants          # privilegios de la app POR EFECTO, con el rol real (G73b)
pnpm security:live            # login/recuperación/canje parental: bloqueo REAL en prod (G73b)
pnpm verify:emails            # los 3 correos programados resuelven destinatario (G73)
pnpm verify:tutor-privacy     # el panel del tutor, por el CUERPO de la red, no por la interfaz (G71)
pnpm verify:baseline          # foto de la base antes/después de un recorrido de verificación (G71)
pnpm verify:cleanup           # borra lo que un recorrido de verificación creó; --apply (G71)
pnpm security:abuse           # simulacro "1 gratis" / práctica "10/día" reales (G67)
pnpm security:time-integrity  # el tiempo del examen se calcula en servidor (G67)
pnpm content:guard            # cobertura por área: qué se puede ofrecer y qué no (G74)
pnpm content:pools            # volumen vs distribución: dónde queda la brecha de la meta efectiva (G94)
pnpm admin:census             # cuentas, planes y pagos por rol/estado, fixture aparte (G99)
pnpm admin:promote <correo>   # pone role=ADMIN y deja fila de bitácora; idempotente (G99)
pnpm admin:rls                # la bitácora NO se lee con sesión STUDENT ni sin sesión (G99)
pnpm admin:prod-probe         # en PRODUCCIÓN: ADMIN entra, STUDENT rechazado en página Y acción (G99)
pnpm admin:sql <archivo.sql>  # aplica SQL por DIRECT_URL cargando .env.local (G99)
pnpm admin:vault              # bóveda: STUDENT/anónimo no leen, listan ni sacan por URL pública (G99)
pnpm admin:vault-headers      # cabeceras no-store REALES de /api/admin/vault en producción (G99)
pnpm perf:lighthouse-prod     # Lighthouse móvil contra https://yaentre.com, no contra el build local (G74)
pnpm scale:audit              # ops de Prisma y peticiones por recorrido, escrituras incluidas (G69)
pnpm scale:pool               # techo real del pool de servidor de Supavisor (G69)
pnpm scale:load               # carga controlada contra producción; --db para la capa de base (G69)
pnpm prisma migrate dev       # migración en desarrollo
pnpm prisma generate          # regenerar client tipado
pnpm prisma db seed           # sembrar taxonomía (no reactivos)
pnpm prisma studio            # inspeccionar DB
```

---

## Decisiones de arquitectura (no negociables)

Estas decisiones vienen del TRD. **No las contradigas sin instrucción explícita.**

1. **Next.js-first.** La lógica vive en Server Actions (mutaciones), RSC (lectura) y Route Handlers (webhooks, motor adaptativo). **No** usar Supabase Edge Functions salvo excepción justificada.
2. **Motor adaptativo determinista.** Reglas explícitas (spaced repetition + promedio ponderado). **Sin ML ni llamadas a IA en runtime.** Funciones puras y testeables.
3. **Scoring siempre server-side.** La correctitud se calcula en el servidor comparando contra la DB. En modo simulacro, la respuesta correcta **nunca** viaja al cliente hasta finalizar.
4. **Pagos se activan SOLO por webhook** de Stripe, nunca desde el redirect de éxito. Idempotencia vía `ProcessedStripeEvent.eventId`.
5. **Zustand solo en el simulador.** El resto del estado es RSC + useState. No introducir un store global.
6. **Prisma es la fuente de verdad** del modelo de datos. Ningún acceso a datos fuera de él.
7. **RLS obligatorio** en todas las tablas con datos de usuario. Las escrituras del sistema usan `SERVICE_ROLE_KEY` (solo servidor).

---

## Reglas de la capa de datos

- El schema completo está en `/docs/Backend_Schema_Acierta_v1.0.md`.
- Taxonomía dinámica: Institución → Área → Materia → Tema es **data (seed)**, no código.
- `Subject.questionWeight` = # de reactivos esperados de esa materia en el examen real. Es el input del Entrómetro.
- `Question.isVerified`: ningún reactivo con `false` es visible para usuarios. El pipeline de IA inserta `false`; el admin lo pasa a `true`.
- **Nunca borrar reactivos con respuestas históricas** (rompe el aprendizaje). Despublicar con `isVerified=false`.
- **Respaldo del banco (G61):** el plan gratuito de Supabase no da respaldos restaurables. Tras cada lote de contenido corre `pnpm backup:export` y commitea `backups/content-bank.json` en el mismo commit del lote — el historial de git es la retención. Restauración: `pnpm backup:import` (`--dry-run` para verificar sin escribir). Detalle en `docs/RESPALDOS.md`.
- El `LearningProfile` sobrevive entre ciclos (clave para re-engagement de rechazados).
- `Subject.sharedContentKey` (G26): materias que varias áreas de un mismo examen evalúan con el mismo temario (UNAM Español/Inglés/Química; IPN Español/Inglés/Química/Matemáticas) comparten su pool de reactivos verificados. Al componer un lote de una materia compartida, insértalo contra el `topicId` de la materia con más contenido del grupo — la reutilización lo sirve a las demás áreas. Nunca cruza instituciones. Lógica en `src/lib/content/shared-subjects.ts` + `src/lib/db/shared-content.ts`; ver `docs/ESTADO.md` §G26.

---

## Sistema de diseño (resumen)

Detalle completo en `/docs/UIUX_Spec_Acierta_v1.0.md`. Dirección: **cálido y gamificado (Duolingo/Brilliant)**, no corporativo.

```css
/* Marca */
--brand: #7C3AED;  --brand-hover: #6D28D9;  --brand-soft: #A78BFA;
/* Gamificación */
--success: #22C55E;  --streak: #F97316;  --danger: #EF4444;  --info: #38BDF8;
/* Superficies dark (default alumno): --bg-base #0F0F14 (tinte violeta, no negro puro) */
/* Superficies light (default panel parental): --bg-base #FBFAFF */
```

- **Tipografía:** Outfit (display), Inter (body), JetBrains Mono (números/timer, `tabular-nums`).
- **Radios generosos:** botones 12px, tarjetas 16px, contenedores 24-32px (firma del look amigable).
- **Temas:** dark por default en la app del alumno; light por default en el panel parental. Ambos desde el MVP.
- **Mascota: Tino el tecolote** (búho mexicano). Aparece en logros, estados vacíos y onboarding. **No** en el simulador. Voz motivadora, nunca regaña.
- **Simulador = excepción visual:** deliberadamente serio, sin Tino, sin gamificación, solo el timer con color. El contraste es intencional.
- **Accesibilidad:** WCAG AA, área táctil ≥44px, respetar `prefers-reduced-motion`, color nunca es el único canal (✓/✗ + texto).

---

## Feature flags

Controlan la activación gradual de instituciones post-launch (env vars):

```
NEXT_PUBLIC_ENABLE_UAM=false            # activar semana 2-3 post-launch
NEXT_PUBLIC_ENABLE_EXANI=false          # activar semana 3-4 post-launch
NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR=false # sprint post-launch
```

**Launch del 6 ene = solo UNAM Superior + IPN Superior.** No bloquear la fecha por las otras instituciones.

---

## Convención de sesiones de Claude Code

Cada tarea es una sesión autónoma con criterios de aceptación explícitos (ver `/docs/Plan_Implementacion_Acierta_v1.0.md`).

**Asignación de modelo por tipo de tarea:**

| Tier | Cuándo | Ejemplos |
|---|---|---|
| 🟣 Fable 5 | Lógica que define el negocio (máximo razonamiento) | pipeline de contenido, motor adaptativo, simulador, integración de pagos |
| 🔴 Opus | Razonamiento denso y verificación de implementaciones críticas | scoring, webhook Stripe, integridad de integraciones |
| 🟡 Sonnet | Features de negocio, CRUD, integración, búsqueda web | dashboard, drill, onboarding, panel admin, Server Actions |
| 🟢 Haiku | DDL, seeds, boilerplate, polish | migraciones, seed de taxonomía, tokens, componentes de presentación |

**Toda sesión debe:**
- Terminar con `pnpm typecheck` y `pnpm lint` en verde.
- Incluir tests Vitest si toca lógica crítica (scoring, motor, pagos).
- Respetar los design tokens y las convenciones de este archivo.
- **No** modificar `prisma/schema.prisma` sin instrucción explícita.
- **Terminar con `git push`** y comprobar POR EFECTO que llegó: `git ls-remote origin master` debe imprimir el mismo SHA que `git rev-parse HEAD`. Un commit local no respaldado no cuenta como trabajo terminado — en este historial vive el ÚNICO respaldo restaurable del banco de contenido (`backups/content-bank.json`, G61), porque el plan gratuito de Supabase no da respaldos. Cerrar una sesión sin empujar deja ese respaldo otra vez en una sola máquina.

---

## Guardrails críticos (nunca hacer)

- ❌ No enviar `isCorrect` ni la respuesta correcta al cliente antes de que responda.
- ❌ No activar acceso de pago desde el redirect del cliente (solo webhook).
- ❌ No exponer `SERVICE_ROLE_KEY` ni `STRIPE_SECRET_KEY` al cliente (nada con `NEXT_PUBLIC_`).
- ❌ No usar `localStorage`/`sessionStorage` para datos sensibles ni de sesión (Supabase maneja auth).
- ❌ No usar la API de pago de Anthropic (SDK, `ANTHROPIC_API_KEY`) en ningún lugar del proyecto, ni en runtime ni en scripts offline.
- ❌ No poner `ContentItem.status = ACTIVE` en Fase 1 (queda `INACTIVE`).
- ❌ No borrar reactivos con respuestas históricas.
- ❌ No introducir un state manager global (Zustand solo en el simulador).
- ❌ No aceptar un `userProfileId` (ni `studentProfileId`/`parentProfileId`/`authUserId`) como entrada de una Server Action o Route Handler. El dueño del recurso sale SIEMPRE del guard. Toda la capa de autorización cuelga de esa premisa y `pnpm security:authz` la verifica automáticamente (G65).
  - **EXCEPCIÓN AUTORIZADA (G99), solo para acciones de ADMINISTRACIÓN.** Una acción de administración tiene que recibir a quién afecta: el objetivo NO es quien actúa, así que no hay nada que derivar del guard. La excepción vale ÚNICAMENTE si se cumplen las cuatro condiciones, y en este orden: **(1)** la propia acción llama `requireRole('ADMIN')` —nunca se apoya en `app/admin/layout.tsx`, porque una Server Action es su propio endpoint y se alcanza con un `fetch` sin renderizar ningún layout (verificado en producción en G99: los 5 ids de acción cosechados del bundle siendo ADMIN siguieron rechazados tras degradar la cuenta a STUDENT)—; **(2)** el id entra validado como cuid por un esquema de `src/lib/admin/schemas.ts`; **(3)** la acción escribe en `admin_audit_log` ANTES de responder, también cuando RECHAZA —el intento es justo lo que interesa auditar—; **(4)** pasa por `consumeRateLimit` (el contador compartido de Postgres, nunca el de memoria). Las acciones destructivas exigen ADEMÁS pertenecer a `MASTER_ADMIN_EMAILS`. Estas acciones quedan fuera del barrido de `security:authz` por diseño y las cubre `tests/admin/authz.test.ts`, que enumera la matriz anónimo × STUDENT × PARENT × ADMIN-no-maestro × ADMIN-maestro.
- ❌ No puntuar ni explicar un reactivo que no pertenezca a la sesión del alumno: la política de revelado se decide por el MODO de la sesión, así que un reactivo que salta de una sesión a otra filtra la clave del simulacro (G65 §2-3).
- ❌ No usar `Math.random()` para nada que autorice acceso (códigos de vinculación, tokens): es xorshift128+, reconstruible. `crypto.randomInt` (G65 §5).
- ❌ No confiar en `src/lib/rate-limit/limiter.ts` (memoria) para frenar abuso real: no cuenta entre instancias de Vercel — medido, 70 peticiones sin un 429. Los puntos sensibles usan `src/lib/rate-limit/store.ts` (contador compartido en Postgres) (G65 §5).
- ❌ No escribir políticas RLS `FOR ALL` sobre tablas de datos de usuario: la app nunca escribe desde el navegador, así que van `FOR SELECT`. Un `FOR ALL` solo lo detiene el GRANT, y basta un `GRANT ALL … TO authenticated` para abrirlo (G65 §7).
- ❌ No devolver la cookie de sesión a `httpOnly: false`: `@supabase/ssr` lo trae así por defecto y hay que sobreescribirlo en el cliente de servidor **y** en el del middleware (`src/lib/auth/cookie-options.ts`). El refresh token vive 400 días (G65 §6).
- ❌ No escribir un override de `pnpm-workspace.yaml` con `>=x.y.z` a secas: sin techo de mayor, pnpm puede saltar a la última versión publicada de CUALQUIER major — pasó en vivo con `nanoid` (ESM-only desde v4, revienta `require()`). Siempre `^x.y.z` (G66 §3).
- ❌ No dejar `pnpm-lock.yaml` fuera de git: sin él, cada `pnpm install` —incluido el de cada deploy— resuelve las transitivas frescas contra npm ese día, sin fijar nada (G66 §4). Se versiona.
- ❌ No contar solo lo TERMINADO/RESPONDIDO para un límite del muro suave si la acción entrega el contenido completo al ABRIR la sesión (el simulacro, la práctica libre): arrancar-y-no-terminar-nunca convertía el "1 simulacro gratis" y los "10 reactivos diarios" en ilimitados. El conteo tiene que reflejar cuánto contenido se SIRVIÓ, no cuánto se completó (G67 §1-2).
- ❌ No usar `$queryRaw` con una función de Postgres que devuelve `void` (p. ej. `pg_advisory_xact_lock`) — Prisma no deserializa `void` y LANZA siempre. Usa `$executeRaw`. Esto tuvo rotos `startSimulation`/`startDiagnosticSession` al 100% desde el 31 de agosto sin que nadie lo notara (G67 §3).
- ❌ No confiar en un cronómetro que el cliente calcula con su propio `Date.now()` para cerrar un examen cronometrado: congelar el reloj del sistema lo deja sin disparar nunca. El servidor debe rechazar la escritura (respuesta/sync) en cuanto SU reloj detecte que `timeLimitSecs` ya se superó, cerrando la sesión con el `finishSession` real (G67 §4).
- ❌ No llamar a `supabase.auth.getUser()` en `proxy.ts` para rutas donde el resultado no se usa: es un viaje de red al servidor de Auth en CADA petición (81 ms medidos) y el middleware solo lo necesita para dos redirecciones. El simulador manda un lote a `/api/simulator/sync` cada 15 s durante 3 h — eran ~140 viajes por alumno que nadie leía. La frontera vive en `src/lib/auth/middleware-policy.ts` (puro y testeado); si hay que moverla, muévela ahí, no en el middleware (G69 §8.1).
- ❌ No introducir un TERCER rol de base de datos para la app. Supavisor abre un pool de servidor **por rol** —medido: 17 conexiones— contra `max_connections=60` (57 útiles). Con `acierta_ci` y `acierta_prod` ya van 34; un tercero deja sin margen a Auth, PostgREST y `pg_cron` (G69 §5).
- ❌ No escribir en el camino caliente algo que no cambió. El `UPDATE` de contadores de integridad del simulador salía ~120 veces por simulacro reescribiendo los mismos valores; `integrityNeedsWrite` compara contra lo persistido y se lo salta. Mismo criterio para cualquier escritura por respuesta (G69 §8.3).
- ❌ Una sonda de seguridad no puede depender del azar. `security:authz` reportaba una fuga FALSA una de cada varias corridas porque tomaba `answers[0]` del simulacro de la víctima y el selector adaptativo baraja con `Math.random()`: a veces ese reactivo caía también en la práctica del atacante, donde responderlo es legítimo. Un rojo intermitente enseña a ignorar la prueba (G69 §8.4).
- ❌ No usar `{{ .ConfirmationURL }}` en una plantilla de correo de Supabase Auth: ese enlace lo resuelve GoTrue y redirige al destino **sin parámetros**, pero `app/auth/confirm/route.ts` exige `token_hash` + `type` y sin ellos manda a `/login?error=verification_failed`. Las plantillas construyen el enlace a mano contra `/auth/confirm` — copia versionada y razones en `docs/CORREOS_AUTH.md` (G70b).
- ❌ No agrupar por `Subject.id` nada que el ALUMNO vaya a leer como «una materia». La reutilización de contenido de G26 sirve el mismo pool desde filas `Subject` distintas, así que un simulacro real de UNAM Área 1 traía 11 reactivos de Química de una fila y 12 de otra, y el desglose pintaba **dos renglones «Química»** con números distintos. La clave canónica es `sharedContentKey ?? subjectId` — la que `progress.ts` ya usaba para el Entrómetro — y también manda para el color, que si no cambia de un simulacro a otro (G71 §6 D1).
- ❌ No dar por hecho que un servicio de terceros vive en UN solo origen. PostHog usa dos: el de ingesta (`us.i.posthog.com`) y el de assets (`us-assets.i.posthog.com`, de donde `posthog-js` carga `config.js`, banderas y encuestas). La CSP solo permitía el primero y bloqueaba al segundo en CADA carga de página; **los eventos seguían llegando, así que ninguna métrica lo delataba** — solo la consola. La CSP y el cliente leen la misma fuente (`src/lib/analytics/posthog-hosts.ts`) justo para que no puedan volver a separarse (G71 §6 D2).
- ❌ No escribir un atributo sobre el `<html>` desde un script en línea sin `suppressHydrationWarning` en ese elemento: React 19 lo ve como una discrepancia de hidratación, lanza el error #418 en cada carga completa de todo visitante que ya eligió cookies, y **Sentry se lo lleva**, gastando cuota y tapando los errores reales (G71 §6 D3).
- ❌ Una prueba que pasa sin comprobar nada es peor que no tenerla. En G71 aparecieron tres: un ✅ cuyo veredicto era `Boolean(antes && despues)` y cuyo nombre afirmaba lo contrario de lo que pasa; una sonda que **no cerraba la sesión que abría** en producción (buscaba «Terminar examen» en el reactivo 6 de 120) y dejaba basura; y una suite E2E que se saltaba **entera** con código de salida 0 y escondía dos specs que no podían pasar. Antes de creerle a un verde, comprobar que el rojo es alcanzable (G71 §6 D6).
- ❌ No codificar una lista de roles de base de datos en una migración. La app tiene DOS roles reales y el de **producción es `acierta_prod`**, no `acierta_ci`. La migración 0013 concedió el limitador de tasa distribuido a `['acierta_ci','postgres']`: en producción cada `consumeRateLimit` moría con `42501` y —como está diseñado para FALLAR ABIERTO— devolvía `allowed:true` siempre. La corrección central de G65 contra fuerza bruta estuvo inerte meses sin que ninguna sonda lo delatara, porque las sondas corren con las credenciales locales de `acierta_ci`. Toda concesión enumera los tres roles (`acierta_ci`, `acierta_prod`, `postgres`) y se salta el que no exista (G73).
- ❌ No dar por aplicado un `GRANT` sobre el esquema `auth`: **no se puede**. Lo posee `supabase_admin` y `postgres` —el máximo al que llega el dueño, por panel o por API— solo tiene `U` sin opción de concesión, así que Postgres acepta el GRANT como **no-op sin error** y `has_schema_privilege` sigue en `false`. Para leer `auth.users` desde la app: función `SECURITY DEFINER` propiedad de `postgres` en `app_security`, con `search_path` fijo y `EXECUTE` revocado a `PUBLIC`/`anon`/`authenticated` (`app_security.auth_emails_for_profiles`, migración 0014). Y verificar el privilegio DESPUÉS, nunca asumirlo (G73).
- ❌ No creer el conteo que devuelve un job de correo. `sendEmail` degrada a log y nunca lanza, y el runner aísla cada job con `Promise.allSettled`: `{"streakRisk":0,…}` significa lo mismo si no había destinatarios que si la consulta reventó. La evidencia de que un correo salió son **los logs de Resend** (`GET https://api.resend.com/emails`, campo `last_event`), nunca el cuerpo de la respuesta del cron (G73).
- ❌ Al componer un lote de reactivos, no dejar la respuesta correcta concentrada en una sola posición: distribuirla de forma pareja entre las cuatro opciones, y citar los distractores por su contenido, nunca por su letra — el simulador no baraja opciones para todas las instituciones (`shuffleOptions:false` en `src/lib/simulator/config.ts` para IPN/UAM/CENEVAL/CNBV). Todo lote debe pasar `scripts/lib/lot-validation.ts` (`content:validate-batch` / paso obligatorio de `content:insert`) antes de insertarse — ver G3b/G3c en `docs/ESTADO.md`.
- ❌ Una distribución pareja de la LETRA correcta no basta — el MÉTODO de composición puede regalar el patrón por otras dos vías que G3c no medía, encontradas por la verificación ciega de G76 sobre el lote de Inglés UNAM (G75) y cerradas en `lot-validation.ts` por G77: **(a)** redactar la clave con más matiz que los distractores la deja sistemáticamente más larga — 24/40 (60%) en G76, contra el 25% del azar; iguala la longitud de las 4 opciones, recortando la clave antes que alargando los distractores. **(b)** decidir la posición de la clave con una regla mental repetible (p. ej. "voy ciclando A, B, C, D") produce una secuencia perfectamente PERIÓDICA que pasa cualquier prueba de distribución pareja —un ciclo perfecto es la distribución más pareja que existe— pero es trivialmente aprendible si la institución destino no baraja opciones (`shuffleOptions:false`): en G76 la clave siguió el ciclo EXACTO A,B,C,D,... en gramática y en vocabulario. La posición de cada reactivo se decide independientemente, no seguido un patrón; nunca "voy alternando" ni "toca la siguiente letra". `lot-validation.ts` ahora rechaza ambos (`LENGTH_BIAS`, `ORDER_PATTERN`) — pero como cualquier chequeo estadístico de CONJUNTO, no reemplaza redactar bien desde el origen (G77).

- ❌ El PROMEDIO del lote no basta para `LENGTH_BIAS` — un sesgo puede estar CONCENTRADO en un solo subgrupo sin que el promedio lo delate. G94 encontró que Comprensión lectora del lote de Español (G93, pool `UNAM:ESPANOL`) salió 6/8=75% (P(≥6|azar 25%)=0.42%, prácticamente imposible por azar) mientras el LOTE completo promediaba exactamente 40.0% — justo bajo `LENGTH_SHARE_WARN_MAX`, que además comparaba con `>` estricto (0.40 > 0.40 es falso), así que no disparó ni la advertencia. G95 cierra el hueco: `analyzeLot` (`lot-validation.ts`) mide `LENGTH_BIAS_SUBGROUP` por TEMA (`LotItem.topic`, poblado por `topicLabelFromFilename` desde el nombre del archivo cuando el lote llega por `--lot-dir`/`--dir`, un archivo por tema) y por FORMATO (siempre disponible). Un subgrupo puede tener 3-9 reactivos, muy por debajo del mínimo de 20 del lote completo, así que un % fijo no sirve — se usa la probabilidad EXACTA bajo azar puro (`binomialUpperTail`, cola superior binomial sin factoriales): advertencia bajo 5%, rechazo bajo 1%, y por debajo de `LENGTH_BIAS_SUBGROUP_MIN_SIZE=4` el chequeo se omite porque ni el resultado más extremo posible alcanza el nivel de rechazo con esa muestra. El umbral del LOTE completo también pasó de `>` a `>=`. Un barrido retrospectivo del banco (`scripts/g95/historical-sweep.ts`, reconstruye lotes desde `backups/content-bank.json` agrupando por materia y hueco de tiempo) encontró sesgo de subgrupo en 12 de 38 lotes históricos reconstruidos — la mayoría anteriores a G77 (nunca pasaron por ningún chequeo de longitud) y dos posteriores donde el lote completo JAMÁS habría advertido (Historia Universal "Siglo XXI" 83.3%/p=0.46%, Artes "Artes visuales prehispánicas" 75%/p=0.42%). Solo se corrigió Comprensión lectora (el caso que motivó la fase); el resto queda reportado, sin tocar, para una fase futura.

- ❌ No ofrecer un área/rama sin comprobar que su contenido alcanza. El onboarding ofrecía IPN SOCADM igual que FISMAT teniendo 4 de 7 materias en CERO: el alumno elegía, el motor recortaba con gracia, y recibía un diagnóstico sobre el 32 % de su temario sin un solo aviso. La guarda vive en `src/lib/content/coverage.ts` (puro) + `src/lib/db/area-coverage.ts` (censo). Tres reglas al tocarla: **(a)** se mide **peso de examen** (`Subject.questionWeight`), no número de reactivos — una materia de peso 3 con 35 reactivos está cubierta y una de peso 26 con 40 no; **(b)** el umbral por materia es **su cuota del diagnóstico**, calculada con `apportionByWeight`, la MISMA función que el diagnóstico usa — nunca una constante paralela, que se desincronizaría; **(c)** el filtro de servible y la suma de pools compartidos de G26 tienen que ser idénticos a los de `loadAreaSubjectPools`, o la guarda dirá «lista» y el diagnóstico servirá otra cosa. **Y jamás una lista de áreas/materias en código** (lección de G73): todo sale del censo, para que un lote de contenido habilite el área solo. `pnpm content:guard` lo verifica por EFECTO contra un recuento SQL independiente (G74).

- ❌ **No se abre la venta en producción con llaves de prueba de Stripe, y el interruptor lo impide por su cuenta.** Desde G70 producción corría con `sk_test_` y con la compra ABIERTA: cualquier alumno con correo verificado podía activar un plan de pago con la tarjeta de prueba PÚBLICA de Stripe (`4242 4242 4242 4242`) sin pagar un peso, y de paso descontar una de las 500 licencias Early Bird. G72 lo declaró bloqueador absoluto y aun así siguió abierto cuatro fases más, porque nadie había puesto un cierre — solo una advertencia en un documento. Desde G98 la venta tiene un interruptor **del lado del servidor**: `src/lib/stripe/sales-switch.ts` (puro, con la matriz 3×3×3 enumerada entera en `tests/sales/sales-switch.test.ts`) + `src/lib/stripe/sales-gate.ts` (lee el entorno y reporta). Tres reglas al tocarlo: **(a)** el default es CERRADO — `SALES_OPEN` ausente o distinto de `'true'` cierra, para que olvidar una variable nunca abra la caja; **(b)** en `VERCEL_ENV === 'production'` además exige llave de modo real (`sk_live_`/`rk_live_`), y `SALES_OPEN=true` con llave de prueba **no abre**: queda cerrada y dispara `reportControlFailure('sales_gate','fail-closed',…)`, porque el único desenlace peligroso es el dueño creyendo que abrió una caja que está cerrada; **(c)** la guarda va en la **PRIMERA línea** de `startCheckoutAction`, antes incluso del guard de identidad — todo lo que toca dinero (el `Customer` de Stripe, la sesión de Checkout, la fila `Subscription` PENDING que consume la licencia) queda detrás de ese `return`. **Esconder el botón en la interfaz no cierra nada**: una Server Action se invoca con un `fetch` a su ruta, y así se verificó en producción. El webhook es una puerta INDEPENDIENTE —lo llama Stripe, sin sesión ni guard, y es el único punto que activa acceso— así que lleva su propia defensa: en producción, un evento cuyo `livemode` no corresponda al modo de la llave responde 200 sin aplicar nada y deja un `stripe_livemode` en Sentry; se rechaza ANTES del store, así que `processed_stripe_events` no registra nada y el evento sigue siendo reprocesable si el modo se corrige. Cómo abrir la venta, en orden (llaves live → plan de Vercel con uso comercial → `SALES_OPEN=true` → redeploy → compra real y reembolso): `docs/STRIPE_LIVE_CHECKLIST.md` § «Cómo abrir la venta» (G98).

- ❌ **Publicidad no es un recordatorio del producto: `MARKETING` exige consentimiento explícito.** Hasta G97, `isNotificationEnabled(null, 'MARKETING')` devolvía `true` porque `MARKETING` no estaba en `OPT_IN_TYPES`, y no existía ninguna pantalla para aceptarlo ni rechazarlo: **todo registrado —público de 15 a 22 años— contaba como destinatario válido de correo promocional sin habérselo pedido jamás**. El defecto era latente (ningún job usa ese tipo todavía), que es justo lo que lo hacía invisible: habría salido a la luz con la primera campaña, ya enviada. Desde G98 `MARKETING` es opt-in, se acepta desde «Avísame cuando abra» en `/paywall` con el texto de qué se acepta y cómo darse de baja **antes** del botón, y se retira desde /app/perfil o desde el enlace de baja. Regla general: un tipo de notificación nuevo entra a `OPT_IN_TYPES` salvo que sea un recordatorio del producto que el alumno ya decidió usar, y **el sitio donde se acepta y el sitio donde se retira se construyen en la misma fase** — un consentimiento que solo se puede dar es una trampa, no un consentimiento (G98).

### Fallos silenciosos (G73b) — la clase de defecto, no sus instancias

> G73 encontró que el limitador de tasa de G65 llevaba **meses inerte en producción**. G73b fue a buscar el patrón, no el bug, y encontró cinco instancias más. Todas comparten la misma firma: **algo se rompe, el producto sigue funcionando, y nadie se entera.**

- ❌ **Ningún control de seguridad puede fallar sin dejar un evento en Sentry.** Fallar ABIERTO suele ser correcto (una base caída no debe convertir el login de un alumno en un 500 la víspera de su examen); fallar en SILENCIO nunca lo es. Todo `catch` que deje pasar una operación sin su control llama a `reportControlFailure(control, outcome, err, ctx)`; toda degradación que devuelva éxito aparente llama a `reportSilentDegradation(area, err, ctx)` — ambas en `src/lib/observability/report.ts`, con `outcome` obligatorio para forzar a nombrar en voz alta si quedó abierto o cerrado. **Un `console.error` NO es una señal:** durante meses `consumeRateLimit` escribió uno en cada login de producción y nadie lo leyó jamás, porque la respuesta era HTTP 200.
- ❌ **No escribir una lista de roles de base de datos, en ninguna parte.** La lista `['acierta_ci','postgres']` de la migración 0013 —sin `acierta_prod`, que es el rol real de producción— es lo que dejó el limitador muerto. Desde la migración 0015 los privilegios cuelgan del rol de grupo **`acierta_app`** y la pertenencia se **deriva de `pg_roles`** (convención `acierta_*`), no de un `ARRAY[...]`. Un `acierta_staging` futuro nace con los privilegios correctos sin que nadie recuerde editar nada. `pnpm security:grants` pone en rojo cualquier rol de conexión que quede fuera del grupo.
- ❌ **`GRANT`/`REVOKE ... ON ALL TABLES` no protege el futuro: solo toca lo que existe ese día.** En un proyecto Supabase, los privilegios por defecto de `public` conceden `arwdDxtm` —escritura incluida— a `anon` y `authenticated` sobre **cada tabla nueva**. El `REVOKE` de la migración 0009 (F22) alcanzó a las tablas de entonces y nada más; **medido en producción en G73b: una tabla recién creada nacía con INSERT/UPDATE/DELETE/TRUNCATE abiertos a la anon key**, que es pública por diseño y viaja en el bundle. Todo cambio de privilegios va acompañado de su `ALTER DEFAULT PRIVILEGES` (migración 0015). Residual conocido: los defaults de `supabase_admin` no son alterables desde este proyecto.
- ❌ **Un secreto con respaldo (`process.env.X || 'valor-fijo'`) que se use en producción tiene que reportarlo.** `unsubscribeSecret()` caía a una constante **escrita en el repositorio**: sin `CRON_SECRET`, cualquiera podría firmar enlaces de baja para el `userProfileId` que quisiera, y todo seguiría respondiendo 200. El respaldo se conserva para desarrollo; usarlo en producción ya dispara `reportControlFailure`.
- ❌ **Una función que degrada no puede devolver el mismo resultado que una que tuvo éxito.** `sendEmail` devolvía `ok:true` cuando Resend fallaba, así que `{"streakRisk":0}` significaba lo mismo si no había destinatarios que si el proveedor estuvo caído todo el día. Ahora un fallo real es `{ok:false, mode:'failed'}` (sigue sin lanzar nunca) y los jobs **cuentan solo lo que Resend aceptó**. Igual con `Promise.allSettled`: aislar un job está bien, aplanar su rechazo a `0` no.
- ❌ **Una sonda verde con el rol equivocado no dice nada.** `pnpm security:*` corre con `acierta_ci` (local); producción es `acierta_prod`. Ese es exactamente el verde que tuvieron G65, G66, G67, G71 y G72 mientras el control estaba muerto. `security:grants` **falla a propósito** si no corre con el rol de producción, salvo `--permitir-rol-no-productivo` explícito.
- ❌ **Verificar privilegios preguntando por el GRANT es verificar código.** Las sondas de G73b ejecutan la operación real (`consumeRateLimit`, `getAuthEmails`) y miran el efecto: si el contador no sube `1,2,3` y no bloquea en el presupuesto, está roto — da igual lo que diga `has_schema_privilege`.
- ❌ **En Playwright, no esperar a `[role="alert"]`.** Next.js inyecta `<div id="__next-route-announcer__" role="alert">` con el título de la ruta en cada página: está siempre presente y visible, así que `locator('[role="alert"]').first()` se satisface **antes** de que la Server Action responda. La primera versión de `security:live` hizo eso y reportó los tres limitadores en rojo **estando los tres vivos**. Esperar siempre por el TEXTO concreto que el control debe producir, y que el patrón cubra tanto el desenlace normal como el bloqueo.
- ❌ **Un comando documentado que no existe es una verificación que nunca falla.** `pnpm security:time-integrity` llevaba desde G67 en este archivo **sin entrada en `package.json`**: cualquiera que lo corriera veía un error de pnpm, no un rojo. Al añadir una sonda, añadir su script; al documentar un comando, comprobar que existe.
- ❌ **No cargar el grafo de módulos DENTRO del presupuesto de tiempo de un test.** Un `await import(...)` dentro de un `it()` le cobra a los 5 s por defecto de Vitest la carga del módulo y de todas sus transitivas, no la conducta que se quiere medir. Al instrumentar `guards.ts` con `reportControlFailure`, G73b metió `@sentry/nextjs` —672 ms de grafo, medidos con caché tibia y sin contención— en el camino de `tests/regressions/g10-bugs.test.ts`, que lo importaba dentro de la prueba: con la caché de transformación de vite fría y los 61 archivos de la suite compitiendo en paralelo, ese primer test se fue a **23.4 s y reventó el timeout**, mientras en aislamiento y en la siguiente corrida daba verde. **El rojo intermitente es el peor de los tres estados**: un verde falso al menos es estable, y un rojo que aparece una de cada dos corridas enseña a reintentar hasta que pase (misma lección que G69 §8.4). La corrección es estructural, no subir el número: el import va a **ámbito de módulo** —como en `tests/stripe/webhook-route.test.ts`— para que el presupuesto mida aserciones; el primer test pasó de 23 409 ms a **9 ms** sin tocar una sola aserción. Y un test unitario no tiene por qué inicializar el SDK real de Sentry: se mockea. Regla: si un archivo de pruebas importa dinámicamente, que sea una vez y fuera del `it`.

---

## Estructura de carpetas (objetivo)

```
/
├── CLAUDE.md                 ← este archivo
├── docs/                     ← los 8 documentos de planeación
├── prisma/
│   ├── schema.prisma
│   └── seed/                 ← seeds de taxonomía por institución
├── scripts/
│   └── content-insert-drafts.ts, content-blind-batch.ts,
│       content-resolve-verification.ts ← pipeline de contenido vía
│       sesiones de Claude Code (nunca API de pago)
├── src/
│   ├── app/                  ← rutas (App Router)
│   │   ├── (public)/         ← landing, precios, registro, login
│   │   ├── (app)/            ← dashboard, practicar, simulador, progreso, perfil
│   │   ├── (parent)/         ← panel parental
│   │   ├── admin/            ← panel de contenido
│   │   ├── actions/          ← Server Actions
│   │   └── api/              ← Route Handlers (webhooks, adaptive, admin)
│   ├── components/
│   │   ├── ui/               ← botones, tarjetas, inputs
│   │   ├── exam/             ← QuestionCard, OptionButton, Timer, ...
│   │   ├── gamification/     ← StreakFlame, Entrometro, Tino, ...
│   │   └── mascot/           ← Tino SVG + estados
│   ├── lib/
│   │   ├── db/               ← capa de acceso a datos (Prisma)
│   │   ├── adaptive/         ← motor determinista (puro, testeado)
│   │   ├── auth/             ← guards
│   │   ├── stripe/           ← integración de pagos
│   │   └── stores/           ← Zustand (solo simulador)
│   └── styles/               ← globals.css, tokens
└── tests/                    ← Vitest + Playwright
```

---

## Variables de entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo servidor
DATABASE_URL=                    # pooled
DIRECT_URL=                      # migraciones
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Email / Observabilidad
RESEND_API_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
# Feature flags
NEXT_PUBLIC_ENABLE_UAM=false
NEXT_PUBLIC_ENABLE_EXANI=false
NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR=false
# Interruptor de ventas (G98) — sin `true` la compra está CERRADA en el servidor
SALES_OPEN=false
# Cron
CRON_SECRET=
```

`.env.local` en `.gitignore`; `.env.example` versionado con placeholders.

---

## Convenciones de código

- **TypeScript strict.** Sin `any` salvo justificación.
- **Validación con Zod** en el borde de cada Server Action y Route Handler.
- **Español mexicano** en todo el copy de cara al usuario; inglés en código/comentarios técnicos.
- **Nombres de tablas** en snake_case (via `@@map`); modelos Prisma en PascalCase.
- **Commits** en español, imperativos, con prefijo de tipo: `feat:`, `fix:`, `chore:`, `test:`.
- **Errores de cara al usuario:** explican qué pasó y cómo seguir, en la voz de la interfaz, sin disculpas excesivas.

---

## Testing

Enfoque calibrado a 1 dev: testear donde un bug cuesta dinero o confianza.

- 🔴 Obligatorio: motor adaptativo, scoring, webhook Stripe (Vitest); simulador end-to-end (Playwright).
- 🟡 Recomendado: RLS (script SQL), integración de pagos.
- ⚪ No: unit tests de UI ni de animaciones (se cubren con E2E + verificación manual).
- `pnpm typecheck` es la primera red de seguridad y debe estar siempre en verde.

---

## Estado del proyecto

**El estado vivo está en `/docs/ESTADO.md` — consúltalo SIEMPRE antes de empezar cualquier fase.**

Pipeline de contenido: verificación adversarial garantiza calidad sin freelancers, ejecutada íntegramente dentro de sesiones de Claude Code/chat (nunca la API de pago). Dos sesiones independientes (una compone el reactivo, otra lo resuelve a ciegas sin ver la respuesta) deben coincidir para publicar un reactivo; las discrepancias sin resolver no se publican.

---

*Mantén este archivo actualizado cuando cambien decisiones estructurales. Es la brújula de cada sesión.*

- ❌ **Un layout NO protege una Server Action ni un Route Handler, y esconder un botón no cierra nada.** `app/admin/layout.tsx` verifica `requireRole('ADMIN')`, pero cada acción y cada ruta es su propio endpoint: se alcanza con un `fetch` que lleva la cabecera `Next-Action: <id>` a la URL de la página que la importa, sin renderizar ningún layout. El id se hornea en el bundle del build, así que no se adivina — se cosecha del JS servido, y **sobrevive a que a la cuenta se le retire el rol**. G99 lo verificó en producción de la forma que importa: cosechó los 5 ids siendo ADMIN, degradó la cuenta a STUDENT y los REPLAYÓ; los 5 siguieron rechazados porque quien rechaza es la primera línea de la acción, no la inaccesibilidad de la página. Misma lección que G98 con `startCheckoutAction`. Toda ruta y toda acción nueva bajo `/admin` verifica el rol por su cuenta.

- ❌ **`MASTER_ADMIN_EMAILS` ausente o vacía NO puede abrir nada.** La compuerta de admin maestro (`src/lib/admin/master.ts`, pura y con la matriz enumerada en `tests/admin/master-gate.test.ts`) separa el ADMIN de lectura del **admin maestro**, que es el único que puede otorgar y dar de baja planes, forzar restablecimientos, cerrar sesiones, cambiar roles y borrar archivos de la bóveda. El default es CERRADO —variable ausente ⇒ ninguna acción destructiva procede— y el caso se reporta con `reportControlFailure('master_admin_gate','fail-closed',…)`, porque desde la interfaz «falta la variable» es indistinguible de «no eres maestro», que es exactamente la indistinguibilidad que dejó muerto el limitador de G65 durante meses. La lista vive en el ENTORNO y no en la base a propósito: así, promover a alguien a ADMIN desde el propio panel no basta para que se autoconceda el poder de degradar a los demás. Y un admin maestro **no puede cambiar su propio rol** (se rechaza cuando el objetivo es el actor, aunque el rol pedido sea el mismo), para que el producto no pueda quedarse sin administrador por un clic.

- ❌ **Una cortesía no se crea con un `create` suelto.** El alta manual de un plan desde el panel pasa por `activateSubscriptionTx` (`src/lib/db/billing.ts`), **la misma función que usa el webhook de Stripe**, para que el resultado sea indistinguible de una compra: `ACTIVE` idempotente, `startedAt`, `expiresAt` derivado de `targetExam.examDate` e insignia Early Bird. Si se hiciera aparte, una Premium regalada quedaría sin `expiresAt` y el paywall la trataría distinto — el alumno lo descubriría el día del examen. Las dos únicas diferencias son deliberadas: `isComp = true` y **ningún `Payment`** (no hubo cobro; fabricar uno ensucia la contabilidad). Y `countActiveEarlyBirdSubscriptions` filtra `isComp: false`: una licencia REGALADA no puede descontar del «quedan X de 500» que se anuncia en vivo, porque ese contador es una promesa sobre cuántas quedan en VENTA y agotarlo sube el precio de temporada (`degradeIfEarlyBirdExhausted`) sin que haya entrado un peso.

- ❌ **La bitácora no se lee desde el navegador, y no se borra.** `admin_audit_log` (migración 0016) lleva RLS habilitada **sin ninguna política permisiva** y sin GRANT a `anon`/`authenticated` — un escalón más cerrado que el `FOR ALL USING (is_admin())` de las demás tablas de solo servidor, porque la app la lee únicamente por Prisma (BYPASSRLS) y no existe caso de uso legítimo desde el navegador. Verificado POR EFECTO contra `/rest/v1` con una sesión STUDENT real y sin sesión: 10/10 intentos bloqueados (`pnpm admin:rls`, con control positivo que aborta si la fila de prueba no se escribió — sin él, «0 filas» pasaría igual con la tabla vacía). Dos reglas de integridad referencial que no hay que «arreglar»: `actorUserProfileId` es nulable con **SetNull**, nunca Cascade (una bitácora que se borra al eliminarse la cuenta del actor no es una bitácora; `actorEmail` guarda la instantánea legible), y `targetUserProfileId` va **sin clave foránea**, porque la bitácora registra lo que le pasó a una cuenta aunque después se elimine (LFPDPPP).

- ❌ **El camino para aplicar DDL en producción no es `prisma db execute`.** La documentación (`docs/VALIDACION_INFRA.md`) menciona `prisma db execute` con `DIRECT_URL`, y sirve para consultas — pero el rol de la app (`acierta_ci`/`acierta_prod`) **no tiene CREATE sobre el esquema `public`** ni puede hacer `ALTER FUNCTION … OWNER TO postgres`: devuelve `permission denied for schema public`. Las migraciones 0012-0016 se aplicaron como **`postgres` por el panel/API de Supabase**, que es el único rol con privilegio suficiente. `pnpm admin:sql <archivo>` existe para lo que sí cabe por `DIRECT_URL` (carga `.env.local`, que el CLI de Prisma ignora, y pasa la URL sin imprimirla). Tras aplicar, validar SIEMPRE con `prisma migrate diff` y comprobar que lo único que reporta son los índices de rendimiento de 0012 que viven fuera de `schema.prisma` a propósito.

- ❌ **La bóveda guarda los archivos HASTA que el admin maestro los borre — y eso obliga a tres cosas que no se pueden «arreglar».** **(a)** `AdminFile.uploadedBy` va con **SetNull**, jamás Cascade: si la fila muriera al eliminarse la cuenta de quien subió, el objeto quedaría huérfano en el bucket, fuera del listado, y por tanto ni accesible ni borrable nunca; `uploadedByEmail` es la instantánea legible que sobrevive. **(b)** El bucket `admin-vault` NO lleva `file_size_limit`, ni `allowed_mime_types`, ni regla de ciclo de vida: la lista blanca y el tope de 40 MB se aplican en la Server Action, donde producen un mensaje que el administrador puede leer, en vez de un rechazo silencioso del proveedor. **(c)** Ningún cron, job ni sonda borra de ese bucket; `pnpm verify:cleanup` no lo toca. El único camino que escribe `deletedAt` es `deleteVaultFileAction`, que exige admin maestro, pide motivo y deja fila en la bitácora. Si el objeto no se puede quitar de Storage, el borrado lógico se **revierte** — un listado que dice que un archivo ya no está mientras sigue vivo en el bucket es peor que no borrarlo.

- ❌ **En la bóveda, la extensión sale del TIPO declarado, nunca del nombre que mandó el cliente, y el texto no se interpreta.** El path es `crypto.randomUUID()` + la extensión de la tabla `VAULT_TYPES` (nunca `Math.random`, nunca el nombre original, que se guarda solo como metadato); el archivo se sirve con el `Content-Type` guardado y `X-Content-Type-Options: nosniff`. Sin eso, un `informe.pdf.html` se ejecuta en el navegador dentro de la sesión más privilegiada del producto. Por la misma razón, el visor pinta `.txt` y `.md` **preformateados** y nunca con `dangerouslySetInnerHTML` ni un renderizador de Markdown, y el CSV se pinta celda por celda como texto de React. El nombre original se sanea antes de ir en `Content-Disposition` (comillas, saltos de línea y caracteres de control) porque si no se pueden inyectar cabeceras.

- ❌ **Un componente que necesita JavaScript no se envuelve en un `<form>` con un botón `type="submit"`.** El formulario de subida de la bóveda lo hacía, y un clic ANTES de que React hidratara disparaba la navegación GET nativa: la página se recargaba con `?` al final, no se subía nada y no aparecía ningún error. Se detectó en producción con `pnpm admin:vault-headers`, no en local. La forma correcta es un contenedor sin semántica de formulario y un botón `type="button"` con `onClick`: antes de hidratar el clic no hace nada, que es honesto, y después hace lo correcto.

- ❌ **El service worker decide por su cuenta qué guarda: las cabeceras `no-store` no lo detienen.** `public/sw.js` metía en `SHELL_CACHE` la respuesta de CUALQUIER navegación, así que `/admin/usuarios`, `/admin/bitacora` y —porque el botón «Descargar» es un `<a href>`, o sea `mode === 'navigate'`— el ARCHIVO COMPLETO servido por `/api/admin/vault/<id>` acababan escritos en el disco del navegador. La Cache Storage sobrevive al cierre de sesión: en una computadora compartida el siguiente en usarla los recuperaba sin credenciales. `isPrivateAdminPath` sale del manejador ANTES que cualquier otra rama y no llama a `respondWith`. `tests/pwa/sw-admin-never-cached.test.ts` ejecuta el `sw.js` REAL y comprueba que no intercepta, con control positivo sobre `/app` para que el verde signifique algo.

- ❌ **Para leer .xlsx, `exceljs`; NUNCA el paquete `xlsx` de npm.** SheetJS dejó de publicar ahí: la versión que queda arrastra CVE-2023-30533 (prototype pollution) marcada como «no fix available», así que `pnpm security:deps` quedaría rojo de forma permanente y sin remedio. Y la previsualización **no evalúa fórmulas**: se muestra el resultado ya cacheado en el archivo y, si no lo hay, la fórmula como TEXTO (`=A1+B1`), nunca calculada — evaluar fórmulas de un archivo subido es ejecutar entrada no confiable en el servidor. `cellToText` lo garantiza y `tests/admin/xlsx-preview.test.ts` lo fija con un caso que exige `'=A1+B1'` y prohíbe `'5'`. Dos gotchas: el `as never` en `workbook.xlsx.load` es un choque de TIPOS (exceljs declara su propio `interface Buffer extends ArrayBuffer`), no de valores; y esa suite lleva `@vitest-environment node` porque en jsdom exceljs falla al abrir un libro VÁLIDO mientras que los corruptos «pasan» igual — un verde que no distingue el caso bueno del malo no mide nada.

- ❌ **Una sonda que hace UN clic y espera no sirve contra un botón `type="button"`.** Es el reverso de la corrección del formulario de la bóveda: al quitar el `<form>`, un clic anterior a la hidratación deja de navegar —bien— pero tampoco hace nada, ni error ni señal. `admin:vault-headers` hacía un clic y esperaba 30 s a un mensaje que no iba a llegar, y el rojo parecía un fallo de la subida cuando era de la sonda. Reintenta el clic hasta 4 veces esperando el TEXTO concreto del desenlace (éxito **o** fallo, nunca `[role="alert"]` a secas, que el route-announcer de Next satisface siempre — G73b).
