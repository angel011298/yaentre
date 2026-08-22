# UI/UX Specification — YaEntre
## Design System & Interaction Spec · v1.0

| Campo | Detalle |
|---|---|
| **Producto** | YaEntre (yaentre.com) |
| **Documento** | UI/UX Specification |
| **Versión** | 1.0 |
| **Fecha** | 9 de julio de 2026 |
| **Dirección visual** | Duolingo / Brilliant — cálido, gamificado, redondeado, amigable |
| **Modos** | Dark (default alumno) + Light (default panel parental) |
| **Depende de** | PRD v1.0 · Blueprint Técnico v1.0 · TRD v1.0 |

---

## Tabla de contenidos

1. Principios de diseño
2. Identidad de marca y mascota
3. Sistema de color (dark + light)
4. Tipografía
5. Espaciado, radios y elevación
6. Iconografía e ilustración
7. Biblioteca de componentes
8. Patrones de pantalla (con wireframes)
9. Sistema de movimiento y animación
10. Estados, feedback y microcopy
11. Responsive y adaptación mobile/desktop
12. Accesibilidad
13. Modo del Simulador (spec visual especial)
14. Tokens de implementación (Tailwind)

---

## 1. Principios de diseño

La dirección de YaEntre se aparta del "techy minimalista" (Linear/Vercel) hacia un territorio **cálido y gamificado (Duolingo/Brilliant)**. La razón es estratégica: el usuario primario tiene 15-22 años, estudia bajo estrés y necesita que la app se sienta como un aliado motivador, no como una herramienta corporativa fría.

| # | Principio | Qué significa en la práctica |
|---|---|---|
| DP1 | **Cálido, no corporativo** | Bordes redondeados generosos, sombras suaves, colores vivos. Nada se siente como un banco o un ERP. |
| DP2 | **Cada logro se celebra** | Progreso visible y recompensado. La mascota reacciona. Máximo 1 celebración grande por sesión para no saturar. |
| DP3 | **Claridad sobre densidad** | Una acción principal por pantalla. Mucho aire. El aspirante estresado no debe sentirse abrumado. |
| DP4 | **Amigable pero creíble** | Juguetón en la forma, serio en el contenido. Un reactivo de física se ve riguroso; la celebración de acertarlo se ve divertida. |
| DP5 | **Mobile es el hogar** | El estudio diario se diseña para el pulgar. El simulador es la única excepción desktop-first. |
| DP6 | **Dos audiencias, dos tonos** | El alumno vive en dark mode enérgico. El padre vive en light mode limpio y tranquilizador. |

---

## 2. Identidad de marca y mascota

### 2.1 La mascota: "Tino" el tecolote

> **Decisión de identidad:** YaEntre tiene una mascota — un **tecolote** (búho mexicano) llamado **Tino**.

**Por qué un tecolote y no un búho genérico:** el tecolote es el búho mexicano, profundamente arraigado en la cultura ("el tecolote canta" en el arrullo tradicional). Nos ancla al mercado nacional y nos diferencia del búho verde de Duolingo con una identidad propia y local.

**Personalidad de Tino:**

| Rasgo | Descripción |
|---|---|
| **Rol** | Compañero de estudio, no maestro autoritario. Está del lado del alumno. |
| **Tono** | Motivador, cercano, con humor ligero mexicano. Nunca regaña. |
| **Voz** | "¡Vas increíble!", "Uy, esa estuvo difícil, la volvemos a ver", "3 días seguidos, ¡no pares!" |
| **Qué NO hace** | No presiona con culpa, no usa lenguaje de miedo, no habla como robot. |

**Estados expresivos de Tino (para ilustración):**

```
😴 Tino dormido       → usuario sin actividad (racha en riesgo)
👀 Tino atento        → estado neutral / durante estudio
🎉 Tino celebrando    → ronda perfecta / materia dominada
🔥 Tino con racha     → milestone de streak (7/14/30 días)
💪 Tino animando      → después de un error, "¡vamos otra vez!"
🎓 Tino graduado      → predicción de aciertos supera la meta de la carrera
```

**Especificación técnica de la mascota:**
- Formato: SVG (escalable, ligero, animable con Framer Motion).
- Set inicial: 6 estados expresivos (los de arriba).
- Estilo: geométrico redondeado, 2-3 colores planos + acentos, sin degradados complejos.
- Uso: aparece en momentos de logro, estados vacíos, onboarding y el panel del alumno. **No satura** — no está en cada pantalla.

### 2.2 Logo y símbolo

- **Símbolo primario:** un checkmark (✓) integrado en la contraforma, evocando "acierto". Puede combinarse sutilmente con la silueta de Tino.
- **Wordmark:** "YaEntre" en Outfit Bold, con el punto de la "i" como un pequeño checkmark o destello.
- **Espacio de reserva (clear space):** mínimo = altura de la "A" alrededor del logo.

---

## 3. Sistema de color (dark + light)

La paleta conserva el **violeta de marca** del blueprint pero se calibra hacia un sistema más cálido y amigable, con dos temas completos.

### 3.1 Colores de marca (constantes en ambos modos)

| Token | Hex | Uso |
|---|---|---|
| `--brand-primary` | `#7C3AED` | Color de marca, CTAs primarios, Tino |
| `--brand-primary-hover` | `#6D28D9` | Hover de CTAs |
| `--brand-soft` | `#A78BFA` | Acentos, estados hover suaves |
| `--brand-tint` | `#EDE9FE` | Fondos de realce (badges, chips) en light |

### 3.2 Colores semánticos (gamificación y feedback)

| Token | Hex | Significado |
|---|---|---|
| `--success` | `#22C55E` | Respuesta correcta, materia dominada (verde más cálido que el lime original) |
| `--success-glow` | `#4ADE80` | Halo de celebración |
| `--streak` | `#F97316` | Racha de días (fuego) |
| `--streak-glow` | `#FB923C` | Halo de la llama |
| `--danger` | `#EF4444` | Respuesta incorrecta, alertas |
| `--info` | `#38BDF8` | Pistas, temporizador, información neutral |
| `--warning` | `#FBBF24` | Advertencias suaves (racha en riesgo) |

### 3.3 Superficies — Dark mode (default alumno)

```css
[data-theme="dark"] {
  --bg-base:        #0F0F14;   /* fondo principal, ligeramente cálido (no negro puro) */
  --bg-surface:     #1A1A22;   /* tarjetas */
  --bg-elevated:    #26262F;   /* modales, dropdowns, tarjetas elevadas */
  --bg-input:       #1E1E27;   /* campos de formulario */
  --border-subtle:  #33333F;   /* divisores, bordes de tarjeta */
  --border-strong:  #4A4A57;   /* bordes de foco */
  --text-primary:   #FAFAFA;
  --text-secondary: #B4B4C0;
  --text-muted:     #7A7A88;
}
```

### 3.4 Superficies — Light mode (default panel parental)

```css
[data-theme="light"] {
  --bg-base:        #FBFAFF;   /* blanco cálido con tinte violeta mínimo */
  --bg-surface:     #FFFFFF;   /* tarjetas */
  --bg-elevated:    #FFFFFF;   /* con sombra en vez de color */
  --bg-input:       #F4F3FA;
  --border-subtle:  #E9E7F2;
  --border-strong:  #D4D1E3;
  --text-primary:   #1A1523;
  --text-secondary: #55516A;
  --text-muted:     #8B879C;
}
```

> **Racional del tinte cálido:** en vez de negro puro (`#000`) y blanco puro (`#FFF`), ambos temas tienen un tinte violeta mínimo. Esto hace que el sistema se sienta cohesivo y cálido, evitando la frialdad clínica del contraste puro. Es una firma sutil que refuerza la marca.

### 3.5 Reglas de tema por contexto

| Contexto | Tema default | ¿Toggle? |
|---|---|---|
| App del alumno (dashboard, drill, simulador) | Dark | Sí, puede cambiar a light |
| Panel parental | Light | Sí, puede cambiar a dark |
| Landing page / marketing | Light | No |
| Onboarding | Dark | Sí |

---

## 4. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| **Display / Headings** | Outfit | Títulos, scores grandes, CTAs, nombre de Tino |
| **Body / UI** | Inter | Texto de reactivos, labels, descripciones, cuerpo |
| **Mono / Números** | JetBrains Mono | Temporizador, contador de aciertos, streak (con `tabular-nums`) |

### Escala tipográfica

| Clase | Fuente | Tamaño / Line-height | Peso | Uso |
|---|---|---|---|---|
| `display-xl` | Outfit | 48px / 1.1 | 800 | Score hero, número del Entrómetro |
| `display` | Outfit | 36px / 1.15 | 700 | Títulos de pantalla |
| `heading-1` | Outfit | 28px / 1.2 | 700 | Encabezados de sección |
| `heading-2` | Outfit | 20px / 1.3 | 600 | Subtítulos, títulos de tarjeta |
| `body-lg` | Inter | 18px / 1.6 | 400 | Enunciados de reactivos (legibilidad prioritaria) |
| `body` | Inter | 16px / 1.6 | 400 | Cuerpo general |
| `label` | Inter | 14px / 1.4 | 500 | Labels, metadatos |
| `caption` | Inter | 12px / 1.4 | 500 | Notas, timestamps |
| `score` | JetBrains Mono | 40px / 1 | 700 | Números destacados (tabular) |
| `timer` | JetBrains Mono | 22px / 1 | 600 | Temporizador del simulador |

> **Regla de legibilidad crítica:** los enunciados de reactivos usan `body-lg` (18px) con line-height generoso (1.6). El alumno lee cientos de reactivos; la fatiga visual es un enemigo real. Nunca reactivos por debajo de 16px.

---

## 5. Espaciado, radios y elevación

### Escala de espaciado (base 4px)

```
space-1 = 4px    space-4 = 16px    space-8 = 32px
space-2 = 8px    space-5 = 20px    space-10 = 40px
space-3 = 12px   space-6 = 24px    space-12 = 48px
```

### Radios (redondeados generosos — clave del look Duolingo)

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8px | Chips, tags pequeños |
| `radius-md` | 12px | Botones, inputs |
| `radius-lg` | 16px | Tarjetas |
| `radius-xl` | 24px | Tarjetas grandes, modales |
| `radius-2xl` | 32px | Contenedores hero |
| `radius-full` | 9999px | Avatares, badges circulares, pills |

> **Los radios generosos son la firma del look amigable.** Un botón con `radius-md` (12px) se siente accesible y suave; un botón con 4px se siente corporativo. YaEntre usa radios grandes consistentemente.

### Elevación (sombras suaves, no duras)

```css
/* Dark mode: elevación por color + glow sutil */
--shadow-sm-dark: 0 2px 8px rgba(0,0,0,0.3);
--shadow-md-dark: 0 4px 16px rgba(0,0,0,0.4);
--shadow-glow-brand: 0 0 24px rgba(124,58,237,0.35);   /* halo violeta */

/* Light mode: sombras suaves difusas */
--shadow-sm-light: 0 1px 3px rgba(26,21,35,0.06), 0 1px 2px rgba(26,21,35,0.04);
--shadow-md-light: 0 4px 12px rgba(26,21,35,0.08);
--shadow-lg-light: 0 12px 32px rgba(26,21,35,0.10);
```

---

## 6. Iconografía e ilustración

- **Librería de íconos:** Lucide React (ya en el stack). Estilo: line icons, stroke 2px, redondeados.
- **Íconos por área** (cada área del examen tiene color + emoji/ícono):
  - Área 1 Físico-Mat → 📐 violeta
  - Área 2 Biológicas/Salud → 🧬 verde
  - Área 3 Sociales → 🏛️ ámbar
  - Área 4 Humanidades → 📚 rosa
- **Ilustraciones:** estilo plano geométrico consistente con Tino. Usadas en estados vacíos, onboarding y celebraciones.
- **Estados vacíos:** siempre con Tino + microcopy motivador, nunca una pantalla en blanco fría.

---

## 7. Biblioteca de componentes

Componentes base del sistema. Cada uno se implementa como componente React reutilizable con Tailwind.

### 7.1 Botones

| Variante | Uso | Estilo |
|---|---|---|
| `Button/Primary` | Acción principal | Fondo violeta, texto blanco, `radius-md`, sombra sutil; en press: scale 0.97 |
| `Button/Secondary` | Acción secundaria | Fondo `bg-elevated`, borde `border-subtle`, texto primary |
| `Button/Success` | Confirmar / continuar tras acierto | Fondo verde `--success` |
| `Button/Ghost` | Acción terciaria | Sin fondo, solo texto violeta |
| `Button/Danger` | Acciones destructivas | Texto/borde rojo |

**Especificación de interacción (todos los botones):**
- Hover: cambio de fondo + `translateY(-1px)`.
- Active/press: `scale(0.97)`.
- Disabled: opacidad 0.5, sin cursor pointer.
- Con ícono: gap de 8px entre ícono y texto.
- Altura mínima táctil: 44px (accesibilidad).

### 7.2 Tarjetas

| Variante | Uso |
|---|---|
| `Card/Base` | Contenedor genérico, `radius-lg`, `bg-surface` |
| `Card/Stat` | Métrica del dashboard (Entrómetro, racha) |
| `Card/Area` | Selección de área con color e ícono |
| `Card/Question` | Contenedor de reactivo en drill |
| `Card/Result` | Resultado de simulacro |

### 7.3 Componentes de examen

| Componente | Descripción |
|---|---|
| `QuestionCard` | Enunciado + 4 opciones seleccionables A/B/C/D |
| `OptionButton` | Opción individual; estados: default, selected, correct, incorrect |
| `AnswerFeedback` | Panel post-respuesta (drill): correcto/incorrecto + acceso a explicación |
| `ExplanationAccordion` | Las 4 capas de resolución, expandibles progresivamente |
| `ProgressBar/Exam` | "Pregunta 47 de 120" con barra de avance |
| `Timer` | Cuenta regresiva; cambia a rojo con < 15 min |

**Estados de `OptionButton`:**

```
Default:    borde subtle, fondo surface
Hover:      borde brand-soft, fondo tint sutil
Selected:   borde brand, fondo brand-tint, check violeta
Correct:    borde success, fondo verde sutil, ✓ verde  (solo tras responder)
Incorrect:  borde danger, fondo rojo sutil, ✗ rojo     (solo tras responder)
Disabled:   opacidad reducida (durante feedback)
```

### 7.4 Componentes de gamificación

| Componente | Descripción | Referencia |
|---|---|---|
| `StreakFlame` | Contador de racha con llama animada | Blueprint §3.3 Animación 1 |
| `Entrometro` | Anillo de progreso circular con predicción de aciertos | Componente estrella del dashboard |
| `MateriaDominadaModal` | Modal celebratorio con card-flip | Blueprint §3.3 Animación 3 |
| `PerfectRoundReveal` | Anillo de score con celebración | Blueprint §3.3 Animación 2 |
| `HeatmapCalendar` | Mapa de actividad estilo GitHub | Dashboard alumno y parental |
| `TinoReaction` | Mascota reaccionando según contexto | Aparece en logros y estados vacíos |
| `BadgeChip` | Insignia (Fundador, Materia Dominada) | Perfil del alumno |

### 7.5 Componentes de navegación

| Componente | Mobile | Desktop |
|---|---|---|
| `BottomNav` | Barra inferior fija (5 íconos: Inicio, Practicar, Simulador, Progreso, Perfil) | — |
| `Sidebar` | — | Barra lateral colapsable |
| `TopBar` | Logo + racha + avatar | Logo + racha + avatar + tema |

---

## 8. Patrones de pantalla (con wireframes)

### 8.1 Dashboard del alumno (pantalla principal)

```
┌─────────────────────────────────────────────┐
│  YaEntre          🔥 7        [avatar] ☀️/🌙  │  ← TopBar
├─────────────────────────────────────────────┤
│                                               │
│   ¡Hola, Diana! 👋                            │
│   Faltan 43 días para tu examen               │
│                                               │
│   ┌───────────────────────────────────────┐  │
│   │        ENTRÓMETRO                     │  │
│   │     ╭───────────╮                       │  │
│   │     │    87      │  ↑ +5 esta semana    │  │  ← Card/Stat (hero)
│   │     │  aciertos  │                       │  │
│   │     ╰───────────╯                       │  │
│   │   Meta Medicina: 104  ·  Gap: 17        │  │
│   │   [🎓 Tino: "Vas bien, sigue con        │  │
│   │    química que es tu área de oport."]   │  │
│   └───────────────────────────────────────┘  │
│                                               │
│   Tu semana                                   │
│   ┌───────────────────────────────────────┐  │
│   │ L  M  M  J  V  S  D                     │  │  ← HeatmapCalendar
│   │ ▓  ▓  ▓  ░  ▓  ▓  ·                     │  │
│   └───────────────────────────────────────┘  │
│                                               │
│   Reforzar hoy                                │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│   │ 🧬 Química│ │ 📐 Física │ │ 📚 Historia│    │  ← Cards temas débiles
│   │ 45% ▓▓░░  │ │ 58% ▓▓▓░  │ │ 62% ▓▓▓░  │    │
│   └──────────┘ └──────────┘ └──────────┘    │
│                                               │
│   ┌───────────────────────────────────────┐  │
│   │   ▶  Hacer un simulacro completo        │  │  ← CTA primario
│   └───────────────────────────────────────┘  │
│                                               │
├─────────────────────────────────────────────┤
│  🏠      ✏️       🎯       📊       👤        │  ← BottomNav
│ Inicio Practicar Simulador Progreso Perfil    │
└─────────────────────────────────────────────┘
```

### 8.2 Sesión de Drill (práctica)

```
┌─────────────────────────────────────────────┐
│  ✕                    🧬 Química · Práctica    │
│  ▓▓▓▓▓▓▓░░░░░░░  7/15                          │  ← Progreso
├─────────────────────────────────────────────┤
│                                               │
│   Pregunta 7                                  │
│                                               │
│   ¿Cuál es el número de oxidación del         │  ← body-lg (18px)
│   azufre en el ácido sulfúrico (H₂SO₄)?       │
│                                               │
│   ┌───────────────────────────────────────┐  │
│   │ A)  +2                                  │  │  ← OptionButton
│   ├───────────────────────────────────────┤  │
│   │ B)  +4                                  │  │
│   ├───────────────────────────────────────┤  │
│   │ C)  +6                              ✓   │  │  ← selected → correct
│   ├───────────────────────────────────────┤  │
│   │ D)  -2                                  │  │
│   └───────────────────────────────────────┘  │
│                                               │
│   ┌───────────────────────────────────────┐  │
│   │ ✅ ¡Correcto!    [Ver explicación ▾]    │  │  ← AnswerFeedback
│   └───────────────────────────────────────┘  │
│                                               │
│   ┌───────────────────────────────────────┐  │
│   │           Siguiente  →                  │  │
│   └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 8.3 Resolución por capas (post-respuesta)

```
┌─────────────────────────────────────────────┐
│   Explicación                            ✕    │
├─────────────────────────────────────────────┤
│                                               │
│  ▼ Capa 1 — ¿Por qué es +6?                  │  ← expandida
│    El azufre en H₂SO₄ tiene número de        │
│    oxidación +6 porque los 4 oxígenos        │
│    aportan −8 y los 2 hidrógenos +2.         │
│                                               │
│  ▷ Capa 2 — Paso a paso                       │  ← colapsada
│  ▷ Capa 3 — El concepto base                  │
│  ▷ Capa 4 — Practica 3 similares  →           │
│                                               │
│  [💪 Tino: "Los números de oxidación se       │
│   vuelven fáciles con práctica"]              │
└─────────────────────────────────────────────┘
```

### 8.4 Panel parental (light mode)

```
┌─────────────────────────────────────────────┐
│  YaEntre · Panel de Diana        [☀️ light]   │
├─────────────────────────────────────────────┤
│                                               │
│   Diana lleva 🔥 7 días estudiando sin parar  │
│                                               │
│   ┌─────────────────┐  ┌──────────────────┐  │
│   │  Predicción       │  │  Próximo examen   │  │
│   │  87 aciertos      │  │  UNAM · 43 días   │  │
│   │  ↑ +5 esta semana │  │  15 mayo 2027     │  │
│   └─────────────────┘  └──────────────────┘  │
│                                               │
│   Actividad de la semana                      │
│   L  M  M  J  V  S  D                          │
│   ✓  ✓  ✓  —  ✓  ✓  ·                          │
│                                               │
│   Simulacros recientes                        │
│   • 12 may · 84/120 aciertos                  │
│   • 8 may  · 79/120 aciertos                  │
│   • 3 may  · 71/120 aciertos                  │
│                                               │
│   [Recibir resumen semanal por correo ✓]      │
└─────────────────────────────────────────────┘
```

### 8.5 Inventario completo de pantallas del MVP

| # | Pantalla | Tema | Prioridad |
|---|---|---|---|
| 1 | Landing / marketing | Light | P0 |
| 2 | Registro / Login | Dark | P0 |
| 3 | Onboarding (selección examen/carrera) | Dark | P0 |
| 4 | Diagnóstico inicial | Dark | P0 |
| 5 | Resultados del diagnóstico | Dark | P0 |
| 6 | Dashboard del alumno | Dark | P0 |
| 7 | Drill / práctica | Dark | P0 |
| 8 | Resolución por capas | Dark | P1 |
| 9 | Simulador (pre-flight) | Dark | P0 |
| 10 | Simulador (sesión activa) | Dark | P0 |
| 11 | Resultados del simulacro | Dark | P0 |
| 12 | Progreso / analytics del alumno | Dark | P1 |
| 13 | Perfil / ajustes | Dark | P1 |
| 14 | Panel parental | Light | P1 |
| 15 | Planes / paywall | Dark | P0 |
| 16 | Checkout (Stripe) | — | P0 |

---

## 9. Sistema de movimiento y animación

Referencia técnica completa: Blueprint §3.3 (StreakFlame, PerfectRound, MateriaDominada).

### Principios de movimiento

| Principio | Regla |
|---|---|
| **Spring, no linear** | Usar spring physics (Framer Motion `type: 'spring'`) para que todo se sienta orgánico, no mecánico. |
| **Rápido pero perceptible** | Transiciones de UI: 200-300ms. Celebraciones: 700-1400ms. |
| **Celebrar con moderación** | Máximo 1 celebración grande por sesión. Los micro-feedbacks (press, hover) siempre. |
| **Respetar reduced-motion** | Si `prefers-reduced-motion`, versiones estáticas de todas las celebraciones. |

### Catálogo de animaciones

| Animación | Trigger | Duración | Componente |
|---|---|---|---|
| Button press | Tap/click | 100ms | Todos los botones (`scale 0.97`) |
| Option select | Seleccionar opción | 150ms | `OptionButton` |
| Answer reveal | Responder en drill | 300ms | `AnswerFeedback` (slide + fade) |
| Layer expand | Abrir capa de explicación | 300ms | `ExplanationAccordion` |
| Streak flame | Extender racha | 700ms | `StreakFlame` |
| Perfect round | Score ≥ 90% | 1200ms | `PerfectRoundReveal` |
| Materia dominada | hitRate ≥ 0.85 en materia | 1400ms | `MateriaDominadaModal` (card-flip) |
| Entrómetro update | Recálculo de predicción | 1000ms | Anillo + número animado (`@number-flow`) |
| Tino reaction | Contextos de logro/vacío | 600ms | `TinoReaction` (bounce sutil) |
| Page transition | Navegación entre pantallas | 250ms | Fade + slide sutil |

---

## 10. Estados, feedback y microcopy

### Estados de cada componente interactivo

Todo componente interactivo especifica: `default`, `hover`, `active`, `focus`, `disabled`, `loading`, y donde aplique `error`/`success`.

### Microcopy con la voz de Tino

| Situación | Copy |
|---|---|
| Estado vacío (sin simulacros) | "Aún no haces ningún simulacro. ¡El primero es el más importante! 🦉" |
| Racha en riesgo | "Tu racha de 7 días está en riesgo. ¿Unos minutos hoy? 🔥" |
| Después de un error | "Uy, esa estuvo difícil. La volvemos a ver más adelante. 💪" |
| Ronda perfecta | "¡Ronda perfecta! Vas imparable. 🎉" |
| Materia dominada | "¡Dominaste Química! Una menos, vamos por la siguiente. 🎓" |
| Paywall (suave) | "Desbloquea simulacros ilimitados y el examen completo. Tino te acompaña. 🦉" |
| Predicción sube | "Tu predicción subió 5 aciertos esta semana 🚀" |

> **Regla de microcopy:** siempre en español mexicano cercano, nunca condescendiente, nunca con culpa. Tino anima, no regaña. El paywall es una invitación, no un muro agresivo.

---

## 11. Responsive y adaptación mobile/desktop

| Breakpoint | Ancho | Layout |
|---|---|---|
| `mobile` | < 640px | Single column, BottomNav, hero cards full-width |
| `tablet` | 640-1024px | 2 columnas en dashboard, BottomNav se mantiene |
| `desktop` | > 1024px | Sidebar lateral, grid 2-3 columnas, sin BottomNav |

**Reglas de adaptación:**
- El **estudio diario (drill, dashboard)** es mobile-first y funciona perfecto en pantalla pequeña.
- El **simulador** muestra en mobile un aviso recomendando computadora (el examen real requiere laptop), pero permite práctica.
- El **panel parental** es responsive y debe funcionar bien dentro del navegador in-app de Facebook (donde muchos padres lo abrirán).

---

## 12. Accesibilidad

| Requerimiento | Especificación |
|---|---|
| Contraste | WCAG 2.1 AA mínimo (4.5:1 texto normal, 3:1 texto grande) |
| Área táctil | Mínimo 44×44px en todos los controles |
| Foco visible | Anillo de foco `border-strong` en navegación por teclado |
| Reduced motion | Todas las celebraciones tienen versión estática |
| Texto escalable | Respetar el tamaño de fuente del sistema; no bloquear zoom |
| Lectores de pantalla | Labels ARIA en íconos-botón; `alt` en ilustraciones informativas |
| Color no es el único canal | Correcto/incorrecto usa color + ícono (✓/✗) + texto |

> **Nota crítica de contraste:** verificar que el violeta de marca sobre fondos oscuros y el verde de éxito cumplan AA. El texto sobre botones de color debe testearse; algunos verdes vivos fallan contraste con texto blanco y requieren texto oscuro.

---

## 13. Modo del Simulador (spec visual especial)

El simulador tiene una identidad visual **deliberadamente más seria y enfocada** que el resto de la app. Aquí el tono juguetón se atenúa: el objetivo es replicar la tensión del examen real.

| Elemento | Especificación |
|---|---|
| Fondo | `bg-base` sólido, sin decoración, sin Tino |
| Cromática | Neutra; solo el temporizador usa color (info → warning → danger) |
| Temporizador | Fijo arriba, JetBrains Mono, verde → ámbar (< 30 min) → rojo (< 15 min) |
| Progreso | "Pregunta 47 de 120" discreto, sin gamificación |
| Sin distracciones | Sin BottomNav, sin racha, sin notificaciones, sin animaciones celebratorias |
| Advertencias | Toast sobrio al salir de fullscreen (no juguetón): "Abandonaste la pantalla completa" |
| Celebración | **Ninguna durante el examen.** La celebración llega solo en la pantalla de resultados. |

> **Racional:** el contraste entre el simulador serio y el resto de la app cálida es intencional. Refuerza que el simulacro "es en serio" y prepara psicológicamente al alumno para el examen real. Cuando termina y ve sus resultados, la calidez (y Tino) regresan.

---

## 14. Tokens de implementación (Tailwind)

```javascript
// tailwind.config.ts — extract de la configuración de tokens
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          soft: '#A78BFA',
          tint: '#EDE9FE',
        },
        success: { DEFAULT: '#22C55E', glow: '#4ADE80' },
        streak: { DEFAULT: '#F97316', glow: '#FB923C' },
        danger: '#EF4444',
        info: '#38BDF8',
        warning: '#FBBF24',
        // superficies via CSS variables (cambian por tema)
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '16px',
        xl: '24px', '2xl': '32px',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
```

---

*Fin del documento · UI/UX Specification YaEntre v1.0*
*Acompaña a este documento: mockup HTML navegable de las pantallas hero (Dashboard + Simulador)*
*Serie: Estudio → Blueprint → PRD → TRD → **UI/UX** → Flujo de App → Backend Schema → Plan de Implementación*
