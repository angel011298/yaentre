'use client';

import { useState, useTransition } from 'react';
import { setTeacherVisibilityAction } from '@/app/actions/teachers';
import { Button } from '@/components/ui/Button';

export function VisibilityToggle({ active }: { active: boolean }) {
  const [isActive, setIsActive] = useState(active);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setTeacherVisibilityAction({ active: !isActive });
      if (res.ok) setIsActive(res.data.active);
      else setError(res.message);
    });
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" disabled={pending} onClick={toggle}>
        {isActive ? 'Pausar mi perfil' : 'Volver a aparecer en el directorio'}
      </Button>
      <p className="text-xs text-text-muted">
        {isActive
          ? 'Ahora apareces en el directorio. Si pausas, sigues atendiendo las clases ya reservadas.'
          : 'Tu perfil está en pausa: no apareces en el directorio ni recibes reservas nuevas.'}
      </p>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
