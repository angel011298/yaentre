'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Boundary de error global (F20 tarea 1). Convención de Next.js: reemplaza
 * TODO el árbol —incluido `app/layout.tsx`— cuando algo revienta tan arriba
 * que ni el layout raíz pudo renderizar, así que trae su propio
 * `<html>`/`<body>` mínimo. Es el único punto que captura ese caso extremo;
 * los errores dentro de rutas normales ya los cubre `onRequestError`
 * (servidor) e `instrumentation-client.ts` (cliente).
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-MX">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>Algo salió mal.</p>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              Ya lo registramos. Intenta recargar la página.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
