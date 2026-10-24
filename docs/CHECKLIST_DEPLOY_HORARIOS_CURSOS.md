# Checklist de despliegue — horarios, regularización, cursos y temporalidad (G103)

> Pasos manuales para Ángel. El despliegue de G103 sale con las **tres banderas
> apagadas**: la app se comporta igual que antes salvo la temporalidad de los
> planes (12 meses + gracia + extensión), que no tiene bandera porque es la
> regla de negocio nueva de los planes. Lo que ya se hizo en el despliegue de
> G103 está marcado como tal en `docs/RETORNO_HORARIOS_CURSOS.md` §7.

## 1. Antes de migrar

- [ ] Respaldo **fuera del repo** de las tablas que tocan las migraciones
      (`subscriptions` en especial: 0019 escribe `graceEndsAt`) y `pnpm backup:export`
      del banco de contenido. Sin respaldo, no se migra.
- [ ] Anotar el deployment actual de producción (para la reversa):
      `vercel ls yaentre --scope ya-entre`.

## 2. Migraciones (como `postgres`, por el panel/API de Supabase)

El rol de la app no tiene `CREATE` sobre `public` (CLAUDE.md): `prisma db execute`
no sirve para estas tres. Son 100 % aditivas.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `prisma/migrations/0019_access_temporality_g103.sql` | Columnas de temporalidad en `subscriptions` + relleno idempotente `graceEndsAt = expiresAt + 7 días` (solo donde es nulo). Reversa al pie del archivo: anotar la hora UTC de aplicación ahí. |
| 2 | `prisma/migrations/0020_teacher_marketplace_g103.sql` | Profesores, disponibilidad, fechas bloqueadas, clases, liquidaciones. Extensión `btree_gist` + restricción de exclusión `class_sessions_no_overlap` (doble reserva imposible en la base) + único parcial `teacher_payouts_active_week_key`. RLS cerrada. |
| 3 | `prisma/migrations/0021_course_marketplace_g103.sql` | Cursos, módulos, lecciones, inscripciones, progreso, libro de ajustes de liquidaciones; buckets privados `course-videos` y `teacher-documents` con sus políticas de Storage y funciones `SECURITY DEFINER`. |

Verificación de solo lectura después de aplicar:

- [ ] `prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script`
      debe reportar SOLO lo que vive fuera de Prisma a propósito: los índices de
      rendimiento de 0012, `class_sessions_no_overlap` y `teacher_payouts_active_week_key`.
- [ ] Las tablas nuevas: RLS habilitada, sin GRANT a `anon`/`authenticated`, con GRANT a `acierta_app`.
- [ ] Storage por efecto: con la anon key, `course-videos` no lista ni sirve objetos
      por URL pública (bucket privado).

## 3. Variables de entorno (Vercel, equipo `ya-entre`)

- [ ] `FEATURE_TEACHER_AVAILABILITY=false`, `FEATURE_REGULARIZACION=false`,
      `FEATURE_COURSES=false` en Production (y Preview). Ausentes también es «apagado».
- [ ] `STRIPE_E2E_LOCAL_API` **no** debe existir en Vercel ni en el servidor propio
      (solo la pila local de e2e; de todos modos se ignora con `VERCEL_ENV`).
- [ ] Sin secretos nuevos: el aviso de vigencia usa el `CRON_SECRET` existente.

## 4. Cron

- [ ] Nada que programar: el aviso de vigencia (T−30, T−7, T−1, T0, fin de gracia)
      corre dentro del cron diario existente `/api/cron/notifications`
      (`vercel.json`). La ruta `/api/cron/access-expiry` existe para correrlo a
      mano con el mismo secreto.
- [ ] Las liquidaciones semanales NO tienen cron: el admin maestro las calcula en
      `/admin/liquidaciones` («Calcular la semana»), las aprueba, transfiere por
      SPEI y marca con la clave de rastreo.

## 5. Stripe (cuando se abra la venta con llaves live)

- [ ] El endpoint del webhook debe escuchar, además de los eventos de planes:
      `checkout.session.expired`, `payment_intent.succeeded`,
      `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`.
      `pnpm tsx scripts/setup-stripe-webhook.ts` los registra; o en el panel.
- [ ] Prueba real de compra con reembolso: un curso, una extensión de vigencia y
      una clase (el reembolso revoca el acceso al curso y, si ya estaba liquidado,
      deja un ajuste negativo para la siguiente liquidación).

## 6. Infraestructura antes de encender cursos

- [ ] **Supabase Pro**: el plan gratuito limita a 50 MB por archivo y 1 GB de
      Storage; un video de curso admite hasta 500 MB y un curso hasta 5 GB.
      Con `FEATURE_COURSES=true` en el plan gratuito, las subidas grandes fallan.
- [ ] Vercel con uso comercial (ver `docs/VEREDICTO_LANZAMIENTO.md`).

## 7. Orden recomendado para encender (cada paso, un redeploy)

1. Textos legales `TODO-CLO` integrados (ver `docs/RETORNO_HORARIOS_CURSOS.md` §6):
   en producción, toda acción que dependa de un texto con versión `TODO-CLO` se
   rechaza sola (no basta encender la bandera).
2. Venta abierta con llaves live (`docs/STRIPE_LIVE_CHECKLIST.md`).
3. Profesores reales dados de alta y aprobados desde `/admin/profesores`
   (con la bandera de clases apagada el panel del profesor no existe: para dar de
   alta antes de abrir, encender en Preview).
4. `FEATURE_TEACHER_AVAILABILITY=true` — clases en vivo de admisión (Premium).
5. `FEATURE_REGULARIZACION=true` — pista de regularización y `/regularizacion`.
6. `FEATURE_COURSES=true` — cursos pregrabados (requiere el paso 6 de infraestructura).

## 8. Después de cada despliegue

- [ ] Tras tocar `app/globals.css` (G103 lo hizo: reserva de alto del aviso de
      cookies), desplegar con `vercel --prod --force --scope ya-entre` y comprobar
      que el `.css` servido contiene la regla nueva (lección de G102).
- [ ] Humo: `/`, `/precios`, `/login`, `/app` con sesión, `/admin` con admin; con
      banderas apagadas `/cursos`, `/clases`, `/profesor`, `/regularizacion` → 404.
- [ ] Sentry y logs de Vercel sin errores nuevos en la primera hora.
- [ ] Reversa: `vercel promote <deployment anterior> --scope ya-entre`. Las
      migraciones son aditivas: el código anterior ignora tablas y columnas nuevas.

## 9. E2E local antes de encender cualquier bandera

`tests/e2e-local/README.md`: la suite corre los cinco flujos con las banderas
encendidas contra una pila 100 % local (Supabase en Docker + simulador de
Stripe). Debe estar verde sobre el commit que se va a encender.
