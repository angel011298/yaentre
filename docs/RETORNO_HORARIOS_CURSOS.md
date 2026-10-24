# Retorno — Horarios de profesores, regularización, cursos y temporalidad (G103)

> Fecha: 2026-10-24 · Rama `feat/horarios-cursos-regularizacion-temporalidad`, integrada a `master` por avance rápido (sin forzar).
> Desplegado en producción con las tres banderas **apagadas**. Plan técnico: `docs/IMPLEMENTACION_HORARIOS_CURSOS.md`.
> Pasos manuales: `docs/CHECKLIST_DEPLOY_HORARIOS_CURSOS.md`. E2E local: `tests/e2e-local/README.md`.

## 1. Qué se hizo, por fase

| Fase | Commit | Qué |
|---|---|---|
| 0 | — | Línea base (typecheck, lint, 1 289 pruebas, build) e inventario; specs copiadas a `docs/specs/`; plan en `docs/IMPLEMENTACION_HORARIOS_CURSOS.md`. |
| 1 Temporalidad | `5ebfb69` | 12 meses de calendario (hora de México) + 7 días de gracia con acceso + extensión de 6 meses ($499 Pase / $899 Premium, una constante). `src/lib/subscriptions/*`, activación con `graceEndsAt` (`src/lib/db/billing.ts`), `requirePaidPlan` con gracia, avisos T−30/T−7/T−1/T0/fin de gracia dentro del cron diario existente (idempotentes por `expiryNoticesSent`), banners, `/app/extender` + resultado, `GET /api/me/subscription`, `POST /api/me/subscription/extend`, `/api/cron/access-expiry`, `/admin/vigencias` + `GET /api/admin/subscriptions/expiring`, copy «12 meses» en precios. Migración `0019`. |
| 2 Mensajería | `0f1226b` | «Practicar > ver videos» en vez de negar los videos; la portada y el hero solo mencionan clases/cursos con su bandera encendida (`complementSentence(flags)`); «profesores independientes verificados en YaEntre». `tests/marketing/forbidden-copy.test.ts`. |
| 3-4 Horarios y regularización | `65c5fca` | Profesores (alta con CURP/CLABE/RFC, Carril A/B, niveles por mérito), disponibilidad semanal (cuadrícula arrastrable y táctil), fechas bloqueadas, motor de horarios en `America/Mexico_City` con `date-fns-tz` (corrige el `new Date(\`${date}T${time}\`)` de la spec), tabulador con tope 1.5× sin datos del comprador, reserva en un clic con tarjeta guardada / Checkout que la guarda / 3DS por redirección, idempotencia por intento, doble reserva imposible EN LA BASE (`EXCLUDE USING gist`) + candado por profesor, pista REGULARIZACION con tarifa B separada (admisión exige Premium en servidor; regularización abierta), cancelación ≥24 h con reembolso, completar clase. Migración `0020`. |
| 5 Cursos | `1449d61` | Modelos de cursos, buckets privados `course-videos`/`teacher-documents` con políticas de Storage, subida firmada con firma REAL del archivo, lectura firmada de 1 h solo tras verificar inscripción, compra por Checkout con precio de la base y casilla del art. 56 (texto `TODO-CLO` bloquea en producción), inscripción SOLO por webhook (idempotente; compra duplicada se reembolsa; reembolso revoca), panel del profesor, revisión del admin, catálogo, detalle, reproductor con reanudación, «Mis cursos», calificaciones, `/regularizacion`. Migración `0021`. |
| 6 Liquidaciones y RESICO | `4fd9847` | Liquidación semanal unificada (clases COMPLETADAS + cursos pagados no reembolsados), reserva 15 %/30 días, mínimo $300 por acumulación, libro de ajustes `teacher_payout_adjustments`, hoja de pago con CLABE completa solo para el admin maestro, `/admin/liquidaciones`, `/admin/resico` (peor caso Carril B, cursos incluidos), `/profesor/liquidaciones`, `GET /api/teachers/me/payouts`. |
| 7 Endurecimiento y e2e | `212decf`, `0b98a23`, `472d4f3`, `c994c58` | Pila e2e 100 % local, 6 archivos de flujos + capturas; correcciones de lo que encontraron (ver §5); parches de dependencias (2 RCE críticas de Next.js); checklist, addendum de esquema, reglas en CLAUDE.md. |
| 8 Despliegue | `0e525c0`, `21a10b3` | Respaldo, migraciones, push verificado y `vercel --prod` (ver §7). |

## 2. Estado por fase

| Fase | Estado |
|---|---|
| 0-6 | **Listas y desplegadas** (detrás de banderas apagadas salvo la temporalidad, que es la regla nueva de los planes). |
| 7 | **Lista.** Ver §3. |
| 8 | **Desplegada** (§7). Encender las banderas **requiere decisión** de Ángel y textos legales (§6, §8). |

## 3. Verificaciones corridas (código desplegado `c994c58`; pruebas y documentos posteriores)

| Verificación | Resultado |
|---|---|
| `pnpm typecheck` | verde |
| `pnpm lint` | verde |
| `pnpm test:unit` | **1 885/1 885** en 106 archivos, en hora local y con `TZ=UTC` (línea base: 1 289). Las 14 últimas (autorización de cancelar/marcar impartida/alta de profesor y vigencias del admin) se agregaron tras desplegar: solo pruebas, sin cambio de código |
| `pnpm build` | verde (único aviso: «Edge Runtime deprecated», previo a G103; el de Sentry se corrigió) |
| `pnpm test:e2e:local` | **27/27**: 5 flujos del §7 del encargo + liquidaciones contra Postgres real + banderas apagadas + capturas; el log del servidor sin errores (un `globalTeardown` lo exige) |
| `pnpm audit --audit-level=high` | **0 altas / 0 críticas** (8 bajas/moderadas). Había 5 altas y 4 críticas, ninguna de G103, entre ellas dos RCE sin autenticar en Next.js ≤16.4.0 → `0b98a23` |
| `pnpm security:headers` (producción) | 12/12 |
| Capturas | 54 en `docs/screenshots/horarios-cursos/` (390 y 1440 px; alumno en oscuro y claro), revisadas a mano; el generador exige cero desbordamiento horizontal |
| Rojo alcanzable | Mutaciones del libro de ajustes (6 y 1 rojos), restricción vieja de liquidaciones (rojo en `05b`), guard que lanza (rojo del `globalTeardown`), columna faltante en el comparador de migraciones (rojo) |

## 4. Adaptaciones y correcciones a la spec

**Adaptaciones (el repo real obligó):**
1. Identidad = `UserProfile.id` (no `User.id`); tablas snake_case con `@@map`.
2. Migraciones como SQL plano aplicado como `postgres` (el rol de la app no tiene `CREATE`), DDL generado por `prisma migrate diff` y validado contra él (86 sentencias, 0 faltantes; y contra producción: 0 diferencias de G103).
3. Políticas de Storage por funciones `SECURITY DEFINER` (patrón de `is_admin()`): las de la spec consultaban `"Course"`/`"Teacher"`, que aquí son `courses`/`teachers` y están cerradas a `anon`/`authenticated`.
4. Un pre-enrutador de webhook por `metadata.kind` delante de `handleStripeEvent`, que queda intacto para los planes.
5. Toda venta nueva pasa por `salesGate()` en su primera línea.
6. Sin crons nuevos: el aviso de vigencia corre en el cron diario existente; las liquidaciones se calculan a mano (admin maestro).
7. Banderas de servidor (`FEATURE_*`), no `NEXT_PUBLIC_*`; textos `TODO-CLO` bloquean en producción (un párrafo no es un candado, G98).
8. E2E: la suite existente entraba contra el Supabase real con cuentas fijas; G103 corre en una pila local (cuentas, Auth, Storage y cobros simulados solo en este equipo).

**Correcciones a la spec:**
1. Zona horaria de los horarios: `fromZonedTime` en lugar de construir la fecha con la zona del servidor.
2. «12 meses» = meses de calendario, no 365 días (en bisiesto se perdía un día).
3. Restricción de exclusión en la base en lugar de solo validar en código.
4. Liquidaciones: libro de ajustes en lugar de `refundAdjustedPayoutId` en la partida (la recompra de un curso reembolsado reutiliza la fila de inscripción y borraba la deuda → el profesor cobraba dos veces); índice único **parcial** por semana (con el único simple, cancelar una semana impedía recalcularla).
5. RLS de la spec adaptado (ver 3 arriba).

## 5. Seguridad

### Matriz de endpoints y acciones nuevas

| Endpoint / acción | Control de acceso | Pruebas |
|---|---|---|
| `GET /api/me/subscription` | sesión (401) | `tests/subscriptions/*`, humo prod 401 |
| `POST /api/me/subscription/extend` | `salesGate` 1ª línea, mismo origen, sesión verificada, Zod estricto, límite compartido, precio de servidor | `tests/subscriptions/*`, e2e `04-vigencia` |
| `GET /api/cron/access-expiry` | `CRON_SECRET` | humo prod 401 |
| `GET /api/admin/subscriptions/expiring` | `requireRole('ADMIN')` en la ruta, `no-store` | `tests/subscriptions/admin-expiring-route.test.ts` (anónimo 401, STUDENT/PARENT 403 sin tocar la base, ADMIN 200) |
| `GET /api/classes/teachers/[id]/slots` | bandera, sesión, Premium para ADMISION en servidor (403 `PREMIUM_REQUIRED`), id cuid, límite | e2e `02-reservas` (API 403), `06` (404) |
| `GET/PUT /api/teachers/me/availability`, `GET/POST /api/teachers/me/date-blocks`, `DELETE …/[id]`, `GET /api/teachers/me/payouts` | bandera, mismo origen en escritura, `requireTeacher` (dueño de la SESIÓN), estado editable, límite | `tests/teachers/*`, e2e `01`, `06` |
| `GET /api/admin/teachers/[id]/csf` | `requireRole('ADMIN')`, cuid, bitácora, límite | `tests/admin/marketplace-authz.test.ts` |
| `POST /api/webhooks/stripe` | firma, idempotencia por `event.id` en la misma transacción, metadatos contra la base (monto, moneda, curso, clase) | `tests/stripe/marketplace-webhook.test.ts`, `tests/courses/enrollment-webhook.test.ts`, humo prod 400 |
| `bookClassAction` | `salesGate`, bandera, correo verificado, pista/Premium y tarifa en servidor, declaración de mayoría de edad, `idempotencyKey`, candado + exclusión | `tests/classes/book-action.test.ts` (incluye «sin Premium no reserva ADMISION por API»), e2e `02` |
| `cancelClassByStudentAction`, `cancelClassByTeacherAction`, `completeClassAction` | dueño desde la sesión (la consulta filtra por él), Zod estricto, ≥24 h para el alumno, perfil ACTIVO para marcar impartida | `tests/classes/class-actions-authz.test.ts` (IDOR de alumno y de profesor, id en el cuerpo rechazado, controles positivos) |
| `applyAsTeacherAction`, `updateTeacherProfileAction`, `uploadTeacherCsfAction` | sesión (correo verificado para el alta), Zod estricto, `TODO-CLO` en producción, ruta generada en servidor | `tests/classes/class-actions-authz.test.ts` (perfil de la sesión, `userProfileId` rechazado, TODO-CLO), `tests/teachers/*` |
| 13 acciones de `courses-teacher.ts` | `requireTeacher`, dueño del curso, estado editable, ruta propia + firma real del archivo, cuota | `tests/courses/actions-authz.test.ts`, e2e `03` |
| `startCoursePurchaseAction`, `enrollFreeCourseAction`, `getLessonMediaUrlAction`, `saveLessonProgressAction`, `rateCourseAction` | `salesGate`, bandera, casilla art. 56, sin promociones ni referidos, precio de la base; URL firmada SOLO con inscripción | `tests/courses/*`, e2e `03` (Storage por efecto, con control positivo) |
| `reviewTeacherAction`, `computePayoutsAction`, `payoutDecisionAction` | excepción G99 completa + **admin maestro** | `tests/admin/marketplace-authz.test.ts` (matriz anónimo × STUDENT × PARENT × ADMIN × maestro) |
| `reviewCourseAction`, `moderateCourseReviewAction` | excepción G99 (ADMIN) | idem |

Datos sensibles: CLABE/CURP/RFC nunca en logs, Sentry ni respuestas públicas; enmascarados en la interfaz (`****1234`); CLABE completa solo para el admin maestro. Sin `dangerouslySetInnerHTML` nuevo; lecciones, descripciones y reseñas se pintan como texto (`<script>` verificado como texto en e2e). Referidos: cursos, clases y extensión nunca generan comisión (`isReferralEligible`).

### Hallazgos y cómo se cerraron

| # | Hallazgo | Cierre |
|---|---|---|
| 1 | Dos RCE críticas sin autenticar en Next.js ≤16.4.0 (y otras 7 altas/críticas) **en producción hoy** | `0b98a23`: Next 16.4.2, Sentry 10.75.3, Zod 4.6.7, overrides con techo |
| 2 | `teacher_payouts_money_chk` rechazaba ajustes positivos: cancelar una liquidación ya descontada habría reventado al recalcular | `472d4f3`, encontrado al releer 0020 ANTES de aplicarla; `05b` lo prueba contra Postgres |
| 3 | Con banderas apagadas, el middleware mandaba a `/login` rutas que no existen (delataba la ruta y cambiaba la conducta respecto a antes) | `authRequiredPrefixes(flags)` |
| 4 | Páginas del marketplace con un guard que LANZA: `AuthError` en Sentry por cada visita sin sesión (visto en el log de producción) | `requireUserPage` + prueba de guards + `globalTeardown` que lee el log del servidor |
| 5 | `/cursos` respondía «404 suave» (200) bajo `loading.tsx` | layout con la bandera; sin `loading.tsx` en el catálogo |
| 6 | El aviso de cookies tapaba «Agendar clase» en celular | reserva de alto en `globals.css` |
| 7 | Un WebM de `MediaRecorder` no se podía subir (duración `Infinity`) | `readVideoDuration` |
| 8 | Calificación distinguida solo por color | estrellas rellenas |
| 9 | Esquemas de moderación aceptaban campos de más | `.strict()` |
| 10 | Trazas de Playwright (con contraseñas de prueba locales) se habrían subido a Vercel | `.vercelignore` |
| 11 | La prueba vieja de usuario nuevo buscaba un título que G101 cambió (estaba saltada) | corregida |

## 6. Textos legales pendientes (`TODO-CLO`) que debe producir el CLO

En producción cada acción que dependa de uno de estos textos **se rechaza sola** hasta integrarlo (`src/lib/marketplace/legal-gate.ts`):

1. **Contrato de comisión mercantil del profesor (adhesión)**, NDA y política de grabación — `src/lib/teachers/onboarding.ts`.
2. **Condiciones de contenido para cursos** (propiedad del contenido, prohibición de usar el banco de YaEntre, reportes y moderación) — `src/lib/courses/rules.ts`.
3. **T&C de cursos y casilla del art. 56 LFPC para cursos** — `src/lib/courses/rules.ts` (hoy se muestra un texto provisional).
4. **Declaración de mayoría de edad para reservar y consentimiento del tutor para menores** (regularización atrae menores; hoy los menores no pueden reservar) — `src/lib/teachers/track-access.ts`.
5. **Aviso de privacidad** por videos de cursos, progreso y grabaciones de clases.
6. Confirmar que el texto art. 56 de planes (`art56-planes-v1`) cubre la **extensión** — `src/lib/subscriptions/extension.ts`.
7. Confirmar que los **correos de vigencia** (incluido el de fin de gracia, que invita a comprar) son transaccionales sin enlace de baja — `src/lib/email/templates.ts`.
8. **Términos y condiciones**: la cláusula de vigencia vigente (hasta la fecha del examen) contradice la regla nueva de 12 meses + gracia.
9. Monitor RESICO: validar con el contador la base exacta (reembolsos, mes de reconocimiento) — `src/lib/admin/resico-monitor.ts`.

## 7. Despliegue realizado

| Dato | Valor |
|---|---|
| Deployment vigente | `dpl_2jSBDu7YyKG26xABuf1dmchsi6sz` (`yaentre-36mtaod4u-ya-entre.vercel.app`), 2026-10-24 12:23 UTC, commit `c994c58`, `vercel --prod --force --scope ya-entre` |
| Deployment intermedio (reemplazado) | `dpl_vXgdksbuMkBqqKowopKU5rVyepTi`, 12:05 UTC, commit `21a10b3` (su humo encontró el hallazgo 4) |
| Deployment anterior (reversa) | `dpl_SBJqfTGcrS9sQ3HQKmyi3LCMLS1q` (`yaentre-ih2fvz5ep`), 22-oct, G102: `vercel promote dpl_SBJqfTGcrS9sQ3HQKmyi3LCMLS1q --scope ya-entre` |
| Respaldo previo | `C:\Users\LENOVO\yaentre-respaldos\g103-pre-migracion-20261024T1147Z.dump` (pg_dump 17 `-Fc`, esquemas `public` y `app_security`, 1.3 MB, 34 tablas con datos, legible con `pg_restore -l`), fuera del repo; y `backups/content-bank.json` (7 380 filas, `0e525c0`) |
| Migraciones | `0019` 11:48:30 UTC (relleno: 1 fila, `graceEndsAt = expiresAt + 7 d`, verificada; hora fijada en la reversa del archivo); `0020` y `0021` después. Verificadas: 12 tablas con RLS sin políticas permisivas, sin acceso para `anon`/`authenticated`, con acceso para `acierta_app`; buckets privados; 5 políticas de Storage; exclusión e índice parcial presentes; `prisma migrate diff` contra producción sin diferencias de G103 |
| Variables | `FEATURE_TEACHER_AVAILABILITY`, `FEATURE_REGULARIZACION`, `FEATURE_COURSES` = `false` en Production. Ningún secreto nuevo |
| Push | `master` = `c994c58` local y remoto (`git ls-remote`) |
| Humo | `/`, `/precios`, `/login`, `/registro`, `/legal/privacidad` 200; `/cursos`, `/cursos/x`, `/regularizacion`, `/clases`, `/clases/mis-clases`, `/profesor`, `/mis-cursos`, `/aprender/x`, `/api/teachers/me/payouts` 404; `/app`, `/paywall` 307 a `/login`; cron sin secreto 401; webhook sin firma 400; CSS servido con la regla nueva; portada sin menciones de clases/cursos; precios «12 meses»; `security:headers` 12/12; log en vivo del despliegue sin errores |
| Sentry | Sin acceso desde esta sesión (la API de Vercel devolvió 403; Sentry no tiene conector). El log en vivo del despliegue no mostró errores durante el humo |

**Acciones manuales para Ángel:**
1. Registrar en el webhook de Stripe los eventos nuevos (`checkout.session.expired`, `payment_intent.succeeded|payment_failed|canceled`, `charge.refunded`) cuando se abra la venta.
2. Supabase **Pro** antes de encender cursos (50 MB por archivo en el plan gratuito).
3. Orden para encender banderas: textos `TODO-CLO` → venta live → profesores aprobados → `FEATURE_TEACHER_AVAILABILITY` → `FEATURE_REGULARIZACION` → `FEATURE_COURSES` (checklist §7).
4. Prueba real de compra con reembolso de un curso, una clase y una extensión.
5. Revisar Sentry la primera hora tras cada encendido.

## 8. Decisiones abiertas para Ángel (todas parametrizadas en una constante)

| Decisión | Dónde | Valor actual |
|---|---|---|
| (a) Tarifas base de regularización | `BASE_RATES_REGULARIZACION`, `src/lib/teachers/tariff.ts` | $220-$300 por materia |
| (b) Regularización abierta sin Premium | `REGULARIZACION_REQUIRES_PREMIUM`, `src/lib/teachers/track-access.ts` | `false` (abierta) |
| (c) Precio de la extensión | `ACCESS_DURATION.EXTENSION_PRICE_CENTS`, `src/lib/subscriptions/access-duration.ts` | $499 Pase / $899 Premium |
| (d) Liquidar `NO_SHOW_STUDENT` (el profesor se presentó, el alumno no) | `classPayableCents`, `src/lib/teachers/payout-calculator.ts` | no se liquida |
| (e) Cancelación con menos de 24 h (¿50 %?) | `app/actions/classes.ts` | solo ≥24 h, reembolso total |
| (f) Menores en regularización | `track-access.ts` | bloqueados hasta el consentimiento del tutor |
| (g) Copy «Premium Garantía» / «Garantía de reembolso» / «Tutorías prioritarias (próximamente)» (previo a G103; el encargo prohíbe «garantía» y «próximamente») | `src/components/paywall/PlanCard.tsx`, nombre del plan | sin cambio: es decisión comercial |
| (h) Demanda por defecto y franja de las 7:00 | `DEFAULT_DEMAND_CATEGORY` (`NORMAL`); 7:00 entre semana = vespertino según el código de la spec | sin cambio |
| (i) Roles contador/soporte | — | hoy solo ADMIN; el monitor RESICO es de admin |
| (j) Retención de datos fiscales del profesor al borrar la cuenta | — | sin política |

## 9. Riesgos conocidos y deuda técnica

1. **Deriva de la base por otra rama**: `claude/yaentre-settings-review-fevyqz` (sin fusionar) aplicó a producción `notification_deliveries`, `system_settings`, columnas de recordatorios en `user_profiles` y dos valores de `NotificationType`. Hoy convive (columnas con valor por defecto, sin filas con los valores nuevos), pero sus archivos `0019_*`/`0020_*` chocan en número con los de G103: renumerarlos al fusionar. La rama `claude/intelligent-gates-sxp9pr` trae referidos (Bloque 3) que se cruzan con `src/lib/referrals/eligibility.ts`.
2. **Deuda por reembolso sin ventas futuras**: si un profesor no vuelve a vender, el ajuste negativo queda pendiente (visible en `/admin/liquidaciones`); no hay cobro activo.
3. **«404 suave» en rutas PRIVADAS** con recurso inexistente (`/aprender/<slug>`, `/clases/profesor/<id>`) bajo `loading.tsx`: privadas y `noindex`, bajo impacto.
4. Duración total del curso en el encabezado: se recalcula al subir; el e2e ajusta la lección directo en la base (atajo documentado).
5. La suite e2e principal (`tests/e2e`) sigue dependiendo de credenciales reales; la local cubre los flujos de G103 y la regresión.
6. Sentry no se pudo revisar desde la sesión.
7. Ocho avisos bajos/moderados de dependencias por debajo del umbral.
8. Aviso «Instala YaEntre como app» tapa parte del pie en escritorio (previo, se puede cerrar).
