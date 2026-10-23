import type { CSSProperties, ReactElement, SVGProps } from 'react';
import {
  CHILO_AVATAR_VIEWBOX,
  CHILO_MATERIAS,
  CHILO_RATIO,
  CHILO_VIEWBOX,
  chiloNodes,
  defaultCara,
  type ChiloCara,
  type ChiloHoodie,
  type ChiloMateria,
  type ChiloNode,
  type ChiloPose,
} from '@/lib/brand/chilo-geometry';

/**
 * Chilo — la mascota de YaEntre (Marca v1.0, docs/marca/README.md §Mascota).
 *
 * Siempre vestido: hoodie lisa, jeans y tenis. La hoodie sigue al
 * `data-theme` más cercano —NEGRA en claro (día), CREMA en oscuro (noche)—
 * con las variables `--chilo-*` de globals.css, no con `prefers-color-scheme`.
 *
 * Reglas del manual que dependen de quien lo usa:
 *   - No aparece en pagos, facturas ni en el panel de madres y padres (ahí va
 *     el `Logo` sin personaje) ni dentro del simulador en curso.
 *   - Dice como mucho UNA frase por pantalla.
 *   - Es decorativo (`aria-hidden`): si comunica un estado importante, ese
 *     estado también va en texto. Con `label` se anuncia como imagen.
 *   - Una sola variante de `materia` por pantalla; la materia fuerza la cara
 *     `happy`.
 *
 * Animación (clases en globals.css, tiempos del manual): `reposo` sube y baja
 * con parpadeo; `entrada` entra desde abajo y queda en reposo; `acierto`
 * salta con giro; `error` se sacude una vez; `cargando` mueve los ojos;
 * `ninguna` lo deja quieto (OBLIGATORIO en el simulador). Con
 * `prefers-reduced-motion` no se mueve nada y un cambio de pose es un
 * fundido de 150 ms.
 */

export type ChiloAnimacion = 'reposo' | 'entrada' | 'acierto' | 'error' | 'cargando' | 'ninguna';

export interface ChiloProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  pose?: ChiloPose;
  /** Cualquier pose acepta cualquier cara; si falta, la de la pose. */
  cara?: ChiloCara;
  /** Ancho en px (en `avatar`, el lado del círculo). */
  size?: number;
  /** Cambia solo el tono de la piel y fuerza la cara `happy`. */
  materia?: ChiloMateria;
  /**
   * `avatar`: busto en círculo con fondo por tema. El cuerpo es SIEMPRE la pose
   * `bolsa` (docs/marca: «la pose bolsa recortada a busto»); de la `pose`
   * pedida se toma solo la cara. Sirve donde la figura entera no se leería
   * (32-48 px, junto a una línea de texto).
   */
  variante?: 'figura' | 'avatar';
  animacion?: ChiloAnimacion;
  /** Solo si Chilo va SIN texto que diga lo mismo. */
  label?: string;
  /**
   * TODO(marca): animación Lottie (lienzo 512×512, 30 fps, < 30 KB, capas
   * head/eyes/mouth/arm-l/arm-r/body/prop/bar) cuando el equipo de movimiento
   * la exporte. Punto de integración: `<Chilo lottie={json} />` reproduce el
   * Lottie y deja este SVG como respaldo (sin JS, con movimiento reducido o si
   * falla la carga). Hoy se ignora y siempre se pinta el SVG.
   */
  lottie?: unknown;
}

/** Hoodie por tema, resuelta por CSS. */
const THEMED_HOODIE: ChiloHoodie = {
  hood: 'var(--chilo-hood)',
  hoodD: 'var(--chilo-hood-shade)',
  sleeve: 'var(--chilo-sleeve)',
};

const ANIM_CLASS: Record<ChiloAnimacion, string> = {
  reposo: 'chilo-anim chilo-reposo',
  entrada: 'chilo-anim chilo-entrada',
  acierto: 'chilo-anim chilo-acierto',
  error: 'chilo-anim chilo-error',
  cargando: 'chilo-anim chilo-cargando',
  ninguna: '',
};

/** Clase del grupo de ojos: parpadeo en reposo/entrada, mirada al cargar. */
function eyeClass(animacion: ChiloAnimacion): string {
  if (animacion === 'cargando') return 'chilo-ojos chilo-mirada';
  if (animacion === 'reposo' || animacion === 'entrada') return 'chilo-ojos chilo-parpadeo';
  return '';
}

function camel(attr: string): string {
  if (attr === 'class') return 'className';
  return attr.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function renderNode(n: ChiloNode, key: number): ReactElement {
  const props: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(n.attrs)) props[camel(k)] = v;
  const Tag = n.tag;
  return (
    <Tag key={key} {...props}>
      {n.children?.map(renderNode)}
    </Tag>
  );
}

export function Chilo({
  pose = 'libro',
  cara,
  size = 120,
  materia,
  variante = 'figura',
  animacion = variante === 'avatar' ? 'ninguna' : 'reposo',
  label,
  lottie: _lottie,
  className = '',
  style,
  ...props
}: ChiloProps) {
  const tone = materia ? CHILO_MATERIAS[materia] : undefined;
  const avatar = variante === 'avatar';
  const face = materia ? 'happy' : (cara ?? (avatar ? defaultCara(pose) : undefined));
  const nodes = chiloNodes(avatar ? 'bolsa' : pose, THEMED_HOODIE, {
    face,
    tone,
    eyeCls: eyeClass(animacion),
  });

  const width = size;
  const height = avatar ? size : Math.round(size / CHILO_RATIO);
  const svgStyle: CSSProperties | undefined = avatar
    ? { borderRadius: '50%', display: 'block', flex: 'none', ...style }
    : style;

  return (
    <svg
      width={width}
      height={height}
      viewBox={avatar ? CHILO_AVATAR_VIEWBOX : CHILO_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={`chilo shrink-0 ${ANIM_CLASS[animacion]} ${className}`}
      style={svgStyle}
      focusable="false"
      data-pose={pose}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...props}
    >
      {avatar && <rect x="4" y="-2" width="112" height="112" fill="var(--chilo-avatar-bg)" />}
      {/* La clave cambia con la pose/cara: React remonta el grupo y corre el
          fundido de 150 ms (`.chilo-pose`). */}
      <g key={`${pose}-${face ?? ''}-${materia ?? ''}`} className="chilo-pose">
        {nodes.map(renderNode)}
      </g>
    </svg>
  );
}
