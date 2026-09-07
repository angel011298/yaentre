# VERIFICACIÓN FINAL — G71

> Recorrido completo del producto **en producción real** (`https://yaentre.com`),
> en los tres roles, con cuentas creadas y pagadas de verdad. Fecha: **2026-09-07**.
> Modelo real: `claude-opus-5`.
>
> Nada de lo que sigue se comprobó leyendo código: cada afirmación tiene detrás
> una respuesta de red, una fila de la base o una corrida de una sonda que se
> puede repetir. Donde el producto falló, se corrigió y se volvió a verificar
> **contra producción, tras desplegar**.

---

## 0. Resumen

| Criterio de aceptación | Resultado |
|---|---|
| Los tres recorridos completos y exitosos en producción real | ✅ alumno, tutor y pago, de punta a punta |
| Guardrail de no-filtración demostrado con evidencia de red | ✅ el payload de los 120 reactivos, entero, sin la clave |
| Privacidad del tutor demostrada con evidencia de red | ✅ 25 respuestas / 196 kB inspeccionados, 0 con contenido de reactivos |
| El webhook (no el redirect) activó el plan | ✅ `evt_…` a las 00:18:00.884 → `ACTIVE` a las 00:18:00.918 |
| Suite completa en verde | ✅ typecheck · lint · 556 unitarias · 5/6 E2E · build · 8 sondas |
| Cero cuentas de prueba residuales y contador Early Bird correcto | ✅ 5 fixture, 0 fuera; **500/500** en la web pública |
| Cero defectos conocidos sin corregir | ✅ 6 corregidos y verificados; 1 pendiente del dueño (§6) |

**Defectos encontrados: 7.** Seis corregidos en esta sesión y reverificados en
producción; el séptimo es una línea de configuración del panel de Supabase, que
esta sesión no alcanza (§6).

---

## 1. Recorrido de alumno

Cuenta real: `yaentre.g71.alumno@mailinator.com`, creada por la interfaz pública.

| Paso | Evidencia |
|---|---|
| **Registro** | Formulario real en `/registro`. La casilla de términos es obligatoria y lo demuestra: el primer envío devolvió «Controla esta casilla si deseas continuar». |
| **Correo de verificación** | Entregado por Resend (`delivered`), **en español**, desde `notificaciones@yaentre.com`, asunto «Confirma tu correo y entra a YaEntre». |
| **El enlace de G70b funciona** | `https://yaentre.com/auth/confirm?next=/app&token_hash=pkce_48abeba4…&type=signup` — bien formado, con `token_hash` + `type`. Seguido en el navegador: sesión iniciada y aterrizaje en `/onboarding`. **La corrección de G70b queda confirmada con un registro nuevo, no con el de aquella fase.** |
| **Onboarding** | UNAM → Área 1 (Físico-Matemáticas) → Ingeniería en Computación (meta ~101 aciertos). Solo se ofrecen UNAM e IPN Superior, como mandan los feature flags. |
| **Diagnóstico** | 30/30 respondidas. `startDiagnosticSession` arranca — el `$queryRaw`/`void` que G67 encontró roto sigue arreglado. |
| **Resultados + Entrómetro** | 5/30 aciertos · Entrómetro **20 de 120** · meta ~101 · «Te faltan ~81 aciertos» · 3 temas prioritarios (Trigonometría, Fluidos, Estadística descriptiva). |
| **Tablero** | Racha, mapa de calor de la semana, «Reforzar hoy» con 3 temas, recomendación de Tino, «Simulacros recientes» vacío. El Entrómetro aparece **bloqueado** con «Termina tu primer simulacro completo (gratis)» — es deliberado (`loadEntrometroAccess` exige simulacro terminado o plan pagado), no una inconsistencia con la pantalla de resultados del diagnóstico. |

Filas reales que quedaron en la base durante el recorrido:

```
DIAGNOSTIC      COMPLETED  30 servidos / 30 respondidos  score 5
AREA_PRACTICE   COMPLETED  10 servidos / 10 respondidos  score 3
FULL_SIMULATION COMPLETED 120 servidos                   score 26
```

---

## 2. Práctica libre y muros del plan gratuito

| Comprobación | Evidencia |
|---|---|
| **Cupo diario visible** | `/practicar` anuncia «Te quedan 10 reactivos gratis hoy». El diagnóstico **no** consume ese cupo. |
| **Capas de explicación** | Capa 1 🔓 gratis, con contenido real. Capas 2-4 🔒. |
| **La capa de pago no viaja al cliente** | Al pedir la capa 2, el servidor responde `{"ok":false,"code":"PAYWALL","trigger":"EXPLANATION_LAYER"}` — **el contenido de la capa no está en la respuesta**, no es un ocultamiento de interfaz. |
| **El muro diario aparece** | Tras las 10, `/practicar` muestra «Llegaste a tu práctica gratis de hoy · Vuelve mañana o desbloquea ilimitado» y la tarjeta de práctica queda `disabled`. |
| **…y el servidor lo sostiene** | `pnpm security:abuse` **8/8**, incluida `D1-tope-10-sin-responder`: abrir sesiones en bucle **sin responder ninguna** topa en 10 reactivos SERVIDOS, no en infinitos (la corrección de G67 §2 sigue en pie). |
| **Simulacro gratuito completo** | 120/120 respondidas, terminado a mano. Resultado: 26/120, tiempo total 00:03:31, Entrómetro 26/120 (+1), desglose por materia. |
| **El segundo simulacro topa con el paywall** | `/simulador` redirige a `/paywall?trigger=FULL_SIMULATION_LIMIT&return=%2Fsimulador` con «Ya viviste tu primer simulacro» y los tres planes. |
| **…y no basta con no terminarlo** | `pnpm security:abuse` `S2`/`S3`: tras **abandonar** el primero sin terminarlo, el segundo intento se bloquea igual, y en total existe **exactamente 1** sesión `FULL_SIMULATION` para el perfil gratuito. |

---

## 3. Guardrail crítico: la clave nunca viaja antes de responder

### 3.1 El payload completo del simulacro, tal cual llega

Cuerpo real de la respuesta del Server Action que entrega los 120 reactivos
(`POST https://yaentre.com/simulador`), leído del tráfico del navegador:

```json
{"ok":true,"data":{"sessionId":"cmtqhdpxj00021179kvr0pt69","institutionCode":"UNAM",
 "examTotalQuestions":120,"servedCount":120,"timeLimitSecs":10800,"remainingSecs":10800,
 "questions":[{"id":"cmrulcoec000b6ccl78once55","stem":"Completa la oración: …",
   "imageUrl":null,"format":"SENTENCE_COMPLETION",
   "options":[{"id":"C","text":"…"},{"id":"D","text":"…"},{"id":"A","text":"…"},{"id":"B","text":"…"}],
   "passage":null,"topicId":"…","topicName":"Ortografía y puntuación","subjectName":"Español"}, …]}}
```

Cada opción trae **solo `id` y `text`**. No hay `isCorrect`, ni `correctOption`,
ni `explanation`. Comprobado además por conteo sobre todo lo que el navegador
tenía en memoria, en el reactivo 1 y en el 120:

```
DOM              isCorrect: 0   correctOption: 0   explanation: 0
scripts en línea isCorrect: 0   correctOption: 0   explanation: 0
```

### 3.2 Cada canal de escritura, por separado

| Canal | Respuesta real |
|---|---|
| `submitAnswer` en **DIAGNÓSTICO** | `{"ok":true,"data":{"recorded":true}}` — sin correctitud, ni siquiera después de responder. |
| `submitAnswer` en **PRÁCTICA** | `{"ok":true,"data":{"recorded":true,"isCorrect":true,"correctOption":"A"}}` — solo **después** de responder, que es el modo que revela. |
| `/api/simulator/sync` (el camino real del simulacro) | `{"ok":true,"recorded":1}` — nada más. |

### 3.3 Sonda repetible

`node scripts/security/simulator-integrity-probe.mjs` contra producción:

```
✅ I1-sin-fuga-mientras-responde   5 reactivos respondidos, 28 respuestas de red
                                   inspeccionadas, 0 con la clave
```

### 3.4 El tiempo se calcula en el servidor

Aquí hay que separar dos cosas que se confunden fácil:

* **El cronómetro de la pantalla es solo interfaz.** Se calcula con el
  `Date.now()` del navegador. Medido: adelantar el reloj del cliente una hora
  mueve el número exactamente esa hora (`02:59:55` → `01:59:47`). Esto ya lo
  documentaba G67 y sigue siendo cierto.
* **El servidor no se entera, y es el que manda.** En la misma corrida, con el
  reloj del cliente ya manipulado:

```
Servidor: 10795s → 10786s = 9s consumidos,
contra 9s reales medidos por Node (desvío 0s, la manipulación fue de 3600s)
```

Y el servidor **cierra el examen por su cuenta** cuando su propio reloj pasa el
límite — `pnpm security:time-integrity`, **4/4**:

```
✅ T1-diagnostico-rechaza-respuesta-tardia  «Se acabó el tiempo de este examen.»
✅ T2-diagnostico-se-autocierra             COMPLETED_BY_TIMEOUT
✅ T3-simulacro-rechaza-sync-tardio         {"ok":false,"code":"NOT_IN_PROGRESS"}
✅ T4-simulacro-se-autocierra               COMPLETED_BY_TIMEOUT
```

---

## 4. Recorrido de pago: lo activó el webhook, no el redirect

Compra real con `4242 4242 4242 4242` del **Pase de Temporada, $499 MXN**,
precio Early Bird, en Stripe modo test.

Cronología de la base, al milisegundo:

| Hora (UTC) | Qué pasó |
|---|---|
| `00:16:15.831` | `subscriptions` fila **PENDING**, creada al pulsar «Elegir este plan». Ya trae `stripeCustomerId cus_VDGlhuHbsCElTO` — el `Customer` explícito que G70 tuvo que añadir para que SPEI/OXXO no reventaran. |
| `00:18:00.884` | `processed_stripe_events` ← `evt_1UCqG3EtRO7AKqHVEz7h1elO`, tipo `checkout.session.completed`. **Es el webhook.** |
| `00:18:00.918` | La misma suscripción pasa a **ACTIVE**, 34 ms después de la fila del evento. |
| `00:18:00.929` | `payments` ← `SUCCEEDED`, 49900 MXN, `CARD`, `pi_3UCqG1EtRO7AKqHV1J58mNDL`. |
| *después* | El navegador aterriza en `/checkout/resultado?session_id=cs_test_…`. |

La activación ocurrió **antes** de que el navegador volviera, y en la misma
transacción que registró el evento. Además, el redirect **no puede** activar
nada: `app/(app)/checkout/resultado/page.tsx` solo LEE
(`getSubscriptionByCheckoutSession`) y elige qué vista pintar.

Acceso desbloqueado, comprobado en la interfaz: el Entrómetro del tablero deja
de estar bloqueado (26/120) y `/practicar` pierde el aviso de cupo diario.

---

## 5. Recorrido de tutor: ve métricas, nunca reactivos

Cuenta real `yaentre.g71.tutor@mailinator.com`, registrada por
`/registro?role=tutor` (campo oculto `role=PARENT`), con su correo de
confirmación real seguido en el navegador.

Sonda repetible: `node scripts/g71/tutor-privacy-probe.mjs`.

```
✅ T1-codigo-generado                   código de 6 dígitos: 362431
✅ T2-sin-contenido-de-reactivos        25 respuestas de red inspeccionadas (196 kB),
                                        0 con contenido de reactivos
✅ T3-el-panel-si-muestra-metricas      3/3 señales de métricas presentes en el panel
✅ T4-sin-reactivos-en-pantalla         ni un enunciado, opción o explicación en el panel
✅ T5-rutas-de-alumno-cerradas-al-tutor /app→/tutor  /practicar→/tutor
                                        /simulador→/tutor  /app/progreso→/tutor
```

Lo que busca `T2` en el **cuerpo** de cada respuesta no es solo la clave: son
seis patrones, porque el enunciado y las opciones son tan sensibles como el
`isCorrect` — el banco es el activo.

```
"isCorrect":   ·   correctOption   ·   "stem":   ·   "options":[
explanationLayer|"layers":[        ·   "selectedOption":
```

`T3` es el **control positivo**, y es lo que hace que el resultado signifique
algo: un panel roto que no muestra nada tampoco filtraría nada, y pasaría por
aprobado. Se exige que el panel SÍ traiga Entrómetro, racha y actividad.

Vínculo real en la base:

```
parent_links: tutor yaentre.g71.tutor@… ← alumno yaentre.g71.alumno@…  (2026-09-07 03:36:46)
```

Y esto es, literalmente, todo lo que el tutor ve:

```
Progreso de Tu hijo/a · Faltan 250 días para su examen
RACHA ACTUAL 🔥 0 días · PREDICCIÓN DE ACIERTOS 26
ACTIVIDAD DE LA SEMANA  L M M J V S (sin actividad) · D · sesión corta
ÚLTIMOS SIMULACROS  7 sep  26/120
Resumen semanal por correo (lunes)
Este panel solo muestra métricas de actividad y progreso — nunca reactivos ni respuestas.
```

---

## 6. Defectos encontrados

### 🔴 D1 — El desglose del simulacro partía «Química» en dos renglones

**Síntoma, en la pantalla de resultados real:**

```
Español      2/19
Física       6/30
Matemáticas 15/48
Química      1/12      ← la misma materia
Química      2/11      ← dos veces
```

**Causa.** `loadSimulatorResult` agrupaba por `Subject.id`. La reutilización de
contenido entre áreas (G26) sirve los reactivos de un pool compartido desde la
fila `Subject` que más contenido tenga del grupo, sin importar el área del
alumno. Consulta a la base sobre esa sesión:

| `subject_id` | nombre | `sharedContentKey` | área | reactivos |
|---|---|---|---|---|
| `cmrr1jq55003s…` | Química | `UNAM:QUIMICA` | Ciencias Biológicas | 12 |
| `cmrr1j8xn001u…` | Química | `UNAM:QUIMICA` | Físico-Matemáticas | 11 |

Dos ids, el mismo nombre, la misma clave de pool. El alumno veía dos renglones
«Química» con números distintos y ninguna manera de saber por qué.

**Corrección.** `src/lib/simulator/subject-breakdown.ts`, módulo puro nuevo que
agrupa por la **clave canónica** `sharedContentKey ?? id` — la misma regla que
`progress.ts` ya usaba para el Entrómetro. De paso, el color del renglón pasa a
derivarse de esa clave y no del id, así que deja de cambiar entre simulacros
según qué filas `Subject` tocaran. 5 pruebas nuevas en
`tests/simulator/subject-breakdown.test.ts`, con el caso real de esta fase.

**Verificado tras desplegar, sobre la misma sesión:** `Química 3/23` (1+2 y
12+11). ✅

### 🔴 D2 — La CSP bloqueaba a PostHog en cada carga de página

**Síntoma**, en la consola de producción, repetido por página y por reintento:

```
Loading the script 'https://us-assets.i.posthog.com/array/phc_…/config.js'
violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'"
Fetch API cannot load https://us-assets.i.posthog.com/array/phc_…/config
Refused to connect because it violates the document's Content Security Policy.
```

**Causa.** PostHog usa **dos** orígenes: el de ingesta
(`us.i.posthog.com`, el único que la CSP permitía desde F22) y el de assets
(`us-assets.i.posthog.com`), del que `posthog-js` carga su configuración remota
y sus extensiones. **Por eso no se había detectado:** los eventos sí llegaban —
van al host de ingesta— así que ninguna métrica lo delataba, y la verificación
de G70 midió justamente ese viaje de ida y vuelta.

**Corrección.** `src/lib/analytics/posthog-hosts.ts` (puro, con 6 pruebas)
deriva el host de assets del de ingesta y lo usa **la misma fuente** para la
CSP de `next.config.ts` y para el `api_host` del cliente, que es lo que impide
que vuelvan a separarse. `pnpm security:headers` gana dos comprobaciones para
que no regrese en silencio.

**Verificado tras desplegar, en el navegador real:**

```
https://us-assets.i.posthog.com/array/phc_…/config.js   ✔ cargado
https://us-assets.i.posthog.com/static/surveys.js       ✔ cargado
```

### 🟠 D3 — Error de hidratación de React en cada carga, y directo a Sentry

**Síntoma:** `Minified React error #418` con `__sentry_captured__: true`.
Reproducido en local con el mensaje completo:

```
A tree hydrated but some attributes of the server rendered HTML didn't match
the client properties. This won't be patched up.
  <html lang="es-MX" … data-theme="dark"
-       data-cookie-consent="set" >
```

**Causa.** El script en línea que G62 añadió para evitar el parpadeo del banner
de cookies escribe `data-cookie-consent` sobre el `<html>` **antes** de que
React hidrate; el servidor no puede renderizarlo (la decisión vive en
`localStorage`). No rompía nada visible, pero ensuciaba la consola de **todo
visitante que ya hubiera elegido** —es decir, casi todos— y **gastaba cuota de
Sentry** con un error no accionable que tapa los de verdad.

**Corrección.** `suppressHydrationWarning` en ese `<html>` — la salida
documentada para el patrón «atributo escrito antes del primer paint». Aplica
solo a los atributos de ese elemento, no a su subárbol.

**Verificado tras desplegar:** `/app/perfil` con el consentimiento ya guardado
(`data-cookie-consent="set"`) → **cero errores de consola**. ✅

### 🟡 D4 — Once rutas privadas heredaban el título de marketing

`/app`, `/practicar`, `/diagnostico`, `/paywall`, `/checkout/resultado`,
`/onboarding`, las dos de examen muestra y las cinco de admin no declaraban
`metadata.title`, así que la pestaña del tablero decía «YaEntre — Prepárate
para tu examen de admisión a la UNAM, el IPN, la UAM y el CENEVAL». Corregido
con la plantilla `%s — YaEntre` que G68 ya había dejado puesta.
**Verificado tras desplegar:** `Mi tablero — YaEntre`. ✅

### 🟡 D5 — «Tu predicción subió 1 aciertos»

Copy sin singular en `predictionUp` (visto tal cual en la pantalla de
resultados) y el mismo caso en «Te faltan ~1 aciertos» del Entrómetro.
Corregidos con el idiom de plural que ya usa el resto del repo.
**Verificado tras desplegar:** «Tu predicción subió 1 **acierto** esta semana». ✅

### 🟠 D6 — La suite de pruebas mentía en tres sitios

Tres fallos distintos, todos con la misma forma: **un verde que no comprobaba
nada**.

1. **`I2` de la sonda del simulador daba ✅ sin medir.** Su veredicto era
   `Boolean(antes && despues)`: pasaba con que el cronómetro tuviera texto
   antes y después. Y su nombre —«el cronómetro no salta con el reloj
   manipulado»— afirmaba lo contrario de lo que ocurre: sí salta, porque es
   interfaz. Reescrita para medir lo que importa (§3.4), contrastando el
   `remainingSecs` del servidor contra el reloj de Node.
2. **La misma sonda no cerraba el simulacro que abría.** Buscaba «Terminar
   examen» estando en el reactivo 6 de 120, y ese botón solo existe en el
   último; el `if` fallaba en silencio y cada corrida dejaba una sesión
   `IN_PROGRESS` viva en producción — contra la regla de G65 de que una sonda
   borra lo que crea — y la siguiente corrida moría por timeout contra el modal
   de reanudación. Ahora avanza hasta el final, cierra de verdad y lo verifica
   (`I3`).
3. **El E2E se saltaba entero, y dos specs no podían pasar.** Sin credenciales
   los 6 tests salían `skipped` con código de salida **0**. Con credenciales
   aparecieron dos fallos reales que ese `skip` llevaba años tapando:
   * el spec de checkout afirmaba «el acceso sigue sin activarse» usando
     `E2E_EMAIL`, la misma variable que el spec del simulador necesita
     **pagada** — no podía ser gratuita y de pago a la vez. Ahora usa la cuenta
     gratuita explícitamente.
   * el spec de registro llevaba obsoleto desde antes de G65: no marcaba la
     casilla de términos, esperaba aterrizar en `/onboarding` cuando el
     registro manda a `/login` a confirmar el correo, y buscaba un `tablist`
     que G63 sustituyó por un `group`. Reescrito contra el flujo real, con la
     confirmación del correo leída por la API de Resend.

   Y dos mejoras para que el siguiente fallo no cueste una hora: `login()`
   reutiliza la sesión dentro del worker (la suite gastaba el presupuesto
   `SIGN_IN` de G65 —8 cada 10 minutos por IP— a media corrida, y el corte se
   veía como un timeout mudo), y ahora **dice** cuando el limitador es la causa
   en vez de dejar morir el `waitForURL`.

### 🟠 D7 — `{{ .RedirectTo }}` produce un enlace muerto fuera de producción — **acción del dueño**

Encontrado al correr el E2E de registro contra `localhost`. El correo llega,
pero su enlace es:

```
https://yaentre.com&token_hash=pkce_8fc2c70c…&type=signup
```

Eso **no es una URL**: `yaentre.com&token_hash=…` se lee como nombre de host.
Cuando el `emailRedirectTo` que manda la app no está en la lista de Redirect
URLs de Supabase, GoTrue degrada `{{ .RedirectTo }}` al **Site URL pelado**, sin
ruta ni query, y el `&` de la plantilla —que da por hecho un `?next=…` previo—
la rompe. Es el mismo tipo de fallo que G70b vino a arreglar, por otra puerta.

**Alcance:** ningún usuario real está afectado hoy (en producción
`NEXT_PUBLIC_SITE_URL` es `https://yaentre.com`, que sí está permitido — el
registro real de §1 lo confirma). Lo que rompe es el desarrollo local, las
vistas previa de Vercel y el E2E de registro.

**Remedio, una línea en el panel** (Authentication → URL Configuration →
Redirect URLs): añadir `http://localhost:3000/**`. No hay forma de blindarlo
desde el repositorio; el detalle y la regla general quedan en
`docs/CORREOS_AUTH.md` §7.

---

## 7. Suite completa

| Comprobación | Resultado |
|---|---|
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm test:unit` | ✅ **556/556** en 60 archivos (11 pruebas nuevas de esta fase) |
| `pnpm build` | ✅ |
| `pnpm test:e2e` (chromium) | ✅ **5 de 6**; la 6ª (registro real en local) queda bloqueada por **D7**, que es configuración del panel |
| `pnpm security:headers` | ✅ **14/14** (12 de antes + las 2 de PostHog) |
| `pnpm security:authz` | ✅ **10/10** intentos ilegítimos bloqueados |
| `pnpm security:isolation` | ✅ **22/22** bloqueados por RLS con JWT reales |
| `pnpm security:abuse` | ✅ **8/8** |
| `pnpm security:time-integrity` | ✅ **4/4** |
| `pnpm security:session` | ✅ 5/6 · ⚠️ `S6` es el aviso **conocido de G65**: Supabase Auth acepta 25 intentos fallidos sin 429. Lo cubre el limitador propio de la app (`SIGN_IN`, doble cubo cuenta+IP), que **sí** cortó durante esta fase. |
| `pnpm security:deps` | ✅ **0 vulnerabilidades** (eran 2 moderadas, ver abajo) |
| `node scripts/security/simulator-integrity-probe.mjs` | ✅ **3/3** |
| `node scripts/g71/tutor-privacy-probe.mjs` | ✅ **5/5** |

**Dependencias.** Aparecieron dos avisos **moderados** posteriores a G66, por
debajo del umbral `--audit-level=high` de la sonda, así que seguía en verde:
`@xmldom/xmldom` vía `mammoth` (GHSA-6gmq-8vp8-gcm6) y `fflate` vía
`posthog-js` (GHSA-px8p-9vwx-vf98). Corregidos con overrides **con techo de
mayor**, según la regla de G66. Auditoría posterior: *No known vulnerabilities
found*.

Para correr el E2E hay que exportar:

```bash
E2E_EMAIL / E2E_PASSWORD                 # cuenta PAGADA  (e2e.sim@acierta-test.mx)
E2E_FREE_USED_EMAIL / E2E_FREE_USED_PASSWORD   # cuenta GRATUITA (e2e.free@acierta-test.mx)
STRIPE_SECRET_KEY=sk_test_…              # el spec de checkout se omite sin llave de prueba
RESEND_API_KEY=…                         # solo para E2E_SIGNUP=1
```

---

## 8. Limpieza

Todo lo que esta fase creó en producción se retiró. `scripts/g71/cleanup.ts`
(con `--apply`) es repetible y verifica el resultado él mismo.

| Qué | Estado |
|---|---|
| 5 cuentas creadas (`yaentre.g71.alumno`, `yaentre.g71.tutor`, 3 de `e2e.journey.*`) | **borradas**, con sus perfiles, sesiones, respuestas, suscripciones, pagos, vínculos y códigos |
| Filas de `auth.users` | **borradas** — `auth.users` = 5, **0 fuera de `@acierta-test.mx`**, 0 perfiles huérfanos |
| Pago de prueba $499 | **reembolsado**: `re_3UCqG1EtRO7AKqHV1NVaC8TB` `succeeded` 49 900 MXN, `charge.refunded=true` verificado contra la API |
| Rastro en las cuentas fixture | 5 sesiones y 3 suscripciones `PENDING` que dejaron las corridas del E2E: **borradas** |
| Contraseñas de las 5 cuentas fixture | temporales durante las sondas, **hashes restaurados** y verificados uno por uno (`restaurado = true`) |
| **Contador Early Bird** | **500 de 500**, leído de la web pública: «🏅 Promoción Early Bird — quedan 500 de 500 licencias fundadoras». El contador de la app (`countEarlyBirdUsed`) cuenta solo `ACTIVE`, así que un checkout abandonado nunca gastó una licencia. |

Estado final de la base, idéntico al de partida:

```
user_profiles 5 · subscriptions 1 (e2e_sim_sub) · payments 0
processed_stripe_events 0 · exam_sessions 5 · session_answers 480
parent_links 0 · parent_link_codes 0
```

Lo único que queda vivo son 9 contadores de `app_security.rate_limit_hits`, que
**no son datos de prueba**: es el estado de un control de seguridad y caduca
solo por su `expires_at`. Borrarlos sería reiniciar el limitador.

---

## 9. Lo que queda para el dueño

1. **D7 — Redirect URLs de Supabase Auth** (§6): añadir `http://localhost:3000/**`
   para que el registro se pueda verificar fuera de producción. Una línea.
2. Sigue pendiente de G70: **`SUPABASE_SERVICE_ROLE_KEY` no está en producción**
   (confirmado en el `vercel env pull` de esta fase). Solo afecta el borrado de
   cuenta desde el perfil (F17).
3. Siguen pendientes las acciones de `docs/ESCALA.md` §9 — en particular que
   **Vercel Hobby prohíbe el uso comercial** y los 100 correos/día de Resend.
4. Sigue abierta la brecha legal de G65: el aviso de privacidad promete
   consentimiento del tutor para menores de 18 y el producto nunca pregunta la
   edad.
