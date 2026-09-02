# AUDITORÍA DE SEGURIDAD — YaEntre (G65)

**Fecha:** 2026-09-01 · **Alcance:** aplicación completa (Server Actions, Route
Handlers, RLS, sesiones, secretos, cabeceras, datos de menores).
**Modelo real de la sesión:** `claude-opus-5`.
**No se tocó `prisma/schema.prisma`** (guardrail de CLAUDE.md).

> **Por qué esta fase pesa distinto.** El producto trata datos de personas de
> 15-22 años —muchas menores de edad— y cobra pagos reales. Una fuga aquí no es
> un incidente técnico: bajo la LFPDPPP el responsable del tratamiento es la
> empresa, y los datos de menores agravan la sanción. Por eso todo lo que dice
> este documento se **probó ejecutándolo**, no leyendo código: hay cuatro sondas
> repetibles (`pnpm security:*`) y una verificación en navegador real.

---

## 0. Resumen

| | |
|---|---|
| Server Actions auditadas | **37** (100 %, lista completa en §1) |
| Route Handlers auditados | **8** (100 %) |
| Hallazgos | **14** — 3 🔴 · 5 🟠 · 4 🟡 · 2 🔵 |
| Corregidos en esta fase | **12** |
| Pendientes del dueño (no ejecutables por código) | **2** |
| Sondas activas nuevas | 4 (`security:isolation`, `authz`, `session`, `ratelimit`) + `security:headers` + verificación en navegador |
| Intentos ilegítimos bloqueados tras el arreglo | **22/22** (RLS) · **10/10** (aplicación) |

### Los tres 🔴

1. **La clave de respuestas se podía extraer durante el simulacro**
   (`submitAnswer` aceptaba reactivos de otra sesión). Rompía el guardrail #1
   de CLAUDE.md. **Reproducido en vivo antes de corregir.**
2. **Cero protección contra fuerza bruta en autenticación.** Login, registro y
   recuperación son Server Actions, y el único límite del proyecto cubría
   `/api`… y además **no funcionaba en producción** (medido: 70 peticiones sin
   un solo 429).
3. **El código de vinculación parental era forzable.** 6 dígitos, 10 minutos,
   canjes ilimitados y generado con `Math.random()`. Es la llave al tablero de
   un menor.

---

## 1. Autorización — inventario completo

Cada Server Action y Route Handler, con sus tres controles: **sesión**,
**validación de entrada** y **propiedad del recurso**.

### 1.1 La regla estructural que hace verificable la propiedad

En este código el `userProfileId` **nunca cruza el borde cliente→servidor**:
sale siempre del guard (`requireUser()` → `profile.id`) y se pasa como
argumento a la capa DB. Por eso funciones como `updateDisplayName(profileId,…)`
o `buildUserDataExport(profileId,…)` no re-verifican nada: no pueden recibir un
id ajeno porque ninguna entrada lo acepta.

Esa premisa **se comprueba automáticamente**, no se asume: `pnpm security:authz`
recorre los 19 archivos de borde y falla si algún esquema Zod declara
`userProfileId`, `studentProfileId`, `parentProfileId`, `authUserId` o `userId`.
Hoy: **0 de 19**. La única excepción es `counterpartProfileId` de la
desvinculación, y ésa sí se verifica contra quien llama (§7.2).

Donde el identificador **sí** viene del cliente (`sessionId`, `questionId`,
`careerId`, `?student=`), hay una comprobación de propiedad explícita, listada
en la tabla.

### 1.2 Tabla

| Archivo | Función | Guard de sesión | Validación | Límite de tasa |
|---|---|---|---|---|
| `actions/account.ts` | `deleteAccountAction` | requireUser | manual + confirmación por correo exacto | — |
| `actions/admin-questions.ts` | `approveQuestionAction` | requireRole(ADMIN) | Zod | — |
| `actions/admin-questions.ts` | `approveWithOptionAction` | requireRole(ADMIN) | Zod | — |
| `actions/admin-questions.ts` | `rejectQuestionAction` | requireRole(ADMIN) | Zod | — |
| `actions/admin-questions.ts` | `updateQuestionAction` | requireRole(ADMIN) | Zod + `validateDraft` | — |
| `actions/admin-questions.ts` | `resolveReportsAction` | requireRole(ADMIN) | Zod | — |
| `actions/auth.ts` | `signUpAction` | (público) | Zod | **sí (G65)** |
| `actions/auth.ts` | `signInAction` | (público) | Zod | **sí (G65)** |
| `actions/auth.ts` | `signOutAction` | (público) | sin entrada | — |
| `actions/auth.ts` | `forgotPasswordAction` | (público) | Zod | **sí (G65)** |
| `actions/auth.ts` | `updatePasswordAction` | sesión de recuperación | Zod | **sí (G65)** |
| `actions/auth.ts` | `resendVerificationAction` | sesión Supabase | sin entrada | **sí (G65)** |
| `actions/billing.ts` | `cancelMonthlySubscriptionAction` | requireUser | sin entrada | — |
| `actions/checkout.ts` | `startCheckoutAction` | requireVerifiedForPurchase | Zod | — |
| `actions/drill.ts` | `startDrillAction` | requireUser | Zod | (muro suave F9) |
| `actions/drill.ts` | `revealExplanationLayerAction` | requireUser | Zod | **propiedad G65** |
| `actions/drill.ts` | `reportQuestionAction` | requireUser | Zod | **sí (G65)** |
| `actions/onboarding.ts` | `selectExamAction` | requireUser | manual + revalida contra DB | — |
| `actions/onboarding.ts` | `selectAreaAction` | requireUser | manual + `area.examId == perfil` | — |
| `actions/onboarding.ts` | `selectCareerAction` | requireUser | manual + `career.area.examId == perfil` | — |
| `actions/onboarding.ts` | `startDiagnosticAction` | requireUser | sin entrada | — |
| `actions/onboarding.ts` | `postponeDiagnosticAction` | requireUser | sin entrada | — |
| `actions/parent.ts` | `generateLinkCodeAction` | requireUser + rol STUDENT | sin entrada | **sí (G65)** |
| `actions/parent.ts` | `linkStudentAction` | requireRole(PARENT) | Zod | **sí (G65, doble cubo)** |
| `actions/parent.ts` | `unlinkParentStudentAction` | requireUser | Zod + propiedad del vínculo | — |
| `actions/parent.ts` | `toggleWeeklyEmailAction` | requireRole(PARENT) | Zod | — |
| `actions/profile.ts` | `updateDisplayNameAction` | requireUser | Zod | — |
| `actions/profile.ts` | `updateThemeAction` | requireUser | Zod | — |
| `actions/profile.ts` | `updateNotificationPrefAction` | requireUser | Zod (whitelist de tipos) | — |
| `actions/profile.ts` | `updateTargetCareerAction` | requireUser | Zod + carrera del área propia | — |
| `actions/profile.ts` | `changePasswordAction` | requireUser | Zod | **sí (G65) + contraseña actual** |
| `actions/profile.ts` | `updateAvatarAction` | requireUser | Zod + URL de la carpeta propia | — |
| `actions/profile.ts` | `uploadAvatarAction` | requireUser | tipo MIME + tamaño + path derivado del uid | — |
| `actions/sessions.ts` | `submitAnswer` | requireUser | Zod | **propiedad reforzada G65** |
| `actions/sessions.ts` | `finishSession` | requireUser | Zod + `loadOwnedSession` | — |
| `actions/simulator.ts` | `startSimulationAction` | requireUser | sin entrada | (muro suave + lock) |
| `actions/simulator.ts` | `finishSimulationAction` | requireUser | Zod + `loadOwnedSession` | — |
| `api/account/export/route.ts` | `GET` | requireUser | sin entrada | **sí (G65)** |
| `api/adaptive/next-questions/route.ts` | `POST` | guardApiUser | Zod | **sí (G65)** |
| `api/adaptive/predict/route.ts` | `POST` | guardApiUser | sin entrada | **sí (G65)** |
| `api/cron/notifications/route.ts` | `GET` | `CRON_SECRET` (timing-safe) | sin entrada | exento (scheduler) |
| `api/cron/reconcile-payments/route.ts` | `GET` | `CRON_SECRET` (timing-safe) | sin entrada | exento (scheduler) |
| `api/email/unsubscribe/route.ts` | `GET` | firma HMAC (público a propósito) | whitelist de tipos | **sí (G65)** |
| `api/simulator/sync/route.ts` | `POST` | requireUser | Zod + propiedad de la sesión | (idempotente) |
| `api/webhooks/stripe/route.ts` | `POST` | firma HMAC de Stripe | `constructEvent` | exento (reintentos legítimos) |

**Retirada en esta fase:** `actions/sessions.ts → startSession`. Abría una
sesión SIN reactivos y ningún cliente la usaba (el diagnóstico, la práctica y
el simulacro tienen su propio orquestador con `startSessionWithQuestions`). Era
un punto de escritura autenticado, sin uso y sin cuota. La superficie que no
existe no hay que auditarla.

### 1.3 Comprobaciones de propiedad que ya estaban bien

Verificadas ejecutándolas contra dos cuentas reales (`pnpm security:authz`):

- `loadOwnedSession` — punto único para `submitAnswer` / `finishSession`.
- `recordSimulatorSync` — `FORBIDDEN` si la sesión es de otro.
- `loadSimulatorResult` / `loadSimulatorReview` — `null` para el que no es dueño.
- `loadParentDashboardData` — exige la fila `ParentLink`; sin ella, `not_linked`.
- `/tutor?student=` — el id pedido se resuelve **contra la lista de vinculados**,
  nunca se usa tal cual.
- `updateTargetCareer` — la carrera nueva debe ser del área del alumno.
- `updateAvatarAction` — la URL debe empezar por la carpeta `auth.uid()` propia.

---

## 2. 🔴 La clave de respuestas se podía sacar durante el simulacro

**Estado: CORREGIDO.**

`submitAnswer` verificaba que la SESIÓN fuera tuya, pero aceptaba **cualquier**
`questionId` y creaba la fila con `upsert` si no existía. Y la política de
revelado se decide por el **modo de la sesión**
(`revealsCorrectnessOnSubmit`). Combinando ambas cosas:

1. el alumno abre su simulacro (`FULL_SIMULATION`, no revela) — el cliente ya
   tiene los 120 `questionId`, los necesita para pintarlos;
2. en otra pestaña abre una práctica libre (`AREA_PRACTICE`, **sí** revela);
3. llama a `submitAnswer` con el `sessionId` de la práctica y los
   `questionId` del simulacro.

Reproducido tal cual antes de corregir:

```
A-fuga-clave  ❌ PERMITIDO
   ↳ devolvió {"recorded":true,"isCorrect":true,"correctOption":"A"}
```

Y dejó rastro: la sonda encontró después una fila `SessionAnswer` con el
`questionId` del simulacro de otra cuenta insertada en la sesión de práctica
del atacante — la escritura que el `upsert` permitía.

**Arreglo** (`src/lib/db/sessions.ts`): el par (sesión, reactivo) tiene que
existir ya. Las tres sesiones reales pre-crean sus filas en
`startSessionWithQuestions` (G60), así que "la fila existe" es exactamente "este
reactivo se te asignó". El `upsert` pasa a ser un `update` condicionado — una
operación en vez de dos — y aparece `QUESTION_NOT_IN_SESSION`.

Efecto secundario cerrado: ya no se pueden inyectar respuestas de reactivos
nunca vistos, que contaminaban el historial propio y —vía `score`— el
**percentil que se calcula contra todas las sesiones del examen**, o sea el
resultado que ven los demás.

Tras el arreglo:

```
A-fuga-clave  ✅ BLOQUEADO
   ↳ rechazado: Este reactivo no forma parte de este examen.
```

Mismo criterio aplicado a `recordSimulatorSync` (el destino del `sendBeacon`):
el lote se filtra contra los reactivos asignados a la sesión.

---

## 3. 🟠 La explicación también filtraba la respuesta

**Estado: CORREGIDO.**

`revealExplanationLayer` aceptaba cualquier `questionId` sin contexto de
sesión, y la **capa 1 es gratis y dice cuál es la correcta**. Durante un
simulacro en curso:

```
A-fuga-explicacion  ❌ PERMITIDO
   ↳ {"ok":true,"data":{"layer":1,"title":"Aberración esférica",
       "content":"La aberración esférica es un defecto de enfoque que ocurre
       en espejos y lentes curvos, no en superficies planas."}}
```

**Arreglo:** solo se explica un reactivo que el alumno ya respondió, y en una
sesión que revela de todas formas — terminada (pantalla de repaso) o práctica
libre con la respuesta ya enviada (el flujo real de `DrillRunner`). Un reactivo
de un simulacro o diagnóstico **en curso** no cumple ninguna de las dos. Nuevo
código `NOT_ANSWERED` y el candado va **antes** del muro de pago: ni con plan
premium se abre.

> **Nota metodológica.** La primera re-corrida seguía marcando fuga: la sonda
> anterior —cuando el agujero existía— había dejado escrita una respuesta en una
> sesión abandonada, y esa fila cumplía la regla nueva. Era residuo propio, no
> un agujero. Se limpió y la sonda ahora **borra** sus sesiones al terminar en
> vez de abandonarlas.

---

## 4. 🟠 Aislamiento entre usuarios: probado, no leído

**Estado: verificado + endurecido.**

`pnpm security:isolation` inicia sesión **de verdad** con tres cuentas
(`rlsprobe.alumnoa`, `rlsprobe.alumnob`, `rlsprobe.tutor`) contra Supabase Auth
y, con el JWT real de cada una, ataca `/rest/v1` — la misma API que alcanza
cualquier navegador con la `NEXT_PUBLIC_SUPABASE_ANON_KEY` que va en el bundle.

**22/22 intentos ilegítimos bloqueados**, antes y después:

| Intento | Resultado |
|---|---|
| Leer perfil / sesiones / Entrómetro / temas débiles / racha / plan / preferencias / códigos de otro alumno | ✅ 0 filas |
| Listar `session_answers` global | ✅ 0 filas |
| **Leer `questions` (trae `options[].isCorrect`)** | ✅ 0 filas |
| Leer `explanation_layers` | ✅ 0 filas |
| **Auto-ascenderse a `role='ADMIN'`** | ✅ rechazado |
| Renombrar el perfil de otro | ✅ rechazado |
| **Fabricar un `parent_links` a un menor sin su código** | ✅ rechazado |
| Auto-activarse un plan PREMIUM sin pagar | ✅ rechazado |
| Auto-otorgarse insignias | ✅ rechazado |
| Fabricar un simulacro con `score: 999` | ✅ rechazado |
| Las mismas lecturas **sin sesión** | ✅ 0 filas |

### 4.1 …pero la defensa vivía en el sitio equivocado

Al investigar **por qué** se bloqueaban las escrituras, la respuesta no era la
política sino el catálogo de permisos: `anon` y `authenticated` tienen GRANT de
**SELECT y nada más** sobre `public`. Las políticas RLS estaban escritas
`FOR ALL`, así que su `WITH CHECK` autorizaba escrituras que solo el GRANT
detenía. Y `user_profiles` era el caso feo: el `WITH CHECK` ataba `userId`,
**no `role`** —

```sql
-- Lo que la política permitía, si alguien concediera UPDATE:
UPDATE user_profiles SET role='ADMIN' WHERE "userId" = auth.uid();
```

…es decir, panel de administración completo, con la clave de los 1 143
reactivos servibles dentro. Basta que alguien corra el
`GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated` que circula en media
documentación de Supabase para abrir esa puerta y las otras tres a la vez.

**Arreglo** (`0013_security_hardening_g65.sql`): las 11 políticas de datos de
usuario pasan de `FOR ALL` a **`FOR SELECT`**, y se retiran
`profile_insert` / `profile_update` / `profile_delete`. La app nunca escribe
estas tablas desde el navegador —todo pasa por Server Actions con Prisma
(`acierta_ci`, BYPASSRLS)—, así que **no cambia ningún comportamiento**: solo
deja de depender de un GRANT que nadie vigila. Confirmado: 22/22 siguen
bloqueados y la app funciona igual.

### 4.2 La capa de aplicación, atacada por dentro

RLS no protege a la app de sí misma: Prisma corre con BYPASSRLS. `pnpm
security:authz` llama a las **mismas funciones** que ejecuta cada Server Action
después de su guard, cambiando el identificador. **10/10 bloqueados:**

```
✅ atacante responde en la sesión de la víctima      → "Esta sesión no te pertenece."
✅ atacante cierra la sesión de la víctima           → "Esta sesión no te pertenece."
✅ atacante sincroniza en la sesión de la víctima    → {"ok":false,"code":"FORBIDDEN"}
✅ atacante abre el resultado de la víctima          → null
✅ atacante abre el repaso (con claves) de la víctima→ null
✅ perfil sin vínculo abre el panel del tutor        → {"kind":"not_linked"}
✅ tercero rompe un vínculo ajeno                    → false
✅ ningún esquema de borde acepta un id de usuario   → 0 de 19 archivos
✅ fuga de clave por reactivo cruzado                → rechazado
✅ fuga de clave por explicación                     → NOT_ANSWERED
```

---

## 5. 🔴 Protección contra abuso: existía y no servía

**Estado: CORREGIDO.**

### 5.1 Lo que se midió

- **Los puntos más sensibles no estaban cubiertos en absoluto.** Login,
  registro, recuperación de contraseña y canje del código parental son *Server
  Actions* — POST a la propia ruta. El limitador de F20 solo mira el prefijo
  `/api`, así que nunca los vio.
- **Y en `/api` tampoco funcionaba.** Contra producción, con el límite nominal
  en 60/min: **70 peticiones seguidas a `/api/adaptive/predict`, cero 429.** No
  es un bug del código: el contador vive en memoria del proceso Edge y Vercel
  reparte entre instancias, así que ninguna llega a 60.
- **Supabase Auth tampoco frena.** `pnpm security:session`: **25 intentos de
  login fallidos seguidos sin un solo 429** del servidor de Auth.

Las tres cosas juntas significan que adivinar la contraseña de una cuenta era
cuestión de dejar un script corriendo.

### 5.2 Lo que se construyó

Contador **compartido en Postgres** (`app_security.rate_limit_hits`, migración
0013), reclamado con un único `INSERT … ON CONFLICT DO UPDATE`: sin
leer-luego-escribir, sin condición de carrera entre lambdas.

Vive en el esquema `app_security` **a propósito**: Prisma solo diffea el
esquema por defecto, así que una tabla fuera de `public` es invisible para el
generador de migraciones y **no produce deriva** — que es lo que pasaría con
una tabla equivalente en `public`, dado que no se toca `schema.prisma`.

Presupuestos (`src/lib/rate-limit/store.ts`):

| Punto | Presupuesto | Cubos |
|---|---|---|
| Inicio de sesión | 8 / 10 min | correo **y** IP |
| Registro | 5 / hora | IP |
| Recuperación de contraseña | 4 / hora | correo **y** IP |
| Cambio de contraseña | 6 / hora | perfil (o IP en el flujo de recuperación) |
| Reenvío de verificación | 4 / hora | correo |
| **Canje de código parental** | **6 / 10 min** | perfil del tutor **y** IP (20) |
| Generación de código | 10 / 10 min | perfil del alumno |
| Reporte de reactivo | 20 / hora | perfil |
| Exportación de datos | 5 / hora | perfil |
| Baja de correo | 30 / hora | IP |
| Motor adaptativo | 60 / min | perfil |

Dos cubos donde importa, y **se consumen los dos**: rotar de cuenta no esquiva
el presupuesto de IP, y rotar de IP no esquiva el de la cuenta (eso último es
lo que atrapa el *password spraying*).

La IP se resuelve prefiriendo `x-vercel-forwarded-for` —la única cabecera que
pone la plataforma y el cliente no puede falsear— antes que `x-forwarded-for`
(`src/lib/rate-limit/client-ip.ts`, 6 pruebas). Si el atacante pudiera elegir
su propia "IP", cada intento caería en un cubo distinto y el límite por IP no
valdría nada.

**Si la base falla, el limitador deja pasar y lo registra.** Es una capa de
defensa, no el guard de autenticación: una caída de Postgres no debe convertir
un login legítimo en un 500.

### 5.3 Verificación (`pnpm security:ratelimit`)

```
✅ L1-corta-en-el-limite    8 permitidos de 11 intentos (presupuesto 8)
✅ L2-retry-after           el bloqueo informa Retry-After = 596 s
✅ L3-aisla-sujetos         el segundo sujeto sigue permitido
✅ L4-aisla-alcances        otro alcance del mismo sujeto sigue permitido
✅ L5-atomico-en-paralelo   30 llamadas concurrentes → contadores 1..30 sin colisiones
✅ L6-codigo-parental       6 intentos por ventana de 600 s ⇒ ≈ 1 entre 166 667
```

L5 es la prueba que el contador anterior no podía pasar: 30 llamadas **en
paralelo** contra el mismo cubo producen exactamente los contadores 1…30, sin
repetidos ni huecos.

El limitador en memoria de `proxy.ts` **se conserva** como primera línea barata
(sí frena una ráfaga que caiga en la misma instancia) con un comentario que
explica exactamente qué no hace, para que nadie vuelva a confiar en él.

---

## 6. 🔴🟠 Vinculación parental — la llave al tablero de un menor

**Estado: CORREGIDO (tres cosas).**

### 6.1 Fuerza bruta

Código de 6 dígitos (10⁶), vigencia 10 minutos, **canjes ilimitados**. Con
`PARENT_LINK_REDEEM` (6 por tutor y 20 por IP en esa misma ventana), la
probabilidad de acertar un código vivo cae a ≈ 1 entre 166 667 por ventana, y
el atacante ya no puede iterar.

### 6.2 `Math.random()` no servía para esto

El código salía de `Math.random()`, con este comentario: *"suficiente para un
código de un solo uso de corta vida (no es un secreto criptográfico de largo
plazo)"*. El argumento no se sostiene para **este** código: `Math.random()` en
V8 es xorshift128+, un PRNG **no criptográfico** cuyo estado interno se
reconstruye observando unas pocas salidas — y observarlas es trivial, porque
cualquiera puede registrarse como alumno y pedir todos los códigos que quiera.
Reconstruido el estado, los códigos que el mismo proceso genere para **otros**
alumnos son predecibles.

Ahora usa `crypto.randomInt` (entropía del sistema, uniforme, sin sesgo de
módulo). +2 pruebas.

### 6.3 No existía forma de desvincular

El aviso de privacidad (§8) prometía: *«Si tu tutor se desvincula: sus permisos
se revocan inmediatamente»*. **No había ninguna función de desvinculación en
todo el código.** Un código compartido con la persona equivocada dejaba el
tablero del menor abierto para siempre, salvo borrando la cuenta entera. Para
datos de un menor eso no es un hueco de producto: es incumplir el propio aviso
y el derecho de cancelación y oposición de la LFPDPPP.

Se añadió `unlinkParentStudentAction` + `unlinkParentStudent`, disponible para
**los dos lados**:

- el alumno, desde su perfil (`LinkedParentsCard`, con el correo del tutor para
  poder identificarlo y confirmación en dos pasos);
- el tutor, desde su panel (`UnlinkStudentForm`).

Cada uno solo puede romper **sus** vínculos: el `deleteMany` exige que el perfil
que llama aparezca en la fila, en el lado que le toca. Verificado ejecutándolo:

```
tercero ajeno intenta romperlo   -> false   (y el vínculo sigue vivo)
el ALUMNO lo rompe               -> true
el TUTOR rompe uno nuevo         -> true
```

---

## 7. 🟠 Sesiones y tokens

**Estado: verificado; un cambio de fondo.**

`pnpm security:session` mide contra Supabase Auth real:

```
✅ S1-caducidad            el access token caduca en 3600 s
✅ S2-renovacion           refresh → HTTP 200 (nuevo access token)
✅ S3-rotacion             reuso del refresh anterior → ventana de gracia de Supabase
✅ S4-logout-invalida      logout HTTP 204; refresh posterior → HTTP 400 (rechazado)
✅ S5-getUser-tras-logout  getUser() con el token de la sesión cerrada → HTTP 403
⚠️ S6-fuerza-bruta-auth    25 intentos fallidos sin 429 (→ §5, corregido en la app)
```

**S5 es el que importa** y desactiva la preocupación habitual con JWT sin
estado. Un access token robado sobrevive nominalmente hasta 1 h después del
logout, pero `requireUser()` llama a `supabase.auth.getUser()`, que **valida
contra el servidor de Auth**: éste devuelve 403 en cuanto la sesión se cierra.
Cerrar sesión corta el acceso a la app **al instante**, no en una hora.

### 7.1 🟠 La cookie de sesión era legible por JavaScript

**Estado: CORREGIDO.**

`@supabase/ssr` trae `httpOnly: false` por defecto (`DEFAULT_COOKIE_OPTIONS`
del paquete), y el proyecto usaba el default — mientras el comentario de
`supabase-server.ts` afirmaba desde F0 que *«la sesión vive en cookies
httpOnly»*. No era cierto. Esa cookie contiene el access token **y el refresh
token, con 400 días de vida**: cualquier XSS —presente o futuro— no robaba una
sesión, robaba la cuenta durante más de un año, con los datos del menor y el
historial de pagos dentro.

El motivo del default es real: `createBrowserClient()` necesita leer la sesión
en el navegador. En esta app su **único** uso era subir el avatar a Storage.
Así que:

1. la subida se movió al servidor (`uploadAvatarAction`), que sube con la
   sesión del usuario — las políticas del bucket (carpeta = `auth.uid()`,
   migración 0008) siguen siendo las que autorizan, no se usa llave de
   servicio; de paso gana lista blanca de tipo MIME, tope de 2 MB y extensión
   derivada del **tipo**, nunca del nombre que manda el cliente;
2. `src/lib/auth/supabase-browser.ts` se **eliminó** (ya no lo usa nadie);
3. las cookies se emiten con `httpOnly: true`, `sameSite: 'lax'`, `secure` en
   producción — en el cliente de servidor **y** en el del middleware (si solo
   se endureciera uno, el primer refresco devolvería la cookie a su estado
   anterior y el arreglo duraría una hora).

Verificado en navegador real (§10): `httpOnly=true`, `sameSite=Lax`,
`document.cookie` **vacío**, y el login sigue funcionando.

`sameSite: 'lax'` es además lo que protege del CSRF a los Route Handlers con
auth por cookie (`/api/simulator/sync`): un POST cross-site no lleva la cookie.
Las Server Actions llevan encima la validación de `Origin` de Next.js.

### 7.2 🔵 Cambiar la contraseña no pedía la actual

**Estado: CORREGIDO.**

Bastaba con tener la sesión abierta. En este público —laptop compartida en
casa, computadora de la prepa— eso convierte una sesión prestada en una toma de
control permanente: el atacante cambia la contraseña y el dueño queda fuera.
Ahora se exige la contraseña actual, con el límite de tasa **antes** de la
comprobación (si no, el campo sería un oráculo para adivinarla sin pasar por
el login).

> **Hallazgo que solo apareció al ejecutarlo.** La primera implementación
> verificaba con `signInWithPassword` sobre el cliente de servidor de la propia
> petición. El servidor empezó a lanzar
> `AuthRefreshDiscardedError: session state changed mid-flight` y el formulario
> se quedaba sin responder: ese cliente está cacheado por request (G62) y
> compartido con los guards; iniciar sesión sobre él reescribe su estado a
> media petición. Se rehízo con un cliente **efímero y sin almacenamiento**
> (`src/lib/auth/verify-password.ts`, `persistSession: false`). Verificado:
> correcta → `true`, incorrecta → `false`, correo inexistente → `false`, y la
> sesión del usuario queda intacta tras un intento fallido.

---

## 8. Secretos

**Estado: limpio, con una corrección.**

| Comprobación | Resultado |
|---|---|
| Variables `NEXT_PUBLIC_*` en el código | 11, **todas públicas por diseño** (URL de Supabase, anon key, DSN de Sentry, key de PostHog, IDs de píxeles, feature flags, publishable de Stripe) |
| ¿Algún secreto de servidor referenciado en un Client Component? | **0** (barrido de todos los `'use client'` contra `SERVICE_ROLE`, `STRIPE_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `STRIPE_WEBHOOK_SECRET`, `SENTRY_AUTH_TOKEN`) |
| **Historial de git completo** (117 commits, `git log --all -p`) contra `sk_live`/`sk_test`/`pk_live`/`whsec_`/`re_`/JWT/`sbp_`/`sntrys_`/`phc_`/`ghp_` | **0 coincidencias** |
| Cadenas de conexión reales en el historial | **0** (solo el marcador `postgresql://user:password@host` de `.env.example`) |
| Archivos tipo `.env`/`.pem`/`secret` versionados alguna vez | solo `.env.example` (placeholders) |
| `.gitignore` + `.vercelignore` | ambos cubren `.env*` — el `.vercelignore` existe desde el incidente de G7, donde `vercel --prod` subió un `.env` local pese al `.gitignore` |

**Corregido:** `.env` y `.env.local` conservaban una `ANTHROPIC_API_KEY` (ya
vencida, sin ninguna referencia en el código), pese al guardrail explícito de
CLAUDE.md de no usar la API de pago de Anthropic **en ningún lugar del
proyecto**. Se eliminó de ambos. Nunca estuvo en git.

**Nota para el dueño:** `.env` (además de `.env.local`) sigue existiendo con
valores de desarrollo temprano. Next.js carga los dos. Está ignorado por git y
por Vercel, pero es el mismo archivo que causó el incidente de G7; conviene
borrarlo cuando `.env.local` sea suficiente.

---

## 9. Inyección SQL

**Estado: limpio.**

- **Toda** consulta pasa por Prisma. No hay ningún otro cliente de base de datos.
- 15 usos de SQL crudo en la app, **todos** plantillas etiquetadas
  (`prisma.$queryRaw\`…\``), que Prisma envía parametrizadas. Cero concatenación
  de texto.
- Los fragmentos dinámicos usan `Prisma.sql` / `Prisma.join` (también
  parametrizados); los separadores son literales del código.
- `$queryRawUnsafe` / `$executeRawUnsafe` aparecen **solo** en scripts offline
  (`backup-content-import.ts`, `verify-rls-isolation.ts`), con constantes
  definidas en el propio archivo — nunca en el camino de una petición.
- El SQL nuevo de G65 (`consumeRateLimit`) es plantilla etiquetada con `${key}`
  y `${windowSecs}` como parámetros.

---

## 10. Cabeceras de seguridad — verificadas contra la URL pública

**Estado: 2 corregidas.** `pnpm security:headers` pide la página a
`https://yaentre.com` y comprueba lo que **llega al navegador**, no lo que dice
`next.config.ts` (una CDN, un rewrite o un despliegue incompleto pueden anularlo).

Contra producción **antes** del arreglo: 10/12.

| Cabecera | Antes | Después (build local verificado) |
|---|---|---|
| `Strict-Transport-Security` | ✅ `max-age=63072000; includeSubDomains; preload` | ✅ |
| `X-Content-Type-Options` | ✅ `nosniff` | ✅ |
| `X-Frame-Options` | ✅ `DENY` | ✅ |
| `Referrer-Policy` | ✅ `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | ✅ `camera=(self), microphone=(), geolocation=()` | ✅ |
| CSP `default-src 'self'` | ✅ | ✅ |
| **CSP `frame-ancestors 'none'`** | ❌ **ausente** | ✅ **añadida** |
| CSP `object-src 'none'` / `base-uri 'self'` / `form-action 'self'` | ✅ | ✅ |
| **`X-Powered-By`** | ❌ **exponía `Next.js`** | ✅ **eliminada** (`poweredByHeader: false`) |
| `http://` → `https://` | ✅ 308 | ✅ |

`frame-ancestors` es el sustituto estándar de `X-Frame-Options`: la app estaba
protegida contra clickjacking solo por la cabecera obsoleta. Se añadió también
`upgrade-insecure-requests`.

**Pendiente de despliegue:** las dos correcciones están en `next.config.ts` y
verificadas contra el build de producción local (11/12; el único fallo es
`http→https`, que no aplica en localhost). **Producción sigue sirviendo la
versión anterior hasta el próximo deploy** — el repositorio no tiene remoto de
git, así que el despliegue es una acción manual del dueño. Volver a correr
`pnpm security:headers` después para cerrar el 12/12.

### 10.1 Sobre la CSP y `'unsafe-inline'`

Se mantiene la decisión de F22: `script-src` incluye `'unsafe-inline'` porque
Next.js lo necesita para su bootstrap de hidratación salvo con un esquema de
nonce por request. Sigue bloqueando el vector más dañino (script/iframe/object
de un origen arbitrario). La superficie de XSS real de la app es pequeña y se
auditó: no hay `innerHTML`, `eval` ni `document.write`; los dos
`dangerouslySetInnerHTML` son (a) un script inline **estático** sin
interpolación y (b) el HTML que produce KaTeX, con el texto libre renderizado
como texto de React, nunca como HTML.

---

## 11. Datos de menores — mínimos necesarios y vínculo con el tutor

### 11.1 Qué se guarda de un alumno

`UserProfile` completo: `displayName` (opcional), `avatarUrl` (opcional),
`themePref`, `badges`, `acquisitionSource` (campaña de la primera visita),
examen y carrera meta, `onboardingStep`, `diagnosticDone`. El correo vive en
`auth.users`, de Supabase.

**No se pide ni se guarda: fecha de nacimiento, edad, dirección, teléfono,
CURP, escuela, nombre real, ni ningún documento de identidad.** Verificado
contra el schema completo. Cumple minimización: cada campo tiene un uso directo
en el producto y ninguno identifica a la persona fuera de la plataforma.

El resto es de comportamiento (respuestas, racha, temas débiles, predicción) y
es la razón de ser del producto.

### 11.2 Lo que el tutor puede ver

Confirmado leyendo `src/lib/db/parent.ts` y ejecutando el panel: solo
agregados —racha, predicción del Entrómetro, delta semanal, cuenta regresiva,
3 simulacros recientes (fecha y score), actividad de 7 días. **Nunca**
`Question` ni `SessionAnswer.selectedOption`/`isCorrect`. Coincide con lo que
promete el aviso de privacidad, y RLS lo respalda: ni siquiera con el JWT del
tutor hay una excepción "de padre" en las políticas de `exam_sessions` /
`session_answers`.

### 11.3 🟠 Dos huecos legales, uno cerrado

**Cerrado — revocación del vínculo.** Ver §6.3: el aviso prometía una
desvinculación que no existía. Ya existe, para los dos lados.

**Abierto — consentimiento del tutor antes de tratar los datos.** El aviso dice:
*«Si tienes menos de 18 años, necesitamos el consentimiento de un tutor legal
para procesar tus datos»*. El producto **no pregunta la edad en ningún momento
y no recoge ese consentimiento**: el registro es directo y la vinculación del
tutor es opcional y la inicia el propio alumno.

Esto **no se corrigió en esta fase, a propósito**, y hay que decir por qué: la
solución no es técnica sino de producto y de criterio legal. Las opciones
(pedir fecha de nacimiento y bloquear el registro a menores sin consentimiento
verificable; pedir el correo del tutor y exigir confirmación antes de activar la
cuenta; o ajustar el aviso al modelo real de tratamiento) cambian el embudo de
registro, que es el número que decide el lanzamiento del 6 de enero. Es una
decisión del dueño, informada por un abogado. **Lo que sí es inaceptable es el
estado actual: el aviso afirma algo que el sistema no hace.**

Recomendación mínima y barata mientras se decide: alinear el texto del aviso
con el tratamiento real, y añadir al registro una casilla explícita de "soy
mayor de edad o cuento con el permiso de mi madre, padre o tutor" — no equivale
a consentimiento verificable, pero deja constancia y quita la contradicción.

### 11.4 Derechos ARCO

Verificados como funcionales: exportación completa
(`GET /api/account/export`, ahora con límite de tasa) y eliminación con
confirmación fuerte (escribir el correo exacto) que **anonimiza** el perfil y
borra en cascada sesiones, temas débiles, racha, predicción, preferencias y
vínculos, conservando el historial de pagos por obligación fiscal.

---

## 12. Hallazgos de la infraestructura de Supabase

Del linter de seguridad del proyecto:

- 🔵 **`current_profile_id()` e `is_admin()` son ejecutables por RPC** para
  `anon` y `authenticated`. **Se acepta el riesgo y se documenta.** Ambas son
  `SECURITY DEFINER` pero **no reciben argumentos**: derivan todo de
  `auth.uid()` y devuelven únicamente hechos sobre quien llama (su propio
  `profileId`, si es o no admin). No hay IDOR posible y tienen el `search_path`
  fijado. Revocar `EXECUTE` **rompería RLS**, porque las políticas las invocan
  con los privilegios del rol que consulta; moverlas a un esquema privado
  obligaría a reescribir las 29 políticas, cambio mayor sin ganancia real.
- 🟡 **Protección de contraseñas filtradas desactivada** (HaveIBeenPwned).
  Acción del dueño, en el panel de Supabase — no es configurable por código ni
  por el MCP. Para un producto con menores y pagos debería estar encendida:
  evita que un alumno reutilice una contraseña ya expuesta en una brecha ajena.
  **Ver §14.**
- ✅ **RLS habilitado en las 28 tablas**, todas con política.

---

## 13. Método y reproducibilidad

Cinco comandos nuevos, todos repetibles:

```bash
pnpm security:isolation   # RLS: ataca /rest/v1 con JWT reales de 3 cuentas
pnpm security:authz       # aplicación: cambia identificadores en las funciones reales
pnpm security:session     # caducidad, renovación, logout, fuerza bruta de Auth
pnpm security:ratelimit   # el contador distribuido, incluida la concurrencia
pnpm security:headers     # cabeceras contra la URL pública real
```

Más `scripts/security/ui-probe.mjs` (Playwright), que verifica en navegador
real lo que solo se ve ejecutando la app. **8/8:**

```
✅ U1-login-funciona        login con cookie httpOnly → /app
✅ U2-cookie-httponly       sb-…-auth-token  httpOnly=true  sameSite=Lax
✅ U3-invisible-a-js        document.cookie vacío
✅ U4-rechaza-actual-mala   "Tu contraseña actual no coincide."
✅ U5-sesion-intacta        tras el intento fallido sigue en /app
✅ U6-acepta-actual-buena   "Tu contraseña se actualizó ✓"
✅ U7-restaura-contrasena   "Tu contraseña se actualizó ✓"
✅ U8-limite-login          bloqueado en el intento 9 (presupuesto 8)
```

**U8 es la medición que cierra §5**: con los cubos limpios, el corte cae
exactamente donde debe. **U5 importa tanto como U4**: comprobar la contraseña
actual no puede tumbar la sesión de quien la comprueba (fue el bug de §7.2).

**Datos de prueba:** se usaron las 5 cuentas de prueba ya existentes. Los hashes
de contraseña de las 5 se respaldaron antes de tocarlos y **se restauraron al
cerrar la fase** (§15). Toda sesión o vínculo creado por las sondas se borró; la
base quedó en 5 perfiles, 5 sesiones, 480 respuestas y 0 vínculos parentales —
igual que al empezar.

**Lo que NO se pudo hacer:** `pnpm test:rls` sigue sin correr desde G59 (sus
cuentas de sondeo exigen `SUPABASE_SERVICE_ROLE_KEY`, que en `.env.local` es un
marcador de 22 caracteres). El aislamiento se verificó por la vía equivalente y
más fuerte: peticiones HTTP reales con JWT reales, que es lo que de verdad hace
un atacante.

---

## 14. Pendientes del dueño

Ninguno es ejecutable desde el código.

1. **Desplegar.** Las correcciones de cabeceras (§10) y todo lo demás están en
   el repositorio pero producción sirve la versión anterior. Sin remoto de git,
   el deploy es manual. Después: `pnpm security:headers` debe dar 12/12.
2. **Aplicar la migración 0013 en producción** si la base de producción no es
   la misma que la auditada. *(En este proyecto lo es: se aplicó y verificó en
   vivo.)*
3. **Encender la protección de contraseñas filtradas** en el panel de Supabase
   (Authentication → Policies). §12.
4. **Decidir el consentimiento parental** (§11.3). Es la única brecha legal
   abierta y necesita criterio de negocio y jurídico, no código.
5. **Considerar bajar el TTL del access token** de 60 a 30 min en el panel de
   Supabase. Riesgo bajo (§7 demuestra que el logout corta al instante), pero
   reduce a la mitad la ventana de un token robado en tránsito.
6. **Borrar `.env`** cuando `.env.local` baste (§8).
7. Heredados de G59/G60, siguen abiertos:
   `GRANT USAGE ON SCHEMA auth TO acierta_ci;` +
   `GRANT SELECT (id, email) ON auth.users TO acierta_ci;` — sin ellos los tres
   correos programados reportan 0 enviados. Y la decisión de subir Supabase a
   Pro antes del lanzamiento (G61: el plan gratuito no tiene respaldos
   restaurables de los datos de usuario y pago).

---

## 15. Cambios de esta fase

**Migración**
- `prisma/migrations/0013_security_hardening_g65.sql` — esquema `app_security`
  + tabla del límite de tasa; 11 políticas RLS de `FOR ALL` a `FOR SELECT`;
  retirada de `profile_insert`/`update`/`delete`. **Aplicada y verificada.**

**Nuevo**
- `src/lib/rate-limit/store.ts` — contador distribuido y presupuestos.
- `src/lib/rate-limit/client-ip.ts` — resolución de IP (puro, 6 pruebas).
- `src/lib/rate-limit/request.ts` — IP dentro de Server Action / Route Handler.
- `src/lib/auth/cookie-options.ts` — cookies `httpOnly`.
- `src/lib/auth/verify-password.ts` — comprobación con cliente efímero.
- `src/components/profile/LinkedParentsCard.tsx` — el alumno revoca tutores.
- `src/components/tutor/UnlinkStudentForm.tsx` — el tutor se desvincula.
- `scripts/security/{isolation,authz,session,rate-limit,headers}-probe.ts` +
  `ui-probe.mjs`.
- `tests/security/{client-ip,answer-key-leak,auth-schemas}.test.ts`.

**Modificado**
- `src/lib/db/sessions.ts` — el reactivo debe pertenecer a la sesión (🔴).
- `src/lib/db/simulator.ts` — el lote del `sendBeacon` se filtra igual.
- `src/lib/db/drill.ts` — `hasEarnedExplanation` antes de revelar (🟠).
- `src/lib/db/parent.ts` — `unlinkParentStudent`, `loadLinkedParents`.
- `src/lib/parent/link-code.ts` — `crypto.randomInt` en vez de `Math.random`.
- `src/lib/auth/{supabase-server,supabase-middleware}.ts` — cookies `httpOnly`.
- `src/lib/auth/schemas.ts` — cotas de contraseña (72, bcrypt) y correo (254).
- `app/actions/auth.ts` — límite en registro, login, recuperación, reenvío.
- `app/actions/parent.ts` — límite doble en el canje + desvinculación.
- `app/actions/profile.ts` — contraseña actual obligatoria; `uploadAvatarAction`.
- `app/actions/drill.ts` — límite en el reporte de reactivos.
- `app/actions/sessions.ts` — **retirada** de `startSession` (sin uso).
- `app/api/{account/export,adaptive/*,email/unsubscribe}/route.ts` — límites.
- `next.config.ts` — `frame-ancestors`, `upgrade-insecure-requests`,
  `poweredByHeader: false`, `bodySizeLimit` para el avatar.
- `proxy.ts` — IP endurecida + comentario de qué NO garantiza ese limitador.
- `src/components/profile/{ChangePasswordForm,ProfileIdentityCard}.tsx`.
- `.env` / `.env.local` — fuera la `ANTHROPIC_API_KEY`.

**Eliminado**
- `src/lib/auth/supabase-browser.ts` — sin uso tras mover el avatar al servidor.

**Restaurado al cerrar**
- Los hashes de contraseña de las 5 cuentas de prueba.
- `UserProfile.displayName` y la preferencia `STREAK_RISK` de `e2e_sim_user`,
  que la sonda de la capa de aplicación modificó al ejecutarse **antes** de los
  arreglos.
- Borradas las sesiones y vínculos temporales que crearon las sondas y la tabla
  auxiliar `public._g65_pwbackup`.
