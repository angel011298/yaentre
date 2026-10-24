import { notFound } from 'next/navigation';
import { AvailabilityEditor } from '@/components/teachers/AvailabilityEditor';
import { DateBlocksEditor } from '@/components/teachers/DateBlocksEditor';
import { getAvailability, listDateBlocks } from '@/lib/db/teachers';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import { getTeacherPageContext } from '@/lib/teachers/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi disponibilidad' };

/** G103 — disponibilidad semanal y fechas bloqueadas (spec §1.5). Hora de la Ciudad de México. */
export default async function DisponibilidadPage() {
  const { teacher } = await getTeacherPageContext('/profesor/disponibilidad');
  if (!readMarketplaceFlags().liveClasses) notFound();

  const today = mexicoDayKey(new Date());
  const [blocks, dateBlocks] = await Promise.all([getAvailability(teacher.id), listDateBlocks(teacher.id, today)]);
  const editable = ['PENDING_REVIEW', 'ACTIVE', 'INACTIVE'].includes(teacher.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Mi disponibilidad semanal</h1>
        <p className="text-sm text-text-secondary">
          Marca los bloques en los que puedes dar clase. Cada bloque dura de 1 a 4 horas, en tramos de 30
          minutos, entre 7:00 y 22:00. Zona horaria: Ciudad de México.
        </p>
      </div>
      <AvailabilityEditor initialBlocks={blocks.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))} disabled={!editable} />
      <DateBlocksEditor initialBlocks={dateBlocks} today={today} disabled={!editable} />
    </div>
  );
}
