export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Ruta real construida (F11). Los demás son destinos futuros (F12-F17)
   *  que hoy apuntan de vuelta al dashboard para nunca dejar un link roto —
   *  mismo criterio que F7 usó para "Ir a practicar". */
  builtRoute: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/app', label: 'Inicio', icon: '🏠', builtRoute: true },
  { href: '/app', label: 'Practicar', icon: '✏️', builtRoute: false },
  { href: '/app', label: 'Simulador', icon: '🎯', builtRoute: false },
  { href: '/app', label: 'Progreso', icon: '📊', builtRoute: false },
  { href: '/app', label: 'Perfil', icon: '👤', builtRoute: false },
];
