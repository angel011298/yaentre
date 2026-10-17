import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  href: string;
  label: string;
  /** G101: ícono SVG (antes un emoji). */
  icon: IconName;
  /** Ruta real construida (F11). Los demás son destinos futuros (F12-F17)
   *  que hoy apuntan de vuelta al dashboard para nunca dejar un link roto —
   *  mismo criterio que F7 usó para "Ir a practicar". */
  builtRoute: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/app', label: 'Inicio', icon: 'home', builtRoute: true },
  { href: '/practicar', label: 'Practicar', icon: 'pencil', builtRoute: true },
  { href: '/simulador', label: 'Simulador', icon: 'target', builtRoute: true },
  { href: '/app/progreso', label: 'Progreso', icon: 'chart', builtRoute: true },
  { href: '/app/perfil', label: 'Perfil', icon: 'user', builtRoute: true },
];
