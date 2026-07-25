'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { linkStudentAction } from '@/app/actions/parent';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';

/**
 * Canje del código de 6 dígitos (F16 tarea 2). Cliente mínimo: un solo
 * campo controlado, sin dependencias exóticas — funciona igual dentro del
 * navegador integrado de Facebook (tarea 7). `router.refresh()` en éxito
 * vuelve a pedir `/tutor` al servidor, que ya verá el nuevo vínculo.
 */
export function LinkCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await linkStudentAction({ code });
    setPending(false);

    if (result.ok) {
      setCode('');
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-bold text-text-primary">Vincula a tu alumno</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Pídele a tu hijo o hija que genere un código desde su cuenta y escríbelo aquí. El código
        vence a los 10 minutos.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <TextField
          name="code"
          label="Código de 6 dígitos"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          required
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || code.length !== 6} className="w-full">
          {pending ? 'Vinculando…' : 'Vincular'}
        </Button>
      </form>
    </Card>
  );
}
