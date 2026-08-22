# PRD — YaEntre
## Product Requirements Document · v1.0

| Campo | Detalle |
|---|---|
| **Producto** | YaEntre |
| **URL objetivo** | yaentre.com |
| **Tagline** | *Tu IA sabe exactamente qué te falta para entrar.* |
| **Versión del documento** | 1.0 |
| **Fecha** | 9 de julio de 2026 |
| **Autor** | Product Manager / CTO |
| **Estado** | En revisión |
| **Documentos relacionados** | Estudio de Mercado EdTech UNAM/IPN 2027 · Blueprint Técnico v1.0 |

---

## Tabla de contenidos

1. Resumen del producto
2. Problema y oportunidad
3. Objetivos y métricas de éxito
4. Usuarios objetivo (Personas)
5. Scope del MVP — qué entra y qué no
6. Instituciones y exámenes soportados
7. Requerimientos funcionales (features)
8. Pipeline de creación de contenido
9. Requerimientos de monetización
10. Requerimientos técnicos y de plataforma
11. Requerimientos de diseño
12. Requerimientos no funcionales
13. Dependencias y riesgos
14. Criterios de lanzamiento (Definition of Done)
15. Glosario

---

## 1. Resumen del producto

**YaEntre** es una plataforma SaaS web/PWA de preparación autogestionable para los exámenes de admisión en línea de la UNAM, el IPN, la UAM y el CENEVAL (EXANI II). Combina un banco de reactivos adaptativos generados con IA, un simulador fiel del entorno del examen en línea (fullscreen, temporizador, restricciones), y un motor de diagnóstico que construye la ruta de estudio personalizada de cada alumno.

La plataforma pivota sobre la base tecnológica de Certifik PLD (banco de preguntas, sesiones de examen temporizadas, auth Supabase, Stripe), refactorizando la taxonomía de contenido y añadiendo el motor adaptativo, el simulador y la capa de gamificación. **No es un rebuild — es un pivot estratégico con ~55% de reutilización de código.**

El lanzamiento público se coordina con la apertura de convocatorias UNAM/IPN de enero 2027. La Fase 1 es 100% autogestionable (sin profesores ni clases en vivo). La arquitectura deja los campos de contenido de Fase 2 (video, livestream, notas de profesor) preparados pero inactivos.

---

## 2. Problema y oportunidad

### El problema

| Dimensión | Evidencia |
|---|---|
| **Rechazo masivo** | El 90%+ de aspirantes a UNAM licenciatura son rechazados (~129K por ciclo). IPN rechaza al ~77% de quienes presentan examen (~65K). |
| **Examen ahora es en línea** | IPN aplica examen en línea desde 2021. UNAM migró ECOEMS (media superior) a 100% online en junio 2025. SUAyED usa Lockdown Browser. La tendencia es hacia digitalización total. **Ningún competidor prepara al alumno en el entorno técnico real.** |
| **Fin de COMIPEMS** | El sistema "Mi Derecho, Mi Lugar" (2025) elimina el examen general; solo UNAM e IPN conservan examen propio de media superior. Esto concentra la demanda: los que compiten por UNAM/IPN son los más motivados a pagar. |
| **Métodos tradicionales rotos** | YouTube: sin estructura ni seguimiento. Guías en PDF: sin retroalimentación. Cursos presenciales: caros, rígidos, inaccesibles desde la periferia. Competidores online (Unitips, Unibetas): entregan contenido, no diagnóstico. |
| **El alumno llega al examen sin haber practicado el formato** | El "bloqueo del día D" — enfrentar por primera vez un examen en pantalla completa con temporizador y cámara — es una causa documentada de bajo rendimiento. |

### La oportunidad

- **TAM expandido** (UNAM + IPN + UAM + EXANI II, ZMVM + nacional): ~$350M+ MXN/año.
- **194K rechazados** al año representan un mercado de re-subscripción de altísima intención emocional cada julio-agosto.
- **Océano azul técnico:** el simulador del entorno real del examen online es un diferenciador que ningún competidor ocupa actualmente.
- **Competidor institucional limitado:** UNAM ofrece "Pruéb@te" ($200 MXN, solo simulacros básicos, sin diagnóstico ni ruta adaptativa) — valida la demanda sin cubrirla.

---

## 3. Objetivos y métricas de éxito

### North Star Metric

> **Número de alumnos con al menos 1 simulacro completo en el período de 30 días anteriores al examen real.**

Este KPI captura si los alumnos están usando el producto de la forma que genera el mayor valor (práctica en entorno real justo antes del examen), y predice tanto retención como renovación y recomendación.

### KPIs por horizonte

| Horizonte | Métrica | Meta |
|---|---|---|
| **Early Bird** (oct 2026) | Licencias Early Bird vendidas | ≥ 200 |
| **Pre-launch** (dic 2026) | NPS de beta cerrada | ≥ 7.5 / 10 |
| **30 días post-launch** (feb 2027) | Usuarios de pago activos | ≥ 500 |
| **90 días post-launch** (abr 2027) | Conversión free → pago | ≥ 6% |
| **Examen UNAM** (may-jun 2027) | Simulacros completados / usuario de pago | ≥ 4 por ciclo |
| **Cierre año 1** (dic 2027) | Usuarios de pago acumulados | ≥ 3,000 |
| **Cierre año 1** | Revenue total ciclo 2027 | ≥ $900K MXN |
| **Cierre año 1** | CAC blended real | ≤ $200 MXN |

### Anti-metas (lo que NO queremos)

- ❌ No queremos crecer en volumen de contenido a costa de la calidad de reactivos.
- ❌ No queremos integrar profesores en vivo en la Fase 1 (genera costos operativos que destruyen el margen).
- ❌ No queremos ser una plataforma generalista de cursos — el foco es examen de admisión.
- ❌ No queremos que la app exija desktop: el aprendizaje daily debe funcionar en móvil; solo el simulador requiere laptop/PC (igual que el examen real).

---

## 4. Usuarios objetivo (Personas)

### Perfil A — "El aspirante autónomo" (usuario primario)

| Atributo | Detalle |
|---|---|
| **Edad** | 15-22 años |
| **Situación** | Alumno de 6º semestre de prepa/CCH, egresado en 1er o 2do intento |
| **NSE** | C / C− / D+ |
| **Dispositivo principal** | Smartphone (Android, MIUI o iOS económico); laptop compartida o de escuela |
| **Examen objetivo** | UNAM Licenciatura (Área 1 o 2 prioritariamente), IPN Superior, o EXANI II |
| **Canal de descubrimiento** | TikTok, Instagram Reels, grupos de Facebook de aspirantes, boca a boca |
| **Pain point principal** | "Estudio pero no sé si lo que estudio es lo que viene en el examen real" |
| **Pain point secundario** | "Nunca he visto cómo se ve el examen en línea de verdad" |
| **Disposición a pagar** | Baja por default; alta en los 60 días previos al examen y post-rechazo |
| **Rol en la compra** | Influye en la decisión; quien paga es el padre (Perfil B) |

### Perfil B — "La mamá-decisora" (pagadora primaria)

| Atributo | Detalle |
|---|---|
| **Edad** | 32-50 años |
| **Situación** | Madre o padre de un aspirante de media superior o superior |
| **NSE** | C / C− / D+ |
| **Dispositivo** | Smartphone (Facebook, WhatsApp); desktop en el trabajo |
| **Canal de descubrimiento** | Facebook (grupos de madres y de aspirantes), recomendación de otras mamás |
| **Pain point principal** | "Con el nuevo sistema 'garantizan' lugar, pero yo quiero que entre a una BUENA prepa/universidad" |
| **Pain point secundario** | "Le pago el curso pero no sé si de verdad estudia" |
| **Criterios de confianza** | Garantía explícita · Visibilidad del progreso del hijo · Pago en OXXO · Prueba social local |
| **Capacidad de pago** | $500-$1,500 MXN por ciclo si percibe valor; ≤$3,000 antes de preguntar |
| **Rol en la compra** | Decisora final y pagadora |

---

## 5. Scope del MVP — qué entra y qué no

### ✅ En scope — Fase 1 (lanzamiento enero 2027)

- Autenticación y gestión de cuenta (Supabase Auth)
- Onboarding con diagnóstico inicial (30 reactivos → perfil de debilidades)
- Banco de reactivos con taxonomía UNAM / IPN / UAM / EXANI II
- Motor adaptativo (Entrómetro + ruta de estudio personalizada)
- Modo Simulador de Examen en Línea (fullscreen, timer, restricciones)
- Modo Drill por tema (práctica abierta, sin tiempo)
- Resolución explicada por capas (4 capas por reactivo)
- Dashboard del alumno (progreso, racha, Entrómetro, heatmap)
- Dashboard parental (vista de solo lectura)
- Gamificación: streak de días, badge "Materia Dominada", celebración de ronda perfecta
- Planes de pago (Free / Mensual / Pase de Temporada / Premium) vía Stripe
- Pago en OXXO, tarjeta de crédito/débito, SPEI
- PWA instalable en móvil (para el estudio daily)
- Soporte para UNAM Superior (4 áreas), IPN Superior (3 ramas), UAM Superior y EXANI II
- Soporte para UNAM/IPN Media Superior (ECOEMS)

### ❌ Fuera de scope — Fase 2 (post-validación)

- Clases en vivo (livestream) con profesores
- Video-lecciones pre-grabadas por materia
- Notas de profesor por reactivo
- Foro comunitario o chat entre alumnos
- App nativa (React Native / Expo) — Fase 1 usa PWA
- Panel de profesor con gestión de grupos
- Rankings públicos o modo torneo entre usuarios
- Notificaciones push nativas (Fase 1 usa email)
- Integración con WhatsApp para reminders
- Marketplace de tutorías 1:1

> **Nota de arquitectura:** los campos de Fase 2 (`videoLectureId`, `professorNoteId`, `ContentItem.status = INACTIVE`) están presentes en el schema de DB desde Fase 1. No requieren migración posterior; solo activación de UI y contenido.

---

## 6. Instituciones y exámenes soportados

| Institución | Nivel | Nombre del examen | Reactivos | Duración | Modalidad | Fecha aprox. 2027 |
|---|---|---|---|---|---|---|
| **UNAM** | Superior | Concurso de Selección Licenciatura | 120 | 180 min | En línea (Lockdown Browser + Zoom) | May–Jun 2027 |
| **UNAM** | Superior | Concurso Noviembre (SUAyED) | 120 | 180 min | En línea | Nov 2027 |
| **UNAM** | Media Superior | ECOEMS (Prepa/CCH) | Variable | Variable | En línea | Jun 2027 |
| **IPN** | Superior | Examen de Admisión Superior | 140 | ~180 min | En línea | May–Jun 2027 |
| **IPN** | Media Superior | ECOEMS (CECyT/Vocacional) | Variable | Variable | En línea | Jun 2027 |
| **UAM** | Superior | Examen de Selección UAM | Variable | ~120 min | En línea | Mar–Abr 2027 |
| **CENEVAL** | Superior | EXANI II | 130+ | Variable | Variable por sede | Todo el año |

**Prioridad de contenido al lanzamiento:**
1. UNAM Superior Áreas 1 y 2 (mayor demanda y rechazo)
2. IPN Superior (Físico-Mat y Médico-Biológicas)
3. UNAM Superior Áreas 3 y 4
4. EXANI II (lanzamiento semana 2 post-launch si contenido no está listo el día 1)
5. UAM Superior (lanzamiento semana 3 post-launch)
6. Media Superior ECOEMS (sprint post-launch S7)

---

## 7. Requerimientos funcionales (features)

> Formato de user stories: *Como [persona], quiero [acción] para [beneficio].*
> Criterios de aceptación: condiciones mínimas medibles y verificables.

---

### F-01 — Diagnóstico Inicial y Onboarding Adaptativo `P0`

**User story:**
Como aspirante recién registrado, quiero completar un diagnóstico rápido al entrar por primera vez, para que la plataforma sepa cuáles son mis temas más débiles y me dé una ruta de estudio personalizada desde el día 1.

**Descripción funcional:**
Al completar el registro, el usuario selecciona su institución objetivo, carrera y área/rama. Inmediatamente se lanza una sesión diagnóstica de 30 reactivos representativos de todos los temas del área (distribuidos por materia según el peso real del examen). Los resultados generan el `LearningProfile`: `WeakTopics`, `predictedScore` inicial y los primeros pasos de la ruta de estudio.

**Criterios de aceptación:**
- [ ] El diagnóstico se activa automáticamente en el primer inicio de sesión y no puede omitirse (solo posponerse 1 vez).
- [ ] Los 30 reactivos están distribuidos en al menos 6 materias distintas del área seleccionada.
- [ ] Al finalizar, el sistema identifica los temas con `hitRate < 0.60` como "zonas débiles".
- [ ] El alumno ve una pantalla de resultados con: score obtenido, Entrómetro inicial, y 3 temas prioritarios a reforzar.
- [ ] El `LearningProfile` queda persistido en DB al finalizar el diagnóstico.
- [ ] El flujo completo toma ≤ 45 minutos y está disponible en móvil y desktop.

---

### F-02 — Banco de Reactivos Adaptativo `P0`

**User story:**
Como alumno, quiero que la plataforma me muestre las preguntas que más necesito practicar (no las que ya domino), para optimizar mi tiempo de estudio.

**Descripción funcional:**
Motor de selección de reactivos basado en spaced repetition y weak-topic prioritization. En el modo Drill, el algoritmo selecciona reactivos priorizando temas con `hitRate < 0.60` y evitando preguntas respondidas en las últimas 72 horas. Cada reactivo tiene dificultad calibrada (BEGINNER a EXPERT) y está etiquetado con institución, área, materia, tema, año de aparición y estado de verificación.

**Criterios de aceptación:**
- [ ] En Modo Drill, al menos el 60% de las preguntas mostradas corresponden a los 5 temas más débiles del usuario.
- [ ] Ninguna pregunta respondida en las últimas 72 h aparece en la misma sesión de Drill.
- [ ] Solo se muestran al usuario preguntas con `isVerified = true`.
- [ ] El banco tiene ≥ 1,500 reactivos verificados al lanzamiento público.
- [ ] Cada reactivo tiene al menos la Capa 1 de explicación completa al lanzamiento; Capas 2-3 cubren ≥ 80% del banco.
- [ ] El tiempo de carga de una pregunta (incluyendo opciones) es ≤ 500ms en conexión 4G.

---

### F-03 — Modo Simulador de Examen en Línea `P0`

**User story:**
Como aspirante, quiero practicar en un entorno que replique exactamente las condiciones del examen real en línea, para no bloquearme por el formato el día del examen.

**Descripción funcional:**
Sesión de examen en modo `FULL_SIMULATION` que activa pantalla completa obligatoria (Fullscreen API), temporizador con cuenta regresiva visible, presentación de una pregunta a la vez sin retroceso, y registro de eventos de posible deshonestidad académica (cambios de pestaña, atajos de teclado, clic derecho). El examen no puede pausarse. Al finalizar muestra resultados detallados con desglose por área/materia.

**Flujo del simulador:**

```
1. Pre-flight check
   ├── Solicitud de permiso de cámara (getUserMedia) — orientativo, no obligatorio
   ├── Modal de reglas: "No podrás regresar a preguntas anteriores. El examen no puede pausarse."
   └── CTA: "Iniciar examen" → activa fullscreen

2. Sesión activa
   ├── Barra superior: [Institución/Área] | Pregunta X de 120 | ⏱ 02:47:33
   ├── Una pregunta visible, opciones A/B/C/D seleccionables con clic
   ├── Botón "Siguiente →" (no "Anterior")
   └── Sin barra de navegación ni menú lateral

3. Event handlers (registrar, no bloquear la sesión)
   ├── visibilitychange → tabBlurCount++, toast: "⚠️ Abandonaste la pantalla completa"
   ├── contextmenu → preventDefault(), rightClickAttempts++
   ├── keydown (Ctrl+C/V/U/S, F5, F12, Alt+Tab) → preventDefault(), keyboardShortcutAttempts++
   └── fullscreenchange (si salió) → modal de advertencia + registro en suspicionEvents

4. Envío
   ├── Al llegar al reactivo final o al agotarse el tiempo
   ├── Modal de confirmación → guardar ExamSession
   └── Redirect a pantalla de resultados
```

**Criterios de aceptación:**
- [ ] La sesión activa fullscreen al iniciar; si el navegador lo rechaza, muestra advertencia y permite continuar sin fullscreen (degradación graciosa, especialmente en Safari/iOS).
- [ ] No existe botón "Anterior" en ninguna pregunta durante el simulador.
- [ ] El temporizador no se detiene si el usuario cambia de pestaña; el evento queda registrado en `suspicionEvents`.
- [ ] Al finalizar el tiempo, el sistema guarda automáticamente las respuestas marcadas hasta ese momento.
- [ ] La pantalla de resultados post-simulacro muestra: aciertos totales, desglose por materia, tiempo promedio por pregunta, y Entrómetro actualizado.
- [ ] El simulador funciona correctamente en Chrome ≥ 110, Firefox ≥ 110, Edge ≥ 110 en desktop.
- [ ] En móvil: el simulador muestra un aviso *"El examen real requiere laptop. Puedes practicar, pero te recomendamos usar una computadora para los simulacros."*

---

### F-04 — Resolución Explicada por Capas `P1`

**User story:**
Como alumno que falló una pregunta, quiero entender no solo la respuesta correcta sino por qué la mía estaba mal y cuál es el concepto base detrás, para no cometer el mismo error en el examen real.

**Descripción funcional:**
En la pantalla de revisión post-sesión, cada reactivo fallado (o cualquier reactivo en modo libre) tiene un accordión expandible con 4 capas de explicación. Las capas se revelan progresivamente: el alumno debe leer la Capa 1 antes de desbloquear la Capa 2, etc. La Capa 4 genera un acceso directo a 3 reactivos similares del mismo tema.

**Estructura de capas:**

| Capa | Título | Contenido | Extensión |
|---|---|---|---|
| 1 | ¿Por qué es correcta la opción [X]? | Una oración que explica el error y confirma la correcta | 1-2 oraciones |
| 2 | Paso a paso | Razonamiento completo, fórmulas si aplica (KaTeX), proceso de eliminación | 3-8 pasos |
| 3 | El concepto base | Teoría de fondo, definición, referencia al temario oficial | Párrafo + referencia |
| 4 | Practica más de esto | 3 reactivos del mismo tema con dificultad escalonada | Links a sesión drill filtrada |

**Criterios de aceptación:**
- [ ] Las capas 1-3 están escritas y almacenadas para ≥ 80% del banco de reactivos al lanzamiento.
- [ ] Las fórmulas matemáticas y químicas renderizan correctamente con KaTeX en mobile y desktop.
- [ ] La Capa 4 ("Practica más") abre directamente una sesión Drill filtrada por el `topicId` de esa pregunta.
- [ ] El tiempo de expansión de cada capa (reveal animation) es ≤ 300ms.
- [ ] El alumno puede marcar un reactivo como "revisado" para no verlo de nuevo en las capas de revisión (no lo elimina del banco adaptativo).

---

### F-05 — Dashboard del Alumno `P1`

**User story:**
Como alumno, quiero ver en un solo lugar cuánto he avanzado, cuántos días llevo estudiando y qué probabilidad tengo de pasar el examen, para mantenerme motivado y enfocarme en lo que falta.

**Componentes del dashboard:**

| Widget | Descripción | Fuente de datos |
|---|---|---|
| **Entrómetro** | Predicción de aciertos en el examen real (número grande, con flecha vs. semana anterior) | `LearningProfile.predictedScore` |
| **Carrera objetivo** | Nombre de la carrera meta + aciertos mínimos históricos + gap actual | `Career.minAciertos`, predicción |
| **Racha de días** (🔥) | Días consecutivos con ≥ 1 sesión de estudio | `StreakRecord.currentStreak` |
| **Mapa de calor** | Actividad de los últimos 90 días (estilo GitHub contribution graph) | `ExamSession.startedAt` |
| **Progreso por área** | Anillos de progreso circular por área/materia, % de reactivos dominados | `WeakTopic.hitRate` por subject |
| **Simulacros recientes** | Últimos 3 simulacros: score, fecha, percentil vs. otros usuarios | `ExamSession` donde `mode = FULL_SIMULATION` |
| **Temas a reforzar** | Top 3 temas más débiles con CTA directo a Drill | `WeakTopic` ordenados por `hitRate` asc |

**Criterios de aceptación:**
- [ ] El Entrómetro se recalcula después de cada sesión completada (no en tiempo real, sino al finalizar).
- [ ] El mapa de calor diferencia entre sesiones de ≤ 15 min (punto tenue) y ≥ 30 min (punto lleno).
- [ ] La racha se rompe si el usuario no completa ninguna sesión en un día calendario (UTC-6, hora de México).
- [ ] El dashboard carga completo (first contentful paint) en ≤ 2s en 4G.
- [ ] En mobile, el dashboard es un scroll vertical single-column; en desktop, layout de 2-3 columnas con grid.

---

### F-06 — Dashboard Parental `P1`

**User story:**
Como madre o padre que pagó el plan de mi hijo, quiero ver su progreso desde mi propio dispositivo, para saber que el dinero invertido se está traduciendo en estudio real.

**Descripción funcional:**
Vista de solo lectura, accesible con un correo diferente al del alumno (rol `PARENT` en `UserProfile`). Se vincula al alumno mediante el campo `parentLinkedId`. El padre no puede ver los reactivos ni estudiar; solo ve métricas de actividad y progreso.

**Componentes del panel parental:**

| Widget | Copy para el padre |
|---|---|
| Racha actual | *"[Nombre] lleva 🔥 **{N} días** estudiando sin parar."* |
| Actividad últimos 7 días | Calendario semanal: días estudiados vs. días sin actividad |
| Predicción de aciertos | *"Su predicción actual: **{score} aciertos** en su examen ({+/-N} vs. la semana pasada)"* |
| Simulacros completados | Lista de los últimos 3 simulacros con score y fecha |
| Próximo examen | Countdown al examen real (fecha oficial de la convocatoria) |

**Criterios de aceptación:**
- [ ] El padre puede vincularse al alumno mediante un código de 6 dígitos que genera el alumno desde sus ajustes.
- [ ] El panel parental no muestra ningún reactivo, opción de respuesta ni contenido del examen.
- [ ] El padre puede recibir un resumen semanal por correo (email automático vía Supabase/Resend todos los lunes).
- [ ] Si el alumno no ha estudiado en 3+ días, el panel muestra un badge de alerta: *"Sin actividad en 3 días"*.
- [ ] El panel parental es responsive y funciona correctamente en Facebook in-app browser (navegador de Facebook en Android/iOS).

---

### F-07 — Sistema de Autenticación y Planes `P0`

**User story:**
Como usuario, quiero registrarme fácilmente y elegir el plan que más me conviene, para empezar a estudiar sin fricciones.

**Descripción funcional:**
Autenticación vía Supabase Auth (email + contraseña; magic link opcional). Al registrarse, el usuario entra al plan Free automáticamente. Los planes de pago se gestionan via Stripe. Los pagos en efectivo (OXXO) y transferencia (SPEI) son obligatorios para el mercado objetivo.

**Criterios de aceptación:**
- [ ] El registro por email + contraseña funciona en ≤ 30 segundos.
- [ ] El plan Free no requiere tarjeta de crédito.
- [ ] Stripe acepta tarjeta de débito/crédito, OXXO y SPEI (métodos de pago MX).
- [ ] Al comprar un plan de pago, el acceso se activa en ≤ 5 minutos (inmediato con tarjeta, ≤ 3h con OXXO).
- [ ] El usuario puede cancelar o cambiar de plan desde su perfil sin contactar soporte.
- [ ] Stripe Webhook actualiza el plan en DB al confirmarse el pago (no al iniciarse).
- [ ] Los Early Bird Price IDs de Stripe tienen `max_redemptions: 500` para el límite de licencias.

---

### F-08 — Gamificación (Streak, Badges, Celebraciones) `P1`

**User story:**
Como alumno, quiero que la app me recompense cuando estudio todos los días y cuando domino un tema, para mantenerme motivado durante los meses de preparación.

**Mecánicas de gamificación en Fase 1:**

| Mecánica | Trigger | Componente UI |
|---|---|---|
| **Streak diario** | Sesión de ≥ 10 min en el día | `StreakFlame` — counter animado con partículas en milestone (7, 14, 30 días) |
| **Ronda perfecta** | Score ≥ 90% en simulacro o Drill de ≥ 20 reactivos | `PerfectRound` — anillo animado + badge celebratorio |
| **Materia Dominada** | `hitRate ≥ 0.85` en todos los temas de una materia | `MateriaDominada` — card-flip modal con badge por color de área |
| **Predicción mejorada** | Entrómetro sube ≥ 5 puntos en una semana | Toast con ↑ flecha verde: *"Tu predicción subió 5 puntos esta semana 🚀"* |

**Criterios de aceptación:**
- [ ] El streak no se rompe si el usuario estudia entre las 23:00 y las 23:59 del día en cuestión (huso horario UTC-6).
- [ ] Los badges de materia dominada son persistentes y se muestran en el perfil del alumno.
- [ ] Las animaciones de celebración no bloquean la UI más de 3 segundos y tienen un botón de "cerrar" visible.
- [ ] Las animaciones respetan `prefers-reduced-motion`: si el sistema operativo lo indica, se muestran versiones estáticas.

---

## 8. Pipeline de creación de contenido

La creación de reactivos es la **dependencia crítica no técnica** del proyecto. La estrategia elegida es IA-asistida con revisión humana. Este pipeline define el proceso de calidad que determina que un reactivo sea publicable (`isVerified = true`).

### Etapas del pipeline

```
ETAPA 1 — Generación con IA
────────────────────────────
Input:  Tema + Subtema del temario oficial UNAM/IPN/EXANI II
Prompt: [Plantilla estandarizada por materia]
Output: Reactivo draft:
        - Enunciado (stem)
        - 4 opciones (A/B/C/D), exactamente 1 correcta
        - Explicación Capa 1 (por qué la correcta)
        - Explicación Capa 2 (paso a paso)
        - Explicación Capa 3 (concepto base)
        - Nivel de dificultad sugerido (1-5)
Modelo: Claude 3.5 Sonnet (balance calidad/costo)
        — usar system prompt con: temario oficial, 3 ejemplos few-shot por materia,
          instrucción de formato JSON estricto

ETAPA 2 — Validación automática
─────────────────────────────────
Script de CI (Node.js):
✓ Exactamente 1 opción marcada como correcta (isCorrect: true)
✓ Las 4 opciones están presentes y no están vacías
✓ El enunciado no contiene texto de LaTeX mal formado
✓ Las explicaciones Capas 1-3 están presentes y no están vacías
✓ La dificultad es un valor válido (1-5)
Si falla cualquier check → reactivo va a cola de "regenerar" (no a revisión)

ETAPA 3 — Revisión humana
──────────────────────────
Revisor: Freelancer o egresado de UNAM/IPN con dominio de la materia
Tiempo estimado por reactivo: 3-5 min (solo verificar, no crear desde cero)
Checklist de revisión:
✓ El enunciado es claro y no ambiguo
✓ La respuesta correcta es inequívocamente correcta (verificada con fuente)
✓ Los distractores son plausibles (no trivialmente descartables)
✓ La explicación Capa 2 tiene el razonamiento correcto paso a paso
✓ La dificultad calibrada es apropiada para el nivel del examen real
✓ Para STEM: la fórmula/operación está correctamente representada (KaTeX)
Resultado: APROBADO → isVerified = true | RECHAZADO → vuelve a Etapa 1

ETAPA 4 — Staging (periodo de prueba)
───────────────────────────────────────
Los reactivos recién verificados entran a una pool de "staging":
- Se muestran a usuarios de beta cerrada por 2 semanas
- Si el reactivo recibe un "reportar error" de ≥ 3 usuarios → revisión obligatoria
- Después del staging sin incidencias → pool de producción definitiva
```

### Costos estimados del pipeline

| Recurso | Volumen | Costo estimado |
|---|---|---|
| Claude API (Sonnet) — generación | 1,500 reactivos × ~2K tokens/reactivo | ~$15-25 USD |
| Revisión humana | 1,500 reactivos × $4 MXN/reactivo | ~$6,000 MXN |
| **Total banco inicial (1,500 reactivos)** | | **~$6,400 MXN** |
| Expansión a 3,000 reactivos (post-launch) | | ~$6,400 MXN adicionales |

> **Riesgo crítico:** los reactivos de matemáticas avanzadas, química orgánica y física deben revisarse por un especialista STEM (no solo un egresado general). Presupuestar revisores por materia, no por institución.

---

## 9. Requerimientos de monetización

### Planes y precios

| Plan | Free | Mensual | Pase de Temporada ⭐ | Premium Garantía |
|---|---|---|---|---|
| **Early Bird** (sep–nov 2026) | $0 | $99/mes | $499 | $899 |
| **Temporada Alta** (ene–mar 2027) | $0 | $149/mes | $799 | $1,299 |
| **Último Minuto** (abr–may 2027) | $0 | $199/mes | $999 | $1,499 |
| **Stripe Price ID** | — | `price_mensual_eb` / `price_mensual_reg` / `price_mensual_lm` | `price_pase_eb` / `price_pase_reg` / `price_pase_lm` | `price_premium_eb` / `price_premium_reg` / `price_premium_lm` |

### Qué incluye cada plan

| Feature | Free | Mensual | Pase ⭐ | Premium |
|---|---|---|---|---|
| Diagnóstico inicial | ✅ | ✅ | ✅ | ✅ |
| Reactivos ilimitados (Drill) | ❌ 10/día | ✅ | ✅ | ✅ |
| Simulacros completos | 1 (30 reactivos) | ✅ ilimitados | ✅ ilimitados | ✅ ilimitados |
| Simulador fullscreen (120/140 reactivos) | ❌ | ✅ | ✅ | ✅ |
| Resolución por capas | Capa 1 solo | ✅ todas | ✅ todas | ✅ todas |
| Dashboard del alumno | Básico | ✅ completo | ✅ completo | ✅ completo |
| Entrómetro | ❌ | ✅ | ✅ | ✅ |
| Dashboard parental | ❌ | ❌ | ✅ | ✅ |
| Gamificación completa | Parcial | ✅ | ✅ | ✅ |
| Vigencia | Siempre | Mensual renovable | Hasta el día del examen | Hasta el día del examen |
| Garantía de reembolso | ❌ | ❌ | ❌ | ✅ si no ingresa |
| Tutorías (Phase 2) | ❌ | ❌ | ❌ | Prioritario |

### Métodos de pago obligatorios

- Tarjeta de crédito/débito Visa, Mastercard, Amex
- OXXO (efectivo en tienda, confirmación ≤ 3h)
- SPEI/transferencia bancaria (confirmación ≤ 24h)

### Early Bird — mecánica técnica

- Stripe Price IDs con `max_redemptions: 500` para los tres planes Early Bird.
- Badge visible en el perfil: *"Fundador YaEntre 🏅"* (campo `UserProfile.badges: ["EARLY_BIRD"]`).
- El precio Early Bird se "congela" para el usuario: si renueva después de noviembre 2026, paga el precio regular. El plan de Pase cubre hasta el examen sin renovación.

---

## 10. Requerimientos técnicos y de plataforma

### Stack tecnológico (confirmado)

```yaml
Frontend:
  framework:    Next.js 15 (App Router, TypeScript)
  estilos:      Tailwind CSS 4
  animaciones:  Framer Motion 11
  fórmulas:     KaTeX (renderizado LaTeX en cliente)
  estado:       Zustand (solo para el simulador; resto = React Server Components)
  misc:         screenfull, @number-flow/react, react-calendar-heatmap, Sonner

Backend / BaaS:
  base_datos:   Supabase PostgreSQL
  auth:         Supabase Auth (email + contraseña)
  edge_fns:     Supabase Edge Functions (Deno) — motor adaptativo
  storage:      Supabase Storage (imágenes de reactivos, avatares)
  emails:       Resend (transaccional) o Supabase sendEmail

ORM:
  prisma:       Prisma ORM — migraciones y queries tipadas

Pagos:
  stripe:       Stripe.js — suscripciones, one-time payments, OXXO, SPEI, webhooks

Deploy:
  frontend:     Vercel (región us-east-1 → latencia aceptable en CDMX)
  edge_fns:     Supabase Edge (misma región que la DB)

Generación de contenido:
  ia:           Anthropic Claude API (claude-sonnet-4-6) — pipeline de reactivos
```

### Plataformas y navegadores soportados

| Plataforma | Soporte | Notas |
|---|---|---|
| Chrome ≥ 110 (desktop) | ✅ Principal | Fullscreen API + getUserMedia completo |
| Firefox ≥ 110 (desktop) | ✅ Principal | |
| Edge ≥ 110 (desktop) | ✅ Principal | |
| Safari ≥ 16 (desktop) | ✅ Parcial | Fullscreen API con degradación graciosa |
| Chrome Mobile (Android) | ✅ Estudio/Dashboard | Sin simulador fullscreen; PWA instalable |
| Safari Mobile (iOS) | ✅ Estudio/Dashboard | Sin simulador fullscreen; PWA instalable |
| Facebook in-app browser | ✅ Landing + compra | Redirección a Safari/Chrome para el simulador |
| Internet Explorer | ❌ No soportado | |

> **Posicionamiento honesto del simulador en mobile:** *"El examen real requiere laptop o PC con internet. Estudia desde el celular, pero practica el simulador completo en computadora."*

---

## 11. Requerimientos de diseño

Referencia completa: **Blueprint Técnico v1.0 — Sección 3 (Frontend, Estilos y Animaciones)**.

### Principios de diseño para YaEntre

1. **Dark mode primero.** El modo oscuro es el default (fondo `#09090B`). Light mode disponible como toggle (preferencia del Perfil B / padres).
2. **Mobile-first para el aprendizaje, desktop-first para el simulador.** El flujo de drill y dashboard debe ser cómodo con un pulgar. El simulador se diseña para laptop de 13"+.
3. **Cada acción correcta merece una celebración.** Micro-interacciones en cada logro (streak, ronda perfecta, materia dominada). No saturar — máximo 1 celebración por sesión.
4. **La urgencia es honesta, no manipuladora.** El temporizador del examen y el countdown al día del examen son informativos, no diseñados para crear ansiedad artificial.
5. **Accesible para el contexto mexicano.** Texto suficientemente grande para pantallas pequeñas y baja resolución. Contraste ≥ WCAG AA. Sin dependencia de animaciones para transmitir información crítica.

### Tokens de diseño clave

```css
--brand-primary:  #7C3AED;  /* Electric Violet — identidad */
--color-lime:     #A3E635;  /* Lime — éxito y progreso */
--color-fire:     #F97316;  /* Orange — racha */
--color-danger:   #EF4444;  /* Red — error */
--bg-base:        #09090B;  /* Dark mode background */
--font-display:   'Outfit', sans-serif;
--font-body:      'Inter', sans-serif;
--font-mono:      'JetBrains Mono', monospace;  /* timer, scores */
```

---

## 12. Requerimientos no funcionales

| Categoría | Requerimiento | Meta |
|---|---|---|
| **Performance** | First Contentful Paint (mobile 4G) | ≤ 2.0s |
| **Performance** | Largest Contentful Paint | ≤ 3.5s |
| **Performance** | Lighthouse Score (mobile) | ≥ 85 |
| **Performance** | Tiempo de respuesta API adaptativa | ≤ 800ms (p95) |
| **Disponibilidad** | Uptime SLA | ≥ 99.5% (excluye mantenimientos programados) |
| **Disponibilidad** | Ventana de mantenimiento | Fuera de temporada de exámenes (jul, dic) |
| **Seguridad** | Auth | Supabase RLS en todas las tablas; ninguna tabla expuesta sin política |
| **Seguridad** | Datos de pago | Stripe maneja tarjetas; YaEntre nunca almacena datos de tarjeta |
| **Seguridad** | HTTPS | Forzado en toda la plataforma |
| **Privacidad** | Aviso de privacidad | Requerido por LFPDPPP (México); disponible antes del registro |
| **Accesibilidad** | Contraste de color | WCAG 2.1 nivel AA mínimo |
| **Escalabilidad** | Usuarios concurrentes al lanzamiento | Soporte para ≥ 500 simultáneos sin degradación |
| **PWA** | Instalable en móvil | Manifest.json + Service Worker para caché offline (dashboard y drill básico) |

---

## 13. Dependencias y riesgos

### Dependencias críticas

| Dependencia | Responsable | Fecha límite | Impacto si falla |
|---|---|---|---|
| **Banco de 1,500 reactivos verificados** | Equipo de contenido + pipeline IA | 15 de diciembre 2026 | ❌ No se puede lanzar |
| **Stripe price IDs configurados** (todos los planes) | Dev | 30 de septiembre 2026 (antes del EB) | ❌ No hay Early Bird |
| **Resolución de dominio yaentre.com** | Ángel (propietario) | Antes del 1 de octubre 2026 | 🟠 Retrasa Early Bird |
| **Temario oficial UNAM 2027 publicado** | UNAM | Enero 2027 | 🟡 Ajuste de contenido post-launch |
| **Convocatoria UNAM 2027** | UNAM | Enero-febrero 2027 | — La app depende de esto para el calendar de marketing |

### Registro de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reactivos con errores llegan a producción | Alta | 🔴 Alto | Pipeline de validación automática + `isVerified = true` requerido + botón de reporte de usuario |
| UNAM cambia formato del examen en 2027 | Media | 🔴 Alto | Schema modular: `Exam.totalQuestions` y `Exam.durationMins` son campos editables sin tocar código |
| Fullscreen API falla en Safari/iOS | Alta | 🟠 Medio | Degradación graciosa + aviso "usa laptop para el simulador"; iOS no es el entorno del examen real |
| Baja conversión free → pago | Media | 🔴 Alto | A/B test de CTA: variante "Haz el simulador gratis ahora" vs. "Empieza a estudiar gratis" |
| Latencia alta en Edge Functions (motor adaptativo) | Baja | 🟡 Medio | Deploy en `us-east-1`; cache de `WeakTopics` en cliente con Zustand |
| Competidor (Unitips/Unibetas) lanza simulador similar antes de 2027 | Media | 🟠 Medio | El Entrómetro + dashboard parental son los diferenciadores secundarios difíciles de copiar rápido |
| OXXO payments tienen latencia de confirmación alta | Media | 🟡 Bajo | Stripe maneja el webhook; mostrar pantalla de "Tu pago está pendiente" con estado en tiempo real |
| El usuario usa VPN o extensiones que bloquean getUserMedia | Media | 🟡 Bajo | El permiso de cámara es orientativo, no bloquea el simulador si se rechaza |

---

## 14. Criterios de lanzamiento — Definition of Done

### Go/No-Go para Early Bird (1 octubre 2026)

- [ ] Landing page de YaEntre live en yaentre.com con lista de espera funcional
- [ ] Stripe configurado: Early Bird Price IDs activos con `max_redemptions: 500`
- [ ] Diagnóstico inicial funcional con ≥ 300 reactivos UNAM Área 1
- [ ] Pantalla de resultados del diagnóstico mostrando Entrómetro básico
- [ ] Auth: registro, login, perfil funcionales
- [ ] Compra de Early Bird Pase ($499) funcional con tarjeta y OXXO

### Go/No-Go para Beta Cerrada (1 noviembre 2026)

- [ ] Simulador completo funcional: 120 reactivos, 180 min, fullscreen, sin retroceso
- [ ] ≥ 800 reactivos verificados distribuidos en UNAM Áreas 1-3
- [ ] Dashboard del alumno completo con todos los widgets
- [ ] Resolución por capas (al menos Capas 1-2) en ≥ 80% del banco
- [ ] Reclutamiento de 100 beta testers activos (grupos Telegram/WhatsApp de aspirantes)

### Go/No-Go para Public Launch (6 enero 2027)

- [ ] ≥ 1,500 reactivos verificados (UNAM 4 áreas + IPN 2 ramas mínimo)
- [ ] Dashboard parental funcional y vinculable
- [ ] Gamificación completa (streak, MateriaDominada, PerfectRound)
- [ ] PWA instalable en Android e iOS (manifest + service worker)
- [ ] NPS de beta cerrada ≥ 7.5/10 en al menos 30 respuestas
- [ ] Lighthouse Performance mobile ≥ 85
- [ ] 0 bugs críticos en los 7 días previos al launch
- [ ] Stripe webhooks probados end-to-end: tarjeta, OXXO, SPEI
- [ ] ≥ 200 licencias Early Bird vendidas (validación de demanda pagadora)
- [ ] Aviso de privacidad (LFPDPPP) y Términos de uso publicados
- [ ] Campañas Meta Ads + TikTok Ads configuradas y aprobadas

---

## 15. Glosario

| Término | Definición en el contexto de YaEntre |
|---|---|
| **Reactivo** | Pregunta de opción múltiple (4 opciones, 1 correcta) del banco de preguntas |
| **Acierto** | Respuesta correcta en un examen; la métrica central de evaluación en UNAM e IPN |
| **Entrómetro** | Predicción dinámica del número de aciertos que el alumno obtendría en el examen real, basada en su desempeño histórico en la plataforma |
| **Simulacro** | Sesión de examen en modo `FULL_SIMULATION` con las condiciones del examen real |
| **Drill** | Sesión de práctica abierta por tema, sin tiempo ni restricciones |
| **Racha / Streak** | Número de días calendario consecutivos en que el usuario completó ≥ 1 sesión de ≥ 10 min |
| **WeakTopic** | Tema con `hitRate < 0.60` y ≥ 3 intentos — priorizado por el motor adaptativo |
| **Pase de Temporada** | Plan de licencia con vigencia hasta el día del examen real del ciclo (≈ 5 meses) |
| **Early Bird** | Licencia comprada antes del 30 noviembre 2026 a precio reducido (≤500 disponibles) |
| **ECOEMS** | Sistema de asignación de Media Superior en la ZMVM que sustituyó a COMIPEMS; la UNAM e IPN conservan examen propio dentro del ECOEMS |
| **Perfil A** | Usuario estudiante primario de la plataforma (15-22 años) |
| **Perfil B** | Padre/madre pagador de la suscripción del Perfil A (32-50 años) |
| **Phase 1** | Lanzamiento inicial 100% autogestionable, sin profesores ni clases en vivo |
| **Phase 2** | Expansión post-validación con contenido de video, livestream y profesores |
| **isVerified** | Campo booleano en `Question`; ningún reactivo con `isVerified = false` es visible para usuarios |
| **LTV:CAC** | Relación Lifetime Value / Costo de Adquisición; meta ≥ 3× para YaEntre |

---

*Fin del documento · PRD YaEntre v1.0 · Próxima revisión: 1 de octubre 2026 (post-Early Bird)*
*Documentos de la serie: Estudio de Mercado → Blueprint Técnico → **PRD** → Prompt Master para Claude Code*
