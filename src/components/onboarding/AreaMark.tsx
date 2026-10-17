/**
 * G101 — distintivo de un área o rama, sin emoji.
 *
 * Antes cada tarjeta de área pintaba `Area.iconEmoji` de la base (y un 📘 de
 * respaldo). Ahora muestra la clave que el aspirante ya conoce de la
 * convocatoria: «1»–«4» para las áreas de la UNAM y las siglas de la rama del
 * IPN, sobre el color del área. El nombre completo va siempre al lado, así que
 * el distintivo es decorativo.
 */
const IPN_SHORT: Record<string, string> = {
  IPN_FISMAT: 'FM',
  IPN_MEDBIO: 'MB',
  IPN_SOCADM: 'SA',
};

export function areaShortLabel(code: string, name: string): string {
  const unam = /^AREA_(\d+)$/.exec(code);
  if (unam) return unam[1];
  if (IPN_SHORT[code]) return IPN_SHORT[code];
  return name.trim().charAt(0).toUpperCase() || '·';
}

export function AreaMark({
  code,
  name,
  colorHex,
  muted = false,
}: {
  code: string;
  name: string;
  colorHex: string;
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
        muted ? 'opacity-60' : ''
      }`}
      style={{ backgroundColor: `${colorHex}26`, color: colorHex }}
    >
      {areaShortLabel(code, name)}
    </span>
  );
}
