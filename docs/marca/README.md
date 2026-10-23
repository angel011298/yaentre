> **Copia versionada del handoff de marca (G102, 2026-10-22).** En este repo los SVG viven en `svg/` (el texto de abajo dice `marca/`), sin el manifiesto C2PA de procedencia que traían incrustado (el dibujo es idéntico). Los `.dc.html` de `disenos/` no se copiaron: son referencias visuales. Implementación: `src/lib/brand/` (logo y geometría de Chilo), `src/components/brand/Logo.tsx`, `src/components/mascot/Chilo.tsx`, `app/globals.css` (tokens y animación). Estado y decisiones: `docs/ESTADO.md` §G102.

# Handoff: Marca YaEntre v1.0

## Overview
Nueva identidad de YaEntre: logo, ícono de app y favicon, mascota con poses y variante casual, sistema de color con dos temas, íconos de interfaz, tono de voz y animación. Reemplaza la silueta del búho (Tino) que hoy usan `src/lib/brand/owl-mark.ts`, los íconos de PWA y el favicon.

## Sobre los archivos de diseño
Los `.dc.html` de `disenos/` son **referencias de diseño en HTML**: muestran cómo debe verse y comportarse la marca, no son código para producción. Hay que recrearlos en el entorno del repo (Next.js 16, React, Tailwind 4, `next/og` para íconos) con sus patrones. Los **SVG de `marca/`** y los **tokens de `tokens/`** sí son recursos finales.

## Fidelidad
**Alta.** Colores, geometría del logo y de la mascota, tipografía y tiempos de animación son finales. Las plantillas de `YaEntre Aplicaciones` son composiciones de ejemplo y su texto no es definitivo.

## Logo
- **Concepto:** el personaje se asoma sobre una barra naranja con una mano levantada, redonda y algo ancha, como quien tiene una duda. El logo es solo la cabeza: no lleva ropa y no cuenta como personaje.
- **Geometría** (viewBox 0 0 100 100):
  - Cabeza: `M22.5 76 A34 34 0 1 1 77.5 76 Z`.
  - Ojos: elipses en (40,52) y (60,52), con rx 4.8 y ry 6.
  - Boca: `M44 63 q6 5 12 0`, trazo de 3.4.
  - Brazo levantado: `M80 78 L91 65` con trazo de 14 y mano circular (91,64) r 8.5. Todo queda sobre la línea de la barra y dentro de su extremo; la mano roza la cabeza sin fundirse.
  - Barra: x 12, y 76, 76 × 9, rx 4.5.
  - Mano izquierda: x 19, y 68, 14 × 12, rx 6.
- **Versión chica (16–31 px):** ojos más grandes, sin boca ni mano izquierda; brazo `M84 77 L92 63` con trazo de 13 y mano (92,62) r 8. Ver `marca/logo-chico-16-31.svg`.
- **Colores:**

  | Fondo | Cuerpo | Barra | Hueco de ojos y boca |
  |---|---|---|---|
  | Claro | `#7C3AED` | `#FC9712` | Color del fondo |
  | Oscuro (`#131119`) | `#A78BFA` | `#FC9712` | Color del fondo |
  | Violeta | `#FFFFFF` | `#FC9712` | `#7C3AED` (`#7431E3` sobre el degradado) |
  | Un solo color | Negro `#131119` o blanco | Igual que el cuerpo | Color del fondo |

- **Logotipo:** “YaEntre” en Outfit 700, `letter-spacing -0.02em`.
  - Horizontal: el texto mide 0.7 × el alto del símbolo, con un espacio de 0.2 × entre ambos.
  - Vertical: el texto mide 0.46 × el alto del símbolo.
- **Sin personaje:** “YaEntre” con una barra `#FC9712` debajo, de alto 0.13 × el tamaño del texto y separada 0.1 ×, con remates redondos. Se usa en pagos, facturas, el panel de padres y documentos legales.
- **Zona de seguridad:** 2x, donde x es el alto de la barra (9 % del símbolo).
- **Mínimos:**
  - Símbolo completo: 32 px. Por debajo se usa la versión chica.
  - Horizontal: 96 px de ancho.
  - Sin personaje: 80 px.
- **Ícono de app:**
  - Degradado de 135°, de `#7C3AED` a `#6D28D9`, con el logo blanco al 70 %.
  - Maskable: logo al 60 %.
  - Radio de esquina: 22.5 % (solo en vistas previas; el sistema aplica su máscara).
- **Prohibido:** estirar, girar, cambiar colores, agregar sombras o efectos, ponerlo sobre fondos de poco contraste o sobre degradados ajenos.

## Mascota
**Siempre vestida.** No existe versión sin ropa en la app, animaciones, stickers ni variantes. El logo es la única excepción (solo cabeza). La geometría vive en `referencia/atuendo-svg.js` (`OUTFIT()`).
- **Nombre: Chilo** (decidido). Viene de “chill”. Pendiente fuera de código: buscarlo en el IMPI y en redes antes del lanzamiento; no está registrado ni verificado. En el código el componente es `Chilo` y el repo conserva `Tino` solo como envoltorio de compatibilidad. Nunca aparece en pagos, facturas ni en el panel de madres y padres, donde va el logo sin personaje.
- **Geometría** (viewBox `-14 -16 148 192`): cabeza círculo en (60,40) r 32; hoodie con cuerpo `M31 84 Q31 68 60 68 Q89 68 89 84 L93 112 Q93 121 85 121 H35 Q27 121 27 112 Z` y dobladillo; jeans en dos piernas; tenis. Mangas: trazo de 16 con remate redondo que termina en una mano lila (círculo r 6.5–7).
- **Manos en la bolsa:** las mangas entran por los costados del bolsillo (`M35 80 Q21 96 45 103` y su espejo). El bolsillo `M36 96 H84 L88 112 H32 Z` se dibuja encima de las mangas para ocultar los extremos. No debe asomar ningún remate de manga fuera del bolsillo.
- **Manos con objeto:** las mangas terminan en un puño (remate de la manga) y la mano lila queda 4.5 hacia el centro, sobre el objeto.
- **Poses:** `libro` (base), `bolsa` (reposo), `lapiz` (acierto), `error`, `dormido` (taza), `pensando` (lupa), `calc`, `reloj` (simulacro), `celebrar` y `probeta`.
- **Caras:** `n`, `happy`, `think`, `flat` y `sleep`. Cualquier pose acepta cualquiera. Las variantes por materia siempre usan `happy`.
- **Piel lila:** base `#C4B5FD`, sombra `#AF9BF7`, brillo `#EEE8FF`. Tinta de ojos y boca `#2E1065`. Objetos `#6D28D9` con detalles `#FC9712`.
- **Variante por materia:** misma luminosidad, cambia el matiz de la piel (OKLCH L 0.81, C 0.095). Matemáticas usa `#C4B5FD`; Español 350°, Física 250°, Química 190°, Biología 145°, Historia 80°, Geografía 225°, Habilidades 25°. Propuesta: validar con el catálogo. Una variante por pantalla.
- **Hoodie por tema:** negra `#1E1D24` en modo día (mangas `#2B2A33`, bolsa y dobladillo `#121116`); crema `#F1E8D0` en modo noche (mangas `#F9F4E6`, bolsa y dobladillo `#DDD0AC`). Lisa, sin cordones ni costuras ni contornos.
- **Jeans:** `#9DB9E4` con una línea central `#7F9ED2`. **Tenis:** forma `#DDD9EA` y suela `#BEB9D0`. Iguales en los dos temas.
- **Equivalencia con `TinoState`:** `attentive` → `libro`; `sleepy` → `dormido`; `celebrating`, `streak` y `graduated` → `celebrar`; `encouraging` → `lapiz`.
- **Avatar de perfil:** la pose `bolsa` recortada a busto (viewBox `4 -2 112 112`), fondo `#EDE9FE` en día y `#2A2833` en noche.

## Animación
- **Duraciones:** 100 ms (botones), 200 ms (mensajes), 320 ms (entrada del personaje) y 600 ms (celebraciones).
- **Curvas:**
  - Salida: `cubic-bezier(.2,.8,.2,1)`.
  - Entrada y salida: `cubic-bezier(.65,0,.35,1)`.
  - Rebote: `cubic-bezier(.34,1.56,.64,1)`.
- **Movimientos:**
  - **Reposo:** sube y baja 5 px en 3.4 s, `ease-in-out`, infinito.
  - **Parpadeo:** escala vertical a 0.1 durante 120 ms, cada 5.6 s.
  - **Entrada:** sube 34 px en 320 ms con la curva de salida.
  - **Acierto:** salta 14 px con giro de ±4° en 600 ms con rebote.
  - **Error:** se mueve ±4 px tres veces en 480 ms, una sola vez.
  - **Cargando:** los ojos se mueven ±3.5 px en 1.6 s.
- **Reglas:**
  - Con `prefers-reduced-motion` no hay animaciones; los cambios de pose son un fundido de 150 ms.
  - Nada se anima dentro del simulador.
- **Lottie** (pendiente, desde un editor de movimiento):
  - Lienzo de 512 × 512 para el personaje y de 120 × 120 para íconos animados.
  - 30 cuadros por segundo y menos de 30 KB por pieza.
  - Capas con nombre: `head`, `eyes`, `mouth`, `arm-l`, `arm-r`, `body`, `prop` y `bar`.

## Tokens de color
`tokens/yaentre-colors.css` y `tokens/yaentre-colors.json` incluyen los primitivos, los temas oscuro (alumno, por defecto) y claro (padres) y el bloque `@theme inline` de Tailwind 4. Los nombres son compatibles con `app/globals.css`.
- Ancla: `#7C3AED`.
- Acento Cempasúchil: `#FC9712`.
- Fondo oscuro: `#131119`.
- Fondo claro: `#FBFAFF`.

## Contraste
Los 110 pares de los dos temas cumplen WCAG AA. El detalle está en `disenos/YaEntre Tablero de Color.dc.html`. Los más delicados:
- Aviso en el tema claro: `#A16207` sobre `#FBFAFF`, 4.74:1.
- Texto sobre el botón acento en hover, tema claro: 4.80:1.

## Tipografía
Las fuentes que ya carga `app/layout.tsx`:
- **Outfit** 600/700/800 para títulos y el logo.
- **Inter** 400–700 para texto.
- **JetBrains Mono** 400/600 para números.

Escala:

| Uso | Fuente | Tamaño / interlínea | Tracking |
|---|---|---|---|
| H1 | Outfit 700 | 40/44 | −0.02em |
| H2 | Outfit 600 | 28/32 | — |
| H3 | Outfit 600 | 20/26 | — |
| Texto | Inter 400 | 16/24 | — |
| Texto pequeño | Inter 400 | 14/20 | — |
| Etiqueta | Inter 600 | 12/16 | — |

## Íconos de interfaz
- **Estilo:** retícula de 24 px, trazo de 2 px, remates y uniones redondeados, sin relleno, `currentColor`.
- **Set:** `home`, `book`, `target`, `chart`, `flame`, `clock`, `check`, `x`, `lock`, `user`, `sliders`, `bell`, `search`, `calendar`, `play`, `trophy`, `bulb`, `flag`, `plus`, `arrow` y `door`. Los trazados están en `IC` del generador.
- **Integración:** compara con `src/components/ui/Icon.tsx` antes de reemplazar y conserva los nombres existentes.

## Tono de voz
- **Con el alumno:** de tú, frases cortas, cercano y motivador. Reconoce avances concretos y, ante un error, explica qué sigue.
- **Con los padres:** sobrio; los datos van primero, sin diminutivos ni promesas de resultado.
- **Mascota:** no dice más de una frase por pantalla.
- **Ejemplos:** en la sección 07 del manual.

## Recursos (`marca/`)
- **Logo:**
  - `logo-sobre-claro.svg`, `logo-sobre-oscuro.svg`, `logo-blanco-sobre-violeta.svg`.
  - `logo-mono-negro.svg`, `logo-mono-blanco.svg`, `logo-chico-16-31.svg`.
  - `logo-horizontal.svg` y `logo-sin-personaje.svg`: el texto no está convertido a trazos; contornéalo para impresión.
- **Íconos de app:** `favicon.svg`, `app-icon-1024.svg`.
- **Mascota y avatares:** `personaje-<pose>-dia.svg` y `personaje-<pose>-noche.svg` para las 10 poses, y `avatar-dia.svg` y `avatar-noche.svg`.

## Archivos
- `referencia/generador-svg.js`: geometría del logo, la mascota sin ropa, íconos y colores (`glyph`, `glyphS`, `gotaInner`, `face`, `IC`, `SUBJ`). Ignora `casualInner` y `avatarCasual`: son de una versión anterior.
- `referencia/atuendo-svg.js`: la mascota vestida (`OUTFIT()`): poses, caras, tonos por materia.
- `disenos/`:
  - `YaEntre Manual de Marca.dc.html`
  - `YaEntre Aplicaciones.dc.html`
  - `YaEntre Personaje Vestido.dc.html`
  - `YaEntre Tablero de Color.dc.html`
  - `YaEntre Resumen de Color.dc.html`

  Para verlos, abre cada archivo en el navegador con `support.js` en la misma carpeta.

## Pendientes fuera de código
- Registrar la marca (YaEntre, el logo y Chilo) ante el IMPI y buscar “Chilo” en redes y tiendas de apps antes del lanzamiento.
- Convertir a trazos el texto de los SVG de logo con letras.
- Exportar los Lottie a partir de la especificación de animación.
- Validar las materias con el catálogo de la app.
