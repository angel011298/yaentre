# backups/

**Este directorio SÍ se versiona en git** — a diferencia de
`scripts/content-exports/` (que es gitignored, artefactos de corrida del
pipeline).

## `content-bank.json`

Respaldo lógico completo del banco de contenido (reactivos, opciones,
explicaciones, pasajes, taxonomía, fuentes). Se regenera con:

```bash
pnpm backup:export
```

y se restaura con `pnpm backup:import`. **La retención es el historial de git**:
cada corrida sobreescribe el archivo y ese cambio se commitea, así que cada
commit es un punto de restauración.

Procedimiento completo, frecuencia recomendada y evaluación del plan de Supabase:
**`docs/RESPALDOS.md`**.
