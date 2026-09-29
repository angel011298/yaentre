# Retorno — Bloque 2 (marketplace de profesores)

> De: sesión de desarrollo (CTO) · Para: sesión CLO/CFO/CMO + Ángel
> Fecha: 29 de septiembre de 2026
> Rama: `claude/intelligent-gates-sxp9pr` (repo `angel011298/yaentre`)
> Flujo: **entrega de archivos, no despliegue.** `vercel --prod` lo corre Ángel.
> Documentos de partida: `CONTEXTO_YAENTRE_HANDOFF.md` (gana ante un conflicto) y `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md`.

## Resumen

De los 8 puntos del encargo: **6 entregados y verificados** (1, 2, 3, 4, 5, 8), **1 parcial** (7 — el aula) y **1 bloqueado** (6 — liquidación semanal).

| # | Punto | Estado |
|---|---|---|
| 1 | Modelo de datos (spec §2) | ✅ Listo — **DDL sin aplicar** (ver acciones manuales) |
| 2 | Onboarding/KYC (spec §3) | ✅ Listo — las solicitudes **se abren solas** cuando CLO entregue los 3 textos legales |
| 3 | Niveles por mérito automático (spec §4) | ✅ Listo — ⚠️ conflicto con el handoff, pregunta #2 |
| 4 | Tabulador determinista, tope 1.5×, regla §5.0 | ✅ Listo — ⚠️ preguntas #3 y #4 |
| 5 | Reserva y pago de un click (spec §6) | ✅ Listo — **sin verificar contra Stripe real** |
| 6 | Liquidación semanal SPEI + CFDI (spec §7) | ⛔ **BLOQUEADO** — falta la confirmación del contador |
| 7 | Aula Google Meet + grabación (spec §6.5) | 🟡 Parcial — enlace y consentimiento sí; iniciar/retener grabación **no** |
| 8 | Endpoints (spec §11) | ✅ Listo salvo los de liquidaciones de admin (bloqueados) |

`pnpm typecheck`, `pnpm lint` y `pnpm build` en **verde**; `pnpm test:unit` **1 439/1 439** (102 archivos, +530 frente al Bloque 1), con mutaciones comprobadas en las pruebas críticas (ver §Verificaciones).

### ⛔ Lo que NO se hizo y por qué

**Motor de liquidación semanal y CFDI de nómina/retenciones (punto 6).** La precondición del encargo era que confirmaras que ya contrataste al contador y que validó el proceso operativo; **el mensaje de arranque de esta conversación no traía esa confirmación** («adjunto documentos, continúa» no lo es). Por eso **no se escribió ningún código de cálculo de liquidación, hoja de pago, marcado de transferencia, retención ni CFDI**. Lo único que existe es el modelo `TeacherPayout` (spec §2, inerte) y `GET /api/teachers/me/payouts`, que responde `available:false` — a propósito, no una lista vacía: «no tienes liquidaciones» y «todavía no las mostramos» no son lo mismo, y un profesor no debe concluir que no se le pagó. No existen `GET /api/admin/payouts` ni sus `PATCH`.
Lo que ya está decidido y **listo para conectarse** cuando lo confirmes: comisión 25 % (`splitTariff`, con la invariante `comisión + pago = monto` probada) y el sellado de `commissionCents`/`teacherPayCents` en cada clase y en cada cancelación parcial. Falta la reserva de desempeño (15 %/30 días), el cálculo por periodo, la aprobación y la hoja de pago.

---

## Qué se hizo, por punto

### 1) Modelo de datos — LISTO
`prisma/schema.prisma` **modificado** (declarado, como exigen la regla #2 y `CLAUDE.md`): `Teacher`, `TeacherSubject`, `ClassSession`, `TeacherPayout` y los enums `TeacherPaymentRail`, `TeacherLevel`, `TeacherStatus`, `ClassStatus`, `CancelledBy`, `PayoutStatus`, `RetentionStatus`; relaciones inversas en `UserProfile`.
- `prisma/migrations/0020_teachers_marketplace_bloque2.sql` — idempotente, RLS **solo-servidor** (habilitada, sin política, `REVOKE` a `anon`/`authenticated`, `GRANT` al grupo `acierta_app`; ninguna lista de roles, G73b). Sintaxis validada con `pglast` (45 sentencias) y **paridad con el schema comprobada columna por columna** contra `prisma migrate diff` (31 / 4 / 43 / 17 columnas, 16 índices y todas las claves foráneas idénticos).
- `prisma/migrations/0021_teacher_docs_bucket_bloque2.sql` — bucket **privado** `teacher-docs` con política por carpeta (`auth.uid()`), lectura para ADMIN, sin actualizar ni borrar.

**Ajustes respecto al modelo literal de la spec** (todos por coherencia con el resto del repo o por un hueco real):
- `User` → `UserProfile` (ese es el modelo de este repo); tablas en `snake_case` por `@@map`.
- `Teacher`: `publicName` (derivarlo del nombre completo falla con «María Guadalupe Pérez»), `bio`, `availability` (JSON validado), `clabeUpdatedAt` (cambiar la cuenta de destino es el vector clásico de desvío de pagos: avisa por correo al titular y la hoja de pago futura podrá marcar CLABEs recientes), contadores `ratingCount`.
- `ClassSession`: estado `PENDING_PAYMENT` (retiene el horario mientras se cobra), `refundDueCents`/`refundedCents` (la deuda de reembolso vive en la fila: un fallo de Stripe no pierde lo que se le debe al alumno), `disputeReason`/`disputedAt`, y el snapshot del desglose (`baseTariffCents`, multiplicadores, comisión, pago) sellado al reservar.
- `CURP` y `CLABE` se guardan **en claro** (protegidas por RLS y enmascaradas `****1234` incluso para su dueño). Cifrarlas a nivel de columna es la recomendación (pregunta #12).

### 2) Onboarding / KYC — LISTO
- **CURP**: formato + fecha + **dígito verificador** anclados en referencia oficial; mayoría de edad. **CLABE**: 18 dígitos + dígito verificador. **RFC** opcional.
- **Pregunta de facturación con la redacción EXACTA de spec §3.2**: «¿Puedes emitir facturas por tus servicios?» — «Sí, tengo RFC y puedo facturar» / «No por el momento» (con la calidez y el camino a darse de alta en RFC). Solo contestar «Sí» **y** dar RFC válido **y** subir la CSF produce Carril A; **cualquier otro caso es Carril B (default)**. El carril lo decide el servidor (`determinePaymentRail`), nunca un campo del cliente.
- **CSF** (Constancia de Situación Fiscal): PDF verificado por **firma binaria `%PDF-`** (no por extensión ni MIME declarado), ≤ 5 MB, ruta armada por el servidor (`<uid>/<uuid>.pdf`), propiedad de la ruta y existencia del objeto comprobadas al enviar la solicitud.
- La presentación pública rechaza teléfonos, correos, redes y enlaces (las clases se agendan y se cobran dentro de YaEntre).
- Aceptación digital de contrato/NDA/política de grabación con marca de tiempo y **versión**, y el resumen visible junto a la casilla.
- ⚠️ **Los tres textos legales son `PLACEHOLDER` (CLO no los ha entregado).** En vez de dejarlos en producción, `submitTeacherApplication` **rechaza** mientras alguno empiece con `PLACEHOLDER`, y la pantalla lo dice: se abre sola el día que reemplacen los textos, sin que nadie deba acordarse de encender nada. `tests/legal/teacher-texts.test.ts` se pondrá rojo ese día a propósito (avisa que hay que actualizarlo).
- Pantallas: `/profesores` (landing pública, sin precios ni promesas de ingreso), `/profesor/solicitud`, `/profesor` (estados PENDIENTE/ACTIVO/SUSPENDIDO, próximas clases, progreso de nivel, edición de materias/disponibilidad/cuenta). **El profesor no ve ninguna pantalla de pagos** (bloqueada).

### 3) Niveles por mérito — LISTO
Inicial → Verificado (15 clases, 4.2★, ≤ 10 % cancelación) → Destacado (50 clases, 4.5★, ≤ 5 %, ≥ 3 meses). **Nadie lo asigna ni lo elige; solo sube; las clases ya reservadas conservan su tarifa** (el multiplicador se sella en la fila). Se recalcula tras cada clase completada, calificada o cancelada, y avisa por correo y analítica al subir. Un no-show del alumno **no** cuenta contra el profesor.

### 4) Tabulador — LISTO
`B × N × D × A × H × Q` en **enteros exactos** (multiplicadores en centésimas, `BigInt`), **tope duro 1.5×**; `commission + teacherPay === amount` siempre. **Regla §5.0**: el alumno jamás ve la fórmula — `calculateTariff` (desglose interno) nunca se serializa y `POST /api/classes/calculate-tariff` devuelve **únicamente `{priceCents}`** (probado sobre el JSON completo). `validateTariffInput` rechaza por nombre cualquier dato del comprador (art. 26-II LFPDPPP). «Desde $X» del directorio se calcula sobre lo que **de verdad** se puede cobrar.

### 5) Reserva y pago de un click — LISTO (sin verificar contra Stripe real)
Orden, con nada cobrado ni retenido si una comprobación previa falla: interruptor de marketplace **y** de ventas → límite de tasa → Premium **vigente** → fecha de nacimiento y, si es menor, confirmación del tutor → profesor ACTIVO y distinto del alumno → reglas de la reserva (rejilla 30 min, ventana 8:00–22:00 México, anticipación ≥ 2 h, disponibilidad, vigencia del plan) → **el precio que el alumno vio coincide con el que se cobrará** (`expectedPriceCents`; si cambió, `CONFLICT` con el nuevo precio, sin retener nada) → retención del horario bajo locks del profesor y del alumno (sin interbloqueo) → cobro.
- **Un click**: `PaymentIntent` con la tarjeta guardada (`confirm`, solo tarjeta, `off_session:false`). El Checkout de **Premium ahora guarda la tarjeta** (`setup_future_usage:'on_session'` solo en la opción `card`; un valor global rompería OXXO/SPEI).
- **Fallback a Checkout hospedado** si no hay tarjeta, pide 3-D Secure o se rechaza (cancela el intento primero). La tarjeta que se guarde ahí sirve para la próxima reserva.
- **La clase pasa a `BOOKED` SOLO por el webhook** (guardrail de `CLAUDE.md`): `payment_intent.succeeded`, idempotente por `event.id`, con el monto de `amount_received`. Un monto distinto o un pago tardío **no reservan**: quedan como reembolso pendiente. Los eventos de clase se desvían **antes** del camino de suscripciones (si no, `SubscriptionNotFoundError` → 500 → reintento eterno).
- Fallo de red al cobrar: reintenta con la **misma clave de idempotencia** y, si persiste, **no suelta el horario** (soltarlo podría dejar un cargo sin clase).
- 🔴 **Defecto de diseño que encontré y cerré**: la sesión de Checkout no puede vivir menos de 30 min, pero el horario se soltaba a los 30; un pago en el minuto 30–31 reservaba una hora **ya ofrecida a otro alumno** (dos clases en el mismo horario). Ahora la sesión vive 31 min y el horario se suelta a los 33 (`CHECKOUT_EXPIRY_MINUTES < PAYMENT_SLOT_RELEASE_MINUTES`, probado).
- **Cancelación** (spec §6.7): ≥ 24 h → 100 %; < 24 h → 50 % (lo retenido se reparte 25/75); profesor o sistema por falta del profesor → 100 % y **cuenta en su tasa**; pago no confirmado → nada. Reembolsos **idempotentes por estado** (`class-refund:<id>:<ya devuelto>:<pendiente>`); un fallo de Stripe no revierte la cancelación y **no queda en silencio** (`payment_consistency` → Sentry).
- **Confirmación del profesor** (spec §6.4): se le pide 24 h antes; a las 4 h sin respuesta se alerta al admin y se avisa al alumno; a las 12 h se cancela con reembolso completo (con topes de 60/30 min antes de la clase para reservas de último momento, para nunca cancelar después del inicio).
- **Job del ciclo de vida** `/api/cron/classes` (`CRON_SECRET`): suelta reservas sin pagar, **reconcilia un cobro cuyo webhook se perdió** (consulta a Stripe antes de soltar), confirmaciones, enlaces del aula y reintento de reembolsos. Pasos aislados; «avisé» se sella solo si el correo **salió**; responde **500** si un paso falló (no un `0` limpio, G73b). **No se agregó a `vercel.json`**: el plan Hobby solo admite crons diarios y este debe correr cada 5-10 min.

### 7) Aula y grabación — PARCIAL
- ✅ Enlace de Google Meet por clase (Calendar API, creación idempotente por clase, **sin datos personales en el evento**: ni invitados ni nombres), enviado 15 min antes por correo a las dos partes, y borrado del evento al cancelar.
- ✅ **Consentimiento de grabación** (`recordingConsentGranted`): un menor → lo da su **tutor** en su liga (lo que marque el menor no cuenta); un adulto → él al reservar; y el profesor debe haber firmado la política. Sin ambos lados **no se graba**. El alumno lo ve antes de entrar.
- ⛔ **No implementado, a propósito**: (a) **iniciar la grabación** — Meet no expone un endpoint para eso y exige una edición de Workspace que la incluya (costo, decisión tuya, #9); (b) **retención y borrado** de grabaciones — no hay medio de almacenamiento decidido ni `RECORDING_RETENTION_DAYS` (no le puse valor por defecto, #9). El campo `recordingExpiresAt` y `recordingExpiry()` existen, pero **nada purga todavía**.
- ⚠️ **No pude verificar contra Google real**: el sandbox de desarrollo no llega a las APIs de Google. El proveedor se probó con un `fetch` simulado. **Hace falta una clase de prueba real de punta a punta antes de abrir** (acción #6).

### 8) Endpoints (spec §11)
Alumno: `GET /api/classes/teachers`, `GET /api/classes/teachers/{id}`, `POST /api/classes/calculate-tariff`, `POST /api/classes/book` (202 si el cobro con tarjeta guardada está en curso), `GET /api/classes`, `GET /api/classes/{id}` (para esperar al webhook), `POST /api/classes/{id}/cancel|rate|dispute|report-teacher-no-show`.
Profesor: `POST /api/teachers/apply`, `GET|PATCH /api/teachers/me`, `GET /api/teachers/me/classes`, `GET /api/teachers/me/payouts` (`available:false`), `POST /api/teachers/me/classes/{id}/confirm|complete|student-no-show|cancel`.
Admin: `GET /api/admin/teachers`, `PATCH /api/admin/teachers/{id}/approve|suspend|reactivate`, `GET /api/admin/teachers/{id}/csf`, `GET /api/admin/resico`. **No existen** los de liquidaciones (bloqueados).
Las cuatro condiciones de G99 (rol ADMIN dentro, id cuid, bitácora **antes** de responder —también al rechazar—, límite de tasa compartido) y **admin maestro** para aprobar/suspender/reactivar y ver CURP/CLABE/CSF completas (auditado; un ADMIN no maestro las ve enmascaradas). Suspender **cancela las clases futuras con reembolso**, una por una (una que falle no impide las demás y se cuenta).

**Monitor RESICO (spec §10)** en `/admin/profesores` y `GET /api/admin/resico`: semáforo por décimas **enteras** (sin errores de coma flotante en la frontera 60/80 %), peor caso «todo Carril B», ingreso «mixto» aparte, año fiscal en **hora de México**, base de efectivo. Detalle de sus supuestos en #10.

**Otros cambios necesarios:** `/profesor` exige sesión en el middleware; las rutas privadas del marketplace nunca entran al service worker; eliminar cuenta se **bloquea** si hay perfil de profesor (conserva datos fiscales/bancarios) o clases vivas (hay dinero cobrado); `.env.example`, `scripts/setup-stripe-webhook.ts`, `docs/STRIPE_LIVE_CHECKLIST.md`, `CLAUDE.md` (6 guardrails nuevos) y `docs/ESTADO.md`.

**Early Bird (fase 1 del orden §12) ya entregada en el primer commit:** interruptor `MARKETPLACE_OPEN` (default CERRADO, en el servidor, independiente de `SALES_OPEN`); Premium se rechaza en `startCheckoutAction` y su tarjeta dice «Disponible pronto» en `/paywall` y `/precios`. Las cortesías de admin no pasan por ahí.

---

## Verificaciones corridas

| Verificación | Resultado |
|---|---|
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ (valida también los tipos de las rutas dinámicas) |
| `pnpm test:unit` | ✅ **1 439 / 1 439**, 102 archivos |
| Sintaxis SQL 0020/0021 (`pglast`, incl. cuerpos PL/pgSQL) | ✅ |
| Paridad schema ↔ 0020 vs `prisma migrate diff` | ✅ 0 diferencias |
| Barrido «ningún esquema del borde acepta un id de usuario» (réplica del de `security:authz`) | ✅ 200 archivos; único ofensor: `src/lib/admin/schemas.ts`, la excepción autorizada de G99 |
| Copy prohibido («garantía», «nuestros profesores», «equipo docente», «próximamente») en lo nuevo | ✅ |
| **Mutaciones** (el rojo es alcanzable) | ✅ aceptar un monto menor; expirar cancelando una clase pagada; ignorar el estado del `PaymentIntent` al soltar una reserva; sellar «avisé» aunque el correo falle; aflojar `requireRole('ADMIN')` (8 rojos); quitar la compuerta de maestro (8 rojos); `<` → `<=` en la frontera del semáforo (3 rojos) |

**No pude correr** (necesitan credenciales/red que el sandbox no tiene): `pnpm security:authz|grants|isolation|live`, Playwright, ni nada contra Stripe, Google o la base real. Tampoco **apliqué** las migraciones. Los `security:*` deben correrse con el rol de **producción** (`acierta_prod`) — un verde con otro rol no dice nada (G73b).

---

## Acciones manuales para Ángel (en este orden)

1. **⛔ Confirmarme si ya contrataste al contador y validó el proceso.** Sin eso no toco liquidación ni CFDI. Ver preguntas #1, #6 y #10.
2. **Aplicar `0020` y luego `0021` como `postgres`** por el panel/API de Supabase (**no** `prisma db execute`: el rol de la app no tiene `CREATE` sobre `public`). **Antes** de `vercel --prod`: `anonymizeAndDeletePersonalData` y `/app/clases` ya consultan las tablas nuevas y fallarían. Después: `pnpm prisma migrate diff` (solo deben salir los índices de rendimiento de 0012, que viven fuera del schema a propósito) y `pnpm security:grants` con el rol de producción.
3. **Mantener `MARKETPLACE_OPEN=false`** durante Early Bird (es el default; añadirla a Vercel explícita no hace falta).
4. **Suscribir el webhook de Stripe a `payment_intent.succeeded` y `checkout.session.expired`** (`scripts/setup-stripe-webhook.ts` ya los incluye para modo prueba; el de producción se crea a mano, ver checklist). Sin ellos una clase pagada **nunca** pasa a BOOKED.
5. **Agregar el cron `/api/cron/classes`** (cada 5-10 min, con `CRON_SECRET`) cuando el plan de Vercel lo permita. Hobby solo admite crons diarios — y además **prohíbe el uso comercial** (ya bloqueador desde G72).
6. **Antes de abrir el marketplace**: (a) configurar `GOOGLE_CLASSROOM_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN/CALENDAR_ID` y hacer una **clase de prueba real** con Meet; (b) una reserva real en modo prueba de Stripe **de un click y por Checkout**, con reembolso; (c) adaptar `scripts/g99/rls-probe.ts` a `teachers`/`class_sessions`/`teacher_payouts` y al bucket `teacher-docs` (RLS por efecto con sesión STUDENT y sin sesión); (d) `MASTER_ADMIN_EMAILS` configurada.
7. **CLO**: entregar los textos del contrato de comisión mercantil, el NDA y la política de grabación (con Google como encargado y el plazo de retención). Reemplazarlos en `src/lib/legal/teacher-texts.ts` abre las solicitudes; luego actualizar `tests/legal/teacher-texts.test.ts`.
8. Revisar las preguntas de abajo; las marcadas 🔴 bloquean abrir el marketplace.

---

## Preguntas abiertas (no las adiviné)

**Bloquean liquidación / operación fiscal**
1. 🔴 **Contador** — ver arriba. Sin confirmación no hay liquidación ni CFDI.
2. 🔴 **Conflicto handoff ↔ encargo sobre el nivel.** El handoff (§4.3) habla de nivel autoseleccionado; el encargo y la spec §4 piden **mérito automático**. Implementé mérito automático (era la instrucción explícita y es lo que evita que un profesor se auto-suba de tarifa). Confírmalo o dime cuál rige.
3. **Regla de demanda (Q)**: ni el handoff ni la spec dicen **cómo** se decide si un bloque horario es de demanda baja/normal/alta. Con 3 profesores inventar un umbral produciría ruido que se cobraría. **Q está fijo en ×1.00** (`ACTIVE_DEMAND_CATEGORIES=['NORMAL']`) hasta que CFO/CMO fijen la regla.
4. **El tope 1.5× anula todo lo demás en la clase de 80 min.** El multiplicador de duración ya es ×1.50, así que en una clase de 80 min ningún otro factor (nivel, anticipación, horario) puede subir el precio: un profesor Destacado cobra lo mismo que uno Inicial, y un alumno que reserva de último minuto no paga recargo. ¿Es intencional? Si no, hay que subir el tope o bajar el ×1.50.
5. **«Desde $199/hora»** (texto de marketing del handoff) no cuadra con el tabulador: la tarifa base mínima es $260 (×0.95 de demanda baja sigue arriba). No lo usé en ninguna pantalla.
6. **Carril B (asimilados) vs. comisión mercantil**: el contrato que redacté (placeholder) es de comisión mercantil para ambos carriles; en el Carril B el ingreso se trata como asimilados y YaEntre emitiría CFDI de nómina. Es una tensión jurídica que debe resolver CLO/contador antes de firmar a alguien.

**Aula y grabación**
7. **Grabación**: ¿qué edición de Workspace se paga y quién la inicia? Meet no expone «empezar a grabar» por API.
8. **Sala de espera de Meet**: con el enlace por Calendar, ¿el profesor entra como anfitrión y admite al alumno? Sin probar contra Google real.
9. **Retención**: días de conservación (`RECORDING_RETENTION_DAYS`, sin valor por defecto a propósito), dónde vive el archivo y quién lo borra. Hoy **nada purga**.

**Reglas que asumí (cámbialas si no te sirven)**
10. **RESICO**: se mide con importes **con IVA incluido** (el techo es sin IVA: el % sale ~16 % más alto, margen de seguridad deliberado) y sobre cobrado (base de efectivo). El semáforo se decide por lo **acumulado** (spec §10); la proyección se muestra aparte porque en enero se dispara con una venta. ¿Lo valida el contador?
11. **Parámetros**: ventana reservable 8:00–22:00, rejilla de 30 min, anticipación mínima 2 h, reserva sin pagar 30 min, gracia de no-show 15 min, marcar «impartida» desde 10 min antes del fin, ventana de calificación **y de disputa** 48 h, la clase debe ser anterior al vencimiento del Premium, sin mínimo de calificaciones para subir de nivel.
12. **CURP/CLABE en claro** (RLS + enmascaradas). ¿Cifrado por columna? Recomendado; no lo hice para no crear una gestión de llaves sin tu decisión. Tampoco valido el banco contra el catálogo de la CLABE.
13. **No-show del alumno**: sin reembolso y el profesor cobra su parte retenida; la spec §7 solo paga clases COMPLETADAS. ¿Cuál rige?
14. **No-show del profesor declarado por el alumno** es unilateral y reembolsa 100 %: hay riesgo de fraude (declararlo en falso). Queda en el historial para revisión del admin. ¿Exigir evidencia (asistencia de Meet)?
15. **Evidencia de clase impartida**: no hay asistencia de Meet; la marca el profesor y el alumno tiene 48 h para disputar. Ver #14 y la liquidación futura.
16. **Bloquear la eliminación de cuenta** de un profesor (proceso manual con soporte). ¿O prefieres un flujo asistido?

## Bitácora de commits de este bloque
`b81e4b0` Early Bird · `e91f7a3` modelo y lógica pura · `f6fee61` onboarding, capa de clases, webhook, reembolsos · `5cc56de`/`bf7ac80` reserva, cancelación, ciclo de vida · `e580e95` rutas y administración · `a254bea` interfaces, RESICO, protecciones · (último) eventos del webhook y guardrails.
