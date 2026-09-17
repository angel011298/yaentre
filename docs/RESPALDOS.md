# Respaldos y recuperación — YaEntre

> Fase G61 (2026-09-01). El banco de reactivos es el activo más valioso del
> producto: ~1 150 reactivos verificados, cada uno con opciones, 3 capas de
> explicación y su veredicto de verificación adversarial — meses de trabajo que
> **no se puede regenerar barato**. Este documento define cómo no perderlo.

---

## 0. Resumen para decidir rápido

| Riesgo | Cobertura hoy | Acción |
|---|---|---|
| **Borrado accidental / bug que corrompe el banco** | ✅ `pnpm backup:export` → `backups/content-bank.json` versionado en git. Restauración probada (G61). | Correr el export tras cada lote de contenido y commitearlo. |
| **Fallo de disco / pérdida del proyecto Supabase** | ⚠️ El plan **gratuito NO da respaldos restaurables**. El respaldo de contenido de git cubre el contenido, y desde **G97** ese historial vive también en un **remoto privado de GitHub** (§2.3), así que ya sobrevive a la pérdida de la laptop. Los datos de usuario/pago **siguen sin red**. | Decisión pendiente del dueño: subir a **Pro ($25/mes)** antes de tener clientes pagando — §6. |
| **Necesito un entorno de pruebas idéntico al de prod** | ✅ `pnpm backup:import --schema <x>` o contra un proyecto vacío. | — |

---

## 1. Respaldos automáticos de Supabase — qué cubre el plan actual

**Proyecto:** `Acierta` (`fumluvvzskhdxcyljbmx`), región `us-east-1`, PostgreSQL 17.
**Organización:** `553angelortiz@gmail.com's Org` — **plan `free`** (verificado por
la Management API el 2026-09-01).

### 1.1 Lo que el plan gratuito da y NO da

| | Plan **Free** (actual) | Pro | Team | Enterprise |
|---|---|---|---|---|
| Respaldos diarios automáticos | **No accesibles.** Supabase dice que *puede* tomar hasta 7 diarios internos, "disponibles una vez que subas de plan", y que **podría dejar de hacerlos para proyectos free en el futuro**. No hay forma de restaurar desde el dashboard ni la API. | ✅ 7 días de retención | ✅ 14 días | ✅ hasta 30 días |
| Descarga de respaldos (dashboard) | ❌ "Database backups are not available for download for Free Plan projects." | ✅ | ✅ | ✅ |
| Point-in-Time Recovery (PITR) | ❌ (add-on solo Pro+) | Add-on | Add-on | Add-on |
| Restaurar a otro proyecto ("clone") | ❌ (requiere respaldos físicos, que son Pro+) | ✅ | ✅ | ✅ |
| Pausa por inactividad | ⚠️ Sí — Supabase **pausa** proyectos free con poca actividad en 7 días. Se reactivan a mano desde el dashboard. Subir a Pro lo elimina. | No | No | No |

**Recomendación oficial de Supabase para el plan free**, textual:
> *"We recommend that free tier plan projects regularly export their data using
> the Supabase CLI `db dump` command and maintain off-site backups."*

Es decir: en el plan gratuito, **el respaldo es responsabilidad nuestra**. Este
repo lo implementa para el contenido (§2–§5).

### 1.2 Qué NO cubre ningún respaldo de Supabase, en ningún plan

- **Archivos de Storage** (avatares). Los respaldos de base solo guardan los
  metadatos, no los binarios. Hoy no es crítico (los avatares son cosméticos y
  reemplazables), pero anotarlo.
- **Contraseñas de roles personalizados** (`acierta_ci`). Un restore desde
  respaldo diario no las trae; hay que resetearlas después.
- **Objetos borrados después del respaldo** (obvio, pero: PITR es lo único que
  llega "hasta el segundo del desastre").

### 1.3 Retención y frecuencia (planes de pago, para referencia)

- **Respaldos diarios**: 1×/día, retención 7/14/30 días según plan. RPO = hasta
  24 h (puedes perder un día).
- **PITR**: snapshot físico diario + archivado de WAL cada ~2 min. RPO ≈ **2
  minutos** en el peor caso. Retención configurable 7/14/28 días.
  - Precio: **~$100/mes** (7 días) · ~$200 (14) · ~$400 (28). Además exige un
    add-on de cómputo *Small* (~$10/mes, cubierto por los créditos del plan Pro).
  - Al activar PITR, Supabase **deja de tomar los diarios** (PITR los reemplaza).

---

## 2. El respaldo de contenido de este repo

Un respaldo **lógico** propio: un único JSON versionable que permite reconstruir
**todo el contenido** contra una base vacía.

### 2.1 Qué cubre — y qué NO

**Sí** (13 tablas, en `scripts/lib/content-backup.ts` → `CONTENT_MODELS`):

| Grupo | Tablas |
|---|---|
| Reactivos | `questions` (stem, opciones, dificultad, `verification`, `groundingStatus`, `format`, …) |
| Explicaciones | `explanation_layers` (las 3–4 capas por reactivo) |
| Comprensión de lectura | `passages` |
| Taxonomía | `institutions`, `levels`, `exams`, `areas`, `careers`, `subjects`, `topics` |
| Fuentes y trazabilidad | `content_sources`, `source_chunks`, `question_source_chunks` |

Se preservan los `id` (cuid) originales, así que **todas las llaves foráneas
cuadran** tras restaurar. También se preservan `createdAt` / `updatedAt` /
`ingestedAt` / `classifiedAt`.

**No** (a propósito):

- **Datos de usuario**: `user_profiles`, `exam_sessions`, `session_answers`,
  `weak_topics`, `learning_profiles`, `streak_records`, `subscriptions`,
  `payments`, `notification_preferences`, `parent_links`, `question_reports`.
  Estos dependen del respaldo/PITR de Supabase (§6). Un `question_report` es un
  dato de usuario aunque apunte a un reactivo.
- **Contenido de Fase 2**: `content_items`, `professors` (INACTIVO y vacío).
- **Migraciones / esquema**: viven en `prisma/migrations/` y `prisma/schema.prisma`.
  El importador asume que el esquema ya está aplicado en el destino.

### 2.2 Correr el export

```bash
pnpm backup:export
```

- Lee la base (solo lectura) y escribe **`backups/content-bank.json`**.
- Corre en cualquier momento; no bloquea nada.
- El archivo trae un `_manifest` con: formato/versión, fecha, ref del proyecto,
  **SHA-256 de `prisma/schema.prisma`** (para detectar si el esquema cambió
  desde el respaldo) y el conteo por tabla.
- Tamaño actual: ~3.9 MB (JSON crudo) / ~5.1 MB en disco pretty-printed.

Destino alterno (p. ej. una copia con fecha fuera del repo):

```bash
pnpm backup:export --out ../acierta-backups/content-2026-09-01.json
```

### 2.3 Con qué frecuencia

**La retención es el historial de git.** Cada corrida sobreescribe
`backups/content-bank.json`; ese cambio se commitea y queda una versión
recuperable por commit.

> **Desde G97 (2026-09-16) ese historial ya vive fuera de la laptop.** El
> repositorio tiene remoto privado en **https://github.com/angel011298/yaentre**
> (rama `master`), así que `backups/content-bank.json` —y con él todas sus
> versiones históricas— tiene por fin una **segunda copia física**. Hasta ese
> día, el único respaldo restaurable del banco existía en un solo disco: un
> fallo de esa máquina se llevaba el contenido y su respaldo a la vez.
>
> **La copia solo está tan al día como el último `git push`.** Un
> `pnpm backup:export` commiteado pero no empujado no está respaldado fuera de
> la laptop. Por eso `CLAUDE.md` §«Toda sesión debe» exige cerrar con `git push`
> y comprobar por efecto que `git ls-remote origin master` = `git rev-parse HEAD`.

| Cuándo | Por qué |
|---|---|
| **Tras cada lote de contenido** (cada fase `feat(Gxx): lote…` / `feat(Gxx): verificación ciega`) | Es cuando el banco crece o cambia. El commit del lote debe incluir el `backups/content-bank.json` actualizado. |
| **Antes de cualquier migración que toque tablas de contenido** | Red de seguridad si la migración sale mal. |
| **Antes de correr `backup:import --wipe`** | Obvio. |
| Mínimo, aunque no haya lotes: **1×/semana** | El pipeline a veces retoca `verification` / `questionWeight` sin un "lote" formal. |

> Regla práctica para las sesiones de contenido: si `git status` muestra cambios
> en `questions`/`explanation_layers` vía el pipeline, corre `pnpm backup:export`
> y añade `backups/content-bank.json` al mismo commit.

### 2.4 Off-site (recomendado, manual)

El repo ya vive en GitHub, así que el `content-bank.json` committeado **ya está
replicado fuera de Supabase** — eso cubre el escenario "perdí el proyecto
Supabase". Para paranoia extra, copiar el archivo de vez en cuando a otro lado
(Drive, disco externo) con `pnpm backup:export --out <ruta-externa>`.

---

## 3. Restauración — procedimiento exacto

### 3.1 Caso A — restaurar el contenido a un proyecto Supabase nuevo/vacío

Escenario: se perdió/corrompió el proyecto, o se está levantando uno nuevo.

1. **Crear el proyecto** en Supabase y obtener su `DATABASE_URL` / `DIRECT_URL`
   (rol con permisos de escritura — `postgres` o un `acierta_ci` equivalente).
2. **Aplicar el esquema.** Con `DIRECT_URL` apuntando al proyecto nuevo:
   ```bash
   pnpm prisma migrate deploy        # aplica prisma/migrations/* en orden
   ```
   Ojo con las migraciones que crean el rol `acierta_ci`, RLS y las funciones
   `SECURITY DEFINER` — ya están en `prisma/migrations/0001…` y siguientes.
3. **Sembrar NADA con `prisma db seed`** — la taxonomía viene en el respaldo con
   sus `id` originales. Sembrar aparte crearía `id` nuevos y rompería las FK de
   los reactivos.
4. **Importar el contenido.** Con `DATABASE_URL` apuntando al proyecto nuevo:
   ```bash
   pnpm backup:import                # aborta si el destino ya tiene reactivos
   ```
   El script inserta en orden de dependencias, preserva los `id`, verifica que
   los conteos por tabla cuadren con el `_manifest` y corre un chequeo de
   integridad referencial. Si algo no cuadra, **aborta con error** (no deja una
   restauración a medias sin avisar).
5. **Verificar**:
   ```bash
   pnpm exec tsx scripts/audit-content.ts     # totales por institución/área/materia
   pnpm content:coverage                       # cobertura + salud del pipeline
   ```
6. Regenerar el cliente y desplegar: `pnpm prisma generate`, deploy normal a
   Vercel con las env vars del proyecto nuevo.

### 3.2 Caso B — reemplazar el contenido del proyecto actual

Escenario: un bug/borrado dañó el banco y hay un `content-bank.json` sano (de un
commit anterior).

```bash
git show <commit-sano>:backups/content-bank.json > backups/content-bank.json
pnpm backup:import --wipe --yes
```

- `--wipe` borra el contenido actual en orden inverso y luego importa.
- **Falla si hay `session_answers` que apuntan a los reactivos** (FK
  `ON DELETE RESTRICT`). Eso es a propósito: no se puede tirar contenido que
  usuarios reales ya respondieron sin decidir antes qué hacer con esas sesiones.
  En un incidente real, coordinar con el Caso A (restaurar a un proyecto limpio)
  o borrar/archivar primero las sesiones afectadas.
- `--wipe` sin `--yes` pide confirmación interactiva (escribir `SI`).

### 3.3 Caso C — verificar que un respaldo restaura, sin tocar nada

```bash
pnpm backup:import --dry-run
```

Corre el wipe + import + verificación de integridad **dentro de una transacción
y hace ROLLBACK**: no escribe una sola fila. Sirve para confirmar, en cualquier
momento, que `backups/content-bank.json` está completo y es consistente con el
esquema real (enums, FK, NOT NULL). Es seguro correrlo contra producción.

### 3.4 Caso D — entorno de pruebas en un esquema aislado del mismo proyecto

```bash
pnpm backup:import --schema restore_test
```

Importa a un esquema Postgres aislado (`restore_test`) del **mismo** proyecto,
sin tocar `public`. Requiere que el esquema ya exista con las 13 tablas Y con
copias de los 8 enums (`InstitutionCode`, `LevelType`, `DifficultyLevel`,
`QuestionSource`, `QuestionUsage`, `QuestionFormat`, `ConfidenceLevel`,
`GroundingStatus`) — Prisma con `?schema=` califica los casts de enum contra ese
esquema. La receta SQL para armarlo está en §5.2 (es la que usó la prueba de
G61). Al terminar: `DROP SCHEMA restore_test CASCADE`.

### 3.5 Caso E — restaurar datos de USUARIO (no cubierto por este repo)

Solo posible con respaldos de Supabase:

- **Plan free**: no hay. Los datos de usuario perdidos, se pierden.
- **Plan Pro**: dashboard → *Database → Backups → Scheduled* → elegir el
  respaldo diario más cercano ANTES del desastre → *Restore*. El proyecto queda
  **inaccesible durante el restore** (downtime proporcional al tamaño de la
  base). Si hay `subscriptions`/replication slots, hay que dropearlos antes y
  recrearlos después.
- **Con PITR**: dashboard → *Database → Backups → Point in Time* → elegir fecha y
  hora exactas.
- Vía Management API (necesita un Personal Access Token del dueño):
  ```bash
  curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/fumluvvzskhdxcyljbmx/database/backups"
  ```

---

## 4. Los scripts

| Script | pnpm | Qué hace |
|---|---|---|
| `scripts/backup-content-export.ts` | `pnpm backup:export` | DB → `backups/content-bank.json` |
| `scripts/backup-content-import.ts` | `pnpm backup:import` | `backups/content-bank.json` → DB (`--dry-run` / `--wipe --yes` / `--schema <x>` / `--file <p>`) |
| `scripts/lib/content-backup.ts` | — | Contrato compartido: lista de modelos, orden de inserción, codificación de fechas, metadatos por columna **derivados del DMMF de Prisma** (sin listas hardcodeadas que se desalineen del schema) |

Formato del archivo: `_manifest` + una sección por modelo (arreglo de filas).
Fechas como `{ "$d": "<iso>" }`. Los `jsonb` (`options`, `verification`,
`sources`) se guardan tal cual, sin tocar su interior.

---

## 5. Prueba real ejecutada en G61

### 5.1 Resultado

- **Export**: corrida real contra producción → 5 658 filas
  (2 instituciones · 2 exámenes · 7 áreas · 47 carreras · 35 materias ·
  217 temas · 12 pasajes · 9 fuentes · 380 chunks · 357 vínculos ·
  1 147 reactivos · 3 441 explicaciones), 3.91 MB.
- **Import a un esquema aislado** (`g61_restore_test`, vacío, con las 13 tablas +
  8 enums): las 5 658 filas restauradas. **Checksum `md5` por tabla, `public`
  vs. esquema restaurado: idénticos en las 13** — la reconstrucción es
  byte-a-byte, incluidos los `jsonb` y todas las marcas de tiempo.
- **16 llaves foráneas** añadidas al esquema restaurado *después* de importar:
  todas validaron → los datos quedaron referencialmente íntegros.
- **`--dry-run` contra producción**: wipe + insert de 5 658 + verificación,
  luego ROLLBACK. Producción intacta (1 147 reactivos, 480 respuestas, 5 sesiones
  — sin cambios).
- El esquema `g61_restore_test` se eliminó al terminar.

### 5.2 Receta SQL del esquema de prueba (Caso D / la prueba de G61)

```sql
DROP SCHEMA IF EXISTS restore_test CASCADE;
CREATE SCHEMA restore_test;

-- Copiar los 8 enums que usan las tablas de contenido
DO $$
DECLARE t text; labels text;
BEGIN
  FOR t, labels IN
    SELECT tt.typname, string_agg(quote_literal(e.enumlabel), ',' ORDER BY e.enumsortorder)
    FROM pg_type tt JOIN pg_enum e ON e.enumtypid = tt.oid
    JOIN pg_namespace n ON n.oid = tt.typnamespace
    WHERE n.nspname='public'
      AND tt.typname IN ('InstitutionCode','LevelType','DifficultyLevel','QuestionSource',
                         'QuestionUsage','QuestionFormat','ConfidenceLevel','GroundingStatus')
    GROUP BY tt.typname
  LOOP
    EXECUTE format('CREATE TYPE restore_test.%I AS ENUM (%s)', t, labels);
  END LOOP;
END $$;

-- Tablas: solo columnas + NOT NULL (sin defaults/índices/FK)
CREATE TABLE restore_test.institutions           (LIKE public.institutions);
CREATE TABLE restore_test.content_sources        (LIKE public.content_sources);
CREATE TABLE restore_test.levels                 (LIKE public.levels);
CREATE TABLE restore_test.exams                  (LIKE public.exams);
CREATE TABLE restore_test.areas                  (LIKE public.areas);
CREATE TABLE restore_test.careers                (LIKE public.careers);
CREATE TABLE restore_test.subjects               (LIKE public.subjects);
CREATE TABLE restore_test.topics                 (LIKE public.topics);
CREATE TABLE restore_test.passages               (LIKE public.passages);
CREATE TABLE restore_test.source_chunks          (LIKE public.source_chunks);
CREATE TABLE restore_test.questions              (LIKE public.questions);
CREATE TABLE restore_test.question_source_chunks (LIKE public.question_source_chunks);
CREATE TABLE restore_test.explanation_layers     (LIKE public.explanation_layers);

-- Columnas enum → enums del propio esquema
ALTER TABLE restore_test.institutions ALTER COLUMN code TYPE restore_test."InstitutionCode" USING code::text::restore_test."InstitutionCode";
ALTER TABLE restore_test.levels       ALTER COLUMN type TYPE restore_test."LevelType"       USING type::text::restore_test."LevelType";
ALTER TABLE restore_test.careers      ALTER COLUMN "minAciertosConfidence" TYPE restore_test."ConfidenceLevel" USING "minAciertosConfidence"::text::restore_test."ConfidenceLevel";
ALTER TABLE restore_test.questions    ALTER COLUMN difficulty        TYPE restore_test."DifficultyLevel" USING difficulty::text::restore_test."DifficultyLevel";
ALTER TABLE restore_test.questions    ALTER COLUMN source            TYPE restore_test."QuestionSource"  USING source::text::restore_test."QuestionSource";
ALTER TABLE restore_test.questions    ALTER COLUMN usage             TYPE restore_test."QuestionUsage"   USING usage::text::restore_test."QuestionUsage";
ALTER TABLE restore_test.questions    ALTER COLUMN format            TYPE restore_test."QuestionFormat"  USING format::text::restore_test."QuestionFormat";
ALTER TABLE restore_test.questions    ALTER COLUMN "groundingStatus" TYPE restore_test."GroundingStatus" USING "groundingStatus"::text::restore_test."GroundingStatus";

-- Claves primarias
ALTER TABLE restore_test.institutions           ADD PRIMARY KEY (id);
ALTER TABLE restore_test.content_sources        ADD PRIMARY KEY (id);
ALTER TABLE restore_test.levels                 ADD PRIMARY KEY (id);
ALTER TABLE restore_test.exams                  ADD PRIMARY KEY (id);
ALTER TABLE restore_test.areas                  ADD PRIMARY KEY (id);
ALTER TABLE restore_test.careers                ADD PRIMARY KEY (id);
ALTER TABLE restore_test.subjects               ADD PRIMARY KEY (id);
ALTER TABLE restore_test.topics                 ADD PRIMARY KEY (id);
ALTER TABLE restore_test.passages               ADD PRIMARY KEY (id);
ALTER TABLE restore_test.source_chunks          ADD PRIMARY KEY (id);
ALTER TABLE restore_test.questions              ADD PRIMARY KEY (id);
ALTER TABLE restore_test.question_source_chunks ADD PRIMARY KEY ("questionId","sourceChunkId");
ALTER TABLE restore_test.explanation_layers     ADD PRIMARY KEY (id);

-- Permisos para el rol de conexión de Prisma
GRANT USAGE, CREATE ON SCHEMA restore_test TO acierta_ci;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA restore_test TO acierta_ci;
```

Luego `pnpm backup:import --schema restore_test`, y al terminar
`DROP SCHEMA restore_test CASCADE;`.

---

## 6. Evaluación del plan — ¿alcanza el gratuito con clientes pagando?

**No.** El plan gratuito es adecuado para pre-lanzamiento, pero **antes del 6 de
enero de 2027 (launch) o en cuanto haya un solo cliente pagando**, el proyecto
debe estar en **Pro**. Razones, en orden de peso:

1. **Cero recuperación de datos de usuario.** Si un bug o un borrado toca
   `user_profiles`/`subscriptions`/`payments`/`exam_sessions`, en el plan free
   **no hay de dónde restaurar**. Con clientes pagando eso es inaceptable: no se
   puede reconstruir la relación de pago de un cliente ni su progreso.
2. **Pausa por inactividad.** Supabase pausa proyectos free ociosos; un launch
   con tráfico intermitente los primeros días es justo el perfil de riesgo.
3. **Sin acceso a soporte.** El plan free no incluye soporte de Supabase.
4. **SLA.** El uptime SLA solo aplica a planes de pago.

### 6.1 Opciones y costo (precios Supabase, USD, verificados 2026-09-01)

| Opción | Costo mensual | RPO (cuánto se puede perder) | Recomendación |
|---|---|---|---|
| **Free** (actual) | $0 | Datos de usuario: **todo**. Contenido: 0 (git). | Solo hasta el launch. |
| **Pro** | **$25** (incluye $10 de créditos de cómputo) | Datos de usuario: **hasta 24 h** (respaldo diario, 7 días de retención). Contenido: 0. | **Mínimo para el launch.** Cubre el 95 % del riesgo por 1/100 del costo de PITR. |
| **Pro + PITR 7 días** | $25 + ~$100 + ~$10 cómputo Small ≈ **$125–135** | Datos de usuario: **~2 min**. | Cuando el volumen de pagos lo justifique (p. ej. >$1 000/mes de ingresos) o si la base pasa de 4 GB. Hoy la base son **~20 MB**: PITR es sobredimensionado. |
| **Team** | $599 | 14 días de retención de diarios | Innecesario a esta escala. |

### 6.2 Decisión pendiente del dueño

- [ ] **Subir el proyecto `Acierta` a Pro ($25/mes) antes del launch** (6-ene-2027).
      Idealmente ya, para quitar el riesgo de pausa por inactividad durante la
      beta. Se hace desde el dashboard de Supabase → *Organization → Billing*.
- [ ] Revisar en el launch si conviene activar PITR. Con ~20 MB de base y pocos
      pagos al inicio, **el respaldo diario de Pro basta**; PITR se puede activar
      después sin migración.
- [ ] Independiente del plan: seguir corriendo `pnpm backup:export` tras cada
      lote — el respaldo de contenido de git es más barato y más granular que
      cualquier respaldo de Supabase para *ese* activo, y sobrevive incluso a la
      pérdida total del proyecto.

---

## 7. Checklist de aceptación (G61)

- [x] Respaldos automáticos de Supabase documentados con precisión (§1).
- [x] Script de exportación funcionando y probado contra producción (§2.2, §5).
- [x] Script de importación funcionando y probado (esquema aislado + `--dry-run`, §5).
- [x] Procedimiento de restauración completo (§3).
- [x] Evaluación del plan con costos y decisión pendiente del dueño (§6).
