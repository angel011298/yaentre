# G100 — Reemplazo de los 70 reactivos anclados a guías CENEVAL

Instrucción CLO del 22-sep-2026 (`INSTRUCCIONES_CENEVAL_CTO.md`). **Regla de oro:** un reactivo
anclado NO se despublica hasta que su reemplazo esté producido, verificado a ciegas Y publicado.
Nada se borra: despublicar es `isVerified = false`.

## Qué hay aquí

| Ruta | Qué es |
|---|---|
| `anchored-70.json` | Censo: los 70 ids, con tema, pool, formato y dificultad (sin enunciados, a propósito). Criterio: el reactivo está ligado, por `question_source_chunks`, a un fragmento de un `ContentSource` de CENEVAL. |
| `ingles/` | 28 reemplazos de Inglés UNAM (12 gramática + 16 lectura en 4 pasajes) → pool `UNAM:INGLES`. |
| `espanol/` | 26 reemplazos de Español UNAM (3 ortografía, 2 morfosintaxis, 11 redacción, 10 lectura en 3 pasajes) → pool `UNAM:ESPANOL`. |
| `otros/` | 16 reemplazos: 9 IPN Ecuaciones, 5 IPN Cinemática, 2 UNAM Polinomios y funciones. |
| `verification/` | Veredictos de la verificación ciega (`*-verdicts.json`) e informe de aprobación con la **huella** de cada reactivo (`*-report.json`). |
| `build-lot.mjs` | Constructor: `build-data.mjs` → un JSON por tema, posición de la clave con `crypto.randomInt`. |

Cada reemplazo nace `TEMARIO_ONLY` (`sourceChunks: []`): **ningún fragmento de guía se ofrece ya como
anclaje** (`isRestrictedGroundingSource`, `scripts/lib/grounding.ts`). Si el lote se re-construye con
`build-lot.mjs` cambian las posiciones y el informe de verificación queda desfasado: hay que volver a
verificar (`tests/content/g100-lots.test.ts` lo pone en rojo).

## Cómo se verificó (a ciegas)

```bash
pnpm content:g100-blind export <lote> <salida.json>             # solo enunciado, pasaje y opciones barajadas
pnpm content:g100-blind check  <lote> <respuestas.json> <informe.json>
```

El verificador es una sesión aparte que **no vio el prompt de generación ni la clave**. Aprueba un reactivo
solo si eligió la clave, con confianza ≥ 0.85 y sin `problems`.

## Cómo se publica — pasos para quien tenga `.env.local` (no se pueden hacer desde la sesión en la nube)

```bash
git pull origin claude/intelligent-gates-sxp9pr
pnpm backup:export            # respaldo ANTES

# 1) insertar, un archivo por tema, con --lot-dir (ensayo primero con --dry-run)
pnpm content:insert --topic cmrr1jhnp002whi3nfoul2nok --file docs/content-batches/g100-ceneval/ingles/1-grammar-tenses.json        --lot-dir docs/content-batches/g100-ceneval/ingles
pnpm content:insert --topic cmrr1jilw0030hi3nr0slusjl --file docs/content-batches/g100-ceneval/ingles/2-reading-comprehension.json --lot-dir docs/content-batches/g100-ceneval/ingles
pnpm content:insert --topic cmrr1jdtu002ghi3n7j7kc14q --file docs/content-batches/g100-ceneval/espanol/1-ortografia-puntuacion.json --lot-dir docs/content-batches/g100-ceneval/espanol
pnpm content:insert --topic cmrr1je98002ihi3ndr1xdv8t --file docs/content-batches/g100-ceneval/espanol/2-morfosintaxis.json         --lot-dir docs/content-batches/g100-ceneval/espanol
pnpm content:insert --topic cmrr1jghp002qhi3nqdkertop --file docs/content-batches/g100-ceneval/espanol/3-redaccion-textos.json      --lot-dir docs/content-batches/g100-ceneval/espanol
pnpm content:insert --topic cmrr1jgz2002shi3nqpqjyheu --file docs/content-batches/g100-ceneval/espanol/4-comprension-lectora.json   --lot-dir docs/content-batches/g100-ceneval/espanol
pnpm content:insert --topic cmrr1kxll009jhi3n8g2zoku1 --file docs/content-batches/g100-ceneval/otros/1-ipn-ecuaciones.json          --lot-dir docs/content-batches/g100-ceneval/otros
pnpm content:insert --topic cmrr1l37m00a5hi3n0nuo6d74 --file docs/content-batches/g100-ceneval/otros/2-ipn-cinematica.json          --lot-dir docs/content-batches/g100-ceneval/otros
pnpm content:insert --topic cmrr1iwgb000khi3nzn34qded --file docs/content-batches/g100-ceneval/otros/3-unam-polinomios-funciones.json --lot-dir docs/content-batches/g100-ceneval/otros

# 2) publicar los aprobados a ciegas (ensayo; repetir con --apply)
for l in ingles espanol otros; do
  pnpm content:g100-publish --lot docs/content-batches/g100-ceneval/$l --report docs/content-batches/g100-ceneval/verification/$l-report.json
done

pnpm backup:export && git add backups/content-bank.json && git commit -m "chore: respaldo con los 70 reemplazos G100 publicados"

# 3) SOLO ahora: despublicar los anclados (ensayo; repetir con --apply)
pnpm content:g100-unpublish
pnpm backup:export && git add backups/content-bank.json && git commit -m "chore: respaldo con los 70 anclados despublicados (G100)"

pnpm content:guard && pnpm content:pools
```

`content:g100-unpublish` rehúsa despublicar un anclado si no hay un reemplazo publicado y limpio del
mismo tema que lo cubra, si un pool quedaría bajo 90 % de su tamaño original, y termina con una auditoría
contra la base viva (publicados aún ligados a CENEVAL/EXANI; meta 0).
