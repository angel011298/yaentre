import { ResicoMonitorCard } from '@/components/admin/ResicoMonitorCard';
import { requireCapability } from '@/lib/auth/guards';
import { getResicoStatus } from '@/lib/db/resico';

export const metadata = { title: 'Monitor RESICO' };
export const dynamic = 'force-dynamic';

/**
 * Monitor de techo RESICO (spec del marketplace §10, PRIORIDAD ALTA): semáforo
 * del ingreso propio anual contra $3.5M, con el desglose por carril. Solo lectura;
 * lo ven el admin y el contador (`fiscal.read`).
 *
 * La página vuelve a exigir la capacidad aunque el layout ya lo haga: quien decide
 * qué se pinta es esta página, y un layout no protege nada más allá de su render.
 */
export default async function FiscalResicoPage() {
  await requireCapability('fiscal.read');
  const status = await getResicoStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Monitor RESICO</h1>
        <p className="text-text-secondary">
          Ingreso propio del año fiscal contra el techo del régimen. Se actualiza en cada carga.
        </p>
      </div>
      <ResicoMonitorCard status={status} />
    </div>
  );
}
