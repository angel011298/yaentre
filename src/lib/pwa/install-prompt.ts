/**
 * Regla del aviso de instalación (F17 tarea 1). Módulo PURO: no lee
 * `localStorage` ni `window` — recibe los valores ya leídos y decide.
 *
 * Reglas exactas de la tarea: aparece en la SEGUNDA visita (no la primera —
 * no interrumpir la primera impresión), y si se descarta no vuelve a
 * aparecer en 7 días.
 */
export const INSTALL_PROMPT_MIN_VISITS = 2;
export const INSTALL_PROMPT_COOLDOWN_DAYS = 7;

export function shouldShowInstallPrompt(input: {
  visitCount: number;
  dismissedAt: number | null;
  isStandalone: boolean;
  now: number;
}): boolean {
  if (input.isStandalone) return false; // ya instalada — nunca insistir
  if (input.visitCount < INSTALL_PROMPT_MIN_VISITS) return false;
  if (input.dismissedAt === null) return true;

  const cooldownMs = INSTALL_PROMPT_COOLDOWN_DAYS * 24 * 3600 * 1000;
  return input.now - input.dismissedAt >= cooldownMs;
}
