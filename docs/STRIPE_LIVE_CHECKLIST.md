# Stripe — checklist de activación (G6)

> Generado en la fase G6. Cubre dos cosas: (1) lo que falta para dejar el
> **modo de prueba** funcionando de punta a punta, y (2) los pasos que el
> **dueño del producto** debe hacer personalmente para activar el **modo
> real (live)**. Nada de lo que hay aquí requiere tocar código — son
> acciones de cuenta/negocio en dashboard.stripe.com y vercel.com.

---

## Estado tras G70 (2026-09-06) — modo PRUEBA activo y verificado

El **modo de prueba ya funciona de punta a punta en producción**. Verificado
con una compra real de Pase de Temporada ($499, tarjeta `4242 4242 4242
4242`) en `https://yaentre.com`: Checkout hospedado → `checkout.session.completed`
→ webhook → `subscriptions` fila `ACTIVE` en la base real, `payments`
`SUCCEEDED`, `processed_stripe_events` con el `evt_…` (idempotencia + firma OK).

Lo que G70 cargó / creó / corrigió:

- **En Vercel producción:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (todas `sk_test_`/`pk_test_`/`whsec_`)
  y los **9 `STRIPE_PRICE_*`**.
- **9 Price en Stripe** (`pnpm stripe:setup-prices`), idempotentes por
  `lookup_key`, producto por Price con nombre `YaEntre — {plan} ({temporada})`,
  montos PRD §9. La cuenta estaba vacía — no había productos «Acierta» que
  renombrar.
- **Webhook `we_1UC7dtEtRO7AKqHVNqAA6eMU`** (`https://yaentre.com/api/webhooks/stripe`):
  el dueño lo creó con 3 eventos; G70 agregó por API el 4º que enruta
  `src/lib/stripe/webhook.ts` → **`checkout.session.async_payment_failed`**
  (OXXO/SPEI que expira sin pago). Los 4 ahora: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `customer.subscription.deleted`.
- **🔴 Bug de código corregido — `app/actions/checkout.ts`:** el primer
  checkout real lanzó `The payment method 'customer_balance' requires
  'customer' to be set`. `customer_creation: 'always'` NO basta para SPEI
  (`customer_balance`): en `mode: 'payment'` ese Customer se materializa al
  completarse el pago y Stripe lo exige antes. Ahora se crea el `Customer`
  explícito para los pagos únicos (pase/premium) y se pasa `customer` en vez
  de `customer_email`. Sin esto, **cualquier compra de pase o premium falla**.

**Pendiente de G70 — CERRADO en G70b (2026-09-06):**

1. ~~Borrar la cuenta de prueba y reembolsar el pago.~~ **HECHO.**
   - **Reembolso:** `re_3UCa5HEtRO7AKqHV1kfAeU8k` · `succeeded` · 49 900 MXN
     sobre `pi_3UCa5HEtRO7AKqHV1HAD0r4w`; verificado en la API:
     `charge.refunded = true`, `amount_refunded = 49900`. Ejecutado con
     `scripts/g70b-stripe-refund.ts`, que **se niega a correr con una llave
     que no sea `sk_test_`** y es idempotente (si ya está reembolsado, no
     hace nada).
   - **Base de datos:** borrada la cuenta `yaentreg701788677536@uberip.com`
     con su `user_profile`, su `subscription`, su `payment` y su
     `processed_stripe_event`. **Contador Early Bird de vuelta en 500/500.**
   - **NO se borró** el `Customer` de Stripe `cus_VD04yqIo776yUE`: en modo
     prueba no ensucia contabilidad y borrarlo destruiría la trazabilidad
     del reembolso. Si molesta, se borra a mano desde el dashboard.
2. La sección 2 de abajo (modo **live**) sigue igual — nada de G70 la
   adelanta. Cuando actives live, `pnpm stripe:setup-prices` con la
   `sk_live_` recrea los 9 Price, y el webhook live se crea a mano con los
   **4** eventos de arriba.

---

## Cómo abrir la venta (G98) — el orden importa

> **Desde G98 la venta tiene un interruptor del lado del SERVIDOR**
> (`src/lib/stripe/sales-switch.ts` + `src/lib/stripe/sales-gate.ts`).
> Mientras esté cerrado, `startCheckoutAction` rechaza con `SALES_CLOSED`
> **antes** de llamar a Stripe y **antes** de crear la `Subscription` PENDING
> que descuenta una licencia Early Bird. Esconder el botón no cierra nada: la
> Server Action se invoca con un `fetch`. El interruptor es lo que cierra.
>
> Reglas del interruptor:
> - Abierta **solo** si `SALES_OPEN === 'true'`. Ausente o cualquier otro
>   valor = cerrada. **El default seguro es cerrado**: olvidar la variable no
>   puede abrir la caja.
> - En **producción** (`VERCEL_ENV === 'production'`), además, la llave de
>   Stripe tiene que ser de **modo real** (`sk_live_` / `rk_live_`).
>   `SALES_OPEN=true` en producción con llave de prueba **no abre**: queda
>   cerrada y dispara `reportControlFailure('sales_gate', 'fail-closed', …)`
>   en Sentry como configuración inconsistente.
> - Fuera de producción (preview, local) basta con `SALES_OPEN=true`: es el
>   único modo de ensayar el flujo completo contra Stripe de prueba.

Los cinco pasos, **en este orden**. Saltarse el orden no "adelanta" nada: el
paso 3 no tiene efecto sin el 1, y el 5 no se puede hacer sin el 4.

### 1. Llaves, precios y webhook en modo real

Todo lo de la **sección 2** de este documento (2.1 → 2.4): cuenta activada en
Stripe, `sk_live_`/`pk_live_`, los 9 Price recreados en modo live
(`pnpm stripe:setup-prices` con la llave live), el webhook live creado a mano
con los **4** eventos, y las variables **reemplazadas** en Vercel producción.

**Por qué va primero:** con llave de prueba en producción el interruptor se
niega a abrir. No es un orden sugerido — es el orden que el código impone.

### 2. Proyecto en un plan de Vercel que permita uso comercial

El plan **Hobby prohíbe el uso comercial** (bloqueador identificado en G72,
`docs/VEREDICTO_LANZAMIENTO.md`). Cobrar dinero real desde un despliegue
Hobby es una violación de los términos de Vercel, no un detalle de facturación.

Ángel abrirá la **prueba Pro de 14 días** al abrir ventas, de modo que el reloj
de la prueba empiece a correr cuando ya haya algo que vender — no antes.

**Por qué va antes de `SALES_OPEN=true`:** el interruptor no sabe en qué plan
está el proyecto; nadie lo va a comprobar por ti en el momento de la primera
compra.

### 3. `SALES_OPEN=true` en Vercel producción

```bash
npx vercel env rm SALES_OPEN production
npx vercel env add SALES_OPEN production   # escribe exactamente: true
```

Con `SALES_OPEN` ausente la venta también está cerrada, así que dejar la
variable puesta en `false` no es obligatorio — pero sí es preferible: una
variable presente y explícita se ve en el panel, y una ausente se confunde con
un olvido.

### 4. Redeploy

```bash
npx vercel --prod --yes
```

Las variables de entorno se resuelven **en el build/runtime del despliegue**:
cambiarlas sin redesplegar no cambia lo que sirve producción.

Después del redeploy, comprobar **por efecto**, no por el panel: abrir
`/paywall` con una cuenta fixture y ver el botón «Elegir este plan» en lugar
de «🔒 La preventa abre pronto». Si sigue cerrado con `SALES_OPEN=true`, la
llave no es live — y hay un evento `sales_gate` en Sentry diciéndolo.

### 5. Compra real con tarjeta propia, y reembolso

Es el paso 2.5 de este documento, y sigue siendo obligatorio: **una** compra
real con una tarjeta real (el plan más barato, Mensual) para confirmar que el
cargo llega, que el webhook activa el plan en la base, y que el depósito queda
programado. Reembolsarla después desde
[dashboard.stripe.com/payments](https://dashboard.stripe.com/payments).

Verificar el efecto en la base, no solo en Stripe:

```bash
pnpm tsx --tsconfig scripts/tsconfig.perf.json scripts/g98/billing-census.ts
```

Debe aparecer esa compra como **NO fixture** (es la primera legítima) con su
`payment`. A partir de ese momento el censo de G98 deja de servir como
condición de parada "cero filas reales" — eso era una propiedad de la etapa
pre-venta, no un invariante del producto.

### Cerrar la venta otra vez

Simétrico y sin despliegue de código: `SALES_OPEN=false` (o borrar la
variable) + redeploy. Las suscripciones ya activas **no se tocan**: el
interruptor solo gobierna el INICIO de una compra nueva. El webhook sigue
procesando los pagos asíncronos (OXXO/SPEI) que ya estaban en curso.


---

## 0. Decisión de cuenta (G6)

**Cuenta de Stripe separada y dedicada a YaEntre**, no la cuenta existente
del dueño (si la tiene, para otro proyecto). Razones:

- **Contabilidad y depósitos limpios por proyecto**: los payouts de Stripe
  van a la cuenta bancaria vinculada a esa cuenta específica de Stripe; mezclar
  proyectos en una sola cuenta obliga a reconciliar manualmente qué depósito
  corresponde a qué producto.
- **Radio de blast separado**: una suspensión, disputa o revisión de riesgo
  en un proyecto no afecta el procesamiento de pagos del otro.
- **Facturación fiscal**: YaEntre cobra en MXN a clientes en México (tarjeta,
  OXXO, SPEI); si el otro proyecto tiene otra moneda/país, mezclar cuentas
  complica el registro fiscal.
- **Costo de la separación es cero**: Stripe no cobra por tener múltiples
  cuentas: es gratis crear una nueva.

Esta sesión (G6) **no creó la cuenta** — crear una cuenta nueva (con email,
verificación, datos del titular) es una acción que el dueño humano debe
hacer personalmente; no es algo que una sesión automatizada deba ejecutar.
Ver la sección 1 abajo para los pasos exactos.

---

## 1. Modo de PRUEBA — para dejarlo funcionando (bloqueado hoy)

El pipeline de código ya está listo (`scripts/setup-stripe-prices.ts`,
`scripts/setup-stripe-webhook.ts`, `src/lib/stripe/*`, webhook en
`app/api/webhooks/stripe`) — lo único que falta es una **llave real de
prueba**, que ninguna sesión automatizada puede generar (crear una cuenta o
generar credenciales no es algo que se automatice aquí).

1. **Crea la cuenta de Stripe** (si no existe una dedicada a YaEntre):
   [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
   No requiere verificación de identidad ni datos bancarios todavía — eso
   solo se pide al activar modo real (sección 2).
2. **Copia la llave secreta de PRUEBA**:
   [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
   → `sk_test_...`. También copia la publicable `pk_test_...`.
3. **Pégalas en `.env.local`** (nunca las compartas en el chat de una sesión
   de Claude Code — este proyecto bloquea explícitamente la lectura de
   `.env`/`.env.local` por diseño, ver `.claude/settings.json`):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. **Corre, en este orden:**
   ```bash
   pnpm stripe:setup-prices
   pnpm stripe:setup-webhook --url https://acierta.vercel.app
   ```
   El primero crea los 9 Price (3 planes × 3 temporadas, montos del PRD §9) y
   actualiza `.env.example`. El segundo crea el webhook de prueba apuntando a
   `https://acierta.vercel.app/api/webhooks/stripe` y guarda el
   `STRIPE_WEBHOOK_SECRET` resultante **directamente en Vercel** (variable de
   entorno de producción) sin imprimirlo en ninguna terminal.
5. **Sube también a Vercel** (producción) `STRIPE_SECRET_KEY` y
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, y los 9 `STRIPE_PRICE_*` que el paso
   4 escribió en `.env.example`:
   ```bash
   npx vercel env add STRIPE_SECRET_KEY production
   npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   # repetir para cada STRIPE_PRICE_* (9 variables)
   ```
   Esta sesión (G6) no pudo hacer este paso: los valores viven únicamente en
   `.env.local`, que esta sesión tiene explícitamente bloqueado para lectura
   — es una barrera de seguridad deliberada del proyecto, no un olvido.
6. **Redeploy** para que el runtime recoja las variables nuevas:
   ```bash
   npx vercel --prod --yes
   ```
7. **Prueba de extremo a extremo** (tarjeta de prueba de Stripe
   `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC): entra a
   `https://acierta.vercel.app`, regístrate, completa un checkout, confirma
   que `/checkout/resultado` muestra éxito y que la `Subscription` en la DB
   real quedó `ACTIVE` (el webhook, no el redirect, es quien la activa — ver
   CLAUDE.md, regla de oro).

**Nota:** esta app en Vercel hoy corre sin las variables de Supabase/DB en
producción tampoco (mismo bloqueo de lectura de `.env.local`) — sin ellas,
el registro/login y el checkout no pueden completarse aunque Stripe ya
tenga llaves reales. Súbelas junto con las de Stripe en el paso 5
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`).

---

## 2. Modo REAL (live) — SOLO el dueño humano

Esto es lo único que ninguna sesión de Claude Code debe intentar: activar
cobros reales exige verificación de identidad y datos bancarios del titular
ante Stripe. Pasos exactos:

### 2.1 Activar la cuenta en Stripe

1. En [dashboard.stripe.com](https://dashboard.stripe.com), banner
   **"Activate your account"** (o Configuración → Cuenta → Activar pagos).
2. Datos que Stripe va a pedir (ten esto a mano antes de empezar):
   - Tipo de entidad (persona física con actividad empresarial / persona
     moral) y RFC.
   - Domicilio fiscal.
   - CLABE interbancaria de la cuenta donde quieres recibir los depósitos.
   - Identificación oficial vigente (INE/pasaporte) para verificación de
     identidad del representante.
   - Descripción del negocio/producto (YaEntre: plataforma educativa de
     preparación para examen de admisión).
3. Confirma que **OXXO** y **SPEI** están habilitados como métodos de pago
   para MXN: Configuración → Métodos de pago. Por default para cuentas
   mexicanas suelen venir disponibles, pero verifícalo — el checkout de
   YaEntre (F8) los usa para pase/premium.
4. Stripe revisa la solicitud (usualmente minutos a un par de días hábiles).
   Mientras está "en revisión", el modo de prueba sigue funcionando sin
   límite — no bloquea nada de lo de arriba.

### 2.2 Llaves reales

5. Con la cuenta activada, cambia el dashboard a modo **Live** (toggle
   arriba a la derecha) y copia:
   [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
   → `sk_live_...` y `pk_live_...`.

### 2.3 Precios y webhook en modo live

6. Los 9 Price de prueba **no existen en modo live** — Stripe separa
   completamente los datos de ambos modos. Vuelve a correr, con la llave
   live:
   ```bash
   # en .env.local, temporalmente:
   STRIPE_SECRET_KEY=sk_live_...
   pnpm stripe:setup-prices
   ```
7. El webhook también es exclusivo por modo. `scripts/setup-stripe-webhook.ts`
   se niega a correr con una llave que no empiece con `sk_test_` (guardrail
   a propósito — no está pensado para automatizar la creación del webhook
   live). Créalo a mano:
   [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   → "Add endpoint" → URL = `https://<tu-dominio-real>/api/webhooks/stripe`
   (ver sección 3 sobre qué URL usar) → eventos:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `customer.subscription.deleted`
   (mismos 4 que `src/lib/stripe/webhook.ts` enruta). Copia el signing
   secret (`whsec_...`) que Stripe muestra **una sola vez**.

### 2.4 Variables de entorno en Vercel (producción)

8. Reemplaza (no dupliques) los valores de prueba por los de live:
   ```bash
   npx vercel env rm STRIPE_SECRET_KEY production
   npx vercel env add STRIPE_SECRET_KEY production        # pega sk_live_...
   npx vercel env rm STRIPE_WEBHOOK_SECRET production
   npx vercel env add STRIPE_WEBHOOK_SECRET production    # pega el whsec_ del paso 7
   npx vercel env rm NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   # + los 9 STRIPE_PRICE_* nuevos del paso 6
   ```
9. Redeploy (`npx vercel --prod --yes`).

### 2.5 Verificación con dinero real (antes de anunciar el lanzamiento)

10. Haz UNA compra real con una tarjeta real tuya (el plan más barato,
    Mensual) para confirmar que el cargo real llega, el webhook activa el
    plan en la DB, y el depósito aparece programado en Stripe. Cancela/
    reembolsa esa suscripción de prueba después
    ([dashboard.stripe.com/payments](https://dashboard.stripe.com/payments)).

---

## 3. Dominio — ya conectado, ver actualización (G12)

> **Actualización (G12, 2026-08-25):** esta sección quedó resuelta por R6→R8
> — se conserva el texto original abajo como registro histórico de lo que
> estaba pendiente en G6, pero **ya no aplica tal cual**. `yaentre.com` está
> en producción real desde R8 (25-ago-2026), con SSL válido (Let's Encrypt),
> y `NEXT_PUBLIC_SITE_URL` ya apunta ahí. **Cuando actives Stripe (prueba o
> real), configura el webhook directo contra
> `https://yaentre.com/api/webhooks/stripe` desde el principio** — no hace
> falta el paso de "crear en `.vercel.app`, migrar después" que describe el
> resto de esta sección; `https://acierta.vercel.app` sigue funcionando como
> respaldo si algún día hace falta, pero ya no es la URL primaria.

Texto original de G6, para referencia histórica (el dominio SÍ ya está
conectado, a diferencia de lo que decía aquí):

Hoy el webhook (prueba y, cuando lo actives, live) apunta a
`https://acierta.vercel.app/api/webhooks/stripe`, que sigue siendo la URL real
de producción. **El dominio ya no está pendiente de compra: `yaentre.com` se
adquirió el 21 de agosto de 2026 en Akky** (orden `20260821697888`, 1 año); lo
que falta es apuntarlo a Vercel por DNS (fase R6). **Cuando el dominio se
conecte a Vercel:**

1. Crea un webhook NUEVO apuntando a `https://<tu-dominio>/api/webhooks/stripe`
   (test y/o live, según cuál esté activo en ese momento) — no basta con
   editar la URL del webhook existente en el dashboard de Stripe si cambia
   de dominio raíz; es más simple y menos propenso a error borrar y recrear.
   Para modo prueba: `pnpm stripe:setup-webhook --url https://<tu-dominio> --force`.
2. Actualiza `STRIPE_WEBHOOK_SECRET` en Vercel con el nuevo signing secret
   (Stripe genera uno distinto por cada endpoint).
3. Borra el webhook viejo apuntando a `*.vercel.app` en el dashboard de
   Stripe una vez confirmado que el nuevo recibe eventos correctamente.
4. Actualiza `NEXT_PUBLIC_SITE_URL` en Vercel al dominio real (usado para
   construir links de verificación/recuperación de Supabase — ver
   `.env.example`).

Es un cambio de un campo por endpoint, tal como se anticipó al inicio de
esta fase — no bloquea nada de lo de arriba mientras tanto.
