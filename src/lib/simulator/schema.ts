import { z } from 'zod';

/**
 * Contrato de sincronización cliente→servidor del simulador (F12). Lo comparten
 * el store del cliente, el Route Handler (`/api/simulator/sync`) y los tests.
 * Es el ÚNICO cuerpo que el cliente manda con respuestas: nunca envía (ni
 * recibe) la correctitud — eso vive server-side.
 */

export const integrityCountersSchema = z.object({
  tabBlurCount: z.number().int().min(0),
  rightClickAttempts: z.number().int().min(0),
  keyboardShortcutAttempts: z.number().int().min(0),
});

export const simulatorSyncSchema = z.object({
  sessionId: z.string().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOption: z.string().min(1).nullable(),
        position: z.number().int().min(0),
        timeSpentSecs: z.number().int().min(0),
      })
    )
    .max(300),
  integrity: integrityCountersSchema,
  suspicionEvents: z
    .array(z.object({ type: z.string(), at: z.string() }).loose())
    .max(1000),
  completedFullscreen: z.boolean(),
});

export type SimulatorSyncBody = z.infer<typeof simulatorSyncSchema>;
