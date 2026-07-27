# LAUNCH_CHECKLIST — Acierta

> Veredicto formal de lanzamiento (F24). Recorre **todos** los criterios de
> `PRD_Acierta_v1.0.md §14 "Criterios de lanzamiento (Definition of Done)"`
> más las métricas de negocio de §3 y los requerimientos no funcionales de §12
> que ese mismo §14 da por sentados. Cada punto tiene veredicto contra el
> **estado real del repositorio y de Supabase**, verificado en esta sesión —
> no contra lo que debería ser.
>
> Leyenda: ✅ **CUMPLIDO** (con evidencia) · 🟡 **PARCIAL** (qué falta,
> exactamente) · 🔴 **PENDIENTE** (qué acción falta y de quién depende) ·
> 🔧 **REQUIERE VERIFICACIÓN MANUAL** (no verificable desde código — cómo
> comprobarlo).
>
> Fecha de este veredicto: 27 de julio de 2026. Última fase de código:
> F24. Fuente de la evidencia: lectura directa de Supabase real
> (`fumluvvzskhdxcyljbmx`), `docs/ESTADO.md` (F0-F23), y el código del repo.

---

## Veredicto ejecutivo

**El producto NO está listo para el Go/No-Go de Public Launch (6 de enero
2027) tal como está hoy.** La plataforma en sí — motor adaptativo, simulador,
pagos, seguridad, legal, observabilidad — está **construida y probada a nivel
de código** con un nivel de rigor alto (442 tests unitarios, RLS verificado
en vivo, 0 vulnerabilidades de dependencias, hardening de seguridad
completo). El bloqueador real **no es técnico**: es el **banco de
reactivos**, que hoy tiene **309 de los 1,500 requeridos (20.6%)**, concentrado
en solo 2 de las 6 combinaciones institución/área mínimas, con **IPN en
cero** — pese a que IPN es una de las dos únicas instituciones planeadas
para el día 1 del lanzamiento (junto con UNAM, per `CLAUDE.md`).

El segundo bloqueador es de **negocio, no de código**: cero campañas de
publicidad activas, cero licencias Early Bird vendidas reales (la única
suscripción activa en la base es de una cuenta de prueba), y cero
retroalimentación de beta testers (nunca se reclutaron los 100 requeridos).

Ningún hallazgo de esta verificación es nuevo o sorpresivo — todos estaban ya
documentados como pendientes en `docs/ESTADO.md` de fases anteriores (F4,
F19, F20, F21, F23); esta fase los consolida en un solo veredicto formal y
verifica cada uno contra el estado real, no contra lo que decían los
documentos de fases pasadas.

---

## 1. Go/No-Go para Early Bird (1 octubre 2026)

| # | Criterio (PRD §14) | Veredicto | Evidencia |
|---|---|---|---|
| 1.1 | Landing page de Acierta live en acierta.mx con lista de espera funcional | 🟡 **PARCIAL** | La landing (`app/(public)/page.tsx`) está construida, verificada en vivo (F10), con SEO/OG/sitemap. **No existe una "lista de espera"** — el producto pivotó a registro directo (`/registro`) con Early Bird como pricing, no como una waitlist previa; funcionalmente cubre el mismo objetivo de negocio (capturar interés temprano) mejor que una waitlist. **Falta la parte literal del criterio que sí bloquea**: la app corre en `localhost`/preview — no hay evidencia de que **acierta.mx** resuelva a un deploy real de Vercel. 🔧 Verificar: `dig acierta.mx` y confirmar que el dominio apunta al proyecto de Vercel. |
| 1.2 | Stripe: Early Bird Price IDs activos con `max_redemptions: 500` | 🟡 **PARCIAL** | El límite de 500 licencias SÍ está implementado y probado en vivo (F9: `EARLY_BIRD_LICENSE_LIMIT=500`, `resolveEffectiveSeason`/`degradeIfEarlyBirdExhausted`, verificado con fixture 500→499) — pero a nivel de **aplicación** (cuenta suscripciones ACTIVE en DB), no como un campo nativo `max_redemptions` de Stripe (que además no es un campo de `Price` en la API real de Stripe, sino de `Coupon`/`PromotionCode` — el PRD lo describe de forma imprecisa; la intención de negocio SÍ está cubierta). **Bloqueador real**: `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` son placeholders (`docs/VALIDACION_INFRA.md`, sin cambios desde F1) — los Price IDs reales de Stripe **nunca se han creado** (`pnpm stripe:setup-prices` está listo pero no se ha corrido con una key real). 🔴 Depende de: Ángel (dueño) — cuenta de Stripe real + llaves. |
| 1.3 | Diagnóstico inicial funcional con ≥ 300 reactivos UNAM Área 1 | 🔴 **PENDIENTE** | Verificado en vivo contra Supabase real: UNAM Área 1 ("Ciencias Físico-Matemáticas y las Ingenierías") tiene **183 reactivos servibles verificados**, no 300. El diagnóstico en sí funciona correctamente (F7, probado en vivo) — el déficit es de **contenido**, no de código. 🔴 Depende de: pipeline de contenido (ver §5 de este documento). |
| 1.4 | Pantalla de resultados del diagnóstico con Aciertómetro básico | ✅ **CUMPLIDO** | F7, verificado en vivo contra Supabase real (score, Aciertómetro, gap vs. meta, 3 temas prioritarios, mensaje de Tino). `pnpm test:unit` cubre `predictScore`/`computeCareerStrategy`. |
| 1.5 | Auth: registro, login, perfil funcionales | ✅ **CUMPLIDO** | F5/F17, verificado en vivo con cuentas reales contra Supabase real: registro con verificación diferida, login, recuperación de contraseña, perfil completo (nombre, avatar, tema, contraseña, notificaciones, exportar datos, eliminar cuenta). |
| 1.6 | Compra de Early Bird Pase ($499) funcional con tarjeta y OXXO | 🟡 **PARCIAL** | La lógica de pago está construida y probada exhaustivamente: webhook idempotente con los 4 casos exigidos (F8), 9 tests contra el Route Handler real firmando payloads con la utilidad oficial de Stripe (F19), reconciliación de pagos perdidos (F22). **Nunca se ha ejecutado un cobro real de $499 contra una cuenta de Stripe en modo test o live** — mismo bloqueador que 1.2 (llaves placeholder). El *código* de la compra está listo apenas haya llaves reales; el *flujo end-to-end contra Stripe real* no se puede marcar cumplido sin ellas. |

**Veredicto Early Bird: 2 de 6 cumplidos, 3 parciales, 1 pendiente. No se puede dar Go hoy.**

---

## 2. Go/No-Go para Beta Cerrada (1 noviembre 2026)

| # | Criterio (PRD §14) | Veredicto | Evidencia |
|---|---|---|---|
| 2.1 | Simulador completo funcional: 120 reactivos, 180 min, fullscreen, sin retroceso | ✅ **CUMPLIDO** | F12, verificado en vivo (UNAM Ingeniería en Computación): 120 `SessionAnswer` pre-creadas, límite 10800s, fullscreen con degradación graciosa, cero botón "Anterior" (garantía estructural — Zustand solo expone `advance()`). Cubierto además por Playwright E2E (F19): no-filtración de respuesta correcta interceptando tráfico de red real, imposibilidad de regresar verificada en 3 puntos. |
| 2.2 | ≥ 800 reactivos verificados distribuidos en UNAM Áreas 1-3 | 🔴 **PENDIENTE** | Verificado en vivo: **309 reactivos** en Áreas 1-2 únicamente (183 + 126). **Área 3 (Ciencias Sociales) tiene 0 reactivos servibles.** 38.6% del volumen mínimo, en 2 de las 3 áreas requeridas. |
| 2.3 | Dashboard del alumno completo con todos los widgets | ✅ **CUMPLIDO** | F11, verificado en vivo con fixture real: Aciertómetro, racha, mapa de calor 90 días, temas a reforzar, simulacros recientes, todos los widgets del PRD §7 F-05. |
| 2.4 | Resolución por capas (Capas 1-2) en ≥ 80% del banco | ✅ **CUMPLIDO** (para el banco existente) | Verificado en vivo: **100% de los 380 reactivos generados** (309 servibles + 71 no publicados) tienen Capas 1-3 completas, no solo 1-2. **Advertencia honesta**: este 100% es sobre un banco que en sí mismo es 20.6% del tamaño requerido para lanzamiento — cumplir la *proporción* de capas no compensa el déficit de *volumen* (criterio 2.2 / 5.1). |
| 2.5 | Reclutamiento de 100 beta testers activos | 🔴 **PENDIENTE** | `docs/BETA_FEEDBACK.md` (creado en F23) está vacío — no existe ningún registro de beta testers reclutados ni retroalimentación real recibida. Acción 100% de negocio/marketing, no de código. |

**Veredicto Beta Cerrada: 3 de 5 cumplidos, 2 pendientes (ambos bloqueantes: contenido y reclutamiento). No se puede dar Go hoy.**

---

## 3. Go/No-Go para Public Launch (6 enero 2027)

| # | Criterio (PRD §14) | Veredicto | Evidencia |
|---|---|---|---|
| 3.1 | ≥ 1,500 reactivos verificados (UNAM 4 áreas + IPN 2 ramas mínimo) | 🔴 **PENDIENTE — EL BLOQUEADOR PRINCIPAL** | Verificado en vivo contra Supabase real: **309 reactivos totales (20.6% del mínimo)**, exclusivamente en UNAM Área 1 (183) y Área 2 (126). **UNAM Áreas 3-4: 0. IPN (ambas ramas): 0.** IPN es una de las dos únicas instituciones planeadas para el día 1 del lanzamiento (`CLAUDE.md`: "Launch del 6 ene = solo UNAM Superior + IPN Superior") y hoy tiene **cero contenido servible**. Este es, con evidencia, el gap más grande de todo el proyecto. Depende de: retomar el pipeline de contenido (F2/F4) — bloqueado desde F4 por saldo $0 de la API de Anthropic, resuelto ahí con la alternativa "capital cero" (generación vía Claude Code) que solo alcanzó a producir 380 reactivos antes de agotar el límite de gasto del plan (ver `docs/ESTADO.md` Notas F4). Depende de: Ángel (decisión de negocio: comprar crédito de API, o repetir la alternativa capital-cero con más sesiones dedicadas). |
| 3.2 | Dashboard parental funcional y vinculable | ✅ **CUMPLIDO** | F16, verificado en vivo: código de 6 dígitos con TTL, canje atómico, panel bloqueado/desbloqueado según plan, multi-hijo, RLS verificado en las 2 capas (código + DB real). |
| 3.3 | Gamificación completa (streak, MateriaDominada, PerfectRound) | ✅ **CUMPLIDO** | F15, verificado en vivo con fixture real: motor de prioridad de celebraciones, insignias persistentes, guardrail de código fuente confirmando cero Tino en el simulador activo. |
| 3.4 | PWA instalable en Android e iOS (manifest + service worker) | ✅ **CUMPLIDO** | F17: `app/manifest.ts` + `public/sw.js` + 3 íconos + `apple-icon.tsx`, verificado en vivo (`navigator.serviceWorker.getRegistrations()` → `activated`; manifest/íconos con `curl` → 200). |
| 3.5 | NPS de beta cerrada ≥ 7.5/10 en al menos 30 respuestas | 🔴 **PENDIENTE** | No existe ninguna respuesta de NPS — depende directamente de que primero exista una beta cerrada real (criterio 2.5, nunca ejecutada). |
| 3.6 | Lighthouse Performance mobile ≥ 85 | 🟡 **PARCIAL** | F20, medido con `next build && next start`: **landing 87** (✅), **dashboard 81** (🔴), **práctica 78** (🔴). Causa documentada: TTFB de 1.7-1.9s contra Supabase por internet público desde este entorno de desarrollo — Vercel+Supabase co-ubicados en producción (`us-east-1` ambos) deberían reducirlo, pero **no se ha confirmado en producción real**. 🔧 Re-medir Lighthouse contra el deploy de producción real antes de dar Go. |
| 3.7 | 0 bugs críticos en los 7 días previos al launch | 🔧 **REQUIERE VERIFICACIÓN MANUAL** | No aplica todavía — no ha arrancado la ventana de 7 días previa al lanzamiter. Verificar con: Sentry (dashboard de errores, requiere `NEXT_PUBLIC_SENTRY_DSN` real — hoy placeholder, F20) + revisión manual de `docs/BETA_FEEDBACK.md` en esa ventana. |
| 3.8 | Stripe webhooks probados end-to-end: tarjeta, OXXO, SPEI | 🟡 **PARCIAL** | Los 3 métodos están cubiertos por tests que firman payloads reales con la utilidad oficial de Stripe y los verifican contra el Route Handler real (F19, 9 tests) — la LÓGICA está probada exhaustivamente. **Nunca se ha ejecutado un pago real de prueba** (tarjeta de test 4242, voucher OXXO real, CLABE SPEI real) contra una cuenta de Stripe — mismo bloqueador de llaves placeholder que 1.2/1.6. |
| 3.9 | ≥ 200 licencias Early Bird vendidas (validación de demanda pagadora) | 🔴 **PENDIENTE** | Verificado en vivo: **1 suscripción Early Bird ACTIVE** en la base de datos real, y es una cuenta de prueba de una sesión de verificación anterior (F9/F16), no una venta real. 0.5% del mínimo. Depende 100% de negocio: campañas activas + Stripe con llaves reales (3.1/1.2) son prerrequisito. |
| 3.10 | Aviso de privacidad (LFPDPPP) y Términos de uso publicados | 🟡 **PARCIAL** | Ambos documentos existen, completos y accesibles desde landing y app (F21): derechos ARCO conectados a funciones reales, checkbox obligatorio en registro, banner de cookies que condiciona la analítica. **Contienen datos de relleno marcados en amarillo** (razón social, domicilio legal, teléfono) que deben completarse antes de publicar — ver `grep -n "PLACEHOLDER:" "app/(public)/legal/"`. Sin esto, el aviso es legalmente incompleto (no identifica al responsable real de los datos). 🔴 Depende de: Ángel (datos legales de la empresa). |
| 3.11 | Campañas Meta Ads + TikTok Ads configuradas y aprobadas | 🔧 **REQUIERE VERIFICACIÓN MANUAL** | 100% acción de negocio — no verificable ni ejecutable desde código. **Esta fase (F24) construyó la infraestructura de rastreo que esas campañas necesitan** (Meta Pixel + TikTok Pixel configurables por `NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID`, 4 eventos de conversión, atribución de campaña persistente — ver §4 de este documento) pero **activar y que Meta/TikTok aprueben las campañas es trabajo humano en sus plataformas de ads**, ajeno a este repositorio. 🔧 Verificar: entrar a Meta Business Manager / TikTok Ads Manager y confirmar el estado "Activa"/"Aprobada" de cada campaña, y copiar sus Pixel IDs reales a `.env`. |

**Veredicto Public Launch: 3 de 11 cumplidos, 4 parciales, 3 pendientes, 1 de verificación manual pura. No se puede dar Go hoy — bloqueador principal: contenido (3.1).**

---

## 4. Rastreo de campañas de marketing (F24 — construido en esta fase)

Instrumentación completa y verificada en vivo:

- **4 eventos de conversión**, disparados en Meta Pixel y TikTok Pixel simultáneamente (los que tengan `NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID` configurados con un valor real — placeholders quedan inertes, mismo criterio que Sentry/PostHog):
  - `PageView` — landing y precios (`PixelPageView.tsx`, montado en ambas páginas).
  - `CompleteRegistration` — al terminar el registro (`SignupConversionTracker.tsx`, vía marcador `?signup=1` en el redirect de `signUpAction`, porque un Server Action que redirige en su rama de éxito no puede devolverle datos al cliente).
  - `InitiateCheckout` — al iniciar el pago (`ChoosePlanButton`/`RetryButton`), con valor estimado y plan.
  - `Purchase` — al confirmarse la compra (`SuccessView`, pantalla de agradecimiento), con el **valor REAL** tomado del `Payment` que el webhook de Stripe ya confirmó (nunca un estimado) y el plan.
- **Respetan el consentimiento de cookies** (F21): `loadAdPixels()`/`trackAdPixelEvent()` verifican `localStorage['acierta-cookies-consent'] === 'true'` antes de inyectar cualquier script o disparar cualquier evento — verificado que rechazar cookies deja ambos píxeles sin cargar.
- **Atribución de campaña persistente**: `proxy.ts` captura `utm_source/medium/campaign/content/term` + `fbclid/ttclid/gclid` de la PRIMERA visita (cualquier ruta, cookie httpOnly de 90 días, nunca se sobreescribe — verificado en vivo con `curl`: primera visita con UTMs → `Set-Cookie`; segunda visita con UTMs distintos → sin `Set-Cookie`, se conserva la original) y `signUpAction` la persiste en `UserProfile.acquisitionSource` (JSON, solo al crear el perfil) para poder atribuir **cualquier compra futura** al canal de origen, no solo el registro.
- **Página de agradecimiento optimizada** (`SuccessView`): copy reforzando el valor específico del plan comprado + lista concreta de "qué sigue" (personalizada por plan — simulacro gratis ilimitado, vinculación de tutor, garantía activa) + CTA única al tablero.
- **CSP actualizada** (`next.config.ts`): dominios de Meta/TikTok se agregan a `script-src`/`connect-src`/`img-src` SOLO si el ID correspondiente está configurado — verificado que la CSP no incluye dominios de terceros que el sitio nunca carga.
- 10 tests nuevos (`tests/marketing/attribution.test.ts`) sobre el núcleo puro de extracción/parseo de atribución.

**Pendiente que requiere acción del dueño**: obtener los Pixel IDs reales de Meta Business Manager y TikTok Ads Manager y configurarlos en las variables de entorno de producción — sin ellos, la infraestructura queda construida pero inerte (mismo patrón que Sentry/PostHog/Stripe en este entorno).

---

## 5. El bloqueador real: banco de reactivos

Tabla de estado real (verificado en vivo contra Supabase, `fumluvvzskhdxcyljbmx`):

| Institución | Área/Rama | Reactivos servibles | Meta mínima (Public Launch) |
|---|---|---|---|
| UNAM | Área 1 (Físico-Matemáticas e Ingenierías) | **183** | parte de ≥1,500 total |
| UNAM | Área 2 (Biológicas, Químicas y de la Salud) | **126** | parte de ≥1,500 total |
| UNAM | Área 3 (Sociales) | **0** | requerido para Beta Cerrada |
| UNAM | Área 4 (Humanidades y Artes) | **0** | requerido para Public Launch |
| IPN | Físico-Matemáticas | **0** | requerido para Public Launch — **institución de lanzamiento día 1** |
| IPN | Médico-Biológicas | **0** | requerido para Public Launch — **institución de lanzamiento día 1** |
| **Total** | | **309 (20.6%)** | **1,500** |

**Por qué pasó esto (contexto de `docs/ESTADO.md`, Notas F4):** el pipeline de contenido se bloqueó en F4 por saldo $0 en la API de pago de Anthropic. Por instrucción explícita del dueño ("no se meterá crédito de ninguna forma... capital cero"), se ejecutó una alternativa sin costo monetario: Claude Code (el propio agente, no la API) generando y verificando reactivos usando su cuota de plan en vez de facturación de API. Esa alternativa alcanzó a producir 380 reactivos (309 publicables) antes de que **Fable 5 agotara su límite de gasto mensual del plan** a medio proceso — un límite de cuota, no de dinero, pero un límite real que detuvo la producción.

**Esto NO es un problema de código.** El pipeline (generación → validación automática → revisión adversarial de 2 modelos independientes → auditoría de 5%) está construido, probado y funcionando — literalmente produjo los 309 reactivos que sí existen, con una tasa de auto-aprobación de 81.3% documentada. Lo que falta es **volumen de ejecución**, que depende de una decisión de negocio: comprar crédito real de la API (el camino que el dueño descartó explícitamente en F4), o dedicar más sesiones de Claude Code al mismo proceso "capital cero" que ya funcionó una vez.

**Sin este banco, ninguna de las 3 puertas de Go/No-Go (§1, §2, §3) se puede abrir — es la dependencia crítica #1 que el propio PRD ya señalaba en su §13 ("Dependencias críticas"): "Banco de 1,500 reactivos verificados... Impacto si falla: ❌ No se puede lanzar".**

---

## 6. Requerimientos no funcionales (PRD §12) — estado real

| Requerimiento | Meta | Veredicto |
|---|---|---|
| Lighthouse mobile | ≥85 | 🟡 Solo landing (87); dashboard (81) y práctica (78) no alcanzan — ver 3.6 |
| Uptime SLA | ≥99.5% | 🔧 No medible antes de tener tráfico real de producción |
| RLS en todas las tablas | Ninguna tabla expuesta sin política | ✅ Verificado en vivo (F22): 28/28 tablas con RLS, 23/23 pruebas de aislamiento pasando, además `REVOKE` de escritura directa vía PostgREST para `anon`/`authenticated` (hallazgo crítico de F22, corregido) |
| Datos de pago | Stripe nunca almacena tarjeta en Acierta | ✅ Verificado por diseño — Acierta nunca ve ni guarda datos de tarjeta, solo IDs de Stripe |
| HTTPS forzado | Toda la plataforma | ✅ `Strict-Transport-Security` activo (F22); Vercel fuerza HTTPS por defecto |
| Aviso de privacidad LFPDPPP | Antes del registro | 🟡 Publicado, pero con datos de relleno de la empresa sin completar — ver 3.10 |
| Contraste WCAG AA | Nivel AA mínimo | ✅ Barrido completo en F18 (medido con fórmula WCAG real, corregidos los tokens de light mode que fallaban) |
| Usuarios concurrentes | ≥500 simultáneos sin degradación | 🔴 **No verificado y con una duda concreta**: el proyecto de Supabase real sigue en el **plan gratuito** ($0/mes, `docs/VALIDACION_INFRA.md`, F1, sin registro de cambio en fases posteriores) — el plan gratuito de Supabase tiene límites de conexiones concurrentes muy por debajo de 500 usuarios simultáneos activos. 🔧 Verificar el plan actual en el Dashboard de Supabase y, si sigue en free tier, actualizar a un plan Pro **antes** de proyectar tráfico de lanzamiento. |
| PWA instalable | Manifest + Service Worker | ✅ Ver 3.4 |

---

## 7. Lo que SÍ está listo (para que el veredicto no se lea como solo negativo)

Todo lo siguiente está construido, probado en vivo contra Supabase real, y no tiene pendientes de código:

- Motor adaptativo determinista (Aciertómetro, selector, estrategia de carrera) — F6, con caso de referencia exacto verificado bit a bit.
- Simulador fiel al examen oficial, con garantía estructural de no-filtración de respuestas verificada por interceptación de red real — F12/F19.
- Motor de sesiones, scoring 100% server-side — F2/F6/F12.
- Pagos con webhook idempotente, garantía de que el acceso SOLO se activa por webhook — F8/F19, más job de reconciliación para webhooks perdidos — F22.
- Onboarding, diagnóstico, drill, resolución por capas, dashboard, gamificación, panel parental, PWA, perfil completo — F5, F7, F11, F13-F18.
- Seguridad: RLS completo y verificado, cero secretos expuestos al cliente, cabeceras HTTP, 0 vulnerabilidades de dependencias críticas, escalación de privilegios encontrada y corregida — F22.
- Legal: aviso de privacidad y términos completos (falta solo el dato de la empresa) — F21.
- Observabilidad: Sentry + PostHog instrumentados (inertes hasta tener credenciales reales) — F20.
- Rastreo de campañas de marketing completo — F24 (esta fase).
- 442 tests unitarios pasando, 23/23 verificaciones de aislamiento RLS en vivo, `pnpm typecheck`/`lint`/`build` en verde.

**El código está listo para escalar en cuanto el contenido y las credenciales de negocio lo estén.**

---

## 8. Pasos restantes, ordenados por urgencia

### 🔴 Bloqueantes de lanzamiento (sin esto, no hay Go posible)

1. **Producir contenido hasta llegar a ≥1,500 reactivos, cubriendo IPN (ambas ramas) y las 4 áreas de UNAM.** Decisión de negocio requerida primero: ¿comprar crédito de API real, o repetir el proceso "capital cero" de F4 con más sesiones dedicadas? — depende de Ángel.
2. **Obtener credenciales reales de Stripe** (llave secreta + webhook secret + Price IDs) y correr `pnpm stripe:setup-prices` — depende de Ángel (cuenta de Stripe).
3. **Completar los datos de relleno del aviso de privacidad y términos** (razón social, domicilio, teléfono) — `grep -n "PLACEHOLDER:" "app/(public)/legal/"` — depende de Ángel.
4. **Verificar y, si aplica, actualizar el plan de Supabase** de gratuito a uno que soporte ≥500 usuarios concurrentes — depende de Ángel (decisión de presupuesto de infraestructura).
5. **Reclutar y correr la beta cerrada real** (100 testers, NPS ≥7.5/10 en ≥30 respuestas) — depende de Ángel/equipo de marketing, y solo tiene sentido una vez el contenido (paso 1) esté cerca de su meta.

### 🟡 Importantes, no bloqueantes de código pero sí de negocio

6. Configurar `NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID` reales y lanzar/aprobar las campañas en Meta Ads Manager y TikTok Ads Manager (infraestructura de rastreo ya lista, F24).
7. Confirmar que `acierta.mx` resuelve al deploy real de Vercel.
8. Activar credenciales reales de Sentry/PostHog para tener observabilidad real desde el día 1 (hoy inertes por placeholders).
9. Re-medir Lighthouse Performance (dashboard/práctica) contra el deploy de producción real, no contra este entorno de desarrollo — el TTFB debería mejorar al estar Vercel+Supabase co-ubicados.
10. Activar "Leaked Password Protection" en Supabase Dashboard → Authentication → Policies (pendiente heredado de F22).

### ⚪ Verificable solo en la ventana de los 7 días previos al launch

11. Confirmar 0 bugs críticos abiertos (Sentry + revisión manual).

---

## 9. Cómo re-correr esta verificación

Este documento es un snapshot verificado el 27 de julio de 2026. Para
refrescarlo:

```bash
# Conteo real de reactivos servibles por institución/área — usar Supabase MCP
# o conectar directo con psql/Prisma Studio y correr el mismo query que esta
# sesión usó contra la tabla `questions` JOIN topics/subjects/areas/exams/levels/institutions.
pnpm prisma studio

# Suite completa
pnpm typecheck && pnpm lint && pnpm build && pnpm test:unit && pnpm test:rls
```

Y repetir la lectura de `docs/PRD_Acierta_v1.0.md §14` punto por punto contra
lo que realmente exista en ese momento — no contra este documento, que
envejece en cuanto el contenido o las credenciales cambien.
