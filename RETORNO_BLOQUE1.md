# Retorno — Bloque 1 (cierre legal para abrir venta)

> De: sesión de desarrollo (CTO) · Para: sesión CLO/CFO/CMO + Ángel
> Fecha: 25 de septiembre de 2026
> Rama: `claude/intelligent-gates-sxp9pr` (repo `angel011298/yaentre`)
> Flujo: **entrega de archivos, no despliegue.** `vercel --prod` lo corre Ángel.

## Resumen

De los 7 puntos del Bloque 1 (§9 del handoff): **6 entregados y verificados**
(1, 2, 3, 4, 6, 7) y **1 bloqueado por decisión abierta** (5 — correo de
renovación del Mensual). `pnpm typecheck` y `pnpm lint` en **verde**;
`pnpm test:unit` **909/909 verde** (75 archivos), con tests nuevos para toda la
lógica pura y los gates críticos del checkout.

⚠️ **ACCIÓN BLOQUEANTE ANTES DE DESPLEGAR:** el código ya usa las columnas nuevas
(fecha de nacimiento, consentimiento art. 56, tabla `tutor_consents`). Hay que
**aplicar la migración `prisma/migrations/0019_minors_and_checkout_consent_bloque1.sql`
como `postgres` por el panel/API de Supabase ANTES** de `vercel --prod`, o las
consultas fallarán. Ver §Acciones manuales.

Se **modificó `prisma/schema.prisma`** (lo exigían los items 2, 3 y 4). Se declara
aquí como pide la regla de trabajo #2 y el guardrail de CLAUDE.md. Cambios: dos
columnas en `user_profiles`, dos en `subscriptions`, y el modelo nuevo
`TutorConsent`. No se tocó ningún modelo/columna existente de forma destructiva.

---

## Item 1 — Precios nuevos · **LISTO**

**Qué se hizo** (`src/lib/stripe/pricing.ts` + barrido de copy):
- Early Bird: **Básico (SEASON_PASS) $999**, **Premium $1,799** (centavos
  99 900 / 179 900). Confirmados por tu instrucción; resuelven §6.1.
- **Early Bird cierra el 30-nov-2026** (hora de México, UTC−6): el corte pasó de
  `2027-01-01` a `2026-12-01 00:00 CST`. A partir del 1-dic rige Temporada Alta.
- **Se retiró `hasGuarantee`** de `PlanPricing` y de todos sus consumidores; el
  producto ya no ofrece garantía. La palabra «garantía» se barrió del copy de
  cara al usuario (paywall, checkout, marketing, FAQ, emails, `/precios`).
- **Renombrado de cara al usuario:** SEASON_PASS → «Básico», PREMIUM → «Premium».
  Los VALORES del enum `SubscriptionPlan` NO se renombraron (ver §Preguntas #2).

**Archivos:** `src/lib/stripe/pricing.ts`, `src/lib/db/billing.ts`,
`src/lib/db/admin-users.ts`, `app/actions/checkout.ts`,
`src/components/paywall/PlanCard.tsx`, `src/components/checkout/CheckoutViews.tsx`,
`src/components/marketing/{ParentSection,EarlyBirdBanner}.tsx`,
`src/components/tutor/ParentLockedPreview.tsx`, `src/lib/tino/copy.ts`,
`src/lib/email/templates.ts`, `src/lib/marketing/faq-data.ts`,
`app/(public)/precios/page.tsx`, `app/admin/usuarios/[id]/page.tsx`,
`tests/stripe/webhook.test.ts`.

**Verificaciones:** typecheck, lint, tests de precios/temporada verde.

**Requiere decisión** (marcado en código y en §Preguntas): precios de **Temporada
Alta / Último Minuto** de Básico/Premium (usé la propuesta §3.3, pendiente de
confirmar) y el **precio/existencia del plan Mensual** (sin cambio).

---

## Item 2 — Casilla art. 56 LFPC en el checkout · **LISTO**

**Qué se hizo:**
- Casilla **obligatoria y no premarcada** con el **texto exacto** del handoff §3.4
  (en `src/lib/legal/consent-texts.ts`, `ART56_CHECKOUT_CONSENT_TEXT`).
- El servidor **vuelve a exigir** el consentimiento (nunca confía en la UI) como
  parte de `startCheckoutAction`, ANTES de tocar Stripe, y **sella marca de
  tiempo + versión** (`subscriptions.art56ConsentAt` / `art56ConsentVersion`).
- También en el **botón de reintento** de pago (`RetryButton`), que crea una
  nueva compra.

**Archivos:** `app/actions/checkout.ts`, `src/lib/db/billing.ts` (schema),
`src/components/paywall/{PlanChooser,PlanCard,ChoosePlanButton}.tsx`,
`src/components/checkout/RetryButton.tsx`, `src/lib/legal/consent-texts.ts`.

**Verificaciones:** `tests/legal/checkout-gates.test.ts` comprueba que sin el
consentimiento la acción **rechaza y NO llama a Stripe**.

---

## Item 3 — Fecha de nacimiento + bloqueo <15 + liga del tutor <18 · **LISTO**

**Qué se hizo:**
- **Registro de alumno** pide fecha de nacimiento + casilla «declaro que es
  verídica». **Bloqueo de menores de 15 ANTES de crear la cuenta** (ni el usuario
  de Supabase ni el perfil se crean). El registro de **tutor** (adulto) no la pide.
- Se guarda `birthDate` + `birthDateDeclaredAt` en el perfil.
- **Gate de checkout:** un menor de 18 no puede pagar sin **confirmación del
  tutor**; sin fecha de nacimiento tampoco (código `BIRTHDATE_REQUIRED`).
- **Flujo de liga del tutor:**
  - `/app/verificacion-tutor` (alumno): pide/reenvía la liga al correo del tutor.
  - correo transaccional (Resend) con la liga.
  - `/confirmar-tutor?token=…` (**público**, autorizado por token, no por sesión):
    el tutor revisa y confirma.
- **Token seguro:** `crypto.randomBytes(32)`, se guarda **solo el hash SHA-256**;
  vigencia 7 días. Nunca `Math.random` (guardrail G65).

**Archivos:** `src/lib/legal/age.ts` (puro), `src/lib/db/tutor-consent.ts`,
`app/actions/tutor.ts`, `app/actions/auth.ts`, `src/lib/auth/schemas.ts`,
`app/(public)/registro/SignUpForm.tsx`,
`app/(app)/app/verificacion-tutor/page.tsx`, `app/confirmar-tutor/page.tsx`,
`src/components/tutor/{TutorConsentRequestForm,TutorConfirmForm}.tsx`,
`src/lib/email/templates.ts`, `src/lib/rate-limit/store.ts`, `prisma/schema.prisma`.

**Verificaciones:** `tests/legal/age.test.ts` (edad, bloqueo <15, parseo de fecha)
y `tests/legal/checkout-gates.test.ts` (menor sin/con tutor → rechaza/procede).

---

## Item 4 — Consentimientos marketing/analítica/grabación en la liga · **LISTO**

**Qué se hizo:** la liga del tutor recoge **cuatro consentimientos granulares** —
datos (obligatorio) + marketing + analítica + grabación (opcionales) — y los
persiste en `tutor_consents` con la **versión** del texto aceptado. Textos y
claves en `src/lib/legal/consent-texts.ts` (`TUTOR_CONSENT_CLAUSES`).

**Nota:** los textos descriptivos de estos consentimientos son **PLACEHOLDER**
hasta que CLO entregue los definitivos (ver item 6 y §Preguntas #4). El de
grabación debe nombrar a Google como encargado (§4.5) cuando el aula entre en
operación (Bloque 2).

---

## Item 6 — Puntos de integración de textos legales · **LISTO (scaffolding)**

**Qué se hizo:** `src/lib/legal/consent-texts.ts` centraliza los textos que la
persona acepta y sus **versiones** (`ART56_CONSENT_VERSION`, `TUTOR_CONSENT_VERSION`,
`LEGAL_DOCS_VERSION`), con marcadores `// TODO(CLO)` en cada texto que produce la
sesión CLO. Las páginas legales completas (`/legal/terminos`, `/legal/privacidad`)
ya existen con sus marcadores «EDITAR ANTES DE PUBLICAR» y `noindex`; falta crear
`/legal/reembolsos`. Cuando lleguen los textos: (1) reemplazar las constantes;
(2) subir la versión SOLO si cambia lo que se acepta; (3) quitar `noindex` y
agregar a `sitemap.ts`.

**Pendiente de CLO (no es código):** T&C, Aviso de Privacidad (integral +
simplificado), Política de Reembolsos, y los textos de consentimiento (registro,
menores, marketing/analítica/grabación).

---

## Item 7 — Simulacro Free 120→60 (una vez) + conversión · **LISTO**

**Qué se hizo:**
- El simulacro Free pasa a **medio simulacro: 60 reactivos, tiempo proporcional**
  (p. ej. UNAM 120/180 → 60/90). El pagado sigue completo (120/140). El tope de
  **1 intento** no cambia.
- Helpers puros `simulationQuestionTarget` / `simulationTimeLimitSecs`
  (`src/lib/paywall/gates.ts`).
- **Pantalla de conversión** a Básico/Premium al terminar el medio simulacro Free
  (`SimulatorResult`), y el pre-flight muestra «Medio simulacro».
- Se alineó el copy que prometía «1 simulacro completo gratis» (Hero, FAQ,
  precios, términos, Entrómetro, Tino, dashboard) al medio simulacro real.

**Archivos:** `src/lib/paywall/gates.ts`, `src/lib/db/simulator.ts`,
`app/simulador/page.tsx`, `src/components/simulator/{SimulatorApp,SimulatorPreflight,SimulatorResult}.tsx`,
`scripts/scale-audit.ts`, + copy. **Tests:** `tests/paywall/gates.test.ts`.

---

## Item 5 — Correo de renovación del Mensual (5 días antes) · **BLOQUEADO (requiere decisión)**

**No se implementó, a propósito.** Depende de una decisión abierta y de una
configuración que solo Ángel puede hacer:

1. **La existencia del plan Mensual es una decisión abierta.** El handoff §3.2
   define «tres niveles: Free · Básico · Premium» (sin Mensual), pero §3.3 sigue
   incluyendo el Mensual en la tabla de precios. **Solo el plan MONTHLY es
   recurrente**; Básico y Premium son **pago único** (no se renuevan, no necesitan
   aviso de renovación). Por lo tanto **este correo aplica únicamente si el plan
   Mensual se conserva.** No lo adiviné (regla de trabajo #2).
2. **Falta infraestructura de fecha de renovación.** `Subscription` no guarda la
   fecha del próximo cobro y el webhook no escucha `invoice.upcoming`.

**Plan de implementación listo para cuando se decida** (si el Mensual se conserva),
recomendado en este orden:
- Configurar en Stripe el webhook **`invoice.upcoming`** con **5 días** de
  anticipación (Dashboard → Billing), y manejarlo en `src/lib/stripe/webhook.ts`
  para disparar el correo. Es la vía más limpia (no requiere cron ni almacenar la
  fecha).
- Alternativa sin webhook: guardar `currentPeriodEnd` en `Subscription` (columna
  nueva, poblada desde `customer.subscription.updated`) + un Vercel Cron diario
  que busque las que renuevan en 5 días.
- Plantilla de correo + **liga de cancelación** (a un flujo que llame
  `stripe.subscriptions.update({ cancel_at_period_end: true })` desde una Server
  Action guardada del alumno, o un portal de cliente de Stripe).

---

## Acciones manuales para Ángel (antes de desplegar)

1. **[BLOQUEANTE] Aplicar la migración 0019 como `postgres` por el panel/API de
   Supabase** (el rol de la app no tiene DDL — igual que 0012-0018):
   `prisma/migrations/0019_minors_and_checkout_consent_bloque1.sql`.
   Después validar con `pnpm prisma migrate diff` (debe salir vacío salvo los
   índices de rendimiento de 0012 que viven fuera del schema a propósito) y correr
   `pnpm security:grants` para confirmar que `tutor_consents` quedó cerrada a
   `anon`/`authenticated`.
2. **Recién entonces** `vercel --prod`. Desplegar antes de aplicar la migración
   rompería el registro y el checkout (columnas inexistentes).
3. Confirmar los **precios de Temporada Alta / Último Minuto** y el **futuro del
   plan Mensual** (§Preguntas #1 y #2) — no bloquean el deploy, pero sí definen si
   los precios no-Early-Bird son correctos.
4. Cuando CLO entregue los textos legales, integrarlos (item 6) antes de quitar
   el `noindex` de las páginas legales.
5. Para el correo de renovación (item 5), decidir el futuro del Mensual y, si se
   conserva, configurar el webhook `invoice.upcoming` en Stripe.

---

## Preguntas abiertas

1. **Precios no-Early-Bird:** ¿confirmas Temporada Alta Básico $1,199 / Premium
   $2,199 y Último Minuto $1,499 / $2,599 (propuesta §3.3)? Ahora mismo están en
   código con esos valores y marcados como pendientes.
2. **Plan Mensual:** ¿se conserva? El handoff §3.2 lista solo Free/Básico/Premium
   pero §3.3 lo cotiza. Lo dejé **sin cambio** ($99/$149/$199) y **no renombré el
   enum** `SubscriptionPlan`. Si se elimina, hay que decidir cómo (afecta al
   paywall, al panel parental que hoy exige Básico/Premium, y al item 5).
3. **Copy comercial de Premium:** dejé copy conforme a los guardrails («abre el
   acceso» a profesores independientes verificados; las clases se cobran aparte),
   pero **el marketplace de profesores es Bloque 2 (aún no existe)**. ¿Se abre la
   venta de Premium antes de que exista el marketplace? El copy final necesita
   visto bueno de CLO/CMO para no prometer algo inexistente.
4. **Textos legales/consentimiento (CLO):** T&C, Aviso de Privacidad (integral +
   simplificado), Política de Reembolsos y los textos de consentimiento
   (registro, menores, marketing/analítica/grabación). Los puntos de inserción
   están listos (item 6). ¿Cuándo llegan?
5. **Vigencia de la liga del tutor:** la dejé en **7 días**. ¿Está bien, o
   prefieres otra ventana?
6. **Cuentas existentes sin fecha de nacimiento:** el gate de checkout las manda a
   completar su fecha, pero **no construí una UI de edición de fecha en el perfil**
   (fuera del alcance explícito, y hoy no hay compras reales: venta cerrada, 0
   licencias). Si quieres que las cuentas previas puedan comprar, hace falta ese
   pequeño formulario — dímelo y lo agrego.
