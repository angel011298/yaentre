# Escala — G69 (2026-09-02)

> Objetivo: saber **qué aguanta la infraestructura de hoy**, dónde se rompe
> primero, y qué cuesta sostener 500, 1 000 y 5 000 alumnos activos.
>
> Todo lo marcado como *medido* sale de una corrida real contra la
> infraestructura viva: Supabase `fumluvvzskhdxcyljbmx` (PostgreSQL 17.6,
> us-east-1, plan **gratuito**) y el sitio en producción `https://yaentre.com`
> (Vercel, plan **hobby**, región `iad1`). Los scripts quedan versionados:
> `pnpm scale:audit`, `pnpm scale:pool`, `pnpm scale:load`.
>
> Lo que es *estimación* se marca como tal y se muestra la aritmética. No se
> mezclan las dos cosas.

---

## 0. Resumen ejecutivo

**El cuello de botella no es la base de datos.** Es lo primero que hay que
decir, porque contradice la sospecha razonable con la que empezó esta fase (en
serverless suele serlo). Aquí no: con el tráfico del lanzamiento, Postgres
trabaja **86 ms de CPU** para un recorrido de usuario completo, y el pooler
absorbe la concurrencia sin despeinarse.

Los que sí se rompen, en el orden en que van a romperse:

| # | Punto de quiebre | Cuándo revienta | Estado |
|---|---|---|---|
| 1 | **Correo de Supabase Auth** — sin SMTP propio, el registro devuelve `over_email_send_rate_limit` | **Ya está roto.** Nadie puede registrarse hoy | 🔴 bloquea el lanzamiento |
| 2 | **Vercel Hobby prohíbe el uso comercial** | Al primer cobro. La sanción es la pausa del despliegue | 🔴 bloquea el lanzamiento |
| 3 | **Resend gratuito: 100 correos/día** | ~100 alumnos activos | 🟠 semana 1 |
| 4 | **Alta de usuarios de Supabase Auth: 30/hora** (default con SMTP propio) | Una campaña que traiga >30 registros/hora | 🟠 día del lanzamiento |
| 5 | **Tamaño de la base: 500 MB** en el plan gratuito → modo solo-lectura | ~3 200 alumnos-temporada | 🟡 mes 2-3 |
| 6 | **Egreso de Supabase: 5 GB/mes por ORGANIZACIÓN** (compartido con el otro proyecto activo) | ~2 800 alumnos activos/mes | 🟡 mes 2-3 |
| 7 | **Invocaciones de Vercel: 1 M/mes** (Hobby) | ~1 400 alumnos activos/mes | 🟡 (moot: hay que pasar a Pro antes por el punto 2) |
| 8 | Conexiones de Postgres | **~10 000 alumnos simultáneos en simulacro** (calculado; ver §5) | 🟢 no es el problema |

**Lo que cuesta arreglarlo** (detalle en §7):

| Alumnos activos | Vercel | Supabase | Resend | **Total/mes** |
|---|---|---|---|---|
| 500 | $20 | $25 | $20 | **$65 USD** (~$1 200 MXN) |
| 1 000 | $20 | $30 | $20 | **$70 USD** (~$1 300 MXN) |
| 5 000 | $20 | $30 | $35 | **$85 USD** (~$1 550 MXN) |

La cifra sorprendente es que **el costo casi no crece con los usuarios**: lo
que se paga son cuotas de plataforma, no consumo. El salto real es de $0 a
$65; de ahí a 5 000 alumnos son $20 más.

Y como parte de esta misma fase se ganó capacidad **sin gastar un peso** (§8):
un simulacro completo pasó de **635 a 396 operaciones** de base de datos
(−38 %), el diagnóstico de **149 a 89** (−40 %), y el middleware dejó de
preguntarle a Supabase Auth quién es el usuario en las peticiones donde la
respuesta se tiraba a la basura (~140 viajes de red menos por simulacro).

---

## 1. Límites reales de cada servicio

### 1.1 Supabase — plan **Free** (organización `ixsufkgytbaunwnpczna`)

Verificado en vivo con el conector de Supabase: `plan: "free"`.

| Recurso | Límite Free | Medido hoy | Fuente |
|---|---|---|---|
| Tamaño de base **por proyecto** | **500 MB** → modo solo-lectura al superarlo | **20 MB** (tablas de `public`: 7 792 kB) | docs + `pg_database_size` |
| Disco | 1 GB | WAL solo ya ocupa **128 MB** | `pg_ls_waldir()` |
| Egreso **por organización** | **5 GB/mes** (10 GB de ancho de banda: 5 cacheado + 5 sin cachear) | no metered aquí | docs de facturación |
| Almacenamiento (Storage) | 1 GB | avatares, marginal | docs |
| MAU (Auth) | 50 000 | 5 | docs |
| Proyectos activos | **2** | **2 de 2 usados** (`Acierta` + `financeos-whatsapp`) | conector |
| Cómputo | **Nano**: CPU compartida, **0.5 GB RAM** | `shared_buffers` 224 MB, `effective_cache_size` 384 MB | `pg_settings` |
| Conexiones directas a Postgres | **60** (`superuser_reserved` = 3 ⇒ 57 útiles) | 13-16 en reposo | `pg_settings` |
| Conexiones de cliente al pooler | **200** | — | docs de compute |
| Respaldos restaurables | **ninguno** | — | docs (ya documentado en G61) |
| Pausa por inactividad | **a los 7 días** sin actividad | — | docs |

Tres cosas de esta tabla merecen atención especial:

**El egreso y el MAU son cuotas de la ORGANIZACIÓN, no del proyecto.** La
organización tiene 4 proyectos, 2 de ellos activos: `Acierta` y
`financeos-whatsapp`. Ese segundo proyecto consume del mismo presupuesto de
5 GB. Si YaEntre despega y alguien está usando el otro proyecto, se topan
juntos.

**Ya se usaron los 2 proyectos activos del plan gratuito.** No hay espacio para
un proyecto de *staging* sin pagar o sin apagar el otro.

**El plan gratuito pausa proyectos con 7 días de inactividad.** Entre hoy y el
6 de enero hay semanas en las que nadie va a tocar la app. Un proyecto pausado
no responde: el lanzamiento se encuentra con un 503 y hay que despausarlo a
mano desde el panel.

### 1.2 Supabase Auth — los límites que hoy **bloquean el registro**

| Endpoint | Límite | Configurable |
|---|---|---|
| Todo lo que manda correo (`/signup`, `/recover`, `/user`) | Un puñado de correos/hora con el SMTP integrado — **el registro real ya falla con `over_email_send_rate_limit`** (reproducido en G7, G9 y G12) | **Solo con SMTP propio** |
| Lo mismo, **con SMTP propio** | **30 usuarios nuevos por hora** por defecto | Sí (Authentication → Rate Limits) |
| `/auth/v1/verify` (confirmación de correo) | **360/hora por IP** | No |
| `/auth/v1/token` (refresco de sesión) | **1 800/hora por IP** | No |

⚠️ **Los dos últimos se cuentan por IP, y la app llama a Supabase Auth desde el
servidor.** O sea: para Supabase, *todas* las peticiones de *todos* los alumnos
vienen de las IPs de Vercel y comparten el mismo cubo. 1 800 refrescos/hora
suena a mucho hasta que se recuerda que son 1 800 **para toda la plataforma**,
no por alumno. Supabase tiene una salida documentada — la cabecera
`Sb-Forwarded-For`, que hay que **habilitar explícitamente** en el proyecto y
que exige una llave secreta de API — pero hoy no está activada. Ver §9.

### 1.3 Vercel — plan **Hobby** (equipo `angel011298s-projects`)

Verificado en vivo con el conector de Vercel: `plan: "hobby"`.

| Recurso | Incluido en Hobby | Incluido en Pro |
|---|---|---|
| Fast Data Transfer | 100 GB | **1 TB**, luego $0.15/GB (iad1) |
| Fast Origin Transfer | 10 GB | luego $0.06/GB |
| Invocaciones de función | **1 000 000** | por uso, $0.60/M |
| Active CPU | **4 CPU-hrs** | por uso, $0.128/hr (iad1) |
| Memoria aprovisionada | **360 GB-hrs** | por uso, $0.0106/GB-hr (iad1) |
| Edge Requests | tope de plan | **10 000 000**, luego $2.00/M |
| Duración máx. de función | 300 s | 300 s (configurable hasta 800 s) |
| Cron jobs por proyecto | 100 | 100 |
| Logs de runtime | 1 hora | 1 día |

Y el que no es una cuota sino una regla:

> **«Hobby teams are restricted to non-commercial personal use only. All
> commercial usage of the platform requires either a Pro or Enterprise plan.»**
> — [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)

La misma página define uso comercial como, textualmente, *cualquier método de
solicitar o procesar pagos de los visitantes del sitio*. YaEntre tiene Stripe
Checkout en producción. **No es una zona gris: hoy el proyecto está fuera de
los términos de su plan**, y la consecuencia documentada es la pausa del
despliegue. Es el riesgo más caro del inventario, porque no avisa
proporcionalmente: no se degrada, se apaga.

### 1.4 Resend — plan **Free**

| | Free | Pro |
|---|---|---|
| Correos/mes | **3 000** | 50 000 ($20) · 100 000 ($35) |
| **Correos/día** | **100** | sin tope diario |
| Dominios | 3 | 10 |
| Retención | 30 días | 30 días |

El tope **diario** de 100 es el que muerde primero: no hace falta llegar a
3 000 al mes para quedarse sin correo un martes.

### 1.5 Los demás

| Servicio | Estado hoy | Límite del plan gratuito |
|---|---|---|
| **Stripe** | Llaves de prueba; sin cuenta live | Sin cuota: **3.6 % + $3 MXN** por tarjeta nacional (+0.5 % internacional, +2 % si hay conversión); **4 % + $3 MXN** en OXXO/SPEI |
| **Sentry** | **Sin configurar** (DSN es un marcador) | — |
| **PostHog** | **Sin configurar** (key es un marcador) | 1 M eventos, 5 K grabaciones, 1 M peticiones de feature flags al mes |

Sentry y PostHog no consumen nada porque no existen. Eso no es una ventaja: el
día del lanzamiento no va a haber telemetría con la que decidir nada, y varias
de las decisiones de esta fase (§9) piden justamente datos reales.

---

## 2. Cuánto consume un alumno — medido

`pnpm scale:audit` (nuevo en G69) instrumenta el cliente de Prisma
(`log: 'query'`) y corre los recorridos **reales** — los mismos módulos de
`src/lib/db/*` que ejecutan las Server Actions, no una reimplementación —
sobre un perfil desechable que el propio script crea y borra. Cuenta las tres
magnitudes que importan:

- **ops**: operaciones de Prisma. Con `?pgbouncer=true` cada una se envuelve en
  su propia transacción, así que **una op = una conexión de servidor del pooler
  ocupada durante 4 viajes de red**. Es la unidad que compite por el recurso
  escaso.
- **sentencias**: viajes totales al pooler (`BEGIN` / `DEALLOCATE ALL` /
  la consulta / `COMMIT`).
- **peticiones HTTP**: invocaciones de función de Vercel.

### 2.1 Coste por paso (después de las optimizaciones de §8)

| Paso | ops | sentencias | nota |
|---|---|---|---|
| `diag/carga-pagina` | 1 | 4 | |
| `diag/arranque` | 5 | 27 | incluye el advisory lock |
| `diag/hidratar` | 1 | 8 | |
| `diag/responder-1` | **2** | 8 | **× 30 reactivos** |
| `diag/cierre` | 17 | 71 | recalcula temas débiles + Entrómetro + racha |
| `diag/resultados` | 5 | 26 | |
| `sim/carga-pagina` | 1 | 4 | |
| `sim/portada` | 1 | 9 | |
| `sim/arranque` | 7 | 43 | |
| `sim/sync-1-respuesta` | 4 | 16 | primer lote (fija `completedFullscreen`) |
| `sim/sync-1-estable` | **3** | 12 | **× 119 — el régimen del examen** |
| `sim/cierre` | 16 | 66 | |
| `sim/resultados` | 8 | 37 | incluye el percentil |
| `sim/revision` | 2 | 12 | |
| `practica/opciones` | 3 | 18 | |
| `practica/muro-suave` | 2 | 8 | |
| `practica/arranque` | 11 | 55 | selector adaptativo |
| `practica/responder-1` | **2** | 8 | **× 10 reactivos** |
| `practica/explicacion` | 2 | 8 | |
| `practica/cierre` | 16 | 67 | |
| `pantalla/dashboard` | 12 | 54 | 9 loaders en `Promise.all` |

### 2.2 Coste por recorrido completo

| Recorrido | ops (antes de G69) | **ops (hoy)** | viajes al pooler | peticiones HTTP |
|---|---|---|---|---|
| Diagnóstico (30 reactivos) | 149 | **89** (−40 %) | 356 | 35 |
| **Simulacro completo (120 reactivos)** | 635 | **396** (−38 %) | 1 584 | **126** |
| Práctica libre (10 reactivos) | 74 | **54** (−27 %) | 216 | 15 |
| Dashboard (una carga) | 12 | **12** | 48 | 1 |

El simulacro domina, y dentro del simulacro domina **la sincronización**: el
cliente manda un lote a `/api/simulator/sync` cada 15 s, pero **solo cuando hay
algo nuevo** (`useSimulatorSync` compara el cuerpo serializado con el último
enviado), así que la cota superior es *una sincronización por respuesta*. 119
sincronizaciones × 3 ops = 357 de las 396 ops del recorrido.

Datos de carga útil (medidos en la misma corrida):

- Payload del simulacro servido al cliente: **59 kB** de JSON.
- Payload de resultados: **1.3 kB**.
- HTML servido en producción (brotli): `/` **63.5 kB**, `/precios` **42.3 kB**,
  `/login` **17.4 kB**.
- Una sola vista de la landing dispara **~16 peticiones de assets estáticos**
  más **~20 pre-cargas `?_rsc=`** (contadas en el build de producción). Ese
  multiplicador es lo que de verdad consume el presupuesto de *Edge Requests*.

### 2.3 Trabajo real de Postgres: 86 ms por recorrido completo

Se tomó el delta de `pg_stat_statements` para el rol de la app alrededor de una
corrida completa de `pnpm scale:audit`:

```
antes:   64 630 llamadas · 336 095.0 ms de tiempo de ejecución
después: 65 923 llamadas · 336 181.2 ms
delta:    1 293 sentencias ·      86.2 ms
```

**1 293 sentencias cuestan 86 ms de CPU de Postgres** — 0.067 ms de media por
sentencia. Un recorrido de usuario entero (diagnóstico + simulacro de 120
reactivos + práctica + dashboard) hace trabajar a la base **menos de una
décima de segundo**.

Esto es lo que decide toda la conversación de capacidad: **la base de datos no
es el recurso escaso**. Lo que cuesta es el *viaje de red*, no el cómputo. Y
por eso la palanca correcta es hacer menos operaciones (§8), no comprar una
base más grande.

### 2.4 Perfil mensual de un alumno activo (estimación)

Usando el modelo de temporada de G59 (que a su vez viene del banco de pruebas
de 2 000 alumnos: 18 sesiones y 428 respuestas por alumno):

| Actividad | Frecuencia mensual | ops | peticiones |
|---|---|---|---|
| Simulacros completos | 2 | 792 | 252 |
| Prácticas libres | 15 | 810 | 225 |
| Cargas de dashboard/progreso | 40 | 480 | 40 |
| Diagnóstico (amortizado) | 1/6 | 15 | 6 |
| **Total** | | **≈ 2 100 ops** | **≈ 520 peticiones** |

Con las pre-cargas y las navegaciones RSC, las **invocaciones de función**
suben a **≈ 700/alumno/mes**, y los **Edge Requests** a **≈ 2 100** (assets
estáticos y pre-cargas incluidos).

---

## 3. Almacenamiento: cuántos alumnos caben en 500 MB

Medido de verdad, no estimado: se creó un esquema aislado `g69_size` con una
copia de `session_answers` (`LIKE … INCLUDING ALL`, o sea con sus mismos
índices), se poblaron **100 000 filas** sintéticas y se midió. El esquema se
**eliminó** al terminar; la base volvió a 20 MB.

```
total   31 MB   (heap 12 MB + índices 19 MB)
→ 325 bytes por fila de session_answers
```

Los índices pesan **más que los datos** (197 B contra 128 B por fila). Es el
precio de los 18 índices que añadió G59, y está bien pagado: sin ellos la
insignia de «materia dominada» costaba 204 ms por materia.

Con el modelo de temporada (428 respuestas/alumno):

| | Por alumno-temporada |
|---|---|
| `session_answers` | 428 × 325 B = **139 kB** |
| `exam_sessions` (18) + perfil + `learning_profile` + `weak_topics` + racha | ~11 kB |
| **Total** | **≈ 150 kB** |

**Techo del plan gratuito:** (500 MB − 20 MB actuales) ÷ 150 kB ≈ **3 200
alumnos-temporada**. Un alumno muy intenso (6 simulacros + 90 prácticas) gasta
~550 kB, así que el rango honesto es **900 – 3 200 alumnos** según qué tan
activos sean.

Al cruzar los 500 MB, Supabase pone la base en **solo lectura**: los alumnos
pueden leer sus datos pero no responder ni guardar nada. En plena temporada de
exámenes eso es indistinguible de una caída.

> Nota: el WAL (128 MB hoy) **no** cuenta contra los 500 MB de *tamaño de base*,
> pero sí contra el 1 GB de *disco*. Vale la pena tenerlo en el radar.

---

## 4. Prueba de carga controlada

Dos capas, porque miden cosas distintas. Ambas con `pnpm scale:load`.

**Cómo se acotó para no hacer daño:** rampa corta (≤24 concurrentes, unos
cientos de peticiones en total — menos de lo que genera un salón de 30 alumnos
entrando a la vez), enfriamiento entre pasos, corte automático si la tasa de
error de un paso supera el 25 %, y **ninguna ruta que escriba, cobre o mande
correo**. Solo `GET` idempotentes contra producción y lecturas contra la base.

### 4.1 Capa Vercel — contra `https://yaentre.com` (producción real)

| Ruta | c=1 | c=4 | c=8 | c=16 | c=24 | errores |
|---|---|---|---|---|---|---|
| `/` (ISR) | 3.6 req/s · p50 101 ms | 20 · 106 ms | 47.4 · 92 ms | 122.7 · 94 ms | **178.1 req/s · p50 92 ms** | **0** |
| `/precios` (ISR) | 7.8 · 92 ms | 33.1 · 93 ms | 74.4 · 89 ms | 134.7 · 90 ms | **188.0 req/s · p50 91 ms** | **0** |
| `/login` (dinámica) | 4.9 · 185 ms | 15.2 · 181 ms | 28.6 · 180 ms | 54.4 · 185 ms | **85.9 req/s · p50 180 ms** | **0** |
| `/app` (middleware → 307) | 11.8 · 83 ms | 46.8 · 83 ms | 75.1 · 86 ms | 120.5 · 86 ms | **207.4 req/s · p50 86 ms** | **0** |

Lectura honesta: **la p50 no se movió ni un milisegundo** entre 1 y 24
concurrentes en ninguna ruta, y el rendimiento creció linealmente con la
concurrencia. Eso significa que **no se alcanzó el techo de Vercel** — lo que
se saturó fue el enlace de la máquina que medía. La conclusión que sí se puede
sacar: la capa de entrega no es motivo de preocupación en este rango.

El dato útil es el **delta**: `/login` cuesta **~90 ms más** que una página ISR
(180 vs 92 ms). Ese es el precio de renderizar en función en vez de servir del
CDN, y se paga en cada pantalla privada.

### 4.2 Capa base de datos — dashboard real, solo lectura

Rampa de usuarios virtuales ejecutando los 9 loaders de
`app/(app)/app/page.tsx` en paralelo, con un observador aparte muestreando
`pg_stat_activity` cada 80 ms:

| Concurrencia | Rendimiento | p50 | p95 | Backends activos (pico) | Errores |
|---|---|---|---|---|---|
| 1 | 0.57 dash/s | 1 735 ms | 1 737 ms | 1 | 0 |
| 2 | 1.02 | 1 759 ms | 2 078 ms | 2 | 0 |
| 4 | 1.78 | 2 050 ms | 2 870 ms | 2 | 0 |
| 8 | 2.24 | 3 506 ms | 3 785 ms | 2 | 0 |
| 16 | 2.50 | 6 530 ms | 7 011 ms | 2 | 0 |
| 24 | **2.56** | 9 874 ms | 10 076 ms | **2** | **0** |

El renglón que importa es el de la derecha: **con 24 dashboards en vuelo, el
pico de backends ACTIVOS en Postgres fue 2.** La base estuvo prácticamente
ociosa todo el tiempo. La latencia crece linealmente y el rendimiento se
aplana en 2.56/s porque se saturó el enlace del cliente (48 viajes de red por
dashboard × ~110 ms desde México), no la base.

Traducción: **desde acá no se puede encontrar el techo de la base de datos,
porque el enlace se rinde antes.** Por eso el techo se midió de otra forma
(§5), con una prueba que no consume ancho de banda.

Cero errores en todos los pasos de las dos capas.

---

## 5. El techo de conexiones, medido de verdad

En Vercel no hay «una» conexión a Postgres: hay N instancias, cada una con su
pool de Prisma, todas hablando con **Supavisor** en modo transacción, que
multiplexa esas conexiones de *cliente* sobre un puñado mucho menor de
conexiones de *servidor*. Ese número —el pool de servidor— es el que de verdad
acota, y **no aparece en ninguna variable de `pg_settings`**: es configuración
de Supavisor, invisible desde SQL.

`pnpm scale:pool` lo mide por dos vías independientes que tienen que coincidir:
dispara K consultas `pg_sleep(1)` en paralelo por el pooler y (a) cuenta los
backends reales del rol en `pg_stat_activity`, (b) mira el tiempo de pared, que
si el pool es P < K sube a `ceil(K/P)` segundos.

```
Postgres: max_connections=60 · rol=acierta_ci

K=  4  wall=2.31s  backends_max=  5   errores=0
K=  8  wall=2.31s  backends_max=  9   errores=0
K= 12  wall=2.30s  backends_max= 13   errores=0
K= 16  wall=2.31s  backends_max= 17   errores=0
K= 20  wall=2.98s  backends_max= 17   errores=0   ← 2 rondas
K= 30  wall=3.09s  backends_max= 17   errores=0
K= 40  wall=4.47s  backends_max= 17   errores=0   ← 3 rondas
K= 60  wall=5.90s  backends_max= 17   errores=0   ← 4 rondas
```

**El pool de servidor es 17 conexiones por rol de base de datos**, y las dos
señales coinciden exactamente (`ceil(60/17)=4` rondas ⇒ 4 s + arranque = 5.9 s).
Por encima de eso **no hay errores: hay cola**, que es justo lo que se quiere.

Dos consecuencias que no son obvias:

**El pool es por ROL, no por proyecto.** `pg_stat_activity` muestra dos:
`acierta_ci` (los scripts) con sus 17 backends persistentes y `acierta_prod`
(el que usa Vercel) con los suyos. Sumados son **34 de las 57 conexiones
útiles** de la instancia. Añadir un tercer rol, o subir el *pool size* en el
panel, se come el margen que necesitan Auth, PostgREST y `pg_cron`.

**Cuántos alumnos caben ahí** (cálculo, no medición): un alumno en simulacro
genera una sincronización cada 15 s = 3 ops/15 s = **0.2 ops/s**. Cada op
ocupa una conexión de servidor durante 4 viajes al pooler; desde `iad1` (misma
región que la base) eso son ~8 ms, de los cuales 0.07 ms son ejecución real.
Utilización por alumno = 0.2 × 0.008 = **0.0016 conexiones**. Con 17
conexiones: **~10 600 alumnos simultáneamente en un simulacro**. Con un factor
de seguridad de 2× y una latencia pesimista de 15 ms: **~5 600**.

Por eso la fila 8 del resumen está en verde. La sospecha de partida —«en
serverless siempre son las conexiones»— **no se sostiene con los números de
este producto**, y es un buen ejemplo de por qué convenía medir antes de
comprar.

El único número de conexiones que sí conviene vigilar es el otro: **200
conexiones de cliente al pooler** en Nano. Con `connection_limit=5` por
instancia, el peor caso teórico son **40 instancias de función vivas a la vez**
antes de que Supavisor rechace la 41ª. En la práctica está lejos (Prisma abre
conexiones de forma perezosa, y Fluid Compute atiende varias peticiones por
instancia), pero es el número que se vuelve estrecho en un pico, y la razón por
la que subir a **Small** (400 clientes) es la mejora de cómputo que más tranquilidad
compra por $15.

---

## 6. Punto de quiebre, en orden

### 6.1 🔴 El correo — y no es una proyección, ya está roto

**Nadie puede registrarse en YaEntre hoy.** El servicio de correo integrado de
Supabase tiene un límite de unos pocos correos por hora, pensado para
desarrollo, y el registro real devuelve `over_email_send_rate_limit`. Está
reproducido y documentado desde G7, se volvió a confirmar en G9 y en G12, y
sigue igual: la única salida es configurar **SMTP propio** en
Authentication → Emails → SMTP Settings.

Y configurarlo no basta: con SMTP propio el límite por defecto pasa a **30
usuarios nuevos por hora**. Un empujón de marketing que traiga 200 registros en
una tarde deja fuera a 170 personas con un error que parece un fallo de la app.
Ese límite **sí** es configurable, en Authentication → Rate Limits, y hay que
subirlo *antes* de la primera campaña, no durante.

### 6.2 🔴 Vercel Hobby y el uso comercial

Ya explicado en §1.3. Lo que lo hace el riesgo más serio no es la probabilidad
sino la forma del fallo: no se degrada, se pausa. Y se pausa justo cuando el
tráfico sube, que es cuando alguien lo mira.

### 6.3 🟠 Los 100 correos diarios de Resend

Modelo de correo por alumno activo al mes:

| Tipo | Frecuencia |
|---|---|
| Racha en riesgo | hasta 1/día; realista ~8/mes |
| Cuenta regresiva del examen | 4 por temporada (30/15/7/1 días) |
| Resumen semanal al tutor | 4/mes por vínculo (~30 % de alumnos) |
| Auth (confirmación, recuperación) | ~1/mes |

≈ **10 correos por alumno activo al mes** ⇒ ~0.33/día.

Con **300 alumnos activos** se cruzan los 100 correos diarios del plan
gratuito. Y el día que se cruza, los que se quedan sin enviar son
silenciosos: el runner usa `Promise.allSettled` y reporta 0 enviados.

⚠️ **Además, los tres correos programados ni siquiera salen hoy**, por el
`GRANT` sobre `auth.users` que sigue pendiente desde G59 §7 / G60 §9. O sea:
el límite de Resend no se ha tocado porque el emisor está apagado. Cuando el
dueño aplique el grant, el consumo aparece de golpe.

### 6.4 🟡 Los 500 MB de la base

~3 200 alumnos-temporada (§3). Con 5 000 alumnos activos se cruza y la base
pasa a solo lectura.

### 6.5 🟡 Los 5 GB de egreso de la organización

Estimación (no metered): un simulacro lee ~120 reactivos servibles; con el
`select` acotado de `question-read.ts` son ~1.5 kB por reactivo ⇒ ~180 kB por
simulacro. Sumando prácticas, explicaciones y dashboards:

**≈ 1.8 MB de egreso de base por alumno activo al mes.**

5 GB ÷ 1.8 MB ≈ **2 800 alumnos activos/mes** — y eso *sin descontar* lo que
consuma `financeos-whatsapp`, que comparte la cuota.

### 6.6 🟡 El millón de invocaciones de Vercel

700 invocaciones/alumno/mes (§2.4) ⇒ 1 M ÷ 700 ≈ **1 400 alumnos activos**.
Es el límite de Hobby, así que en la práctica queda tapado por §6.2: hay que
estar en Pro antes por otra razón.

---

## 7. Proyección de costos

Supuestos, explícitos: precios de lista en USD sin impuestos; Vercel en `iad1`;
un solo asiento de Vercel; Supabase con el crédito de cómputo de $10 que trae
el plan Pro.

### 7.1 Vercel

| | 500 alumnos | 1 000 | 5 000 |
|---|---|---|---|
| Invocaciones/mes | 350 K | 700 K | 3.5 M |
| Edge Requests/mes | 1.05 M | 2.1 M | 10.5 M |
| Fast Data Transfer/mes | ~2 GB | ~4 GB | ~20 GB |
| Cuota de plataforma Pro | $20 | $20 | $20 |
| Consumo bajo demanda | $0 | $0 | invocaciones $2.10 + edge $1.00 + CPU ~$3.70 + memoria ~$0.65 ≈ **$7.45** |
| Crédito mensual incluido | −$20 | −$20 | −$20 |
| **Vercel** | **$20** | **$20** | **$20** |

El crédito de $20 que trae el plan Pro absorbe el consumo bajo demanda en los
tres escenarios. **Vercel cuesta $20 pase lo que pase** en este rango.

### 7.2 Supabase

| | 500 alumnos | 1 000 | 5 000 |
|---|---|---|---|
| Tamaño de base | ~95 MB | ~170 MB | ~770 MB |
| Egreso/mes | ~0.9 GB | ~1.8 GB | ~9 GB |
| MAU | 500 | 1 000 | 5 000 |
| Plan | Pro $25 | Pro $25 | Pro $25 |
| Cómputo | Micro (1 GB) $10 | **Small (2 GB) $15** | **Small (2 GB) $15** |
| Crédito de cómputo | −$10 | −$10 | −$10 |
| **Supabase** | **$25** | **$30** | **$30** |

Por qué Pro desde el primer escenario aunque los 500 alumnos cupieran en el
plan gratuito: **respaldos** (el gratuito no da ninguno restaurable — G61),
**no pausar por inactividad**, y soporte. Pagar $25 para no perder el banco de
reactivos y el historial de aprendizaje de 500 aspirantes no admite discusión.

Por qué **Small** en cuanto se pasa de 1 000: no por CPU (§2.3 deja claro que
sobra), sino por **conexiones**: Small sube el pooler de 200 a **400 clientes**
y las directas de 60 a 90, que es el margen que hace falta para un pico de
instancias de función. Medium ($60, −$10 de crédito = $50) solo si la telemetría
lo justifica; hoy nada lo pide.

Complementos que **no** se incluyeron y conviene evaluar aparte: **PITR** (para
recuperar a un punto exacto en el tiempo; el respaldo diario del plan Pro ya
cubre lo esencial) e **IPv4 dedicada** (innecesaria con el pooler).

### 7.3 Resend

| | 500 alumnos | 1 000 | 5 000 |
|---|---|---|---|
| Correos/mes | ~5 000 | ~10 000 | ~50 000 |
| Correos/día (pico) | ~165 | ~330 | ~1 650 |
| Plan | Pro 50 K | Pro 50 K | **Pro 100 K** |
| **Resend** | **$20** | **$20** | **$35** |

Con 5 000 alumnos el consumo queda exactamente en el borde del tramo de 50 K:
se sube al de 100 K por margen, no por necesidad estricta.

### 7.4 Total

| | 500 alumnos | 1 000 | 5 000 |
|---|---|---|---|
| Vercel | $20 | $20 | $20 |
| Supabase | $25 | $30 | $30 |
| Resend | $20 | $20 | $35 |
| Sentry / PostHog | $0 (planes gratuitos) | $0 | $0 |
| **Total USD/mes** | **$65** | **$70** | **$85** |
| **≈ MXN/mes** (a 18.5) | **~$1 200** | **~$1 300** | **~$1 575** |

**Contra el ingreso**, para tener escala: 500 alumnos en el plan Mensual de
Temporada Alta ($149 MXN) son ~$74 500 MXN al mes. La infraestructura es
**1.6 % del ingreso**. Con el Pase de Temporada ($799) la proporción es aún
menor. Comisiones de Stripe (3.6 % + $3 MXN por tarjeta nacional; 4 % + $3 en
OXXO/SPEI) son un orden de magnitud más caras que toda la infraestructura
junta — y son variables, no fijas.

**El costo de infraestructura no es un riesgo del negocio.** El riesgo es no
haberlo pagado a tiempo.

---

## 8. Optimizaciones aplicadas — capacidad ganada sin gastar

Tres cambios, todos verificados con las sondas de seguridad existentes
(`pnpm security:authz` 10/10, `pnpm security:abuse` 8/8) y con los guardrails
de G65/G67 intactos.

### 8.1 El middleware dejó de preguntar quién eres cuando no le importa

`proxy.ts` corre en casi toda petición que no sea un asset estático, y **todas**
construían el cliente de Supabase y llamaban `auth.getUser()`. Eso no es
gratis: `getUser()` valida el JWT **contra el servidor de Auth** — es su razón
de ser, y por lo que se recomienda sobre `getSession()`. Medido: **81 ms de
ida y vuelta** desde México (desde `iad1` serán ~15-25 ms).

Y el resultado se descartaba casi siempre, porque el middleware solo lo usa
para dos redirecciones. Ahora se evita en tres casos, cada uno con su razón:

| Caso | Por qué es seguro | Qué ahorra |
|---|---|---|
| **`/api/*`** | El valor se tiraba: ninguna ruta de API está en los prefijos protegidos, y cada Route Handler vuelve a preguntar con `requireUser` | **~140 viajes a Auth por simulacro** (`/api/simulator/sync` cada 15 s durante 3 h) |
| **Sin cookie `sb-…-auth-token`** | No hay sesión que validar ni que refrescar; `getUser()` devolvería `null` igual | Todo el tráfico anónimo: landing, precios, buscadores |
| **Pre-carga de ruta no protegida** | No hay redirección que decidir; el refresco lo hace la navegación de verdad | **~20 viajes por vista de página** (Next precarga cada `<Link>` del viewport) |

Lo que **no** cambió, a propósito: una navegación de página real de alguien con
sesión sigue pasando por `getUser()`. Ahí es donde se refresca el token y se
reescribe la cookie, y perder eso mataría sesiones. La frontera vive en un
módulo puro y testeado, `src/lib/auth/middleware-policy.ts`.

Verificado contra el build de producción local: las 8 rutas privadas siguen
devolviendo `307 → /login` sin sesión, con cookie inválida, y como pre-carga.

### 8.2 `submitAnswer`: de 4 operaciones a 2

Era el gasto dominante del diagnóstico (30 reactivos) y de la práctica (10):
tres operaciones seguidas para cargar la sesión, la fila `SessionAnswer` que
prueba la asignación, y el reactivo con sus opciones. Ahora un solo `LEFT JOIN`
trae las tres piezas.

**No se relajó ninguna guarda**: las comprobaciones son las mismas, en el mismo
orden, con los mismos códigos de error. En particular sigue exigiéndose que
exista la fila de ESTE (sesión, reactivo) — la condición del JOIN lleva las dos
columnas — que es lo que impide que un reactivo salte de una sesión a otra y
filtre la clave del simulacro (G65). El `LEFT JOIN` es deliberado: con un INNER
no se podría distinguir «no es tuyo» de «no existe», y son errores distintos.

### 8.3 Sincronización del simulador: de 5 operaciones a 3

Dos cambios independientes:

- **La pertenencia y las opciones se resuelven en un JOIN**, no en dos
  consultas. El filtro de pertenencia sigue siendo el mismo `WHERE
  sa."sessionId" = …`.
- **Los contadores de integridad solo se escriben si cambiaron.** Ese `UPDATE`
  salía en cada lote —~120 por simulacro— reescribiendo casi siempre los mismos
  valores: en un examen sin trampas los contadores no se mueven ni una vez. La
  comparación usa el resultado *ya fusionado al máximo*, así que la semántica
  es idéntica: cuando se salta, el `UPDATE` habría sido un no-op.

Resultado medido: el lote en régimen (1 respuesta, integridad sin cambios) pasó
de **5 a 3 ops**, y con él el simulacro completo de **635 a 396**.

### 8.4 De regalo: una sonda de seguridad que mentía

`pnpm security:authz` tomaba `answers[0]` del simulacro de la víctima sin
comprobar nada más. Como el selector adaptativo baraja con `Math.random()`
(`src/lib/adaptive/selector.ts`), de vez en cuando **ese mismo reactivo caía
también en la práctica del atacante** — y entonces responderlo es legítimo. La
sonda reportaba «fuga de la respuesta correcta» por su propio azar.

Se detectó justo así: la sonda salió roja tras los cambios de §8.2, y hubo que
distinguir una regresión real de un falso positivo. Se comprobó reproduciendo
el escenario con la fixture idéntica (rechazado correctamente), guardando y
restaurando los cambios (`git stash`) para comparar, y confirmando el
mecanismo del barajado. Ahora la sonda elige un reactivo del simulacro que **no
esté asignado** a la práctica del atacante, que es exactamente lo que la prueba
quiere decir. Tres corridas seguidas: 10/10.

Un rojo que aparece una de cada varias corridas es peor que no tener la prueba,
porque enseña a ignorarla.

### 8.5 Lo que se evaluó y NO se hizo

- **Quitar `?pgbouncer=true`.** 4.7× más rápido en una prueba de escritorio y
  tumba el sitio bajo concurrencia (8 de 8 clientes fallaron con `26000` en
  G59). Sigue siendo no negociable.
- **Cachear las opciones de los reactivos para puntuar.** Ahorraría una
  consulta por lote, pero metería una ventana de 300 s en la que una corrección
  de la clave por el panel admin puntuaría con datos viejos. El scoring no es
  el lugar para eso.
- **Subir `SYNC_FLUSH_INTERVAL_MS` de 15 s.** Menos peticiones, sí, y también
  más respuestas en riesgo si el navegador se cierra. La resiliencia del
  simulacro vale más que las invocaciones.
- **Bajar `connection_limit` de 5 a 3** para caber en más instancias. El
  dashboard y la pantalla de progreso disparan sus loaders con `Promise.all`;
  con 3 se serializan y sube la latencia de la página. Se prefiere subir el
  cómputo a Small, que resuelve lo mismo por $5 netos.
- **Índices nuevos.** G59 dejó 18 y midió que los caminos calientes ya son
  index-only. Nada en las mediciones de esta fase pide otro.

---

## 9. Qué tiene que hacer el dueño, en orden

Los primeros dos son **bloqueantes del lanzamiento**, no mejoras.

1. 🔴 **SMTP propio en Supabase Auth.** Sin esto no hay registros: hoy el alta
   real falla con `over_email_send_rate_limit`. Pasos exactos en
   `docs/SERVICE_CREDENTIALS_CHECKLIST.md` §1. Al terminar, **subir el límite
   de «usuarios nuevos por hora»** en Authentication → Rate Limits por encima
   de los 30 por defecto.
2. 🔴 **Vercel Pro ($20/mes).** El plan Hobby prohíbe el uso comercial y
   YaEntre cobra con Stripe. La sanción documentada es la pausa del despliegue.
3. 🟠 **Supabase Pro ($25/mes).** Respaldos diarios, sin pausas por
   inactividad, 8 GB de disco y 250 GB de egreso. Cierra de paso el pendiente
   de G61 (el plan gratuito no da respaldos restaurables).
4. 🟠 **Resend Pro ($20/mes)** antes de pasar de ~300 alumnos activos: el tope
   de 100 correos/día del plan gratuito llega mucho antes que el mensual.
5. 🟠 **`GRANT USAGE ON SCHEMA auth TO acierta_ci;`** +
   **`GRANT SELECT (id, email) ON auth.users TO acierta_ci;`** — pendiente
   desde G59 §7. Sin esto los tres correos programados reportan 0 enviados en
   silencio. Cuando se aplique, el consumo de Resend aparece de golpe: conviene
   hacerlo **después** del punto 4.
6. 🟡 **Habilitar `Sb-Forwarded-For`** en Authentication → Rate Limits. Sin
   esto, los límites por IP de Supabase Auth (1 800 refrescos/hora, 360
   verificaciones/hora) se aplican a **las IPs de Vercel**, o sea a toda la
   plataforma junta en vez de por alumno. Requiere una llave secreta de API.
7. 🟡 **Cómputo Small** en Supabase al pasar de ~1 000 alumnos activos: sube el
   pooler de 200 a 400 clientes. $15 − $10 de crédito = **$5 netos**.
8. 🟡 **Crear las cuentas de Sentry y PostHog.** Pendiente desde G9. Sin
   telemetría, el día del lanzamiento no habrá con qué decidir si algo de este
   documento se está cumpliendo. Los planes gratuitos (1 M eventos/mes en
   PostHog) sobran para los tres escenarios.
9. 🟢 **Vigilar el otro proyecto activo de la organización.**
   `financeos-whatsapp` comparte la cuota de egreso y de MAU con YaEntre, y
   ocupa uno de los 2 proyectos del plan gratuito.

---

## 10. Cómo reproducir todo esto

```bash
pnpm scale:audit    # ops de Prisma y peticiones por recorrido (perfil desechable)
pnpm scale:pool     # techo real del pool de servidor de Supavisor
pnpm scale:load     # carga controlada contra producción (capa Vercel)
pnpm scale:load --db  # carga controlada contra la base (dashboard real)
```

| Archivo | Qué |
|---|---|
| `scripts/scale-audit.ts` | Consumo por recorrido, escrituras incluidas |
| `scripts/scale-pool-probe.ts` | Techo de conexiones por dos vías independientes |
| `scripts/scale-load-probe.ts` | Prueba de carga acotada, HTTP y base de datos |
| `src/lib/auth/middleware-policy.ts` | **Nuevo.** Cuándo preguntar a Auth (puro, testeado) |
| `src/lib/db/sessions.ts` | `submitAnswer` en 2 operaciones |
| `src/lib/db/simulator.ts` | Sincronización en 3 operaciones |
| `src/lib/simulator/integrity.ts` | `integrityNeedsWrite` — escribir solo si cambió |
| `tests/auth/middleware-policy.test.ts` | **Nuevo.** 8 casos de la frontera del middleware |
| `tests/simulator/integrity.test.ts` | 5 casos nuevos de la escritura condicional |
| `scripts/security/authz-probe.ts` | Fixture determinista (§8.4) |
| `scripts/logs/scale-audit.json` | Medición cruda de la última corrida (`scripts/logs/` está en `.gitignore`: se regenera con `pnpm scale:audit`) |

**Verde al cierre**: `pnpm typecheck` · `pnpm lint` · `pnpm test:unit`
(58 archivos, **545 pruebas**) · `pnpm build` · `pnpm security:authz` (10/10) ·
`pnpm security:abuse` (8/8).
