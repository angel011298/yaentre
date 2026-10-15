import type { UserRole } from '@prisma/client';

/**
 * G100 — PANTALLA DE INICIO SEGÚN EL ROL.
 *
 * Hasta G99, `signInAction` mandaba a todo lo que no fuera tutor a `/app`. El
 * administrador maestro aterrizaba así, en cualquier dispositivo, en el
 * tablero de ALUMNO —racha, simulacros, Entrómetro— y en toda la app del
 * alumno no había un solo enlace a `/admin`: llegar al panel exigía escribir
 * la URL a mano. Un ADMIN recién promovido que nunca hizo el onboarding caía
 * todavía más lejos, en el asistente que pregunta a qué examen se presenta.
 *
 * Pura y total: un rol desconocido cae al destino de alumno, que es el de
 * menor privilegio.
 */
export function homePathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'PARENT':
      return '/tutor';
    default:
      return '/app';
  }
}
