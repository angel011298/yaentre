import { Card } from '@/components/ui/Card';
import { DeleteAccountForm } from './DeleteAccountForm';

/** Cumplimiento de derechos de datos (F17 tarea 3): exportar + eliminar. */
export function DataRightsSection() {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-sm font-semibold text-text-primary">Tus datos</p>
        <p className="mt-1 text-sm text-text-secondary">
          Descarga una copia de todo lo que guardamos sobre ti.
        </p>
        <a
          href="/api/account/export"
          download
          className="mt-2 inline-block text-sm font-semibold text-brand-soft hover:underline"
        >
          Exportar mis datos ↓
        </a>
      </div>
      <div className="border-t border-border-subtle pt-4">
        <p className="text-sm font-semibold text-danger">Eliminar mi cuenta</p>
        <p className="mt-1 text-sm text-text-secondary">
          Borra tu progreso, racha y vínculos con tutores de forma permanente. Tus pagos se conservan
          de forma anónima, como exige la ley.
        </p>
        <DeleteAccountForm />
      </div>
    </Card>
  );
}
