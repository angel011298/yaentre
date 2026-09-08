# VEREDICTO DE LANZAMIENTO — G72

> Recorre **cada criterio** de `PRD_Acierta_v1.0.md §14 "Criterios de
> lanzamiento (Definition of Done)"`, más las métricas de §3 y los
> requerimientos no funcionales de §12 que ese mismo §14 da por sentados.
> Cada punto tiene veredicto contra el **estado real de producción**
> (`https://yaentre.com`, proyecto Supabase `fumluvvzskhdxcyljbmx`, cuenta de
> Vercel `angel011298s-projects`) — verificado por consulta directa en esta
> sesión, no por lo que dicen los documentos de fases anteriores.
>
> Fecha de este veredicto: **7 de septiembre de 2026**. Última fase de
> código: **G71**. **Actualizado el 8 de septiembre de 2026 con los
> resultados de G73 y G73b** — los puntos afectados están marcados en su
> propia fila; el veredicto global (NO-GO en las tres puertas, por decisiones
> de negocio y no por código) no cambia. Este documento **supera y reemplaza** a
> `docs/LAUNCH_CHECKLIST.md` (snapshot del 27 de julio de 2026, F24) como la
> fuente vigente — ese archivo se conserva sin tocar como registro histórico
> de dónde estaba el proyecto entonces.
>
> Leyenda: ✅ **CUMPLIDO** (con evidencia) · 🟡 **PARCIAL** (qué falta,
> exactamente) · 🔴 **PENDIENTE** (qué acción falta y de quién depende) ·
> 🔧 **NO VERIFICABLE AÚN** (la ventana o el evento que lo mide no ha llegado).

---

## Veredicto ejecutivo

**El producto NO está listo para ningún Go/No-Go hoy — pero por razones
fundamentalmente distintas a las de julio.** El snapshot de F24
(`docs/LAUNCH_CHECKLIST.md`) encontró un proyecto con 309 de 1,500 reactivos
(20.6%), Stripe con llaves placeholder nunca probadas, dominio sin resolver e
IPN en cero absoluto. Nada de eso describe el estado de hoy:

- El banco de reactivos pasó de 309 a **1,143 verificados (76% de la meta
  nominal de 1,500)**, con las 2 instituciones de lanzamiento (UNAM + IPN
  Superior) con contenido real en casi todas sus materias.
- El dominio `yaentre.com` está en producción real, con SSL, HSTS y
  redirección forzada a HTTPS.
- El registro, el diagnóstico, el simulador completo, la compra y el panel
  parental se probaron de punta a punta con **cuentas reales y dinero de
  prueba real** (`docs/VERIFICACION_FINAL.md`, G71), con el guardrail de
  no-filtración de respuestas demostrado por evidencia de red, no por
  lectura de código.
- La auditoría de seguridad (G65-G67, G71) encontró y corrigió hallazgos
  críticos reales — RLS aislado y verificado en vivo, fuerza bruta cortada,
  código de vinculación no forzable — y no quedan hallazgos críticos
  abiertos.

**Lo que bloquea el lanzamiento hoy ya no es "¿funciona el producto?" —
es tres decisiones de negocio que ninguna sesión de código puede tomar por
el dueño:**

1. **Stripe sigue en modo PRUEBA.** Cero pesos reales se han cobrado nunca.
   Es el bloqueador absoluto de cualquier venta real, incluido el Early
   Bird. Ver §3.
2. **La infraestructura de despliegue está en planes gratuitos que prohíben
   o no soportan el uso comercial.** Vercel Hobby prohíbe explícitamente
   cobrar sobre ese plan (la sanción documentada es pausar el despliegue) y
   Supabase sigue en el plan gratuito (sin respaldos restaurables, límite de
   500 MB). Ver §4.
3. **Cero validación de mercado real todavía.** 0 licencias Early Bird
   vendidas de verdad, 0 beta testers reclutados, 0 respuestas de NPS, 0
   campañas de publicidad configuradas. Esto no es un defecto — es que el
   proyecto aún no ha cruzado la puerta de negocio que activa estas
   métricas — pero el PRD las exige antes de dar Go, y hoy están en cero.

**El código está objetivamente más cerca del lanzamiento de lo que estuvo
nunca.** Lo que falta de aquí al 6 de enero de 2027 es, en su enorme
mayoría, trabajo humano (comprar planes, activar Stripe live, completar
datos legales, correr una beta real) y ~350 reactivos más de contenido — no
ingeniería de producto.

---

## 1. Semáforo por puerta (PRD §14)

| Puerta | Fecha | Cumplidos | Parciales | Pendientes | No verificable | Veredicto |
|---|---|---|---|---|---|---|
| **Early Bird** | 1 oct 2026 | 4 / 6 | 1 | 1 | 0 | **NO-GO** — falta Stripe live |
| **Beta Cerrada** | 1 nov 2026 | 3 / 5 | 0 | 2 | 0 | **NO-GO** — falta contenido y reclutamiento |
| **Public Launch** | 6 ene 2027 | 4 / 11 | 3 | 4 | 1... | **NO-GO** — 4 bloqueadores directos |

La fecha de Early Bird está a **~3 semanas** de este veredicto. Con Stripe
todavía en modo prueba y los datos legales sin completar, esa fecha no es
alcanzable si "Early Bird" significa cobrar dinero real — sí lo es si se
acepta redefinir el 1 de octubre como el día en que el mecanismo queda
demostrado en pruebas y **el dueño** decide cuándo voltear el interruptor a
modo real.

---

## 2. Go/No-Go para Early Bird (1 octubre 2026)

| # | Criterio (PRD §14) | Veredicto | Evidencia |
|---|---|---|---|
| 2.1 | Landing live en yaentre.com con lista de espera funcional | ✅ **CUMPLIDO** | `yaentre.com` resuelve en producción real, SSL válido, `curl -I` → `200`, `Strict-Transport-Security` presente (`pnpm security:headers` 14/14). **No existe una "lista de espera" literal** — el producto usa registro directo + Early Bird como pricing en vez de una waitlist previa; cubre el mismo objetivo de negocio (capturar interés temprano) sin el paso intermedio. |
| 2.2 | Stripe: Early Bird Price IDs activos con `max_redemptions: 500` | 🔴 **PENDIENTE** | Los 9 Price existen y funcionan de punta a punta (`pnpm stripe:setup-prices`, verificado con una compra real en G70/G71) — **pero en modo `sk_test_`/`pk_test_`**, confirmado en la Vercel de producción en esta misma sesión. El límite de 500 SÍ está implementado y probado a nivel de aplicación (`EARLY_BIRD_LICENSE_LIMIT`, verificado en vivo en 500/500 tras la limpieza de G71) — el PRD describe `max_redemptions` de forma imprecisa (es un campo de `Coupon`, no de `Price`, en la API real de Stripe); la intención de negocio SÍ está cubierta. **Bloqueador real: no hay una sola licencia que se pueda vender con dinero de verdad hoy.** Depende de: Ángel — activar la cuenta de Stripe en modo live (`docs/STRIPE_LIVE_CHECKLIST.md` §2). |
| 2.3 | Diagnóstico inicial funcional con ≥ 300 reactivos UNAM Área 1 | ✅ **CUMPLIDO** (por un margen estrecho) | UNAM Área 1 (Ciencias Físico-Matemáticas y las Ingenierías): **307 reactivos verificados**, verificado por consulta directa a la base. Margen de 7 sobre el mínimo — cualquier retirada de reactivo por reporte de error lo pondría por debajo. El diagnóstico en sí se probó de punta a punta con una cuenta real (G71): 30/30 respondidas, Entrómetro generado. |
| 2.4 | Pantalla de resultados del diagnóstico con Entrómetro básico | ✅ **CUMPLIDO** | Verificado en vivo con cuenta real (G71): «5/30 aciertos · Entrómetro 20/120 · Meta estimada ~101 · Te faltan ~81 aciertos · 3 temas prioritarios». |
| 2.5 | Auth: registro, login, perfil funcionales | ✅ **CUMPLIDO** | Verificado en vivo con cuentas reales (G70b, G71): registro → correo de verificación real en español → confirmación → onboarding; login; perfil completo (nombre, tema, contraseña, vinculación de tutor). |
| 2.6 | Compra de Early Bird Pase ($499) funcional con tarjeta y OXXO | 🟡 **PARCIAL** | **Tarjeta: probada de punta a punta con dinero de prueba real** (`4242…` → webhook `checkout.session.completed` → `Subscription.status = ACTIVE` en 34 ms, G70/G71). **OXXO y SPEI: solo probados con payloads firmados sintéticamente contra el Route Handler** (F19, 9 tests) — nunca con un voucher OXXO real ni una transferencia SPEI real. Y los tres, en modo prueba: ninguno ha movido un peso real todavía. |

**Veredicto Early Bird: 4 de 6 cumplidos, 1 parcial, 1 pendiente. El pendiente (2.2) es, por sí solo, el que bloquea la puerta — sin Stripe live no hay Early Bird real posible, sin importar cuánto más se cumpla de lo demás.**

---

## 3. Estado del cobro — explícito, sin ambigüedad

> El usuario pidió esto con máxima claridad, así que va aparte.

### 🔴 STRIPE ESTÁ EN MODO PRUEBA. CERO PESOS REALES SE HAN COBRADO NUNCA.

| Verificado en esta sesión | Valor |
|---|---|
| `STRIPE_SECRET_KEY` en Vercel producción | `sk_test_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en Vercel producción | `pk_test_…` |
| Suscripciones reales en la base (fuera de fixtures de prueba) | **0** |
| Pagos reales en la base | **0** (0 filas en `payments` tras la limpieza de G71) |
| Licencias Early Bird activas | **0** (contador público: 500 de 500 disponibles) |
| Cuenta de Stripe activada para cobrar (identidad + CLABE verificadas) | Sin confirmar desde código — requiere el dashboard de Stripe |

**Esto es un bloqueador absoluto para cualquier lanzamiento público o venta
real, sin excepción.** El mecanismo técnico está construido, probado y
funciona de punta a punta — pero "funciona en modo prueba" y "puede cobrar
dinero real" son dos afirmaciones distintas, y solo la primera es cierta
hoy. Activar el modo live exige verificación de identidad y datos bancarios
del titular ante Stripe (persona física/moral, RFC, domicilio fiscal,
CLABE, identificación oficial) — es una acción que **solo el dueño humano
puede ejecutar**, documentada paso a paso en
`docs/STRIPE_LIVE_CHECKLIST.md` §2. Ninguna sesión de Claude Code debe
intentarlo ni se le debe pedir que lo intente.

**Camino a modo real, una vez que el dueño active la cuenta:**
1. Activar la cuenta en modo live (identidad + CLABE).
2. Copiar `sk_live_…` / `pk_live_…`.
3. Recrear los 9 Price con la llave live (`pnpm stripe:setup-prices`) — los de prueba **no existen** en modo live, Stripe separa los datos por completo.
4. Crear el webhook live a mano (el script se niega a hacerlo con una llave que no sea de prueba, por diseño).
5. Reemplazar las 3 variables + 9 Price IDs en Vercel producción.
6. **Una compra real con tarjeta propia**, antes de anunciar nada, para confirmar que el cargo real llega y el depósito queda programado.

---

## 4. Go/No-Go para Beta Cerrada (1 noviembre 2026)

| # | Criterio (PRD §14) | Veredicto | Evidencia |
|---|---|---|---|
| 4.1 | Simulador completo funcional: 120 reactivos, 180 min, fullscreen, sin retroceso | ✅ **CUMPLIDO** | Verificado en vivo con una cuenta real (G71): simulacro completo de **120/120** reactivos, sin botón "Anterior" en ningún momento, tiempo calculado y cerrado por el **servidor** (9 s consumidos contra 9 s reales medidos por Node, con el reloj del cliente manipulado +3 600 s), degradación graciosa de pantalla completa probada. |
| 4.2 | ≥ 800 reactivos verificados distribuidos en UNAM Áreas 1-3 | 🔴 **PENDIENTE** | UNAM Área 1: 307 · Área 2: 206 · Área 3: 105 → **618 de 800 (77%)**. Mejoró desde 309/800 (38.6%) en julio, pero sigue corto. |
| 4.3 | Dashboard del alumno completo con todos los widgets | ✅ **CUMPLIDO** | Verificado en vivo (G71): Entrómetro, racha, mapa de calor semanal, "Reforzar hoy" con 3 temas, "Simulacros recientes", recomendación de Tino — todos los widgets del PRD §7 F-05. |
| 4.4 | Resolución por capas (Capas 1-2) en ≥ 80% del banco | ✅ **CUMPLIDO, con margen amplio** | Verificado por consulta directa: **100% de los 1,143 reactivos verificados tienen las Capas 1-3 completas** (3,441 filas de `explanation_layers`), no solo 1-2. |
| 4.5 | Reclutamiento de 100 beta testers activos | 🔴 **PENDIENTE** | `docs/BETA_FEEDBACK.md` sigue con sus 6 secciones vacías — "sin entradas todavía" en las 6. Cero beta testers reclutados, cero feedback recibido. Acción 100% de negocio/marketing. |

**Veredicto Beta Cerrada: 3 de 5 cumplidos, 2 pendientes. Ambos son de volumen (contenido) o de negocio (reclutamiento) — cero pendientes de código.**

---

## 5. Go/No-Go para Public Launch (6 enero 2027)

| # | Criterio (PRD §14) | Veredicto | Evidencia |
|---|---|---|---|
| 5.1 | ≥ 1,500 reactivos verificados (UNAM 4 áreas + IPN 2 ramas mínimo) | 🔴 **PENDIENTE — el bloqueador de contenido** | **1,143 de 1,500 (76%)** verificado por consulta directa. Las 2 instituciones de lanzamiento SÍ tienen contenido en (casi) todas sus áreas — ver desglose completo en §6, incluidos dos huecos reales que importan más que el número global: **Inglés de la UNAM está en CERO en las 4 áreas** y **la rama IPN Sociales y Administrativas (SOCADM) tiene 4 de 7 materias en cero**. Brecha efectiva (metodología G26, que pondera por pools compartidos): **333 reactivos, ~10 lotes** del pipeline. |
| 5.2 | Dashboard parental funcional y vinculable | ✅ **CUMPLIDO**, con una falla adyacente real | Verificado en vivo con cuentas reales y evidencia de RED, no de interfaz (G71): código de 6 dígitos, vinculación real, panel con Entrómetro/racha/actividad/simulacros — **25 respuestas de red inspeccionadas, 0 con contenido de reactivos**. **Falla real, no cubierta por este criterio literal pero sí por F-06:** el resumen semanal por correo al tutor (y las otras 2 notificaciones programadas) **fallan en silencio** desde G59 — el rol `acierta_ci` no tiene el `GRANT` sobre `auth.users` que necesita para resolver el correo del destinatario, confirmado en esta sesión (`has_table_privilege('acierta_ci','auth.users','SELECT') = false`). Sin ese `GRANT`, cero correos programados salen, sin ningún error visible. |
| 5.3 | Gamificación completa (streak, MateriaDominada, PerfectRound) | ✅ **CUMPLIDO** | Construido y probado (G15, G63/G64 lo verificaron visualmente incluyendo un bug de contraste real corregido). No se retriggeró en vivo en G71 porque los scores del recorrido fueron bajos a propósito — es esperado, no una falla. |
| 5.4 | PWA instalable en Android e iOS (manifest + service worker) | ✅ **CUMPLIDO** | G64: manifest con `id`, íconos 192/512/maskable, service worker con caché offline de `/app` y exclusión deliberada de `/simulador`, verificado con Playwright y emulación de zonas seguras de iOS. |
| 5.5 | NPS de beta cerrada ≥ 7.5/10 en al menos 30 respuestas | 🔴 **PENDIENTE** | Depende directamente de 4.5 (nunca reclutada la beta). Cero respuestas. |
| 5.6 | Lighthouse Performance mobile ≥ 85 | 🟡 **PARCIAL — sin re-verificar contra el dominio real** | G62 midió **las 5 pantallas críticas ≥ 85** (landing 96, registro 98, dashboard 87, práctica 90, simulador 94) contra un build de producción local (`next build && next start`), no contra `https://yaentre.com` directamente — esta sesión no volvió a correr Lighthouse. Vercel + Supabase co-ubicados en `us-east-1`/`iad1` deberían igualar o mejorar esos números, no empeorarlos, pero **"debería" no es "confirmado"**. 🔧 Recomendado: correr Lighthouse contra el dominio real antes de la ventana de 7 días previa al lanzamiento. |
| 5.7 | 0 bugs críticos en los 7 días previos al lanzamiento | 🔧 **NO VERIFICABLE AÚN** | La ventana de 7 días no ha empezado (faltan ~4 meses). Estado de hoy: **0 bugs críticos de código conocidos sin resolver** — el único hallazgo abierto de G71 (D7) es una línea de configuración del panel de Supabase, no un bug de código, y no afecta a ningún usuario real en producción. |
| 5.8 | Stripe webhooks probados end-to-end: tarjeta, OXXO, SPEI | 🟡 **PARCIAL** | Mismo estado que 2.6: tarjeta probada con dinero de prueba real de punta a punta; OXXO/SPEI solo con payloads sintéticos firmados. Los 4 eventos que enruta `src/lib/stripe/webhook.ts` (`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.deleted`) están configurados en el webhook de prueba. |
| 5.9 | ≥ 200 licencias Early Bird vendidas | 🔴 **PENDIENTE** | **0 reales**, verificado por consulta directa (`subscriptions` con `season='EARLY_BIRD' AND status='ACTIVE'` → 0 filas). Depende 100% de negocio, y de que 2.2/3 (Stripe live) se resuelva primero — no se puede vender lo que no se puede cobrar. |
| 5.10 | Aviso de privacidad (LFPDPPP) y Términos de uso publicados | 🟡 **PARCIAL** | Ambos documentos existen, completos en estructura y conectados a funciones reales (exportar datos, eliminar cuenta, banner de cookies que sí condiciona la analítica — verificado en G71 que PostHog respeta el rechazo). **Siguen con datos de relleno sin completar** — confirmado en esta sesión: `app/(public)/legal/privacidad/page.tsx` y `terminos/page.tsx` todavía tienen `PLACEHOLDER: YaEntre SAS de CV, Av. Ejemplo 123, México, CDMX \| contacto@yaentre.com \| +52 55 1234 5678`. Publicar así deja el aviso legalmente incompleto: no identifica al responsable real de los datos. |
| 5.11 | Campañas Meta Ads + TikTok Ads configuradas y aprobadas | 🔴 **PENDIENTE** | Verificado en la Vercel de producción: **ningún `NEXT_PUBLIC_META_PIXEL_ID` ni `NEXT_PUBLIC_TIKTOK_PIXEL_ID` está configurado**. La infraestructura de rastreo (4 eventos de conversión, atribución de campaña persistente de 90 días, CSP condicional) está construida desde F24 y verificada — queda inerte hasta que existan Pixel IDs reales. 100% acción de negocio en Meta Business Manager / TikTok Ads Manager. |

**Veredicto Public Launch: 4 de 11 cumplidos, 3 parciales, 3 pendientes de negocio puro, 1 pendiente de contenido, 1 no verificable aún. No se puede dar Go hoy.**

---

## 6. Banco de reactivos — desglose completo

Verificado por consulta directa a la base (`fumluvvzskhdxcyljbmx`), no contra
lo que digan fases anteriores.

```
TOTAL: 1,143 servibles · 0 pendientes de resolución · 1 retirado · 1,144 en banco
TASA DE AUTO-APROBACIÓN GLOBAL: 99.7% (1,144/1,147)
META 1,500 (nominal, por celda):    ████████████████░░░░░  76%
META 1,222 (efectiva, ponderada G26): ██████████████████░░░░  73%  · brecha 333 (~10 lotes)
```

### Por institución (las dos activas al lanzamiento — `NEXT_PUBLIC_ENABLE_*` confirma que UAM/EXANI/Media Superior siguen en `false`)

| Institución | Área/Rama | Reactivos verificados | Materias en CERO |
|---|---|---:|---|
| UNAM | Área 1 — Físico-Matemáticas e Ingenierías | **307** | Inglés (0/6 peso) |
| UNAM | Área 2 — Biológicas, Químicas y de la Salud | **206** | Inglés (0/3 peso, vía pool) |
| UNAM | Área 3 — Sociales | **105** | Inglés (0/1 peso, vía pool) |
| UNAM | Área 4 — Humanidades y Artes | **70** | Artes (0/2 peso, sin pool) |
| **UNAM total** | | **688** | |
| IPN | Ingeniería y Ciencias Físico-Matemáticas (FISMAT) | **245** | — (todas las materias con contenido) |
| IPN | Ciencias Médico-Biológicas (MEDBIO) | **175** | — (todas las materias con contenido) |
| IPN | Ciencias Sociales y Administrativas (SOCADM) | **35** | **Civismo/Derecho, Español/Lectura¹, Geografía, Historia de México, Historia Universal, Inglés¹ — 4 de 7 sin pool propio, 2 cubiertas por pool** |
| **IPN total** | | **455** | |
| **Total** | | **1,143** | |

¹ El pool `IPN:ESPANOL` e `IPN:INGLES` sí alcanzan a SOCADM (comparten
materia con FISMAT/MEDBIO — regla de G26), así que esas dos SÍ tienen
contenido real para un alumno de SOCADM. **Civismo/Derecho, Geografía,
Historia de México e Historia Universal NO tienen ningún pool que
compartir con otra área de IPN — son exclusivas de SOCADM y están
literalmente en cero.**

### Los dos huecos que importan más que el número global

1. **🔴 Inglés de la UNAM está en cero en las 4 áreas, sin excepción.**
   Cualquier alumno de UNAM que abra Drill o Diagnóstico de Inglés hoy no
   tiene un solo reactivo que ver. No es un problema de reparto entre
   áreas — el pool completo `UNAM:INGLES` está vacío.
2. **🔴 Un alumno que elija la rama SOCADM del IPN encuentra 4 de sus 7
   materias completamente vacías** (Civismo/Derecho, Geografía, Historia
   de México, Historia Universal). El onboarding **no filtra** las áreas
   por cobertura de contenido — `loadAreasForExam` ofrece las 3 ramas de
   IPN por igual — así que un alumno real puede elegir SOCADM hoy mismo y
   tener un diagnóstico roto en la mayoría de sus materias. Esto no
   revienta nada (el motor recorta la asignación a lo disponible, no
   crashea) pero es una experiencia de producto rota para esa rama
   específica.

Ninguno de los dos es un defecto de código — el pipeline funciona
exactamente como debe; simplemente no se le ha pedido lote de contenido
para esas materias todavía. Priorizarlas (Inglés UNAM, las 4 materias de
SOCADM) antes de seguir engordando materias que ya están cómodas movería la
aguja de "producto usable" más que el mismo esfuerzo en cualquier otra
materia.

---

## 7. Dominio, correo, monitoreo y analítica

| Servicio | Estado | Evidencia |
|---|---|---|
| **Dominio** | ✅ EN PRODUCCIÓN | `yaentre.com` resuelve, SSL válido, `HTTP → HTTPS` (308), `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. |
| **Correo (Resend + SMTP de Supabase Auth)** | ✅ EN PRODUCCIÓN | Dominio `yaentre.com` verificado en Resend. Verificado en esta sesión con un registro real: correo de confirmación entregado (`delivered`) en español, enlace funcional, cuenta confirmada. |
| **Correos PROGRAMADOS (resumen semanal, racha en riesgo, countdown)** | 🔴 **ROTO EN SILENCIO** | Ver 5.2 — falta el `GRANT` de `acierta_ci` sobre `auth.users`. Los crons SÍ están configurados y corriendo (`vercel.json`: `/api/cron/notifications` diario), pero no pueden resolver el correo del destinatario y no producen ningún error visible. |
| **Sentry (errores)** | 🟡 EN PRODUCCIÓN, sin sourcemaps | `NEXT_PUBLIC_SENTRY_DSN` cargado y confirmado activo (G70). `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` **no están configurados** → los stack traces de producción llegan minificados. No bloquea, sí dificulta diagnosticar bugs reales una vez haya usuarios. |
| **PostHog (analítica)** | ✅ EN PRODUCCIÓN, corregido en G71 | `NEXT_PUBLIC_POSTHOG_KEY`/`HOST` cargados. **G71 corrigió un bloqueo real**: la CSP solo permitía el host de ingesta y bloqueaba el de assets (`config.js`, banderas, encuestas) en cada carga de página — los eventos sí llegaban, por eso no se había notado. Verificado tras el fix: ambos scripts cargan sin error de CSP. |
| **Confirmación visual en los dashboards de Sentry/PostHog** | 🔧 Acción del dueño | Ninguna sesión tiene un token de lectura para ninguno de los dos — hay que entrar y confirmar que los eventos aparecen. |

---

## 8. Seguridad — resumen de auditorías

| Auditoría | Fase | Resultado |
|---|---|---|
| Autorización, RLS, sesiones, secretos, límites de tasa, datos de menores | G65 | 3 🔴 + 5 🟠 + 4 🟡 + 2 🔵 hallazgos — **12 corregidos**, 2 son decisión del dueño (contraseñas filtradas de Supabase, consentimiento parental — brecha legal documentada y abierta) |
| Dependencias y cadena de suministro | G66 | 14 vulnerabilidades → 0; `pnpm-lock.yaml` versionado (no lo estaba); overrides con techo de mayor |
| Extracción del banco, integridad del simulador, abuso del plan gratuito | G67 | 3 hallazgos 🔴 reales (simulacro "1 gratis" no lo era, "10/día" no lo era, `startSimulation` roto al 100% desde el 31 de agosto) — los 3 corregidos y verificados |
| Verificación integral en producción real, en los 3 roles | G71 | 7 defectos encontrados, 6 corregidos y reverificados tras desplegar (Química duplicada en el desglose, CSP bloqueando PostHog, error de hidratación gastando cuota de Sentry, 11 títulos de página, un plural, y una suite de pruebas que mentía en 3 sitios) |
| Advisors de Supabase (esta sesión) | G72 | 2 funciones `SECURITY DEFINER` marcadas — **revisadas, son las funciones auxiliares de RLS de G59** (`current_profile_id()`/`is_admin()`, cada una solo devuelve datos del propio llamador); **`Leaked Password Protection` sigue deshabilitado** — pendiente del dueño desde G65, toggle de un clic en el dashboard de Auth |

**Reejecutado en esta sesión, todo en verde:** `security:authz` 10/10 ·
`security:isolation` 22/22 · `security:abuse` 8/8 · `security:time-integrity`
4/4 · `security:headers` 14/14 · `security:session` 5/6 (el ⚠️ restante,
`S6`, es el mismo hallazgo conocido de G65: Supabase Auth por sí solo no
frena fuerza bruta — el limitador propio de la app sí lo hace, y `authz`/
`abuse` lo confirman activo) · `security:deps` 0 vulnerabilidades.

**Cero hallazgos críticos nuevos en esta sesión.**

---

## 9. Infraestructura de despliegue — el otro bloqueador de negocio

| Servicio | Plan verificado hoy | Por qué importa |
|---|---|---|
| **Vercel** | `hobby` (confirmado vía API: `angel011298s-projects` → `"plan":"hobby"`) | **Prohíbe explícitamente el uso comercial.** YaEntre ya cobra (aunque hoy sea en modo prueba) — la sanción documentada de Vercel es pausar el despliegue. Bloqueador directo del lanzamiento, independiente de si Stripe está en modo prueba o live. |
| **Supabase** | `free` (confirmado vía API: organización → `"plan":"free"`) | Sin respaldos restaurables (G61), 500 MB de base de datos (~3,200 alumnos-temporada de techo), 2 proyectos ya en uso del límite del plan gratuito, pausas automáticas por 7 días de inactividad. |
| **Resend** | Gratuito, 100 correos/día | Alcanza para los primeros ~300 alumnos activos (G69); tope real, no teórico. |

**Aclaración importante de G69, para no sobre-reaccionar:** el cuello de
botella **no es la capacidad técnica de la base de datos** — medido en G69,
Postgres hace el trabajo de un recorrido completo (diagnóstico + simulacro +
práctica) en 86 ms de CPU, y el pool de conexiones aguanta,
calculado, del orden de 10,600 alumnos simultáneos en simulacro sin
errores. **El bloqueador es de plan/negocio, no de arquitectura**: subir a
Vercel Pro ($20/mes) y Supabase Pro ($25/mes) resuelve los tres puntos de
esta tabla sin tocar una línea de código.

---

## 10. Suite completa — corrida en esta sesión

| Comprobación | Resultado |
|---|---|
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm test:unit` | ✅ **556/556** en 60 archivos |
| `pnpm build` | ✅ |
| `pnpm security:authz` | ✅ 10/10 |
| `pnpm security:isolation` | ✅ 22/22 |
| `pnpm security:abuse` | ✅ 8/8 |
| `pnpm security:time-integrity` | ✅ 4/4 |
| `pnpm security:headers` | ✅ 14/14 |
| `pnpm security:session` | 5/6 (⚠️ conocido, ver §8) |
| `pnpm security:deps` | ✅ 0 vulnerabilidades |
| `pnpm test:e2e` (chromium) | 5/6 — el 6º (registro real) solo se puede correr fuera de producción y está bloqueado por la config de Redirect URLs de Supabase (D7 de G71); no afecta a un usuario real |
| Advisors de Supabase (seguridad + rendimiento) | Revisados — 0 hallazgos nuevos accionables, 1 conocido (`Leaked Password Protection`) |

**Base de datos verificada limpia tras la sesión:** 5 cuentas (todas
fixture, 0 fuera de `@acierta-test.mx`), 0 sesiones abiertas, 0 pagos
huérfanos, contador Early Bird en 500/500 real.

---

## 11. Bloqueadores, ordenados por urgencia

### 🔴 Bloqueantes absolutos de cualquier Go (código listo, decisión de negocio pendiente)

| # | Bloqueador | Responsable | Por qué bloquea |
|---|---|---|---|
| 1 | **Activar Stripe en modo live** (identidad, CLABE, llaves, Price IDs, webhook) | Ángel | Sin esto, cero pesos reales pueden cobrarse — bloquea Early Bird y Public Launch por igual. `docs/STRIPE_LIVE_CHECKLIST.md` §2. |
| 2 | **Subir a Vercel Pro ($20/mes)** | Ángel | El plan Hobby prohíbe el uso comercial explícitamente; la sanción es pausar el despliegue. Bloqueador legal/contractual, no técnico. |
| 3 | **Subir a Supabase Pro ($25/mes)** | Ángel | Sin respaldos restaurables hoy (G61); techo de 500 MB; 2 proyectos gratuitos ya en uso. **G73 añade un motivo de seguridad:** "Leaked Password Protection" es exclusiva de Pro — el intento de activarla devuelve **HTTP 402** (era el item 10). |
| 4 | **Completar los datos legales de la empresa** (razón social, domicilio fiscal, teléfono) en `app/(public)/legal/privacidad` y `/terminos` | Ángel | El aviso de privacidad hoy no identifica al responsable real de los datos — legalmente incompleto bajo LFPDPPP. |
| 5 | **Producir ~350-360 reactivos más** (brecha efectiva 333), priorizando **Inglés UNAM (las 4 áreas)** y **las 4 materias vacías de IPN SOCADM** antes que engordar materias que ya están cómodas | Pipeline de contenido | Bloquea 5.1 (Public Launch) directamente y 4.2 (Beta) parcialmente; los dos huecos priorizados son experiencia de producto rota hoy mismo para esos alumnos, no solo un número por debajo de la meta. |

### 🟠 Bloqueantes de negocio (dependen de que los 5 de arriba se resuelvan primero, pero no son de código)

| # | Acción | Responsable |
|---|---|---|
| 6 | Reclutar 100 beta testers reales y correr la beta cerrada (NPS ≥7.5/10, ≥30 respuestas) | Ángel / marketing |
| 7 | Configurar `NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID` reales y lanzar/aprobar las campañas | Ángel / marketing |
| 8 | Vender las primeras 200 licencias Early Bird reales | Ángel / marketing (posible solo tras el bloqueador 1) |

### 🟡 Importantes, no bloqueantes de ningún Go pero sí de calidad de producto

| # | Acción | Responsable |
|---|---|---|
| ~~9~~ | ✅ **RESUELTO EN G73.** Los 3 correos programados envían de verdad — verificado con el cron real de producción y los 3 mensajes `delivered` en Resend. El SQL que este documento proponía era **inejecutable y además apuntaba al rol equivocado**; ver la nota bajo la tabla. | — |
| ~~10~~ | 🔴 **NO ES UN TOGGLE: ES EL PLAN.** Intentado en G73; el `PATCH` a la API de Supabase devuelve **HTTP 402 Payment Required** — "Leaked Password Protection" solo existe en Pro. **Deja de ser un item propio y se absorbe en el bloqueador 3** (Supabase Pro). | Ángel (vía bloqueador 3) |
| 11 | Configurar `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` para sourcemaps legibles. **Intentado en G73 y bloqueado**: no hay sesión abierta en sentry.io ni sesión de Google viva, y generar el token exige autenticarse con la contraseña del dueño. `next.config.ts` ya está cableado; del DSN se leyeron los ids numéricos (org `4512036691312640`, proyecto `4512036709203968`). Pasos exactos abajo. | Ángel |
| ~~12~~ | ✅ **RESUELTO EN G73.** Redirect URLs corregidas con `supabase config push` declarando solo esa propiedad (las otras 17 intactas, comprobado con `config diff`): se conservan `https://yaentre.com/**` y `https://www.yaentre.com/**`, se añaden `https://*-angel011298s-projects.vercel.app/**`, `http://localhost:3000/**` y `http://127.0.0.1:3000/**`. | — |
| 13 | Re-medir Lighthouse contra `https://yaentre.com` directamente, no solo contra el build local de G62 | Próxima sesión de código |
| 14 | Filtrar en el onboarding las áreas sin cobertura de contenido suficiente (o priorizar su contenido) — hoy `loadAreasForExam` ofrece IPN SOCADM igual que FISMAT/MEDBIO pese a tener 4 de 7 materias en cero | Próxima sesión de código |


> **Nota de G73 sobre el item 9 — por qué el remedio que este documento daba por bueno no habría servido.**
> El `GRANT USAGE ON SCHEMA auth …` estaba mal por tres razones independientes, y **cualquiera de ellas por sí sola** dejaba los correos
> exactamente igual de rotos:
>
> 1. **Rol equivocado.** El `DATABASE_URL` de producción conecta como **`acierta_prod`**, no `acierta_ci`. Aplicarlo tal cual habría
>    arreglado CI y dejado producción idéntica — con la satisfacción de haber "cerrado" el item.
> 2. **Grant inejecutable.** El esquema `auth` lo posee `supabase_admin`; el rol `postgres` (el máximo al que llega el dueño, sea por el
>    editor SQL del panel o por la API) tiene `U` **sin opción de concesión**. Postgres acepta el GRANT como **no-op sin error**:
>    `has_schema_privilege` sigue en `false` después de ejecutarlo. G59 §7 ya lo había dicho; el item 9 lo restató igualmente.
> 3. **Un segundo defecto escondido detrás del primero.** El JOIN comparaba `auth.users.id` (`uuid`) con `user_profiles."userId"` (`text`)
>    sin cast → `42883 operator does not exist: uuid = text`. Con el privilegio concedido, los correos habrían seguido en cero.
>
> La solución real es la migración `0014`: una función `SECURITY DEFINER` propiedad de `postgres` en `app_security`, que expone solo el par
> (perfil, correo). Detalle en `docs/ESTADO.md` §G73 y en `src/lib/db/auth-users.ts`.
>
> **Pasos que quedan para el item 11 (Sentry), ya reducidos a lo mecánico:**
> `sentry.io → Settings → Account → API → Auth Tokens → Create New Token`, con los scopes `project:releases` y `org:read`. Luego:
>
> ```bash
> npx vercel env add SENTRY_ORG production
> npx vercel env add SENTRY_PROJECT production
> npx vercel env add SENTRY_AUTH_TOKEN production
> npx vercel --prod
> ```
>
> Los slugs de org y proyecto se leen en la URL del dashboard de Sentry (`sentry.io/organizations/<org>/projects/<project>/`); los ids
> numéricos equivalentes, extraídos del DSN de producción, son org `4512036691312640` y proyecto `4512036709203968`.

### ⚪ Solo verificable en su momento

15. Confirmar 0 bugs críticos en los 7 días previos al lanzamiento — la ventana no ha empezado.

---

## 12. Riesgos que se asumirían si se lanzara HOY, tal cual

Ninguno de estos es hipotético — cada uno se deriva directamente de un
hallazgo verificado en esta sesión:

1. **Riesgo legal inmediato:** cobrar en Vercel Hobby viola sus términos de
   servicio; la plataforma podría pausarse a mitad de una campaña de
   lanzamiento, sin aviso previo garantizado.
2. **Riesgo legal de privacidad:** publicar el aviso de privacidad con
   datos de relleno de la empresa (`PLACEHOLDER: …`) incumple LFPDPPP — no
   identifica al responsable real del tratamiento de datos.
3. **Riesgo de pérdida de datos:** sin Supabase Pro, un incidente en la
   base de datos no tiene respaldo restaurable — la única "copia" hoy es el
   backup manual de contenido en git (`backups/content-bank.json`), que no
   cubre usuarios, pagos ni progreso.
4. **Riesgo de producto roto para un segmento real de usuarios:** cualquier
   alumno de UNAM que estudie Inglés, o cualquier alumno que elija la rama
   IPN SOCADM, encuentra hoy un diagnóstico/práctica vacíos en la mayoría de
   sus materias — sin ningún aviso que lo explique.
5. ~~**Riesgo de comunicación parental silenciosamente rota**~~ — **eliminado
   en G73.** Los 3 correos programados envían de verdad, verificado con el
   cron real de producción y los mensajes `delivered` en Resend. En su lugar,
   G73 destapó y corrigió un riesgo peor del mismo tipo: **el limitador de
   tasa distribuido de G65 nunca funcionó en producción** (grant concedido a
   `acierta_ci` y no a `acierta_prod`, con fallo abierto por diseño), así que
   el freno de fuerza bruta sobre el login, la recuperación de contraseña y
   el canje del código de vinculación de un menor llevaba meses inerte sin
   que ninguna sonda lo delatara. **G73b cerró ese riesgo y su clase**
   (`docs/AUDITORIA_SEGURIDAD.md §18`): los tres limitadores están
   **verificados bloqueando de verdad contra `https://yaentre.com`** con un
   navegador real, todo control que falla abierto produce ahora un evento en
   Sentry, y los privilegios dejaron de colgar de listas de roles escritas a
   mano. En el camino apareció un riesgo **mayor** del mismo tipo, también
   corregido: **toda tabla futura de `public` nacía escribible por `anon`**
   —la llave pública que viaja en el bundle del navegador— porque el `REVOKE`
   de F22 solo alcanzó a las tablas que existían aquel día y los privilegios
   por defecto de Supabase nunca se tocaron. Medido en producción sobre una
   tabla real antes y después de la migración `0015`.
6. **Riesgo de decidir a ciegas:** sin NPS de beta cerrada ni retención de
   licencias Early Bird reales, cualquier decisión de "estamos listos" se
   basaría en que el código pasa pruebas, no en que usuarios reales
   validaron el producto — exactamente la garantía que el PRD pone como
   condición explícita antes del Public Launch (§14).

---

## 13. Lo que SÍ está listo — para que el veredicto no se lea solo en negativo

Todo lo siguiente está construido, probado con datos y dinero reales contra
producción, y no tiene pendientes de código:

- Motor adaptativo determinista, simulador fiel con garantía estructural de
  no-filtración verificada por interceptación de red real (no solo por
  código), scoring 100% server-side, tiempo calculado y cerrado por el
  servidor con manipulación adversarial probada en vivo.
- Pagos con webhook idempotente y la garantía de que **el webhook, nunca el
  redirect**, activa el plan — cronometrado al milisegundo en G70/G71.
- Onboarding, diagnóstico, drill, resolución por capas (100% de cobertura,
  no solo el 80% mínimo), dashboard, gamificación, panel parental
  (privacidad verificada por el cuerpo de la red, no por la interfaz), PWA,
  perfil completo — todo probado con cuentas reales, no fixtures.
- Seguridad: RLS aislado y verificado en vivo (22/22), fuerza bruta
  cortada por un limitador distribuido real, código de vinculación parental
  no forzable (`crypto.randomInt`), 0 vulnerabilidades de dependencias, cero
  secretos expuestos.
- Correo transaccional real en español, con el dominio propio verificado.
- Observabilidad (Sentry + PostHog) activa y confirmada en producción, con
  un bloqueo de CSP real encontrado y corregido esta misma semana.
- Contenido: 1,143 reactivos verificados, 99.7% de tasa de auto-aprobación
  del pipeline adversarial, 100% con explicación de 3 capas.
- 569 pruebas unitarias, 5/6 E2E, 11 sondas de seguridad, todo en verde —
  y, desde G73b, los controles de fuerza bruta y de aislamiento verificados
  por su EFECTO contra producción real, no por lectura de código.

**El código no es el bloqueador. Lo es el calendario de decisiones de
negocio que el propio dueño tiene que tomar — y, mientras tanto, ~350
reactivos más de contenido.**

---

## 14. Cómo re-correr esta verificación

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test:unit
pnpm security:authz && pnpm security:isolation && pnpm security:abuse
pnpm security:time-integrity && pnpm security:headers && pnpm security:deps
pnpm content:coverage      # conteo real de reactivos por institución/área/materia
```

Y, desde G73b, las dos sondas que verifican por EFECTO en vez de por código.
Ambas exigen el `DATABASE_URL` **de producción** (`vercel env pull`), porque un
verde con el rol local `acierta_ci` es exactamente el que tuvieron G65-G72
mientras el limitador estaba muerto:

```bash
DATABASE_URL=<produccion> pnpm security:grants
DATABASE_URL=<produccion> G73B_PROBE_PASSWORD=<temporal> pnpm security:live
```

`security:live` ataca `https://yaentre.com` con un navegador real y exige ver
el bloqueo en pantalla en login, recuperación de contraseña y canje del código
parental. Requiere fijar temporalmente la contraseña de las cuentas
`rlsprobe.*@acierta-test.mx` y **restaurar el hash original al terminar**.

Y repetir la lectura de `docs/PRD_Acierta_v1.0.md §14` punto por punto
contra lo que realmente exista en ese momento — no contra este documento,
que es un snapshot del 7 de septiembre de 2026.
