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
  { href: '/practicar', label: 'Practicar', icon: '✏️', builtRoute: true },
  { href: '/simulador', label: 'Simulador', icon: '🎯', builtRoute: true },
  { href: '/app', label: 'Progreso', icon: '📊', builtRoute: false },
  { href: '/app/perfil', label: 'Perfil', icon: '👤', builtRoute: true },
];
