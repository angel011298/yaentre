# Flujo de la App — YaEntre
## Application Flow & User Journeys · v1.0

| Campo | Detalle |
|---|---|
| **Producto** | YaEntre (yaentre.mx) |
| **Documento** | Application Flow Specification |
| **Versión** | 1.0 |
| **Fecha** | 9 de julio de 2026 |
| **Depende de** | PRD v1.0 · TRD v1.0 · UI/UX Spec v1.0 |
| **Decisiones base** | Registro antes del diagnóstico · Muro suave (1 simulacro gratis) · Verificación de email diferida |

---

## Tabla de contenidos

1. Convenciones de notación
2. Mapa de navegación global (sitemap)
3. Modelo de estados del usuario
4. Flujo de autenticación y registro
5. Flujo de onboarding y diagnóstico
6. Loop de engagement diario (core loop)
7. Flujo de práctica (Drill)
8. Flujo del Simulador (con muro suave)
9. Flujo del paywall por feature
10. Flujo de pago (Stripe / OXXO / SPEI)
11. Flujo de vinculación parental
12. Flujo de re-engagement de rechazados
13. Flujos de notificación y correo
14. Máquinas de estado (sesión, suscripción, pago)
15. Manejo de errores y edge cases (alto estándar)
16. Rutas, deep links y guards
17. Instrumentación analítica por paso

---

## 1. Convenciones de notación

```
▢  Pantalla / vista
◆  Punto de decisión (branch)
▶  Acción del usuario
⚙  Proceso del sistema (backend)
✉  Correo / notificación
⛔ Bloqueo / guard
✅ Estado de éxito
⚠  Estado de error / edge case
→  Transición
⤴  Retorno a un flujo anterior
```

---

## 2. Mapa de navegación global (sitemap)

```
PÚBLICO (sin sesión)
├── ▢ Landing (yaentre.mx)                    [light mode]
├── ▢ Precios / Planes
├── ▢ Registro
└── ▢ Login

APP AUTENTICADA — rol STUDENT               [dark mode default]
├── ▢ Onboarding (selección examen/carrera)   ← primera vez
├── ▢ Diagnóstico inicial                      ← primera vez
├── ▢ Resultados del diagnóstico               ← primera vez
├── ▢ Dashboard (home)          ◄──────────┐  ← hub central
│                                            │
├── ▢ Practicar (Drill)                      │
│   ├── ▢ Selección de materia/tema          │
│   ├── ▢ Sesión de Drill                    │
│   └── ▢ Revisión + Resolución por capas ───┘
│
├── ▢ Simulador
│   ├── ▢ Pre-flight (reglas + cámara)
│   ├── ▢ Sesión activa (fullscreen)
│   └── ▢ Resultados del simulacro
│
├── ▢ Progreso (analytics del alumno)
├── ▢ Perfil / Ajustes
│   ├── ▢ Cuenta (verificar email, tema)
│   ├── ▢ Suscripción / plan
│   └── ▢ Vincular tutor (generar código)
│
└── ▢ Planes / Paywall           ← modal o pantalla, invocable desde cualquier gate

APP AUTENTICADA — rol PARENT                 [light mode default]
├── ▢ Vincular alumno (ingresar código)       ← primera vez
└── ▢ Panel parental (solo lectura)

APP AUTENTICADA — rol ADMIN
├── ▢ Cola de revisión de reactivos
├── ▢ Generación de contenido
└── ▢ Dashboard de cobertura
```

---

## 3. Modelo de estados del usuario

Todo usuario existe en exactamente uno de estos estados. El estado determina qué puede hacer y qué guards aplican.

| Estado | Descripción | Puede hacer | No puede |
|---|---|---|---|
| `ANON` | Sin sesión | Ver landing, precios; registrarse/login | Nada dentro de la app |
| `REGISTERED_UNVERIFIED` | Registrado, email sin verificar | **Todo lo de FREE** + banner de verificación | Comprar un plan (⛔ gate de pago) |
| `FREE` | Verificado, sin plan de pago | Diagnóstico, Drill limitado, **1 simulacro completo**, dashboard básico | Simulacros ilimitados, capas 2-4, panel parental |
| `PAID` | Plan activo (Mensual/Pase/Premium) | Todo el producto | — |
| `PAID_EXPIRED` | Plan venció (post-examen) | Vista de solo lectura de su progreso; re-suscribir | Nuevas sesiones de pago |
| `PARENT` | Cuenta de tutor vinculada | Panel parental de solo lectura | Estudiar, ver reactivos |
| `ADMIN` | Staff | Panel de administración | — |

> **Decisión de diseño (verificación diferida):** `REGISTERED_UNVERIFIED` tiene acceso completo a las features gratuitas para no matar la activación. El único guard es **no permitir comprar** hasta verificar el correo — protege contra fraude de pago y asegura un canal de contacto válido antes de cobrar.

---

## 4. Flujo de autenticación y registro

### 4.1 Flujo feliz de registro

```
▢ Landing
  ▶ clic "Empieza gratis"
  → ▢ Registro
      ├── campo: correo
      ├── campo: contraseña
      └── ▶ "Crear cuenta"
          ⚙ Supabase Auth crea usuario (email_confirmed = false)
          ⚙ Crea UserProfile (role=STUDENT, onboardingStep=0)
          ✉ Envía correo de verificación (no bloqueante)
          → ✅ Sesión iniciada inmediatamente (estado REGISTERED_UNVERIFIED)
          → ▢ Onboarding  (§5)
```

### 4.2 Variantes y edge cases de auth

| Caso | Comportamiento |
|---|---|
| Correo ya registrado | ⚠ "Ya existe una cuenta con este correo. ¿Iniciar sesión?" → link a login |
| Contraseña débil | ⚠ Validación inline: mínimo 8 caracteres |
| Login con credenciales incorrectas | ⚠ "Correo o contraseña incorrectos" (sin revelar cuál) |
| Olvidó contraseña | ▶ "¿Olvidaste tu contraseña?" → ✉ magic link de reseteo |
| Banner de verificación | Persistente en `REGISTERED_UNVERIFIED`: "Verifica tu correo para desbloquear la compra de planes. [Reenviar]" |
| Clic en link de verificación | ⚙ `email_confirmed = true` → estado pasa a FREE → banner desaparece |
| Usuario intenta comprar sin verificar | ⛔ Modal: "Verifica tu correo antes de comprar. Te reenviamos el enlace." |
| Sesión expirada (JWT) | Redirect silencioso a login, preservando la ruta destino (deep link) |

---

## 5. Flujo de onboarding y diagnóstico

Primera experiencia dentro de la cuenta. Objetivo: que el usuario salga con un `LearningProfile` y su primer Entrómetro en ≤ 50 minutos.

```
▢ Onboarding — Paso 1: ¿Qué examen vas a presentar?
   ◆ selección
     ├── UNAM Superior
     ├── IPN Superior
     ├── UAM Superior            [si ENABLE_UAM]
     ├── EXANI II                [si ENABLE_EXANI]
     └── Media Superior (UNAM/IPN) [si ENABLE_MEDIA_SUPERIOR]
   → ▢ Paso 2: ¿Qué área / rama?
       (se filtra según examen; UNAM=4 áreas, IPN=3 ramas)
   → ▢ Paso 3: ¿Qué carrera es tu meta?
       ⚙ guarda targetExam + targetCareer en UserProfile
       ⚙ muestra aciertos mínimos históricos de esa carrera (ancla emocional)
   → ▢ Paso 4: Presentación de Tino + explicación del diagnóstico
       [🦉 "Voy a hacerte 30 preguntas para saber en qué estás fuerte
            y en qué te ayudo. No te preocupes por fallar — justo para
            eso es."]
   → ▶ "Empezar diagnóstico"
       ⚙ genera sesión DIAGNOSTIC (30 reactivos, distribuidos por peso de materia)
   → ▢ Diagnóstico (30 reactivos, 45 min, permite regresar)
       [caso límite: puede posponerse 1 vez → va a dashboard con estado "diagnóstico pendiente"]
   → ⚙ al finalizar: computa WeakTopics + predictedScore inicial
   → ▢ Resultados del diagnóstico
       ├── Entrómetro inicial (animado)
       ├── comparación vs meta de carrera
       ├── top 3 temas a reforzar
       └── [🦉 Tino recomienda por dónde empezar]
   → ▶ "Ir a mi tablero"
   → ▢ Dashboard  ✅ onboarding completo (onboardingStep = DONE)
```

### Edge cases del onboarding

| Caso | Comportamiento |
|---|---|
| Abandona a mitad del onboarding | Al volver, retoma en el `onboardingStep` guardado |
| Pospone el diagnóstico | Dashboard muestra card destacada "Completa tu diagnóstico" hasta que lo haga |
| Cambia de carrera después | Ajustes → cambiar meta → Entrómetro se recalcula contra la nueva meta |
| Examen no disponible (feature flag off) | No aparece en la lista; si llega por deep link, mensaje "Disponible próximamente" |
| Cierra la app durante el diagnóstico | La sesión queda abierta; al volver ofrece "Continuar diagnóstico" |

---

## 6. Loop de engagement diario (core loop)

El ciclo que buscamos que el alumno repita cada día durante su preparación.

```
        ┌─────────────────────────────────────────┐
        │                                           │
        ▼                                           │
   ▢ Dashboard                                      │
     ├── ve Entrómetro + racha + días al examen   │
     ├── [🦉 Tino sugiere el foco del día]          │
     │                                              │
     ├──▶ "Reforzar Química" (tema débil)           │
     │    → ▢ Drill (§7) ──────────┐                │
     │                             │                │
     ├──▶ "Hacer simulacro"        │                │
     │    → ▢ Simulador (§8) ──┐   │                │
     │                         │   │                │
     ▼                         ▼   ▼                │
   ⚙ Sistema actualiza:                             │
     - WeakTopics (hitRate)                          │
     - StreakRecord (+1 si primer sesión del día)    │
     - LearningProfile.predictedScore                │
     - dispara celebraciones si aplica ──────────────┘
        │
        ├── 🔥 racha extendida → StreakFlame
        ├── ⭐ ronda perfecta → PerfectRoundReveal
        └── 🎓 materia dominada → MateriaDominadaModal
```

**Reglas del loop:**
- La racha (`StreakRecord`) se incrementa con la **primera sesión de ≥ 10 min** del día calendario (huso UTC-6).
- Las celebraciones se muestran **al terminar la sesión**, nunca durante.
- Máximo **1 celebración grande** por sesión (prioridad: materia dominada > ronda perfecta > racha).

---

## 7. Flujo de práctica (Drill)

```
▢ Dashboard / Practicar
  ▶ elige materia o "reforzar débiles"
  → ⚙ selectAdaptiveQuestions() → 60% débiles / 25% medios / 15% dominados
  → ▢ Sesión de Drill (sin límite de tiempo)
      ┌── por cada reactivo ──────────────────────┐
      │ ▢ QuestionCard (enunciado + A/B/C/D)       │
      │ ▶ selecciona opción                        │
      │ ⚙ submitAnswer() → correctitud server-side │
      │ ◆ ¿correcto?                               │
      │   ├── ✅ "¡Correcto!" + [Ver explicación]  │
      │   └── ⚠ "Incorrecto" + respuesta correcta  │
      │         + [Ver explicación] (recomendado)  │
      │ ▶ "Siguiente"                              │
      └───────────────────────────────────────────┘
  → ▢ Resumen de la sesión (aciertos, tiempo, temas)
  → ⚙ actualiza WeakTopics + racha + predicción
  → ⤴ Dashboard (con celebraciones si aplica)
```

### Resolución por capas (dentro del Drill)

```
▶ "Ver explicación"
→ ▢ ExplanationAccordion
   ▼ Capa 1 (siempre visible)          [FREE: hasta aquí]
   ▷ Capa 2 — Paso a paso              [⛔ gate suave si FREE]
   ▷ Capa 3 — Concepto base            [⛔ gate suave si FREE]
   ▷ Capa 4 — Practica 3 similares →   [⛔ gate suave si FREE]
   ◆ si FREE toca Capa 2+ → §9 paywall (muro suave)
```

---

## 8. Flujo del Simulador (con muro suave)

Este flujo integra la decisión clave: **el usuario FREE puede hacer 1 simulacro completo gratis**; el segundo activa el paywall.

```
▢ Simulador (entrada)
  ⚙ guard: ¿cuántos simulacros completos ha hecho este usuario FREE?
  ◆ estado del usuario
    ├── PAID → acceso directo
    ├── FREE, 0 simulacros usados → ✅ acceso (es el gratis)
    │      [🦉 "Este primer simulacro completo va por mi cuenta.
    │           Vívelo como el examen real."]
    └── FREE, ya usó su gratis → ⛔ §9 paywall (muro suave)
  → ▢ Pre-flight check
      ├── explica reglas (no pausar, no regresar, fullscreen)
      ├── solicita permiso de cámara (orientativo, no bloquea)
      ├── ⚠ si mobile → aviso "El examen real requiere laptop.
      │      Puedes practicar, pero te recomendamos computadora."
      └── ▶ "Iniciar examen"
  → ⚙ activa Fullscreen API
      ◆ ¿fullscreen concedido?
        ├── sí → inicia timer + sesión
        └── ⚠ no (Safari/iOS o rechazo) → degradación graciosa:
               continúa sin fullscreen + aviso "Modo honestidad:
               el examen real es en pantalla completa"
  → ▢ Sesión activa (FULL_SIMULATION)
      ┌── por cada reactivo (una a la vez, sin regreso) ──┐
      │ ▶ selecciona opción → ⚙ guarda (sin revelar        │
      │   correctitud)                                     │
      │ ▶ "Siguiente" (no hay "Anterior")                  │
      │ ⚙ event listeners: visibilitychange, contextmenu,  │
      │   keydown → registran suspicionEvents              │
      │ ⚠ si sale de fullscreen → toast sobrio + registro  │
      └────────────────────────────────────────────────────┘
      ◆ fin por: última pregunta O tiempo agotado
  → ⚙ finishSession() → score server-side + valida tiempo real
  → ▢ Resultados del simulacro
      ├── PerfectRoundReveal si ≥ 90%
      ├── desglose por área/materia
      ├── tiempo promedio por pregunta
      ├── Entrómetro actualizado
      ├── percentil vs otros usuarios del mismo ciclo
      └── ▶ "Ver preguntas falladas" → resolución por capas
  → ⤴ Dashboard
```

### Edge cases del simulador (alto estándar)

| Caso | Comportamiento |
|---|---|
| Cierra el navegador a media sesión | `beforeunload` → `sendBeacon` guarda respuestas; al volver, ofrece "Retomar" con el tiempo transcurrido real descontado |
| Se va la conexión a media sesión | Respuestas se encolan localmente (Zustand); reintento al reconectar; el timer sigue local |
| Manipula el timer del cliente (DevTools) | Al finalizar, el servidor recalcula `elapsed` contra `startedAt` real; si excede, marca `TIME_EXCEEDED` en suspicionEvents |
| Intenta reabrir un simulacro finalizado | ⛔ "Este simulacro ya terminó. Empieza uno nuevo." |
| Cámara denegada | Continúa (es orientativa); registra el hecho sin bloquear |
| Batería/pantalla se apaga | Al volver: sesión sigue abierta si dentro del `timeLimit`; si expiró, autoguarda y va a resultados |
| Usuario FREE agotó su simulacro pero quiere "revisar" el anterior | ✅ Puede ver resultados y explicaciones del que ya hizo (no consume otro) |

---

## 9. Flujo del paywall por feature (muro suave)

> **Decisión:** muro suave. El usuario prueba el valor una vez y el paywall llega en el momento de máxima intención. El patrón se afina por feature.

### 9.1 Matriz de gates

| Feature | Límite FREE | Al chocar el muro |
|---|---|---|
| Simulacro completo (120/140) | **1 completo** | Paywall: "Ya viviste tu primer simulacro. Desbloquea los ilimitados." |
| Drill (reactivos) | 10 reactivos/día | Metered: "Llegaste a tu práctica de hoy. Vuelve mañana o desbloquea ilimitado." |
| Resolución por capas | Solo Capa 1 | Paywall: "Desbloquea el paso a paso y el concepto base." |
| Dashboard parental | ❌ (requiere Pase+) | Paywall en el flujo de vinculación |
| Entrómetro | ❌ (solo tras 1er simulacro) | Se muestra bloqueado con "Desbloquéalo con tu plan" |

### 9.2 Flujo del muro suave

```
▶ usuario FREE toca una feature de pago (2ª vez / Capa 2 / etc.)
→ ◆ ¿email verificado?
    ├── no → ⛔ "Verifica tu correo antes de comprar" → §4.2
    └── sí → ▢ Paywall (modal o pantalla)
        ├── contexto específico de la feature (copy dinámico)
        ├── comparativa de planes (Mensual / Pase ⭐ / Premium)
        ├── precio según temporada (Early Bird / Alta / Último Minuto)
        ├── [🦉 Tino: "Desbloquea todo y llegamos juntos al examen"]
        └── ◆ decisión
            ├── ▶ elige plan → §10 (pago)
            └── ▶ "Ahora no" → ⤴ regresa a donde estaba (sin castigo)
```

**Principio:** el muro nunca es agresivo ni bloquea el retorno. "Ahora no" siempre devuelve al usuario a su contexto. El objetivo es convertir por valor demostrado, no por frustración.

---

## 10. Flujo de pago (Stripe / OXXO / SPEI)

```
▢ Paywall → ▶ elige plan
→ ⚙ crea Stripe Checkout Session (con Price ID por plan+temporada)
→ ▢ Stripe Checkout (hospedado por Stripe)
    ◆ método de pago
      ├── Tarjeta → confirmación inmediata
      ├── OXXO → genera voucher (pago en tienda, ≤ 3h)
      └── SPEI → genera CLABE (transferencia, ≤ 24h)
→ ◆ resultado del checkout
    ├── ✅ tarjeta aprobada
    │    ⚙ Stripe webhook: checkout.session.completed
    │    ⚙ activatePlanForUser() → estado PAID
    │    → ▢ Pantalla de éxito + [🦉 Tino celebra]
    │    → ⤴ regresa a la feature que desbloqueó
    │
    ├── ⏳ OXXO/SPEI pendiente
    │    → ▢ "Tu pago está pendiente"
    │        ├── muestra voucher/CLABE + instrucciones
    │        ├── estado en vivo: "Esperando confirmación"
    │        └── ✉ correo con el voucher
    │    ... (usuario paga en tienda/banco) ...
    │    ⚙ webhook: async_payment_succeeded
    │    ⚙ activatePlanForUser() → estado PAID
    │    ✉ "¡Tu pago se confirmó! Ya tienes acceso completo"
    │
    └── ⚠ pago fallido / cancelado
         ├── tarjeta rechazada → "El pago no se completó. Intenta otro método"
         ├── async_payment_failed (OXXO no pagado a tiempo) → "Tu voucher venció"
         └── ▶ "Reintentar" → vuelve a §10
```

### Reglas críticas de pago (del TRD)

- ✅ El acceso se activa **solo desde el webhook**, nunca desde el redirect de éxito del cliente.
- ✅ Idempotencia: el webhook verifica si el pago ya se procesó antes de activar.
- ✅ Early Bird: `max_redemptions: 500` en el Price ID; al agotarse, el plan cae a precio regular.
- ✅ Vigencia del Pase: `expiresAt = fecha del examen objetivo` (controlada en app, no en Stripe).

### Edge cases de pago

| Caso | Comportamiento |
|---|---|
| Usuario cierra el navegador tras pagar OXXO | El webhook activa igual; ✉ correo confirma; al volver ya tiene acceso |
| Doble clic / doble compra | Idempotencia por `session.id`; no cobra dos veces |
| Paga después de que su examen ya pasó | Edge raro; se honra el pago pero se le ofrece cambiar de ciclo |
| Webhook llega antes que el redirect | El usuario ve "éxito" porque su estado ya es PAID al volver |
| Reembolso (Premium, no ingresó) | Flujo manual de soporte; marca `refunded` y estado PAID_EXPIRED |

---

## 11. Flujo de vinculación parental

```
LADO ALUMNO
▢ Perfil → "Vincular a mi tutor"
  ▶ "Generar código"
  ⚙ genera código de 6 dígitos (TTL 10 min) atado a su UserProfile
  → ▢ muestra código + "Compártelo con tu mamá/papá"

LADO TUTOR
▢ Landing → ▶ "Soy tutor / Ver el progreso de mi hijo"
  → ▢ Registro de tutor (correo + contraseña, role=PARENT)
  → ▢ "Ingresa el código de tu hijo"
     ▶ escribe los 6 dígitos
     ⚙ valida código (vigente + correcto)
     ◆ ¿válido?
       ├── sí → ⚙ vincula parentLinkedId → ▢ Panel parental [light]
       └── ⚠ expirado/incorrecto → "Código inválido. Pide uno nuevo."
```

### Consideraciones parentales

| Aspecto | Comportamiento |
|---|---|
| El panel parental requiere que el alumno tenga plan Pase+ | Si el alumno es FREE, el panel muestra un preview + "Pídele a tu tutor desbloquear el plan Pase" |
| Un tutor con varios hijos | Puede vincular varios códigos → selector de alumno en el panel |
| Privacidad | El tutor ve métricas de actividad y progreso, **nunca** los reactivos ni respuestas específicas |
| Resumen semanal | ✉ correo automático los lunes (si el tutor lo activó) |
| Alerta de inactividad | Si el alumno lleva 3+ días sin estudiar → badge en el panel |

---

## 12. Flujo de re-engagement de rechazados

Activado en julio (resultados de admisión). Convierte el ~90% de rechazo en re-suscripción.

```
CONTEXTO: julio 2027, salen resultados UNAM/IPN
⚙ segmentación: usuarios cuyo examen ya pasó y siguen activos/registrados
✉ Campaña "Esta vez sí" (email + retargeting Meta/TikTok)
   → ▢ Landing de re-engagement
       ├── mensaje empático (no de derrota): "El 90% no queda a la primera.
       │    Los que lo logran a la segunda tienen algo en común: no pararon."
       ├── oferta especial de re-suscripción
       └── ▶ "Prepararme para la siguiente convocatoria"
   → ⚙ re-activa cuenta, conserva su LearningProfile histórico
   → ▢ Dashboard con nueva meta (siguiente convocatoria)
       [🦉 "Ya sabes cómo es el examen. Ahora vamos por el lugar."]
```

> **Ventaja de retención:** el `LearningProfile` histórico del usuario se conserva, así que su segunda preparación arranca sabiendo exactamente dónde falló. Es un motivo tangible para volver a YaEntre en vez de empezar de cero en otro lado.

---

## 13. Flujos de notificación y correo

| Evento | Canal | Contenido |
|---|---|---|
| Registro | ✉ Email | Verificación de correo |
| Verificación completada | In-app | Banner desaparece + toast de bienvenida |
| Pago con tarjeta exitoso | ✉ Email + in-app | Recibo + acceso activado |
| OXXO/SPEI pendiente | ✉ Email | Voucher/CLABE + instrucciones |
| OXXO/SPEI confirmado | ✉ Email + in-app | Acceso desbloqueado |
| Racha en riesgo (fin del día sin actividad) | ✉ Email (opt-in) | "Tu racha de N días está en riesgo 🔥" |
| Resumen semanal parental | ✉ Email | Progreso del alumno (lunes) |
| Milestone de racha (7/14/30) | In-app | Celebración StreakFlame |
| Días clave al examen (30/15/7/1) | ✉ Email + in-app | Recordatorio + motivación |
| Re-engagement post-resultados | ✉ Email + ads | Campaña "Esta vez sí" |

> **Regla anti-spam:** las notificaciones motivacionales son opt-in y con frecuencia limitada. Los correos transaccionales (pago, verificación) siempre se envían. Respetar preferencias del usuario en Ajustes.

---

## 14. Máquinas de estado

### 14.1 ExamSession

```
        startSession()
   [NONE] ──────────────▶ [IN_PROGRESS]
                              │
              ┌───────────────┼────────────────┐
              │ finishSession │ timeout        │ abandon
              ▼               ▼                │ (>24h abierta)
         [COMPLETED]     [COMPLETED           ▼
                          _BY_TIMEOUT]   [ABANDONED]
                              │                │
                              ▼                ▼
                        ⚙ score + updateProfile   (no cuenta para stats)
```

| Estado | Descripción |
|---|---|
| `IN_PROGRESS` | Sesión abierta; respuestas guardándose |
| `COMPLETED` | Finalizada por el usuario |
| `COMPLETED_BY_TIMEOUT` | Tiempo agotado; autoguardado |
| `ABANDONED` | Abierta > 24h sin actividad; se cierra sin afectar stats |

### 14.2 Subscription

```
   [NONE] ──purchase──▶ [PENDING] ──webhook success──▶ [ACTIVE]
                            │                             │
                     webhook fail                   expiresAt reached
                            ▼                             ▼
                        [FAILED]                    [EXPIRED]
                                                          │
                                                    re-subscribe
                                                          ▼
                                                      [ACTIVE]
```

| Estado | Acceso |
|---|---|
| `PENDING` | Sin acceso pago (OXXO/SPEI aún no confirma) |
| `ACTIVE` | Acceso completo |
| `FAILED` | Sin acceso; puede reintentar |
| `EXPIRED` | Solo lectura de progreso; puede re-suscribir |

### 14.3 Usuario (resumen)

```
ANON → REGISTERED_UNVERIFIED → FREE → PAID → PAID_EXPIRED → (PAID otra vez)
                                  ▲                              │
                                  └──────────────────────────────┘
```

---

## 15. Manejo de errores y edge cases (alto estándar)

### 15.1 Tabla maestra de edge cases

| Categoría | Caso | Manejo |
|---|---|---|
| **Red** | Sin conexión en dashboard | PWA sirve shell cacheado + banner "Sin conexión" |
| **Red** | Se cae la red en Drill | Encola respuestas; sincroniza al reconectar |
| **Red** | Se cae la red en Simulador | Timer sigue local; respuestas en cola; valida al finalizar |
| **Auth** | JWT expira a media sesión | Refresh silencioso; si falla, guarda estado y pide re-login |
| **Auth** | Cuenta en 2 dispositivos | Permitido; última escritura gana (last-write-wins) |
| **Pago** | Webhook nunca llega | Job de reconciliación consulta Stripe; alerta a soporte |
| **Pago** | Usuario paga 2 veces | Idempotencia; segundo pago se reembolsa automáticamente |
| **Simulador** | Fullscreen falla (iOS) | Degradación graciosa + aviso |
| **Simulador** | Cierra a media sesión | Autoguardado; opción de retomar con tiempo real |
| **Contenido** | Reactivo con error reportado | Botón "Reportar"; ≥3 reportes → revisión admin; se puede ocultar |
| **Contenido** | Feature flag off (UAM/EXANI) | No aparece; deep link muestra "Próximamente" |
| **Datos** | Diagnóstico sin completar | Dashboard degradado; card "Completa tu diagnóstico" |
| **Datos** | Entrómetro sin datos suficientes | Muestra "Haz tu diagnóstico para ver tu predicción" |
| **Parental** | Código expirado | "Pide un código nuevo a tu hijo" |
| **Límite** | FREE agota simulacro y drill diario | Paywall suave + "Vuelve mañana" (nunca bloqueo total del producto) |

### 15.2 Principios de manejo de errores (UX)

- Los errores **explican qué pasó y cómo seguir**, en la voz de la interfaz (no de una persona, no disculpándose en exceso).
- Un estado vacío es **una invitación a actuar**, siempre con Tino y un CTA.
- Nunca se pierde el progreso del usuario sin un intento de autoguardado.
- El usuario nunca queda "atrapado": siempre hay una salida o un retorno.

---

## 16. Rutas, deep links y guards

### 16.1 Mapa de rutas

```
/                          → Landing              [público]
/precios                   → Planes               [público]
/registro                  → Registro             [público]
/login                     → Login                [público]
/onboarding                → Onboarding           [auth, onboarding incompleto]
/diagnostico               → Diagnóstico          [auth]
/app                       → Dashboard            [auth, onboarding completo]
/app/practicar             → Drill                [auth]
/app/simulador             → Simulador            [auth, guard de muro suave]
/app/progreso              → Analytics            [auth]
/app/perfil                → Perfil/Ajustes       [auth]
/app/planes                → Paywall              [auth]
/checkout                  → Stripe Checkout      [auth, email verificado]
/tutor                     → Registro/panel tutor [auth role=PARENT]
/admin                     → Panel admin          [auth role=ADMIN]
```

### 16.2 Guards (middleware)

| Guard | Regla |
|---|---|
| `requireAuth` | Sin sesión → redirect a `/login?next=<ruta>` |
| `requireOnboarding` | Onboarding incompleto → redirect a `/onboarding` |
| `requireVerifiedForPurchase` | `/checkout` sin email verificado → modal de verificación |
| `softWallSimulator` | FREE con simulacro agotado → `/app/planes` |
| `requireRole` | Rol incorrecto → 403 / redirect al home de su rol |

---

## 17. Instrumentación analítica por paso

Eventos clave para medir el funnel y la North Star Metric (simulacros completos en los 30 días previos al examen).

```
Funnel de activación:
  landing_view → signup_started → signup_completed
  → onboarding_step_completed (×4) → diagnostic_started
  → diagnostic_completed → dashboard_first_view

Funnel de valor:
  drill_started → drill_completed
  simulation_started → simulation_completed [★ North Star]
  explanation_layer_opened (layer)

Funnel de conversión:
  paywall_shown (feature, season) → plan_selected (plan)
  → checkout_started → payment_method_chosen (card/oxxo/spei)
  → purchase_completed (plan, price)  |  purchase_failed (reason)

Retención / gamificación:
  streak_milestone (days) → materia_dominada (subject)
  → entrometro_increased (delta)

Parental:
  parent_code_generated → parent_registered → parent_linked
  → parent_weekly_digest_opened
```

Cada evento alimenta el análisis de dónde cae el funnel y qué features correlacionan con conversión y retención.

---

*Fin del documento · Flujo de la App YaEntre v1.0*
*Serie: Estudio → Blueprint → PRD → TRD → UI/UX → **Flujo de App** → Backend Schema → Plan de Implementación*
