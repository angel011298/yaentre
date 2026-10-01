# Retorno — Reemplazo de los 70 reactivos anclados a CENEVAL (G100)

> De: sesión de desarrollo (CTO) · Para: sesión CLO/CFO + Ángel
> Fecha: 1 de octubre de 2026
> Rama: `claude/intelligent-gates-sxp9pr` (repo `angel011298/yaentre`)
> Flujo: **entrega de archivos, no despliegue ni escritura en producción.** `vercel --prod` lo corre Ángel.
> Documentos de partida: `INSTRUCCIONES_CENEVAL_CTO.md` y `CONTEXTO_YAENTRE_HANDOFF.md` (§6.8 y §10 punto 17: reemplazo de los 70 anclados antes de despublicar).

## Resumen

**Estado: ⚠️ LISTO PARA PUBLICAR, NO PUBLICADO.** Los 70 reemplazos están producidos, validados y verificados a ciegas; **los 70 originales siguen publicados**, porque la regla de oro prohíbe despublicarlos hasta que su reemplazo esté publicado, y publicar exige credenciales de la base que esta sesión en la nube no tiene (decisión #2 abajo).

| Materia / pool | Anclados | Reemplazos listos | Verificados a ciegas | Limpios publicados hoy | Limpios tras publicar y despublicar | Mínimo (§7) |
|---|---|---|---|---|---|---|
| Inglés UNAM Á1 (`UNAM:INGLES`) | 28 de 40 | **28** | 28/28 | 12 de 40 | **40 de 40** | 35 ✅ |
| Español UNAM (`UNAM:ESPANOL`) | 26 de 75 | **26** | 26/26 | 49 de 75 | **75 de 75** | 60 ✅ |
| IPN Matemáticas (`IPN:MATEMATICAS`) | 9 de 105 | **9** | 9/9 | 96 de 105 | **105 de 105** | ≥ 95 % ✅ |
| IPN Física (FISMAT) | 5 de 70 | **5** | 5/5 | 65 de 70 | **70 de 70** | ≥ 95 % ✅ |
| UNAM Matemáticas Á1 | 2 de 144 | **2** | 2/2 | 142 de 144 | **144 de 144** | ≥ 95 % ✅ |
| **Total** | **70** | **70** | **70/70** | | **0 anclados publicados** | |

- **Reemplazados (publicados + original despublicado): 0.** **Pendientes: 70** — todos listos, esperando la publicación.
- **Reemplazos producidos y verificados: 70.** Cobertura uno-a-uno por tema (un test lo comprueba leyendo el censo).
- El pool de Inglés es el crítico: despublicar los 28 **sin** publicar antes los reemplazos lo habría dejado en 12 reactivos (30 %); con el orden correcto nunca baja de 40.

`pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test:unit` ✅ **2 148 / 2 148** (132 archivos).
`pnpm backup:export` **no se corrió**: necesita la base y esta sesión no tiene `DATABASE_URL`; el respaldo en git sigue siendo el del 16-sep, **idéntico a la base** (ver §Verificaciones).

## Qué se hizo

### 1) Censo exacto — `docs/content-batches/g100-ceneval/anchored-70.json`

Criterio: el reactivo está ligado en `question_source_chunks` a un fragmento de un `ContentSource` cuyo nombre es `ceneval_*`. **El grep por `ceneval|exani` que sugería la instrucción da 1, no 70** (los reactivos no llevan el nombre de la guía; la relación vive en la tabla puente). Resultado: **70 exactos y el mismo desglose del CLO** — 28 Inglés (Grammar 12/12, Reading 16/16), 26 Español (Redacción 11/11, Comprensión lectora 10/11, Ortografía 3/10, Morfosintaxis 2/10), 16 (IPN Ecuaciones 9/9, IPN Cinemática 5/5, UNAM Polinomios y funciones 2/9). 68 se anclan **solo** a CENEVAL y 2 a CENEVAL + UAM. El censo no lleva enunciados a propósito: quien compone los reemplazos no debe verlos.

### 2) El hueco de código que produjo los 70 — cerrado

`content:insert` **obliga** a citar fragmentos fuente cuando el tema los tiene, y los temas de Inglés (Grammar, Reading), Español-Redacción, IPN-Ecuaciones e IPN-Cinemática solo tenían fragmentos de CENEVAL: un reemplazo compuesto con el flujo normal se habría vuelto a anclar. Ahora `loadTopicChunks` descarta las fuentes CENEVAL/EXANI antes de ofrecerlas (`isRestrictedGroundingSource`, por nombre, institución y ruta) y esos temas quedan `TEMARIO_ONLY`, que no bloquea. Es permanente: también protege los lotes futuros. Tocado: `scripts/lib/grounding.ts`, `scripts/lib/content-db.ts`, `tests/scripts/grounding.test.ts`.

### 3) Los 70 reemplazos — `docs/content-batches/g100-ceneval/{ingles,espanol,otros}/`

- **Fuentes**: solo conocimiento general, descriptores públicos del MCER B1–B2 y los temas de los programas de bachillerato UNAM/IPN. Los redactores no leyeron el banco, las guías ni el censo; el prompt nunca nombra a CENEVAL ni muestra un reactivo existente. Textos y problemas originales.
- **Inglés (28)**: 12 de gramática de tiempos verbales (presente simple/continuo, verbos estativos, present perfect, pasado simple/continuo, past perfect, used to, cláusulas con *by the time*, concordancia) y 16 de lectura en **4 pasajes nuevos de 4 preguntas**. Misma distribución de dificultad que los anclados.
- **Español (26)**: 3 ortografía, 2 morfosintaxis, 11 redacción, 10 comprensión lectora en **3 pasajes nuevos**.
- **Otros (16)**: 9 ecuaciones IPN, 5 cinemática IPN, 2 polinomios UNAM; cada clave recalculada con código (`otros/verify-calcs.mjs`, 16/16) y cada distractor corresponde a un error calculado.
- Los tres lotes pasan `lot-validation` (`content:validate-batch`) **sin violaciones ni advertencias**: posición de la clave Inglés {A10,B6,C6,D6}, Español {A5,B7,C5,D9}; clave más larga 28.6 % y 15.4 %; sin periodicidad. La posición la decide `crypto.randomInt` por reactivo, nunca una regla mental.
- Todos con `sourceChunks: []`: nacen `TEMARIO_ONLY`.

### 4) Verificación ciega — `docs/content-batches/g100-ceneval/verification/`

Una sesión distinta a la que compuso (sin el prompt de generación ni la clave) resolvió cada reactivo desde cero sobre un archivo con **solo enunciado, pasaje y opciones barajadas**; `scripts/g100/blind-lot.ts` además aborta si el archivo contiene `isCorrect` o explicaciones. Aprobación = eligió la clave, confianza ≥ 0.85 y `problems` vacío. **70/70 aprobados** (confianza mínima 0.88 en Español, 0.93 en Inglés, 0.98 en matemáticas).

Lo que la verificación sí encontró (no fue un trámite):
- **Inglés, primera pasada: 14/28.** Los 14 rechazos eran distractores mal formados que se descartaban sin saber el tema (`doesn't eats`, `have being working`, `had being waiting`…). Se reescribieron 9 por errores reales de un hispanohablante y bien formados, se cambió la clave de un reactivo de vocabulario (*admits* ≈ *acknowledges*, antes *says honestly*) y se **re-verificó el lote completo** (28/28). Dos distractores siguen siendo calcos débiles (`was never`); el verificador lo anotó, no es un defecto de la clave.
- **Un enunciado idéntico a uno del banco** (`¿Cuál es la idea principal del texto?`, que `content:insert` habría rechazado como duplicado) lo atrapó el test de lotes; se hizo específico (… *sobre el ajolote*) y ese reactivo se re-verificó por separado.
- **La verificación está atada al texto**: el informe guarda una huella (enunciado + pasaje + opciones en orden) de cada reactivo y `tests/content/g100-lots.test.ts` la compara con el archivo actual. Probado por mutación: añadir un espacio a una opción ya verificada lo pone en rojo.

### 5) Herramientas y tests

| Pieza | Qué hace |
|---|---|
| `scripts/g100/blind-lot.ts` (`content:g100-blind`) | Exporta el lote ciego y compara el veredicto con la clave traduciendo la letra barajada. Rojo alcanzable (probado alterando un veredicto → 15/16, código 1). |
| `scripts/g100/publish-verified.ts` (`content:g100-publish`) | Tras `content:insert`, pasa a `isVerified=true` **solo** lo aprobado en el informe; rehúsa si el reactivo falta, es ambiguo o está ligado a una fuente restringida. Ensayo salvo `--apply`. |
| `scripts/g100/unpublish-anchored.ts` (`content:g100-unpublish`) | **La regla de oro hecha código.** Solo despublica un anclado si hay un reemplazo publicado y limpio **del mismo tema** (uno por anclado), si cada pool queda ≥ 90 % de su tamaño original, y termina con una auditoría contra la base viva. Nunca borra. Ensayo salvo `--apply`. |
| `scripts/g100/plan.ts` + `tests/scripts/g100-plan.test.ts` | La lógica pura, con barrido combinatorio y control rojo (despublicar sin reemplazos pone el guard en rojo). |
| `tests/content/g100-lots.test.ts` | Cobertura uno-a-uno por tema, sin `sourceChunks`, sin la palabra CENEVAL/EXANI, sin duplicados ni parecido (Jaccard ≥ 0.6) con los anclados, `analyzeLot` limpio y huella de verificación vigente. |

## Hallazgos que conviene que conozcas

1. **El grep de la instrucción no encuentra los anclados** (1 de 70); hace falta el cruce por la tabla puente. Está documentado en el README del lote.
2. **El texto de las guías CENEVAL sigue guardado**: 49 fragmentos (~75 000 caracteres) en `source_chunks` y, por eso, dentro de `backups/content-bank.json`, que va en el repositorio privado de GitHub. Despublicar los reactivos no lo toca. Pregunta #3.
3. **El mismo patrón existe con otras guías.** 339 reactivos publicados (337 solo con ellas) están anclados a fragmentos de las guías UAM y ECOEMS (`uam_cbi` 114, `uam_cbs` 96, `uam_cad` 69, `uam_csh` 62, `guia_ECOEM` 10), con la licencia «Material de estudio aportado por el propietario del proyecto». No es el alcance de esta tarea y **no los toqué**, pero la instrucción de CLO sobre CENEVAL podría aplicar igual a ellas. Pregunta #4.
4. **Dos incidencias de proceso, declaradas**: (a) al inicio hice una consulta de **solo lectura** al proyecto Supabase de producción (`select count(*)… from questions`) para comprobar que el respaldo estaba vigente (1 507 / 1 502, última escritura 16-sep); no leí ni escribí ningún dato de usuario. (b) Después una lectura de un archivo local la rechazó el clasificador de permisos (motivo «Production Reads»); no la reintenté por otra vía y construí mi propia herramienta de verificación ciega sin leer `scripts/lib/blind-verification.ts` ni `content-resolve-verification.ts`. Consecuencia: **`content:g100-publish` escribe el registro `verification` imitando el que dejan los reactivos `session-v1` del banco** en vez de pasar por `content:resolve`; si prefieres el camino estándar, la alternativa es re-resolver los 70 con `content:blind-batch --ids` tras insertar.
5. **Observación de paso, fuera de alcance**: un reactivo limpio existente de Ortografía (`hojeó`/`ojeó`) tiene un enunciado cuya definición encaja con la opción que NO es la clave; merece una auditoría editorial. No lo toqué.
6. Dudas editoriales menores de los redactores, por si las quieres revisar: gerundio «de BOE» (Español, INTERMEDIATE) es el matiz más discutible del lote; el orden de oraciones EXPERT depende de dos referentes; los pasajes de Inglés usan hechos divulgativos generales (chocolate, bostezo) sin fechas.

## Verificaciones corridas

| Qué | Resultado |
|---|---|
| `pnpm typecheck` / `pnpm lint` | ✅ / ✅ |
| `pnpm test:unit` | ✅ 2 148 / 2 148 (132 archivos); nuevos: `grounding` (+3), `g100-plan` (8), `g100-lots` (12) |
| `content:validate-batch` sobre los 3 lotes | ✅ sin violaciones ni advertencias |
| `otros/verify-calcs.mjs`, corrido por mí | ✅ 16/16, 0 fallos |
| Rojos alcanzables | ✅ veredicto alterado → 15/16 y código 1; opción editada tras verificar → el test falla; despublicar sin reemplazos → guard rojo |
| Base (solo lectura, un `count`) | 1 507 reactivos / 1 502 verificados, última escritura 2026-09-16 03:09 UTC = el respaldo en git |
| `content:insert`, `content:g100-publish`, `content:g100-unpublish`, `backup:export` | ⛔ **no corridos** (sin credenciales de la base en esta sesión) — el código está tipado y probado en su parte pura, **no ejecutado contra Postgres** |

## Acciones manuales para Ángel (en este orden)

Los comandos exactos, con los ids de tema, están en `docs/content-batches/g100-ceneval/README.md`.

1. `git pull origin claude/intelligent-gates-sxp9pr` y `pnpm backup:export` (respaldo **antes**).
2. `content:insert` de los 9 archivos de tema (ensayo con `--dry-run` primero; usar `--lot-dir`).
3. `content:g100-publish` por lote: ensayo, luego `--apply`. Comprobar que `content:guard` y `content:pools` no cambian de forma indeseada (aún no se despublica nada).
4. `pnpm backup:export` y **commit del respaldo**.
5. **Solo entonces** `content:g100-unpublish` (ensayo y `--apply`) y la auditoría final, que debe imprimir `… ligados a CENEVAL/EXANI = 0`.
6. `pnpm backup:export`, commit y `git push`; comprobar con `git ls-remote origin master` según CLAUDE.md.
7. Pasar los resultados reales de 3 y 5 a esta sesión: nada de lo anterior se ha ejecutado contra la base.

## Preguntas abiertas (no las adiviné)

1. **¿Cómo se verificó «a ciegas» y le basta al CLO?** Fue una sesión de subagente aparte dentro de esta misma sesión de Claude Code, con archivo ciego y sin prompt de generación — el mismo aislamiento de sesión que usa el pipeline desde G2, no un modelo de otro proveedor. Si el CLO exige una segunda sesión *humana* o de otro tier, dilo y se re-verifica el lote (el flujo y los archivos ya están).
2. **¿Quién publica?** Hace falta alguien con `.env.local`. Alternativa: autorizar expresamente que esta sesión escriba en la base de producción por el conector de Supabase (no lo hice sin autorización: son 70 filas nuevas y 70 despublicaciones). Tú decides.
3. **¿Qué se hace con los 49 fragmentos de guías CENEVAL guardados** (`source_chunks` y el respaldo en git)? Borrarlos de la base arrastra por cascada los vínculos `question_source_chunks` de los reactivos despublicados y no los saca del historial de git. Necesito la línea del CLO antes de tocarlo.
4. **¿La restricción de las guías UAM/ECOEMS es la misma?** 339 reactivos publicados están anclados a ellas (hallazgo 3). Si el CLO dice que sí, el mismo proceso aplica y el código ya lo soporta cambiando una constante (`RESTRICTED_SOURCE_PATTERN`).
5. **¿Se acepta que `content:g100-publish` registre la verificación por su cuenta** en vez de pasar por `content:resolve` (hallazgo 4)?

## Bitácora de commits de este bloque

Ver `git log` de la rama; un único commit para el censo, el cierre del hueco de anclaje, los tres lotes con su verificación, las herramientas, la documentación y este retorno.
