'use client';

import { useState } from 'react';
import type { SubscriptionPlan } from '@prisma/client';
import { startCheckoutAction } from '@/app/actions/checkout';
import { Button } from '@/components/ui/Button';

export function ChoosePlanButton({
  plan,
  variant = 'primary',
}: {
  plan: SubscriptionPlan;
  variant?: 'primary' | 'secondary';
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setLoading(true);
    setError(null);
    const res = await startCheckoutAction({ plan });
    if (res.ok) {
      window.location.href = res.data.url;
    } else {
      setError(res.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant={variant} className="w-full" onClick={choose} disabled={loading}>
        {loading ? 'Abriendo pago…' : 'Elegir este plan'}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
