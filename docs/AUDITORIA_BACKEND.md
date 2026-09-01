# Auditoría de la capa de datos — G59 (2026-08-31)

> Objetivo: que la base de datos aguante el volumen y la concurrencia del
> lanzamiento (6 de enero de 2027) sin degradarse.
>
> Todo lo que aquí se afirma está medido contra el Supabase real
> (`fumluvvzskhdxcyljbmx`, PostgreSQL 17.6, us-east-1, plan gratuito).
> Los scripts que producen estas cifras quedan versionados: `pnpm perf:audit`
> y `pnpm perf:pool`.

---

## 0. Resumen ejecutivo

| Qué | Antes | Después |
|---|---|---|
| Viajes de red en los 16 flujos críticos | **454** | **300** (−34 %) |
| Sentencias reales (sin protocolo) | 163 | **99** (−39 %) |
| Dashboard del alumno (un render) | 78 viajes · 4 704 ms | **58 viajes · 1 774 ms** |
| Pantalla de progreso | 81 viajes · 3 759 ms | **45 viajes · 2 423 ms** |
| Resultados del simulacro | 58 viajes · 5 625 ms | **38 viajes · 3 203 ms** |
| Delta semanal del Entrómetro | 30 viajes · 4 081 ms | **13 viajes · 1 766 ms** |
| Sinc del simulador (140 respuestas) | 282 viajes | **4 viajes** |
| Insignia "materia dominada" (857 k respuestas) | 204 ms × materia · 102 564 filas | **2,1 ms total · 97 filas** |
| Costo de RLS en `explanation_layers` | 38,3 ms | **0,69 ms** (55×) |
| Índices | 79 | 97 (+18, ~360 kB) |

Dos hallazgos que no eran de rendimiento pero salieron de la misma revisión:

1. 🔴 **Fuga de respuestas correctas.** Cualquiera con la anon key (pública
   por diseño) podía leer `questions` vía PostgREST — y `options` incluye
   `isCorrect`. **Corregido.** Ver §5.1.
2. 🟠 **La insignia "materia dominada" se calculaba con las respuestas de
   TODOS los usuarios**, no las del alumno. **Corregido.** Ver §4.2.

Y uno que **no se pudo corregir** con los privilegios disponibles: los tres
correos programados fallan en silencio por falta de permisos sobre
`auth.users`. Requiere una acción del dueño del proyecto. Ver §7.

---

## 1. Cómo se midió

El problema de auditar esto "a ojo" es que **el SQL que Prisma emite no se
parece al código que uno escribe**. Un `select` anidado como

```ts
select: { isCorrect: true, question: { select: { topic: { select: { subjectId: true } } } } }
```

no es un JOIN: Prisma lo resuelve con **tres** consultas separadas (respuestas →
reactivos por id → temas por id) y las une en memoria. Desde el código eso es
invisible.

Por eso la medición se hace con el cliente instrumentado
(`log: [{ emit: 'event', level: 'query' }]`), que reporta cada sentencia real:

- **`scripts/perf-audit.ts`** (`pnpm perf:audit --label antes|despues`) corre
  los 16 flujos críticos usando **los módulos reales de `src/lib/db/*`**, no
  una reimplementación, y cuenta sentencias y latencia por flujo. Es de solo
  lectura sobre datos de usuario.
- **`scripts/perf-pool-probe.ts`** (`pnpm perf:pool`) mide el costo de
  protocolo de la cadena de conexión.
- Los planes se sacan con `EXPLAIN (ANALYZE, BUFFERS)` contra el Postgres real.

### 1.1 Dos advertencias sobre las cifras

**La latencia absoluta está inflada.** Las mediciones se hacen desde una
máquina en México contra us-east-1: ~110 ms por viaje de red. En Vercel
(`iad1`, la misma región que la base) ese número baja a milisegundos. **Lo que
sí se traslada tal cual es el número de VIAJES**, y por eso es la métrica
principal de este documento: la latencia de producción es
`viajes × latencia_real`, así que reducir viajes reduce la latencia
proporcionalmente en cualquier región.

**Con el volumen de hoy nada es lento.** El banco tiene 1 147 reactivos pero
solo 5 usuarios y 480 respuestas: al medir contra esa tabla, *todo* es un
recorrido secuencial de sub-milisegundo, y ningún índice se justifica. Auditar
así habría dado el veredicto falso "todo está bien". Ver §2.

---

## 2. Banco de pruebas a escala de lanzamiento

Para ver los planes que Postgres elegirá **con tráfico real** se construyó un
esquema aislado `perf_g59` con copias de las seis tablas calientes
(`CREATE TABLE ... LIKE ... INCLUDING ALL`, o sea con los mismos índices) y se
pobló a escala de temporada:

| Tabla | Producción hoy | Banco de pruebas |
|---|---|---|
| `questions` | 1 147 (1 143 servibles) | **1 500** (meta `COVERAGE_GOAL_VERIFIED`) |
| `user_profiles` | 5 | **2 000** alumnos |
| `exam_sessions` | 5 | **36 000** (18 por alumno: 1 diagnóstico + 2 simulacros + 15 prácticas) |
| `session_answers` | 480 | **856 729** |

> El esquema `perf_g59` se **eliminó** al terminar la fase; la base volvió a
> 18 MB. Nunca tocó las tablas de `public`.

La diferencia de veredicto es todo el punto de haberlo hecho:

| Consulta | Con datos de hoy | A escala (857 k respuestas) |
|---|---|---|
| Insignia "materia dominada" | 0,3 ms · Seq Scan de 480 filas | **204 ms · 102 564 filas a Node** |
| Percentil del simulacro | 0,04 ms · 4 filas | 1,3 ms · **2 176 filas a Node** |
| Historial de respuestas del alumno | 0,34 ms | 33 ms (en frío) |

---

## 3. Consultas medidas, antes y después

### 3.1 Viajes de red por flujo (`pnpm perf:audit`)

Mismo arnés, mismo sujeto (`e2e_sim_user`, 480 respuestas), mismo día. Las
columnas «reales» excluyen `BEGIN` / `DEALLOCATE ALL` / `COMMIT` (ver §6).

| Flujo | Antes (tot/reales) | Después (tot/reales) | Wall antes | Wall después |
|---|---|---|---|---|
| Dashboard del alumno | 78 / 27 | **58 / 19** | 4 704 ms | **1 774 ms** |
| Pantalla de progreso | 81 / 30 | **45 / 15** | 3 759 ms | **2 423 ms** |
| Resultados del simulacro | 58 / 22 | **38 / 14** | 5 625 ms | **3 203 ms** |
| Panel parental | 51 / 18 | **34 / 10** | 3 973 ms | **1 767 ms** |
| Entrómetro — recálculo | 32 / 11 | **16 / 4** | 4 183 ms | **1 762 ms** |
| Entrómetro — delta semanal | 30 / 12 | **13 / 3** | 4 081 ms | **1 766 ms** |
| Selector adaptativo | 26 / 8 | **16 / 4** | 2 663 ms | **1 657 ms** |
| Set del diagnóstico | 17 / 5 | **9 / 3** | 1 986 ms | **1 332 ms** |
| Set del simulacro (140) | 17 / 5 | **9 / 3** | 1 876 ms | **1 337 ms** |
| Recálculo de temas débiles | 12 / 6 | **9 / 3** | 1 896 ms | **1 334 ms** |
| Revisión de falladas | 12 / 6 | 12 / 6 | 2 002 ms | 2 015 ms |
| Carga del simulador | 4 / 1 | 4 / 1 | 552 ms | 554 ms |
| Percentil (consulta suelta) | 4 / 1 | 4 / 1 | 550 ms | 554 ms |
| Muro suave (drill) | 8 / 2 | 8 / 2 | 550 ms | 556 ms |
| Recálculo de racha | 8 / 2 | 8 / 2 | 1 103 ms | 1 109 ms |
| Opciones de práctica | 16 / 7 | 18 / 9 | 1 766 ms | 1 883 ms |
| **TOTAL** | **454 / 163** | **300 / 99** | | |

Notas honestas sobre esta tabla:

- **"Opciones de práctica" subió de 16 a 18.** No es una regresión: los dos
  viajes extra son `SELECT 1`, la validación de conexión que Prisma manda al
  abrir una conexión nueva del pool. Aparecen o no según cuándo el pool decide
  crecer, y su número varía entre corridas del mismo código.
- Los flujos que no cambiaron (carga del simulador, muro suave, racha) ya
  estaban en su mínimo: una o dos consultas acotadas por sesión o por usuario.
- La medición se hizo con el caché de Next **desactivado a propósito**
  (`scripts/tsconfig.perf.json` sustituye `next/cache` por un pass-through), o
  sea midiendo el camino frío. Con la ventana de 300 s caliente, la taxonomía
  desaparece por completo y los números de producción son mejores.

### 3.2 `EXPLAIN ANALYZE` a escala, antes y después

Mediana baja de 3 corridas tras 2 de calentamiento (para no reportar el ruido
de una instancia compartida).

| Consulta | Antes | Después | Filas a Node antes → después | Qué cambió |
|---|---|---|---|---|
| Insignia "materia dominada" | **204,5 ms** | **2,1 ms** (97×) | 102 564 → **97** | Reescrita como agregado + índice |
| Barrido de sesiones colgadas (cron) | 0,78 ms | **0,49 ms** | 2 000 → 2 000 | `idx_exam_sessions_stale_sweep` |
| Pool de reactivos del área | 0,65 ms | **0,39 ms** | 515 → 515 | `idx_questions_pool_covering` (index-only) |
| Payload del simulador (130 reactivos) | 0,35 ms | **0,29 ms** | 127 → 127 | `idx_session_answers_session_position` (sin Sort) |
| Exclusión de 72 h | 0,048 ms | **0,026 ms** | 0 → 0 | `idx_exam_sessions_user_started` |
| Percentil del simulacro | 1,33 ms | **1,39 ms** | **2 176 → 1** | Agregado en SQL |
| Ranking de temas débiles | (4 consultas) | **2,55 ms** | todas las respuestas → **3** | `GROUP BY` + `LIMIT` en SQL |
| Estadísticas acumuladas | (3 consultas) | **0,48 ms** | todas las respuestas → **1** | Agregado único |

**El percentil merece una aclaración porque es el único caso donde el número no
mejora.** Contar 2 176 entradas de índice cuesta lo mismo que leerlas: 1,3 ms
en ambos casos. Lo que cambia es **qué cruza la red y qué hace Node**: antes se
traía el score de *cada* sesión terminada del examen —de todos los alumnos— a
memoria del proceso para filtrarlas con un `Array.filter`; ahora vuelve un
renglón con dos números. Con 2 000 alumnos son 2 176 filas; con 20 000 serían
~21 800 por cada visita a la pantalla de resultados. Es la única consulta del
producto cuyo costo crece con la base de usuarios **completa** y no con la del
alumno, así que era la que peor escalaba justo con el éxito comercial.

---

## 4. Consultas N+1 corregidas

### 4.1 🔴 Sinc del simulador — 282 viajes por lote

`recordSimulatorSync` es el destino del flush periódico, del reintento al
reconectar y del `navigator.sendBeacon` en `pagehide`. Recorría
`input.answers` haciendo, **por cada respuesta**, un `question.findUnique` y un
`sessionAnswer.upsert`:

```
2N + 2 consultas → 140 reactivos (IPN) = 282 viajes secuenciales
```

Y como cada operación de Prisma cuesta 4 viajes de protocolo (§6), en la
práctica eran más. En `pagehide` el navegador concede unos segundos antes de
matar la petición: una petición cortada a la mitad es un alumno que pierde
respuestas de su simulacro.

**Ahora son 4 consultas fijas**, sin importar el tamaño del lote: una para la
sesión, una `findMany` con todos los reactivos, un `INSERT … ON CONFLICT
(sessionId, questionId) DO UPDATE` con todo el lote en un solo statement, y el
update de integridad.

Se conservan intactos:
- El **aislamiento por reactivo de F19** (un reactivo corrupto se salta y se
  registra; nunca tumba el lote).
- La **idempotencia** por (sesión, reactivo).
- El **scoring server-side** (guardrail de CLAUDE.md).
- Se añadió deduplicación dentro del lote: `ON CONFLICT DO UPDATE` no puede
  tocar la misma fila dos veces en el mismo statement.

### 4.2 🔴 Insignia "materia dominada" — un bug de corrección, además de lento

`grantNewlyMasteredSubjects` corría, **por cada materia tocada por la sesión**
(un simulacro completo las toca todas, ~11): dos consultas de estadísticas, una
del nombre de la materia y un `UPDATE` del perfil.

Pero el problema serio no era el conteo de consultas. `loadSubjectTopicMastery`
**no filtraba por alumno**:

```ts
where: {
  session: { status: { in: FINISHED_STATUSES } },   // ← sin userProfileId
  question: { topic: { subjectId } },
}
```

Agregaba las respuestas de **todos los usuarios de la plataforma**. La insignia
es personal, así que el veredicto era simplemente el equivocado: con un único
usuario de prueba coincidía por accidente, y con tráfico real la insignia se
habría otorgado o negado según cómo le fuera al resto del mundo.

Medido a escala: **204 ms y 102 564 filas a Node por materia** — más de 2 s de
base de datos en el cierre de cada simulacro, creciendo con el total de
respuestas de toda la plataforma.

**Ahora**: cuatro consultas fijas, la agregación (`GROUP BY topicId` con
`count(*) FILTER`) la hace Postgres, y va acotada al alumno. **2,1 ms y 97
filas.**

### 4.3 Historial de respuestas — 3 consultas por lectura, hasta 3 lecturas por flujo

`loadFinishedAnswers` usaba el `select` anidado que Prisma resuelve en tres
viajes. Y el cierre de sesión lo invocaba **tres veces** (temas débiles, tiers,
predicción): nueve viajes para leer lo mismo.

- Se centralizó en `src/lib/db/answer-history.ts`, que hace el JOIN en Postgres:
  **1 consulta**.
- `onSessionFinished` lo lee **una sola vez** y se lo pasa a los recálculos.

Efecto colateral que también importa: la versión anterior mandaba de vuelta la
lista de ids de reactivos como parámetros de un `IN (…)`. Con un alumno muy
activo eso son cientos de parámetros por consulta; el JOIN los elimina.

### 4.4 La cadena perfil → carrera → área → examen, releída 4 veces por página

`recomputeLearningProfile`, los dos deltas del Entrómetro y
`computeCareerStrategy` recorrían cada uno esa cadena por su cuenta con
`findUnique` anidados. El dashboard llama a tres de ellos en el mismo render:
la misma fila de `user_profiles`, `careers`, `areas` y `exams` se leía hasta
cuatro veces.

**Ahora** hay un `loadPredictionTarget` que la resuelve en **una** consulta (un
JOIN de cuatro tablas por PK es trabajo despreciable para Postgres; los viajes
de red no lo eran) y trae de paso la predicción ya persistida.

### 4.5 Taxonomía releída ocho veces por render

`loadAreaSharedContent` costaba **tres** consultas y un solo render del
dashboard la invocaba **ocho** veces: 24 viajes para leer datos idénticos para
todos los alumnos del área, que solo cambian con un seed o el panel admin.

- Ahora es **una** consulta (las materias del examen se traen de un jalón, con
  su área y su nombre).
- Va cacheada con `unstable_cache` y la misma ventana de 300 s que el banco de
  reactivos (`QUESTION_BANK_REVALIDATE_SECS`), que ya era el patrón del
  proyecto.
- Lo que se cachea es siempre una estructura **serializable**: los `Map` se
  reconstruyen fuera del caché. Un `Map` no sobrevive a la serialización de la
  data cache de Next — volvería como `{}` sin avisar.

### 4.6 Agregaciones que se hacían en Node

Tres loaders traían todas las respuestas del alumno para calcular un número:

| Función | Antes | Ahora |
|---|---|---|
| `loadAllTimeTopicRanking` (dashboard) | 4 consultas; todas las respuestas con nombres repetidos, para quedarse con 3 | 1 consulta con `GROUP BY … ORDER BY … LIMIT` |
| `loadCumulativeStats` (progreso) | 3 consultas; todas las respuestas y todas las sesiones, para contar y sumar | 1 agregado |
| `loadEntrometroHistory` (progreso) | 4 consultas (sesiones → respuestas → reactivos → temas) | 1 consulta ya ordenada |

### 4.7 Lo que se revisó y **no** era N+1

- **Carga del simulador / diagnóstico / drill.** El `include` anidado de las
  respuestas con su reactivo se resuelve en 5 consultas de tamaño fijo
  (sesión, respuestas, reactivos, temas, materias), no una por reactivo.
- **Jobs de correo.** `filterEnabledForType` y `getAuthEmails` ya trabajan por
  lote. `runParentWeeklySummaryJob` sí llama a `loadParentDashboardData` una
  vez por vínculo, pero eso es inherente: cada correo lleva datos distintos.
- **`buildCoverageReport`** (panel admin) carga el JSON `verification` de todo
  el banco. Es admin-only y de uso esporádico; queda anotado como candidato a
  agregado si algún día molesta.

---

## 5. Row Level Security

### 5.1 🔴 Hallazgo crítico: la respuesta correcta era pública

La política del banco de reactivos era:

```sql
read_verified: FOR SELECT USING ("isVerified" = true OR is_admin())
```

Es decir, **cualquiera** podía leer la tabla `questions` completa vía PostgREST
con solo `NEXT_PUBLIC_SUPABASE_ANON_KEY` — que es pública por diseño, va en el
bundle del cliente. Y `questions.options` es el JSON `[{ id, text, isCorrect }]`.

Comprobado en vivo antes de corregirlo, con `SET ROLE anon`:

```sql
SELECT jsonb_path_query_first(options::jsonb, '$[*] ? (@.isCorrect == true).id')
  FROM questions WHERE "isVerified";
-- → la letra correcta de los 1 143 reactivos servibles
```

Eso tira por la borda el simulador entero y contradice el primer guardrail de
CLAUDE.md. El scoring server-side estaba bien; la fuga era por la puerta de
atrás. Es el mismo tipo de agujero que la migración 0009 cerró para
`explanation_layers`, pero `questions` se había quedado fuera porque su
política *parecía* deliberada.

**Corregido**: `questions` pasa a admin-only, igual que el resto del contenido.
Verificado que ningún código del proyecto usa `supabase.from('questions')` — el
único acceso es Prisma con `acierta_ci`.

### 5.2 Cobertura: activo en las 28 tablas

`relrowsecurity = true` en las 28 tablas de `public`. Comprobado además el
comportamiento real, no solo la bandera, con sesiones simuladas del rol
`authenticated` y el JWT correspondiente:

| Prueba | Resultado |
|---|---|
| Alumno A lee su propio perfil / sesiones / respuestas | 1 / 4 / 480 ✅ |
| Alumno A lee perfil, sesiones, respuestas, Entrómetro, racha o suscripción de B | **0 en todos** ✅ |
| Tutor vinculado lee el perfil de su alumno | 1 ✅ |
| Tutor lee el perfil de un alumno **no** vinculado | **0** ✅ |
| Tutor lee sesiones, respuestas, Entrómetro o racha de su alumno | **0** ✅ (privacidad de F16) |
| `anon` lee perfiles, sesiones, respuestas, suscripciones, capas | **0 en todos** ✅ |
| `anon` lee reactivos | 1 143 ❌ → **0** ✅ tras §5.1 |

> `pnpm test:rls` (el script vivo con clientes `@supabase/supabase-js` reales)
> **no se pudo correr**: sus cuentas de sondeo en `auth.users` ya no existen y
> recrearlas exige `SUPABASE_SERVICE_ROLE_KEY`, que sigue pendiente desde G9.
> Por eso la verificación se hizo por la vía equivalente de arriba (`SET ROLE
> authenticated` + `request.jwt.claims`), que ejercita exactamente las mismas
> políticas.

### 5.3 Impacto en rendimiento: 55× en el peor caso

El linter de Supabase reportaba `auth_rls_initplan`. El problema: Postgres
trata `auth.uid()` / `current_profile_id()` / `is_admin()` como parte del
filtro de **cada fila** y las reevalúa una vez por fila.

Medido sobre `explanation_layers` (3 441 filas, política `USING (is_admin())`
sin cortocircuito — el peor caso real del schema), como `authenticated`:

```
ANTES:   38,305 ms   →  Filter: is_admin()            Rows Removed by Filter: 3441
DESPUÉS:  0,688 ms   →  InitPlan 1 … Filter: (InitPlan 1).col1
```

**55× más rápido, con el mismo resultado (0 filas para un no-admin).** El
arreglo es envolver cada llamada en `(SELECT …)`, lo que la convierte en un
InitPlan evaluado una vez por consulta. Se aplicó a las 29 políticas.

De paso se fundieron las **dos políticas permisivas de SELECT** sobre
`user_profiles` (Postgres evaluaba ambas en cada lectura) en una sola con `OR`,
y se añadió `WITH CHECK` a las políticas de escritura — la migración 0009 ya
había documentado que su ausencia dejaba a un usuario cambiar su propio `role`
a `ADMIN` si algún día se le devolviera el GRANT de UPDATE.

### 5.4 Avisos del linter que se dejan como están (con razón)

Tras los cambios, el linter de seguridad no reporta ningún **ERROR**. Quedan
cuatro **WARN**, todos revisados:

- `current_profile_id()` y `is_admin()` son ejecutables por `anon` y
  `authenticated` vía `/rest/v1/rpc/…`. **Se dejan así a propósito**: las
  expresiones de una política RLS se evalúan con los privilegios del rol que
  consulta, así que revocarles `EXECUTE` rompería todas las políticas que las
  usan. Y lo que devuelven no filtra nada: `is_admin()` responde `false` a
  quien no lo es, y `current_profile_id()` devuelve el id de perfil del propio
  llamante, que ya conoce.
- `auth_leaked_password_protection` desactivado. Es un interruptor del panel de
  Supabase Auth (contraste contra HaveIBeenPwned), no de la base de datos.
  Conviene encenderlo antes del lanzamiento; es un clic del dueño del proyecto.

Y en el linter de rendimiento: `auth_rls_initplan` (1 aviso) y
`multiple_permissive_policies` (5 avisos) **desaparecieron**; las llaves
foráneas sin índice bajaron de **18 a 5**, y esas 5 son exactamente las de la
Fase 2 que se decidió no indexar (§8.3).

### 5.5 RLS no está en el camino de la app

Conviene tenerlo claro para no perseguir fantasmas: **Prisma se conecta con
`acierta_ci`, que tiene `rolbypassrls = true`** (verificado en vivo). Las
políticas RLS **no cuestan nada** en las consultas de la aplicación. Son
defensa en profundidad contra el acceso directo por PostgREST con la anon key
— que es exactamente el vector de §5.1, así que la defensa importa aunque no
esté en el camino caliente.

---

## 6. Pool de conexiones en serverless

### 6.1 El hallazgo que casi tumba el sitio

La instrumentación mostró algo que no se ve en el código: **cada operación de
Prisma cuesta cuatro viajes de red, no uno.**

```
1. BEGIN
2. DEALLOCATE ALL
3. SELECT … (la consulta de verdad)
4. COMMIT
```

Eso es `?pgbouncer=true` en `DATABASE_URL`: hace que Prisma desactive las
sentencias preparadas con nombre y limpie el estado en cada transacción. De los
300 viajes que quedan en los flujos críticos, **201 son protocolo** (67 %).

Quitar el parámetro parece la optimización obvia. Medido (`pnpm perf:pool`,
puerto 6543, 10 rondas × 3 operaciones):

| Configuración | Viajes | Por operación | Tiempo |
|---|---|---|---|
| `pgbouncer=true` | 121 | **4,0** | 16 646 ms |
| sin `pgbouncer` | 30 | **1,0** | **3 552 ms** |
| sin `pgbouncer` (2ª pasada) | 30 | 1,0 | 3 582 ms |

**4,7× más rápido y sin errores.** Y sería un error gravísimo quedarse ahí.

El modo en que fallan las sentencias preparadas sobre un pooler en modo
transacción es **intermitente**: aparece cuando Supavisor reasigna la conexión
del cliente a otra conexión de servidor que no tiene esa sentencia. Una sola
conexión secuencial casi nunca lo dispara. Con 8 clientes en paralelo —que es
lo que de verdad pasa con varias instancias lambda— **fallaron los 8**:

```
ERROR 26000: prepared statement "s42" does not exist
ERROR 26000: prepared statement "s50" does not exist
ERROR 42P05: prepared statement "s47" already exists
```

O sea: el atajo se ve perfecto en una prueba de escritorio y tumba el sitio
bajo carga. Justo el modo de falla que esta fase venía a prevenir.

**Conclusión: `pgbouncer=true` se queda.** Y como el costo de 4 viajes por
operación es fijo e inevitable, **la única palanca real es hacer menos
operaciones de Prisma por petición** — que es exactamente el trabajo de §4.
Esto es lo que amarra toda la auditoría: los 454 → 300 viajes valen 4× más de
lo que parecen.

### 6.2 Configuración aplicada

La cadena de conexión ya no depende de que alguien se acuerde de escribirla
bien en el panel de Vercel: `src/lib/db/connection-url.ts` la normaliza en
código, y `src/lib/db/prisma.ts` la usa vía `datasourceUrl`.

| Parámetro | Valor | Por qué |
|---|---|---|
| `pgbouncer` | `true` | Obligatorio (§6.1). Sin él, `26000` bajo concurrencia. |
| `connection_limit` | `5` | El dashboard y progreso disparan sus loaders con `Promise.all`; `connection_limit=1` (la receta clásica de Prisma para lambdas) los serializaría. En modo transacción el pooler multiplexa: son conexiones al **pooler**, no a Postgres, así que no compiten contra `max_connections` (**60** en esta instancia, verificado). |
| `pool_timeout` | `20` | El doble del default. Bajo pico es preferible encolar 20 s que devolver `P2024` al alumno a media sesión. |
| `connect_timeout` | `10` | Margen para el arranque en frío de una lambda. |

Reglas de la normalización, cubiertas por `tests/db/connection-url.test.ts`
(9 casos):

- Solo toca conexiones al **pooler en modo transacción** (puerto 6543 o
  `pgbouncer=true`). La conexión **directa** (`DIRECT_URL`, 5432) que usan
  `prisma migrate` y los scripts offline se deja intacta.
- **Nunca sobreescribe** un valor puesto a mano por el operador.
- Es idempotente.
- Si la cadena falta o es inválida, la devuelve tal cual: que se queje Prisma
  con su propio mensaje.

### 6.3 Singleton: ahora también en producción

```ts
// antes
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
// ahora
globalForPrisma.prisma = prisma;
```

Cachear solo fuera de producción es el patrón para que el HMR de Next no
acumule clientes en desarrollo. Pero en producción cada bundle de ruta puede
evaluar el módulo por separado dentro de la **misma** instancia lambda, y cada
evaluación abriría otro pool. Cachearlo siempre garantiza un pool por
instancia, que es lo que el pooler espera. Nunca se llama `$disconnect()`: en
serverless la conexión debe sobrevivir entre invocaciones de la misma
instancia.

### 6.4 Co-locación

`vercel.json` fija ahora `"regions": ["iad1"]` — la misma región que el
proyecto de Supabase (us-east-1). Era el default de la cuenta, pero con cuatro
viajes por operación cualquier deriva de región se multiplica por cuatro, así
que conviene que esté escrito.

---

## 7. Pendiente que esta fase NO pudo cerrar

**Los tres correos programados fallan en silencio.**

`src/lib/db/auth-users.ts` lee correos con
`SELECT id, email FROM auth.users WHERE id = ANY(...)`, y el rol `acierta_ci`
**no tiene acceso al esquema `auth`**:

```sql
has_schema_privilege('acierta_ci','auth','USAGE') → false
```

Consecuencia real: `runStreakRiskJob`, `runExamCountdownJob` y
`runParentWeeklySummaryJob` fallan con `42501 permission denied for schema
auth`. Como el runner los corre con `Promise.allSettled`, **el cron no truena**:
reporta 0 enviados y deja el error en el log. Por eso nadie lo había notado.

No se pudo corregir desde aquí: el esquema `auth` es de `supabase_admin` y el
rol `postgres` (el que usa el conector) solo tiene `USAGE` **sin grant option**
(`nspacl` = `…postgres=U/supabase_admin`), así que su `GRANT` es un no-op
silencioso — y `SET ROLE supabase_admin` está denegado. Se intentó, se verificó
que no tomaba, y **se revirtió el grant parcial de columnas** para no dejar
media configuración aplicada.

**Acción del dueño del proyecto**, con un rol con privilegio suficiente:

```sql
GRANT USAGE ON SCHEMA auth TO acierta_ci;
GRANT SELECT (id, email) ON auth.users TO acierta_ci;
```

El grant por **columna** es deliberado: `acierta_ci` no necesita —y no debe
poder leer— `encrypted_password` ni el resto de `auth.users`.

Alternativa si se prefiere no tocar el esquema `auth`: reescribir
`getAuthEmails` sobre la API admin de Supabase, que necesita una
`SUPABASE_SERVICE_ROLE_KEY` real (hoy `.env.local` trae un marcador de 22
caracteres, no una llave). Esa misma llave desbloquearía `pnpm test:rls`.

---

## 8. Índices

18 índices nuevos, **~360 kB en total** con el volumen actual. Todos con
`IF NOT EXISTS`: la migración es idempotente.

### 8.1 Camino crítico

| Índice | Sirve a | Efecto medido |
|---|---|---|
| `idx_exam_sessions_exam_score` <br>`("examId", mode, status, score)` | Percentil del simulacro; además cubre la FK `exam_sessions_examId_fkey`, que **no tenía ningún índice con `examId` a la cabeza** | Bitmap Heap Scan → Index Scan |
| `idx_exam_sessions_user_started` <br>`("userProfileId", "startedAt" DESC)` | Exclusión de 72 h, límite diario del muro suave, mapa de calor, "sesión vigente más reciente" | 0,048 → 0,026 ms |
| `idx_exam_sessions_user_finished` <br>parcial, `("userProfileId", "finishedAt" DESC)` | Simulacros recientes, historial, evolución del Entrómetro | Sin Sort aparte |
| `idx_exam_sessions_stale_sweep` <br>parcial, `("startedAt")` | Cron de sesiones colgadas. El `idx_exam_sessions_open` existente no le servía: su primera columna es el usuario | 0,78 → **0,49 ms** |
| `idx_session_answers_question` <br>`("questionId")` | FK sin índice sobre la tabla más grande; retirar un reactivo la recorría entera | Insignia: 204 → 114 ms solo por el índice |
| `idx_session_answers_session_position` <br>`("sessionId", position)` | Payload del simulador, siempre `ORDER BY position` | Sort → Index Scan |
| `idx_questions_pool_covering` <br>parcial, `("topicId", id)` | Pool servible del área. Incluir `id` lo hace index-only: no toca el heap, donde viven `stem`, `options` y `verification` | 0,65 → **0,39 ms** |

### 8.2 Llaves foráneas sin índice (linter de Supabase)

`parent_links(studentProfileId)` · `parent_link_codes(studentProfileId)` ·
`payments(subscriptionId)` · `user_profiles(targetExamId)` ·
`user_profiles(targetCareerId)` · `weak_topics(topicId)` ·
`questions(passageId)` · `questions(contentSourceId)` ·
`passages(contentSourceId)` · `source_chunks(subjectId)` ·
`question_source_chunks(sourceChunkId)`

Las que apuntan a columnas casi siempre nulas van **parciales**
(`WHERE col IS NOT NULL`): ocupan lo que de verdad usan.

### 8.3 Lo que se decidió NO indexar

- `content_items.subjectId / topicId / professorId` y
  `questions.videoLectureId / professorNoteId`. Son las llaves de la **Fase 2**
  (video, notas de profesor). `content_items` y `professors` están vacías, esas
  dos columnas de `questions` son 100 % `NULL`, y nada de eso se borra en Fase
  1: un índice ahí solo costaría escrituras. El linter los seguirá reportando.
- `streak_records(currentStreak)` y `user_profiles(role)` para los crons: un
  recorrido secuencial de decenas de miles de filas **una vez al día** no
  justifica el costo en cada escritura.

### 8.4 Índices redundantes: detectados, no eliminados

- `user_profiles_userId_idx` duplica exactamente el índice único
  `user_profiles_userId_key`.
- `idx_questions_publishable` es casi redundante con
  `questions_servable_verified_idx` (solo difiere para los
  `CALIBRATION_ONLY`).
- `session_answers_sessionId_idx` queda cubierto por el nuevo
  `(sessionId, position)`.

**No se borran**, a propósito: el primero lo genera `@@index([userId])` en
`schema.prisma` y borrarlo crearía deriva con el schema (CLAUDE.md prohíbe
tocarlo sin instrucción explícita); los otros dos aparecen como "usados" en las
estadísticas y con 1 147 reactivos el ahorro sería de kilobytes. Queda anotado
para cuando haya una instrucción explícita de tocar el schema.

> Nota: el linter reporta varios índices como "no usados". Es esperable: la
> base no ha tenido tráfico real. No es motivo para borrarlos antes del
> lanzamiento.

---

## 9. Nota operativa

`CREATE INDEX` toma un lock de escritura sobre la tabla. Con el volumen de hoy
tarda milisegundos, y en la prueba de carga (857 k filas) segundos. Si alguna
vez hay que reaplicar la migración con usuarios en línea, conviene reescribir
los `CREATE INDEX` como `CREATE INDEX CONCURRENTLY` y correrlos **fuera** de
una transacción, uno por uno.

---

## 10. Archivos

| Archivo | Qué |
|---|---|
| `prisma/migrations/0012_perf_indexes_and_rls_g59.sql` | Índices + RLS (aplicada) |
| `src/lib/db/connection-url.ts` | Normalización de la cadena (pura, testeada) |
| `src/lib/db/prisma.ts` | Singleton + `datasourceUrl` |
| `src/lib/db/answer-history.ts` | Historial en una consulta |
| `src/lib/db/adaptive.ts` | `loadPredictionTarget`, historial compartido |
| `src/lib/db/gamification.ts` | Insignia: acotada al alumno + agregada |
| `src/lib/db/simulator.ts` | Sinc por lote, percentil agregado |
| `src/lib/db/shared-content.ts` | Taxonomía en una consulta, cacheada |
| `src/lib/db/progress.ts`, `dashboard.ts` | Agregaciones movidas a SQL |
| `src/lib/simulator/percentile.ts` | `percentileRankFromCounts` |
| `scripts/perf-audit.ts` | Arnés de medición (`pnpm perf:audit`) |
| `scripts/perf-pool-probe.ts` | Sonda del pool (`pnpm perf:pool`) |
| `tests/db/connection-url.test.ts` | 9 casos de la política de conexión |

**Verde al cierre**: `pnpm typecheck` · `pnpm lint` · `pnpm test:unit`
(53 archivos, **502 pruebas**).
