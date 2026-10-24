# Implementación — horarios, cursos, regularización y temporalidad (G103)

> Plan de trabajo de la spec `docs/specs/ESPECIFICACION_HORARIOS_CURSOS_TEMPORALIDAD_CTO.md`
> (23-oct-2026), que extiende `docs/specs/ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md`
> y `docs/specs/ESPECIFICACION_QR_COMISIONES_CTO.md`. Rama
> `feat/horarios-cursos-regularizacion-temporalidad`. Retorno en
> `docs/RETORNO_HORARIOS_CURSOS.md`.

## 0. Línea base (Fase 0, antes de tocar nada)

| Compuerta | Resultado |
|---|---|
| `pnpm typecheck` | verde (20 s) |
| `pnpm lint` | verde (57 s) |
| `pnpm test:unit` | **1289/1289**, 86 archivos (79 s) |
| `pnpm build` | verde (68 s); único aviso: `MODULE_TYPELESS_PACKAGE_JSON` de `tailwind.config.ts` (preexistente) |

### Inventario: lo que existe y lo que no

| Pieza | Estado en el repo |
|---|---|
| `Subscription` | Existe. `startedAt`, `expiresAt` (= fecha del examen, respaldo 150 días; `null` en MONTHLY). Sin gracia ni extensión. Acceso = `status ACTIVE` y `expiresAt` nula o futura (`getActiveSubscription`). |
| Planes | `MONTHLY`, `SEASON_PASS` (= «Básico»), `PREMIUM`. Precios viejos ($499 EB) y `hasGuarantee`: **fuera del alcance** (bloque 1 del CONTEXTO). |
| Producción | **1** suscripción: PREMIUM ACTIVE, no cortesía, vence 2027-07-25 (fixture E2E). 0 ventas reales (Stripe en prueba, venta cerrada por G98). |
| `Teacher`, `ClassSession`, `TeacherPayout`, `TeacherSubject` | **No existen.** Ninguna pieza del marketplace de profesores está implementada. |
| Referidos (`ReferralCode`, `/r/{code}`) | **No existen.** La regla «cursos y clases no generan referido» queda como guarda pura lista para cuando exista. |
| Consentimiento del tutor por liga / fecha de nacimiento | **No existen** (bloque 1 del CONTEXTO). |
| Casilla del art. 56 en el checkout de planes | **No existe.** |
| Roles | `STUDENT`, `PARENT`, `ADMIN`. No hay «contador» ni «soporte». |
| Migraciones | SQL plano (`prisma/migrations/00NN_*.sql`) aplicado como `postgres` por el panel/API de Supabase — no `prisma migrate deploy` (el rol de la app no tiene CREATE en `public`). |
| Base de datos | **Una sola** (proyecto `fumluvvzskhdxcyljbmx`). Local y producción comparten base. |
| Storage | `avatars` y `guias-oficiales` (públicos), `admin-vault` (privado, políticas `is_admin()`). Sin service-role en el camino de la bóveda: usa la sesión del usuario + RLS. |
| Crons | `notifications` (13:00 UTC) y `reconcile-payments` (14:00 UTC). |
| Fechas | `src/lib/paywall/mexico-time.ts` (UTC−6 fijo + `MEXICO_TIME_ZONE`). Sin `date-fns`. |

## 1. Decisiones técnicas (el repo manda en lo técnico)

1. **Nombres.** La identidad del usuario es `UserProfile.id`, no `User.id`: `Teacher.userProfileId`, `ClassSession.studentProfileId`, `CourseEnrollment.userProfileId`. Tablas en snake_case con `@@map`, columnas camelCase (convención del repo).
2. **`startsAt` no se agrega**: `Subscription.startedAt` ya cumple ese papel. Se agregan `extendedAt`, `originalExpiresAt`, `graceEndsAt`, `expiryNoticesSent` (idempotencia de correos) y `extensionConsentAt/Version`.
3. **12 meses = meses de calendario en hora de México** (no 365 días): «12 meses de acceso» es lo que se promete; en año bisiesto 365 días entregaría un día menos. Extensión = 6 meses de calendario. Gracia = 7 días.
4. **La gracia da acceso**: la spec dice «después de esa fecha perderás el acceso». `getActiveSubscription` acepta `graceEndsAt > now`.
5. **Mutaciones**: Server Actions (convención del repo) salvo los endpoints que el encargo nombra explícitamente, que son Route Handlers con `same-origin` + guard + Zod + límite de tasa compartido.
6. **Webhook**: un pre-enrutador por `metadata.kind` (`access_extension`, `class_booking`, `course_purchase`) delante de `handleStripeEvent`, que queda **intacto** para los planes. Idempotencia por `processed_stripe_events` en la misma transacción.
7. **Toda venta nueva pasa por `salesGate()` en su primera línea** (extensión, curso, clase): con llave de prueba en producción no se vende nada, igual que los planes.
8. **Doble reserva imposible en la base**: restricción de exclusión `EXCLUDE USING gist` sobre `tsrange(scheduledAt, blockedUntil)` por profesor (extensión `btree_gist`), más candado consultivo por profesor para dar un mensaje limpio.
9. **Zona horaria**: `date-fns-tz` (`fromZonedTime`/`toZonedTime`) con `America/Mexico_City` de extremo a extremo; `scheduledAt` en UTC. Corrige el `new Date(\`${date}T${time}\`)` de la spec, que usa la zona del servidor.
10. **Storage de cursos**: bucket privado `course-videos`; subida por URL firmada emitida en el servidor tras validar dueño, estado, tipo y cuota; validación del tipo REAL leyendo los primeros bytes (firma `ftyp`/EBML) tras subir; reproducción con URL firmada de 1 h renovable. Políticas RLS por funciones `SECURITY DEFINER` (patrón de `is_admin()`).
11. **Texto de lecciones, descripciones y reseñas**: se pintan como texto plano (`whitespace-pre-wrap`), nunca como HTML/Markdown interpretado — mismo criterio que la bóveda.
12. **Flags de servidor** `FEATURE_COURSES`, `FEATURE_REGULARIZACION`, `FEATURE_TEACHER_AVAILABILITY` (ausente o ≠ `true` ⇒ apagado). `FEATURE_TEACHER_AVAILABILITY` enciende el marketplace de clases en vivo (profesores, disponibilidad, directorio, reserva); `FEATURE_REGULARIZACION` la pista y `/regularizacion`; `FEATURE_COURSES` el marketplace de cursos. Con un flag apagado la ruta responde 404 y la acción se rechaza en servidor.
13. **Textos legales `TODO-CLO`**: en producción, una acción que dependa de un texto pendiente se rechaza y se reporta (mismo patrón que G98: un párrafo no es un candado).
14. **Sin crons nuevos en `vercel.json`**: el aviso de vigencia corre dentro del cron diario de notificaciones (y por su propia ruta protegida); la liberación de reservas y la caducidad de apartados se resuelven de forma perezosa.

## 2. Mapa de archivos

| Fase | Archivos |
|---|---|
| 1 Temporalidad | `prisma/schema.prisma`, `prisma/migrations/0019_access_temporality_g103.sql`, `src/lib/subscriptions/{access-duration,access-check,extension}.ts`, `src/lib/stripe/expiry.ts`, `src/lib/db/{billing,paywall,access-extension,access-expiry-jobs}.ts`, `src/lib/stripe/marketplace-webhook.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/me/subscription/{route,extend/route}.ts`, `app/api/admin/subscriptions/expiring/route.ts`, `app/api/cron/access-expiry/route.ts`, `src/lib/email/templates.ts`, `src/components/subscription/*`, `app/(app)/app/extender/*`, `app/admin/vigencias/page.tsx`, `app/(public)/precios/page.tsx` |
| 2 Mensajería | `src/components/marketing/Hero.tsx`, `app/(public)/page.tsx`, `app/layout.tsx`, `src/components/marketing/Differentiators.tsx`, `tests/marketing/forbidden-copy.test.ts` |
| 3 Disponibilidad | `prisma/migrations/0020_teacher_marketplace_g103.sql`, `src/lib/marketplace/flags.ts`, `src/lib/teachers/{availability,slot-calculator,conflict-prevention,tariff,subject-catalog,onboarding,level-engine}.ts`, `src/lib/db/{teachers,classes}.ts`, `app/api/teachers/me/{availability,date-blocks}/…`, `app/api/classes/teachers/[id]/slots/route.ts`, `app/profesor/*`, `src/components/teachers/*` |
| 4 Regularización | `src/lib/teachers/track-access.ts`, `app/actions/classes.ts`, `app/clases/*`, `src/components/classes/*` |
| 5 Cursos | `prisma/migrations/0021_course_marketplace_g103.sql`, `src/lib/courses/*`, `src/lib/db/courses.ts`, `app/actions/{courses-teacher,courses-student,admin-courses}.ts`, `app/(public)/cursos/*`, `app/(public)/regularizacion/page.tsx`, `app/cursos/*` (privadas), `app/profesor/cursos/*`, `app/admin/cursos/*` |
| 6 Pagos/RESICO | `src/lib/teachers/{payout-calculator,payout-sheet}.ts`, `src/lib/admin/resico-monitor.ts`, `src/lib/db/payouts.ts`, `app/actions/admin-marketplace.ts`, `app/admin/{profesores,liquidaciones,resico}/*` |
| 7 Cierre | `tests/e2e/marketplace.spec.ts`, `docs/CHECKLIST_DEPLOY_HORARIOS_CURSOS.md`, `docs/ESTADO.md`, `docs/Backend_Schema_Acierta_v1.0.md` |

## 3. Orden y compuertas

Cada fase: implementación → pruebas → `typecheck`/`lint`/`test:unit` en verde → commit.

**Orden de aplicación de migraciones (adaptación obligada).** Solo hay UNA base, compartida por local y producción, así que el E2E local necesita el esquema nuevo antes del despliegue del código. Las tres migraciones son aditivas (tablas, columnas con default o nulables, enums nuevos, un índice de exclusión sobre una tabla nueva) y el código desplegado hoy las ignora: se aplican **después** de que typecheck/lint/unit/build estén en verde y **después** del respaldo previo, y **antes** del E2E. El despliegue del código va al final, sobre el commit que pasó toda la compuerta.

## 4. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Romper el acceso de alumnos existentes al cambiar la vigencia | El cálculo nuevo solo aplica a activaciones nuevas; el backfill conserva `expiresAt` y solo agrega `graceEndsAt = expiresAt + 7 d` (documentado); prueba de que la suscripción vigente sigue dando acceso. |
| Que el webhook de planes cambie de comportamiento | Pre-enrutador por `metadata.kind`; los eventos sin `kind` llegan a `handleStripeEvent` exactamente igual; suites `tests/stripe/*` sin tocar. |
| Venta con llave de prueba en producción | `salesGate()` en la primera línea de cada acción que cobra. |
| Doble reserva concurrente | Restricción de exclusión en Postgres + candado por profesor; prueba concurrente real contra la base. |
| Vídeos expuestos | Bucket privado, sin URLs públicas, políticas por función, URL firmada de vida corta tras verificar inscripción, `media-src` mínimo en la CSP, service worker que no toca orígenes externos. |
| Datos fiscales (CLABE/RFC/CURP) en logs o en el navegador | Nunca en `console`, Sentry ni PostHog; enmascarados en la interfaz; `/profesor` y `/api/teachers` fuera del service worker. |
| Supabase gratuito: tope global de 50 MB por archivo y 1 GB de almacenamiento | El código aplica 500 MB/5 GB de la spec; **encender `FEATURE_COURSES` exige plan Pro** (anotado en el checklist). |
