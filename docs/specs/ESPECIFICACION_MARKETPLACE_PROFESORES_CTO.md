# Especificación técnica — Marketplace de profesores (Premium)

> **De:** CLO/CFO/CMO (sesión legal-financiera)
> **Para:** CTO (sesión de desarrollo)
> **Fecha:** 22 de septiembre de 2026
> **Depende de:** precios confirmados ($999 Básico, $1,799 Premium), Carril B default confirmado

---

## 1. Resumen ejecutivo

El marketplace conecta alumnos Premium con profesores independientes para clases en vivo. YaEntre actúa como **comisionista** (arts. 273-308 Cód. Comercio) — NO es patrón. El profesor es el **comitente** que presta el servicio directamente al alumno.

**Decisiones cerradas que rigen esta spec:**
- Carril B (asimilados a salarios) como **default**; Carril A (profesor factura) como excepción
- Motor de pagos: **SPEI semiautomático** (no Stripe Connect)
- Comisión YaEntre: **25%** del valor de la clase
- Niveles del profesor: **por mérito automático** (no autoseleccionados en onboarding)
- Premium = **abre acceso** al directorio; las clases se cobran **aparte**

---

## 2. Modelo de datos

### 2.1 Schema de Prisma (tablas nuevas)

```prisma
// ============================================================
// MARKETPLACE DE PROFESORES — agregar a prisma/schema.prisma
// ============================================================

model Teacher {
  id              String   @id @default(cuid())
  userId          String   @unique  // Relación con User existente
  
  // Datos de onboarding
  fullName        String
  rfc             String?           // Opcional — requerido solo para Carril A
  curp            String
  clabe           String            // Para pago SPEI
  bankName        String
  phone           String
  
  // Carril de pago
  paymentRail     TeacherPaymentRail @default(ASIMILADOS)  // B = default
  csfDocumentUrl  String?           // Constancia de Situación Fiscal (solo Carril A)
  
  // Nivel (automático por mérito)
  level           TeacherLevel @default(INICIAL)
  levelPromotedAt DateTime?
  
  // Estado
  status          TeacherStatus @default(PENDING_REVIEW)
  onboardedAt     DateTime?
  suspendedAt     DateTime?
  suspendReason   String?
  
  // Contrato
  contractAcceptedAt DateTime?      // Timestamp del contrato de adhesión
  contractVersion    String?        // Versión del texto aceptado
  ndaAcceptedAt      DateTime?
  
  // Materias
  subjects        TeacherSubject[]
  
  // Métricas de rendimiento (para nivel automático)
  totalClassesGiven   Int     @default(0)
  averageRating       Float   @default(0)
  cancellationRate    Float   @default(0)  // Porcentaje 0-100
  monthsActive        Int     @default(0)
  
  // Relaciones
  user            User     @relation(fields: [userId], references: [id])
  classes         ClassSession[]
  payouts         TeacherPayout[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([status])
  @@index([level])
  @@index([paymentRail])
}

model TeacherSubject {
  id          String   @id @default(cuid())
  teacherId   String
  subjectKey  String   // Clave de materia (ej: "matematicas", "fisica")
  baseRate    Int      // Tarifa base de la materia en centavos (ej: 28000 = $280)
  
  teacher     Teacher  @relation(fields: [teacherId], references: [id])
  
  @@unique([teacherId, subjectKey])
  @@index([subjectKey])
}

model ClassSession {
  id              String   @id @default(cuid())
  teacherId       String
  studentUserId   String
  
  // Detalle de la clase
  subjectKey      String
  scheduledAt     DateTime
  durationMinutes Int      // 50 o 80
  
  // Tarifa calculada
  baseTariffCents     Int    // Tarifa base en centavos
  levelMultiplier     Float  // N_profesor al momento de reservar
  durationMultiplier  Float  // D_duración
  advanceMultiplier   Float  // A_anticipación
  scheduleMultiplier  Float  // H_horario
  demandMultiplier    Float  // Q_demanda
  finalTariffCents    Int    // Tarifa final (con tope 1.5×)
  
  // Comisión y pago
  commissionCents     Int    // 25% del finalTariffCents
  teacherPayCents     Int    // 75% del finalTariffCents
  
  // Pago del alumno
  stripePaymentId     String?   // ID del PaymentIntent de Stripe
  paidAt              DateTime?
  
  // Estado de la clase
  status              ClassStatus @default(BOOKED)
  completedAt         DateTime?
  cancelledAt         DateTime?
  cancelledBy         CancelledBy?
  cancellationReason  String?
  
  // Calificación
  studentRating       Int?    // 1-5
  studentFeedback     String?
  ratedAt             DateTime?
  
  // Enlace de la clase
  meetingUrl          String?   // Google Meet URL
  recordingUrl        String?   // URL de la grabación en Storage
  recordingExpiresAt  DateTime? // Retención de grabación
  
  // Relaciones
  teacher     Teacher  @relation(fields: [teacherId], references: [id])
  payout      TeacherPayout? @relation(fields: [payoutId], references: [id])
  payoutId    String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([teacherId])
  @@index([studentUserId])
  @@index([status])
  @@index([scheduledAt])
  @@index([payoutId])
}

model TeacherPayout {
  id              String   @id @default(cuid())
  teacherId       String
  
  // Periodo
  periodStart     DateTime
  periodEnd       DateTime
  
  // Montos
  grossCents      Int      // Total antes de retenciones
  retentionCents  Int      // Reserva de desempeño (15%)
  netCents        Int      // Monto a transferir
  
  // Estado
  status          PayoutStatus @default(PENDING)
  approvedAt      DateTime?
  approvedBy      String?     // userId del admin que aprobó
  transferredAt   DateTime?
  speiReference   String?     // Clave de rastreo SPEI
  failedAt        DateTime?
  failReason      String?
  
  // Clases incluidas
  classes         ClassSession[]
  
  // Reserva de desempeño
  retentionReleasedAt DateTime?  // Se libera 30 días después si no hay incidencias
  retentionStatus     RetentionStatus @default(HELD)
  
  teacher     Teacher  @relation(fields: [teacherId], references: [id])
  
  createdAt   DateTime @default(now())
  
  @@index([teacherId])
  @@index([status])
  @@index([periodEnd])
}

// --- ENUMS ---

enum TeacherPaymentRail {
  ASIMILADOS        // Carril B (default) — YaEntre emite CFDI de nómina
  COMISION_MERCANTIL // Carril A (excepción) — profesor factura
}

enum TeacherLevel {
  INICIAL      // ×1.00 — automático al onboarding
  VERIFICADO   // ×1.15 — ≥15 clases + ≥4.2★ + ≤10% cancelaciones
  DESTACADO    // ×1.30 — ≥50 clases + ≥4.5★ + ≤5% cancelaciones + ≥3 meses
}

enum TeacherStatus {
  PENDING_REVIEW  // Onboarding completado, pendiente de revisión admin
  ACTIVE          // Aprobado, visible en directorio
  SUSPENDED       // Suspendido (fraude, incidencias)
  INACTIVE        // Voluntariamente inactivo
}

enum ClassStatus {
  BOOKED          // Reservada y pagada por el alumno
  CONFIRMED       // Profesor confirmó asistencia (24h antes)
  IN_PROGRESS     // Clase en curso
  COMPLETED       // Clase impartida
  CANCELLED       // Cancelada
  NO_SHOW_TEACHER // Profesor no se presentó
  NO_SHOW_STUDENT // Alumno no se presentó
  DISPUTED        // En disputa
}

enum CancelledBy {
  STUDENT
  TEACHER
  SYSTEM   // Cancelación automática (ej: no-show)
}

enum PayoutStatus {
  PENDING       // Calculado, pendiente de aprobación admin
  APPROVED      // Aprobado, listo para transferir
  TRANSFERRED   // SPEI enviado
  FAILED        // Transferencia fallida
  CANCELLED     // Cancelado (fraude, etc.)
}

enum RetentionStatus {
  HELD          // Retenido (30 días)
  RELEASED      // Liberado automáticamente
  FORFEITED     // Confiscado (incidencia grave)
}
```

---

## 3. Flujo de onboarding del profesor

### 3.1 Proceso paso a paso

```
1. CAPTACIÓN (fuera de plataforma)
   └─ Marketing orgánico / comisionistas / voz a voz
   └─ Landing: yaentre.com/profesores
   
2. REGISTRO
   ├─ Crear cuenta normal (si no tiene)
   └─ Solicitar convertirse en profesor → formulario de onboarding

3. FORMULARIO DE ONBOARDING
   ├─ Datos personales: nombre completo, CURP, teléfono
   ├─ Datos de pago: CLABE interbancaria + nombre del banco
   ├─ RFC: OPCIONAL (pregunta: "¿Puedes emitir facturas?")
   │   ├─ SÍ → pedir RFC + subir CSF → marcar Carril A
   │   └─ NO / no responde → Carril B (asimilados, default)
   ├─ Materias: seleccionar 1+ materias del catálogo
   │   └─ Cada materia muestra su rango de tarifa ("Matemáticas: $280–$420/clase")
   ├─ Disponibilidad semanal: selector de bloques horarios
   └─ Aceptaciones digitales (con timestamp):
       ├─ Contrato de comisión mercantil (adhesión)
       ├─ NDA (confidencialidad de contenidos y datos)
       └─ Política de grabación de clases

4. REVISIÓN ADMIN
   ├─ Verificar CURP (formato válido)
   ├─ Verificar CLABE (18 dígitos, banco válido)
   ├─ Si Carril A: verificar RFC + CSF vigente
   └─ Aprobar → status = ACTIVE, nivel = INICIAL

5. ACTIVACIÓN
   ├─ Profesor aparece en el directorio (solo visible para Premium)
   ├─ Notificación: "¡Bienvenido al directorio de YaEntre!"
   └─ Badge de nivel INICIAL visible en perfil
```

### 3.2 Regla de RFC en onboarding

```typescript
// src/lib/teachers/onboarding.ts

export function determinePaymentRail(
  canInvoice: boolean,  // Respuesta del profesor: "¿Puedes emitir facturas?"
  rfc?: string,
  csfUrl?: string,
): TeacherPaymentRail {
  // Carril A solo si:
  // 1. Dice que SÍ puede facturar
  // 2. Proporcionó RFC
  // 3. Subió CSF
  if (canInvoice && rfc && csfUrl) {
    return 'COMISION_MERCANTIL'; // Carril A
  }
  
  // Default: Carril B
  return 'ASIMILADOS';
}
```

**UX de la pregunta de RFC (no ofende, incentiva Carril A):**

No preguntar "¿Tienes RFC?" (suena a juicio). Preguntar:

> **¿Puedes emitir facturas por tus servicios?**
> 
> ○ **Sí, tengo RFC y puedo facturar** → se le pide RFC + CSF → Carril A
>   _¡Genial! Es la opción más ágil para ambos._
> ○ **No por el momento** → se continúa sin RFC → Carril B (asimilados)
>   _No hay problema — operamos con un esquema que no te pide facturar. Si quieres darte de alta en RFC (es gratis y rápido en sat.gob.mx), te podemos guiar._
>
> **Estrategia:** Incentivar activamente Carril A. Cada profesor que factura reduce el ingreso computable en el RESICO de Ángel ($3.5M de techo). Incluir guía paso a paso para alta en RFC/RESICO como recurso en el panel del profesor.

> **NOTA FISCAL (22 sep):** Bajo asimilados (Carril B), el CFDI DEBE ser "Recibo de nómina" (tipo N, Complemento de Nómina 1.2). No existe alternativa bajo este régimen — es regla dura del SAT. Para evitar CFDI de nómina y reducir riesgo RESICO, la estrategia es incentivar Carril A en el onboarding. Validar operación con contador.

---

## 4. Sistema de niveles por mérito

### 4.1 Reglas de promoción

```typescript
// src/lib/teachers/level-engine.ts

interface LevelCriteria {
  minClasses: number;
  minRating: number;       // Sobre 5.0
  maxCancellationRate: number; // Porcentaje (0-100)
  minMonthsActive?: number;
}

const LEVEL_CRITERIA: Record<TeacherLevel, LevelCriteria | null> = {
  INICIAL: null,  // Todos arrancan aquí
  VERIFICADO: {
    minClasses: 15,
    minRating: 4.2,
    maxCancellationRate: 10,
  },
  DESTACADO: {
    minClasses: 50,
    minRating: 4.5,
    maxCancellationRate: 5,
    minMonthsActive: 3,
  },
};

export function evaluateTeacherLevel(teacher: {
  totalClassesGiven: number;
  averageRating: number;
  cancellationRate: number;
  monthsActive: number;
  level: TeacherLevel;
}): TeacherLevel | null {
  // Solo puede subir, nunca bajar
  const levels: TeacherLevel[] = ['INICIAL', 'VERIFICADO', 'DESTACADO'];
  const currentIdx = levels.indexOf(teacher.level);
  
  for (let i = levels.length - 1; i > currentIdx; i--) {
    const criteria = LEVEL_CRITERIA[levels[i]];
    if (!criteria) continue;
    
    if (
      teacher.totalClassesGiven >= criteria.minClasses &&
      teacher.averageRating >= criteria.minRating &&
      teacher.cancellationRate <= criteria.maxCancellationRate &&
      (!criteria.minMonthsActive || teacher.monthsActive >= criteria.minMonthsActive)
    ) {
      return levels[i]; // Promover al nivel más alto alcanzable
    }
  }
  
  return null; // Sin cambio
}
```

### 4.2 Cuándo evaluar

```typescript
// Ejecutar después de cada clase completada:
// 1. Actualizar métricas del profesor (totalClassesGiven, averageRating, etc.)
// 2. Llamar evaluateTeacherLevel()
// 3. Si retorna un nivel nuevo → actualizar Teacher.level + Teacher.levelPromotedAt
// 4. Enviar notificación celebratoria al profesor
// 5. Las tarifas futuras usan el nuevo multiplicador (clases ya reservadas NO cambian)
```

### 4.3 Degradación

**Los niveles NO bajan automáticamente.** Si un profesor Destacado empieza a cancelar mucho, se puede suspender manualmente (admin), pero no se le baja de nivel. Esto es un reconocimiento ganado, no una calificación en tiempo real.

---

## 5. Tabulador de tarifas

### 5.0 Regla de presentación al alumno

> **La fórmula y los multiplicadores son INTERNOS (backend).** El alumno **nunca** ve la fórmula ni los factores individuales.
> - En el **directorio**: la tarjeta del profesor muestra *"Desde $260/clase"* (tarifa base mínima de sus materias).
> - Al **reservar**: el alumno ve solo el **precio final**: *"Clase de Matemáticas — 50 min — $300."*
> - En el **landing/marketing**: *"Clases desde $199/hora"* (rango general).
> - Publicar en una página de transparencia: tabla simplificada de **rangos por materia** (ej: "Matemáticas: $260–$420/clase"). Sin fórmula, sin multiplicadores.

### 5.1 Tarifa base por materia (B)

```typescript
// src/lib/teachers/tariff.ts

export const BASE_RATES: Record<string, number> = {
  // Centavos MXN
  matematicas: 30000,    // $300
  fisica: 30000,         // $300
  quimica: 28000,        // $280
  biologia: 28000,       // $280
  espanol: 26000,        // $260
  ingles: 30000,         // $300
  historia: 26000,       // $260
  geografia: 26000,      // $260
  filosofia: 26000,      // $260
  literatura: 26000,     // $260
  // IPN específicas
  habilidad_verbal: 28000,
  habilidad_matematica: 30000,
  // Agrupaciones futuras
  ciencias_sociales: 26000,
  razonamiento: 34000,   // $340 — mayor demanda/dificultad
};
```

### 5.2 Cálculo completo

```typescript
export const MULTIPLIERS = {
  level: {
    INICIAL: 1.00,
    VERIFICADO: 1.15,
    DESTACADO: 1.30,
  },
  duration: {
    50: 1.00,
    80: 1.50,
  },
  advance: {
    EARLY: 1.00,      // ≥ 48h
    STANDARD: 1.05,   // 24–48h
    LAST_MINUTE: 1.12, // < 24h
  },
  schedule: {
    DAYTIME: 1.00,    // 8:00–18:00 L-V
    EVENING: 1.08,    // 18:00–22:00 L-V
    WEEKEND: 1.12,    // Sábado y domingo
  },
  demand: {
    LOW: 0.95,
    NORMAL: 1.00,
    HIGH: 1.10,
  },
} as const;

export const TARIFF_CAP_MULTIPLIER = 1.5; // Tope duro: nunca más de 1.5× la base

export function calculateTariff(params: {
  subjectKey: string;
  teacherLevel: TeacherLevel;
  durationMinutes: 50 | 80;
  advanceCategory: 'EARLY' | 'STANDARD' | 'LAST_MINUTE';
  scheduleCategory: 'DAYTIME' | 'EVENING' | 'WEEKEND';
  demandCategory: 'LOW' | 'NORMAL' | 'HIGH';
}): {
  baseCents: number;
  finalCents: number;
  multipliers: Record<string, number>;
  capped: boolean;
} {
  const baseCents = BASE_RATES[params.subjectKey];
  if (!baseCents) throw new Error(`Unknown subject: ${params.subjectKey}`);
  
  const m = {
    level: MULTIPLIERS.level[params.teacherLevel],
    duration: MULTIPLIERS.duration[params.durationMinutes],
    advance: MULTIPLIERS.advance[params.advanceCategory],
    schedule: MULTIPLIERS.schedule[params.scheduleCategory],
    demand: MULTIPLIERS.demand[params.demandCategory],
  };
  
  const rawMultiplier = m.level * m.duration * m.advance * m.schedule * m.demand;
  const cappedMultiplier = Math.min(rawMultiplier, TARIFF_CAP_MULTIPLIER);
  const finalCents = Math.round(baseCents * cappedMultiplier);
  
  return {
    baseCents,
    finalCents,
    multipliers: m,
    capped: rawMultiplier > TARIFF_CAP_MULTIPLIER,
  };
}
```

### 5.3 Validación anti-discriminación

```typescript
// GUARDRAIL: el tabulador NUNCA usa datos del comprador
// Esta función verifica que NO se pase información del alumno

export function validateTariffInput(params: Record<string, unknown>): void {
  const FORBIDDEN_KEYS = [
    'userId', 'userPlan', 'userHistory', 'userDevice',
    'userLocation', 'userSpend', 'userAge', 'userGender',
    'buyerName', 'studentId',
  ];
  
  for (const key of FORBIDDEN_KEYS) {
    if (key in params) {
      throw new Error(
        `GUARDRAIL VIOLATION: tariff cannot use buyer data (${key}). ` +
        `Art. 26-II LFPDPPP + 76 Bis V LFPC.`
      );
    }
  }
}
```

---

## 6. Flujo de reserva y pago de clase

```
1. BÚSQUEDA (alumno Premium)
   ├─ Directorio de profesores (filtros: materia, disponibilidad, nivel, precio)
   └─ Cada tarjeta muestra: nombre, nivel, ★, materias, rango de precio

2. RESERVA
   ├─ Alumno selecciona profesor + materia + fecha/hora + duración
   ├─ Sistema calcula tarifa con calculateTariff()
   ├─ validateTariffInput() verifica que no se usan datos del alumno
   ├─ Mostrar desglose al alumno:
   │   "Clase de Física con Prof. García — 80 min — $420"
   │   "Viernes 25 oct, 19:00 — Horario nocturno"
   └─ Si menor de 18 → verificar que el tutor ya dio consentimiento (liga)

3. PAGO
   ├─ Stripe PaymentIntent por el monto de la clase
   ├─ Webhook confirma pago → ClassSession.status = BOOKED
   ├─ Notificación al profesor: "Nueva clase reservada"
   └─ El dinero queda en Stripe (no se transfiere aún)

4. CONFIRMACIÓN (24h antes)
   ├─ Notificación al profesor: "Confirma tu clase de mañana"
   ├─ Profesor confirma → status = CONFIRMED
   ├─ Si no confirma en 4h → alerta admin + notificación al alumno
   └─ Si no confirma en 12h → cancelación automática + reembolso al alumno

5. CLASE
   ├─ Generar enlace Google Meet (API)
   ├─ Enviar enlace a ambos 15 min antes
   ├─ status = IN_PROGRESS al conectar
   ├─ Grabación (con consentimiento previo del tutor si aplica)
   └─ status = COMPLETED al terminar

6. POST-CLASE
   ├─ Alumno puede calificar (1-5★ + comentario opcional) — 48h para hacerlo
   ├─ Actualizar métricas del profesor (totalClassesGiven, averageRating)
   ├─ Evaluar nivel con evaluateTeacherLevel()
   └─ Clase entra al pool de liquidación semanal

7. CANCELACIÓN
   ├─ Alumno cancela ≥ 24h antes → reembolso 100%
   ├─ Alumno cancela < 24h → reembolso 50% (el profesor recibe 50% de su parte)
   ├─ Profesor cancela → reembolso 100% al alumno
   │   └─ Cuenta como cancelación (afecta cancellationRate)
   └─ No-show profesor → reembolso 100% + alerta admin
```

### 6.1 UX de pago — una compra, no "pagos constantes"

**Principio:** el alumno NO debe sentir que está "pagando constantemente." La experiencia debe ser un click, no un checkout.

**Implementación (lanzamiento marketplace):**

```typescript
// src/lib/classes/booking.ts
// El alumno ya tiene PaymentMethod guardado desde la compra de Premium.
// Agendar una clase = UN CLICK.

export async function bookClass(params: {
  studentUserId: string;
  teacherId: string;
  subjectKey: string;
  scheduledAt: Date;
  durationMinutes: 50 | 80;
}): Promise<ClassSession> {
  // 1. Calcular tarifa
  const tariff = calculateTariff({...});
  
  // 2. Obtener PaymentMethod guardado del alumno
  const customer = await stripe.customers.retrieve(studentStripeId);
  const paymentMethod = customer.invoice_settings.default_payment_method;
  
  // 3. Cobrar con UN SOLO CLICK (sin formulario de pago)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: tariff.finalCents,
    currency: 'mxn',
    customer: studentStripeId,
    payment_method: paymentMethod,
    confirm: true,           // Cobra inmediatamente
    off_session: false,      // El alumno está presente (hizo click)
    description: `Clase de ${params.subjectKey} — ${params.durationMinutes} min`,
    metadata: {
      type: 'class_booking',
      teacherId: params.teacherId,
      subjectKey: params.subjectKey,
    },
  });
  
  // 4. Crear ClassSession
  // ... (webhook confirma el pago y actualiza status)
}
```

**UX en pantalla:**

```
┌──────────────────────────────────────────────────┐
│ Confirmar clase                                  │
│                                                  │
│ 📚 Matemáticas con Prof. Juan P. ⭐ Inicial     │
│ 📅 Lunes 23 sep — 17:00 — 50 min                │
│ 💳 Visa ****4242                                 │
│ 💰 $300.00                                       │
│                                                  │
│        [ Agendar clase ]  ← UN CLICK             │
│                                                  │
│ Cancelación gratuita hasta 24h antes.            │
└──────────────────────────────────────────────────┘
```

**Framing de marketing (obligatorio en copy):**
- ✅ "Agenda cuando quieras. Paga solo lo que uses."
- ✅ "Clases particulares desde $199/hora con profesores verificados."
- ✅ "Sin mensualidades de clases. Sin compromisos. Tú decides cuántas y cuándo."
- ✅ Comparar con mercado: "Clase particular típica: $500+. En YaEntre: desde $199."
- ❌ NUNCA decir "paga por cada clase" ni enfatizar costo por sesión en el landing.

**Fase 2 — Wallet/saldo (cuando haya volumen de clases):**
- El alumno precarga saldo: $500, $1,000 o $2,500.
- Agenda desde su saldo con CERO fricción de pago.
- Reduce transacciones Stripe (menos fees).
- Psicológicamente: "ya pagué" → la reserva se siente gratis.
- Implementar como balance interno (no Stripe wallet).

---

## 7. Motor de liquidación (SPEI semiautomático)

### 7.1 Proceso semanal

```
CADA LUNES (cron job o trigger manual):

1. CALCULAR
   ├─ Para cada profesor con clases COMPLETED en la semana anterior:
   │   ├─ Sumar teacherPayCents de todas las clases completadas
   │   ├─ Calcular reserva de desempeño: 15% del total
   │   └─ Neto a transferir: total − reserva
   └─ Crear TeacherPayout con status = PENDING

2. APROBAR (admin manual — Ángel)
   ├─ Dashboard muestra lista de payouts pendientes
   ├─ Cada payout muestra: profesor, # clases, bruto, reserva, neto, CLABE
   ├─ Ángel revisa y aprueba individualmente o en lote
   └─ Status → APPROVED

3. TRANSFERIR (semiautomático)
   ├─ Ángel entra a su banca en línea (cuenta caja YaEntre)
   ├─ Dashboard muestra los datos para copiar:
   │   CLABE: 012345678901234567
   │   Beneficiario: Juan Pérez García
   │   Monto: $1,350.00
   │   Referencia: YAENTRE-PO-{payoutId}
   ├─ Ángel ejecuta la transferencia SPEI
   ├─ Ingresa la clave de rastreo en el dashboard
   └─ Status → TRANSFERRED

4. RESERVA DE DESEMPEÑO
   ├─ Cron a diario: revisar retentions con > 30 días naturales
   ├─ Si no hay incidencias → retentionStatus = RELEASED
   │   └─ El monto se agrega al siguiente payout
   └─ Si hay incidencia grave → retentionStatus = FORFEITED (decisión admin)
```

### 7.2 Monto mínimo de payout

```typescript
export const MIN_PAYOUT_CENTS = 30000; // $300 MXN

// Si el neto de la semana es < $300, se acumula para la siguiente
// Mostrar al profesor: "Saldo acumulado: $225 — se liquida al acumular $300"
```

### 7.3 Datos para SPEI (UI del admin)

```typescript
// src/lib/teachers/payout-sheet.ts
// Genera la "hoja de pago" que Ángel usa para hacer las transferencias

export interface PayoutSheetRow {
  payoutId: string;
  teacherName: string;
  clabe: string;
  bankName: string;
  netAmountMxn: string;    // Formateado: "$1,350.00"
  reference: string;       // "YAENTRE-PO-{id}"
  classCount: number;
  periodLabel: string;     // "15-21 sep 2026"
}

export function generatePayoutSheet(payouts: TeacherPayout[]): PayoutSheetRow[] {
  return payouts
    .filter(p => p.status === 'APPROVED')
    .map(p => ({
      payoutId: p.id,
      teacherName: p.teacher.fullName,
      clabe: p.teacher.clabe,
      bankName: p.teacher.bankName,
      netAmountMxn: formatCurrency(p.netCents),
      reference: `YAENTRE-PO-${p.id.slice(-8).toUpperCase()}`,
      classCount: p.classes.length,
      periodLabel: `${formatDate(p.periodStart)}–${formatDate(p.periodEnd)}`,
    }));
}
```

---

## 8. Dashboard del profesor

```
┌──────────────────────────────────────────────────┐
│ 🎓 Panel del Profesor                            │
│                                                  │
│ Juan Pérez García          Nivel: ⭐ Inicial     │
│ Materias: Matemáticas, Física                    │
│ Carril: Asimilados                               │
│                                                  │
│ ═══════════════════════════════════════════════   │
│                                                  │
│ 📅 Próximas clases                               │
│ • Lun 23 sep 17:00 — Matemáticas — Ana M.       │
│ • Mar 24 sep 10:00 — Física — Pedro L.           │
│                                                  │
│ 📊 Este mes                                      │
│ Clases impartidas: 12                            │
│ Calificación promedio: 4.6 ★                     │
│ Ingresos brutos: $3,600                          │
│ Reserva retenida: $540                           │
│ Pagado: $2,295                                   │
│ Pendiente: $765                                  │
│                                                  │
│ 💰 Liquidaciones                                 │
│ • 16 sep — $1,147.50 — TRANSFERIDO ✅           │
│ • 9 sep — $1,147.50 — TRANSFERIDO ✅            │
│ •  Reserva 2 sep — $270 — liberada 2 oct ✅     │
│                                                  │
│ 🎯 Progreso a Verificado                         │
│ ████████░░░░ 12/15 clases                        │
│ ██████████░░ 4.6/4.2 ★                           │
│ ██████████░░ 2% cancelaciones (máx 10%)          │
│                                                  │
│ CLABE: ****4567  Banco: BBVA                     │
│ [Actualizar datos de pago]                       │
└──────────────────────────────────────────────────┘
```

---

## 9. Dashboard del alumno (sección Premium)

```
┌──────────────────────────────────────────────────┐
│ 📚 Mis clases                                    │
│                                                  │
│ Próxima clase:                                   │
│ Matemáticas con Prof. Juan P. ⭐ Inicial         │
│ Lun 23 sep — 17:00 — 50 min — $300              │
│ [Cancelar]  [Unirse a clase]                     │
│                                                  │
│ Historial:                                       │
│ • 20 sep — Física — Prof. Juan P. — $300 — ★★★★★│
│ • 16 sep — Mates — Prof. María G. — $280 — ★★★★ │
│                                                  │
│ [Buscar profesor]  [Agendar clase]               │
└──────────────────────────────────────────────────┘
```

---

## 10. Monitor RESICO (admin — PRIORIDAD ALTA)

```typescript
// src/lib/admin/resico-monitor.ts
// Semáforo de ingreso propio anual vs $3.5M RESICO

export const RESICO_CEILING_CENTS = 350_000_000; // $3,500,000 MXN

export interface ResicoStatus {
  yearToDateIncomeCents: number;   // Ingresos acumulados este año fiscal
  subscriptionIncomeCents: number; // Solo suscripciones (100% de YaEntre)
  classIncomeCents: number;        // DEPENDE DEL CARRIL:
                                    // Carril A: solo comisión 25%
                                    // Carril B: el 100% de la clase (peor caso)
  projectedAnnualCents: number;    // Proyección lineal al 31 dic
  percentUsed: number;             // ytd / ceiling × 100
  signal: 'GREEN' | 'YELLOW' | 'RED';
  recommendation: string;
}

export function calculateResicoStatus(
  subscriptionRevenueCents: number,
  classRevenue: { 
    totalCents: number;         // Monto total de todas las clases
    commissionCents: number;    // Solo la comisión 25%
    carrils: { A: number; B: number }; // # de clases por carril
  },
  dayOfYear: number,
): ResicoStatus {
  // Para Carril B: el monto completo de la clase suma al RESICO
  // Para Carril A: solo la comisión 25%
  // Peor caso (conservador): asumir todo como Carril B
  const classIncomeCents = classRevenue.totalCents; // Peor caso
  const ytd = subscriptionRevenueCents + classIncomeCents;
  const projected = Math.round(ytd * (365 / dayOfYear));
  const pct = (ytd / RESICO_CEILING_CENTS) * 100;
  
  let signal: 'GREEN' | 'YELLOW' | 'RED';
  let recommendation: string;
  
  if (pct < 60) {
    signal = 'GREEN';
    recommendation = 'Holgado. Sin acción necesaria.';
  } else if (pct < 80) {
    signal = 'YELLOW';
    recommendation = 'Considerar migrar profesores de Carril B a Carril A para reducir ingreso computable.';
  } else {
    signal = 'RED';
    recommendation = 'URGENTE: migrar a Carril A y/o considerar constitución de persona moral antes de rebasar $3.5M.';
  }
  
  return {
    yearToDateIncomeCents: ytd,
    subscriptionIncomeCents: subscriptionRevenueCents,
    classIncomeCents,
    projectedAnnualCents: projected,
    percentUsed: Math.round(pct * 10) / 10,
    signal,
    recommendation,
  };
}
```

### UI del monitor

```
┌──────────────────────────────────────────────────┐
│ 🚦 Monitor RESICO — Año fiscal 2026              │
│                                                  │
│ Techo: $3,500,000                                │
│ Acumulado: $856,000          [████░░░░░░] 24.5%  │
│                                                  │
│ Desglose:                                        │
│   Suscripciones:    $499,500                     │
│   Clases (peor caso): $356,500                   │
│     ├─ Carril A (comisión):  $12,500             │
│     └─ Carril B (total):     $344,000            │
│                                                  │
│ Proyección anual: $1,712,000                     │
│ Estado: 🟢 VERDE — holgado                       │
│                                                  │
│ 💡 Sin acción necesaria.                          │
└──────────────────────────────────────────────────┘
```

---

## 11. Endpoints API

```
// ──── PROFESOR (autenticado como profesor) ────
POST   /api/teachers/apply           — Enviar solicitud de onboarding
GET    /api/teachers/me              — Perfil y métricas del profesor
PATCH  /api/teachers/me              — Actualizar datos (CLABE, disponibilidad)
GET    /api/teachers/me/classes      — Mis clases (próximas + historial)
GET    /api/teachers/me/payouts      — Mis liquidaciones
POST   /api/teachers/me/classes/{id}/confirm — Confirmar asistencia

// ──── ALUMNO PREMIUM (autenticado como alumno Premium) ────
GET    /api/classes/teachers         — Directorio de profesores (con filtros)
GET    /api/classes/teachers/{id}    — Perfil público del profesor
POST   /api/classes/calculate-tariff — Calcular tarifa (sin reservar)
POST   /api/classes/book             — Reservar y pagar clase
POST   /api/classes/{id}/cancel      — Cancelar clase
POST   /api/classes/{id}/rate        — Calificar clase (1-5★)

// ──── ADMIN ────
GET    /api/admin/teachers           — Lista de profesores
PATCH  /api/admin/teachers/{id}/approve  — Aprobar onboarding
PATCH  /api/admin/teachers/{id}/suspend  — Suspender profesor
GET    /api/admin/payouts            — Lista de liquidaciones pendientes
PATCH  /api/admin/payouts/{id}/approve   — Aprobar payout
PATCH  /api/admin/payouts/{id}/mark-transferred — Marcar como transferido + ref SPEI
GET    /api/admin/resico             — Monitor RESICO

// ──── REDIRECT (público) ────
GET    /r/{code}                     — Redirect con atribución (ya implementado por QR spec)
```

---

## 12. Prioridad de implementación

| Fase | Qué | Cuándo | Depende de |
|---|---|---|---|
| **Early Bird** | Premium "Coming Soon" (botón desactivado, precio visible) | Lanzamiento ~15 oct | Nada — solo UI |
| **Post-EB fase 1** | Onboarding profesor + directorio + tabulador | Cuando haya contador contratado | Contador para Carril B |
| **Post-EB fase 2** | Reserva + pago de clase + aula Google Meet | Después de al menos 3 profesores onboardeados | Fase 1 |
| **Post-EB fase 3** | Motor de liquidación SPEI + dashboard profesor | Después de primera clase impartida | Fase 2 + cuenta caja |
| **Post-EB fase 4** | Calificaciones + niveles automáticos + monitor RESICO | Después de primeras 10 clases | Fase 3 |

**Para Early Bird solo se necesita:**
1. Plan Premium visible con "Coming Soon" + botón desactivado
2. Copy: "Profesores independientes verificados en YaEntre — próximamente" (NO "próximamente" sobre algo que no existe; el directorio SÍ existirá, solo no está listo)
   - Corrección: usar "Disponible pronto" en vez de "Próximamente" para cumplir guardrail

---

## 13. Guardrails

- ❌ **NUNCA** usar datos del alumno en el cálculo de tarifa (art. 26-II LFPDPPP)
- ❌ **NUNCA** pagar a un profesor sin que la clase haya sido impartida
- ❌ **NUNCA** llamar al pago "salario", "nómina", "honorarios" ni "sueldo" (es "liquidación de comisión mercantil")
- ❌ **NUNCA** escribir "nuestros profesores" ni "equipo docente" (son "profesores independientes verificados en YaEntre")
- ❌ **NUNCA** incluir clases en el precio de Premium (Premium ABRE ACCESO)
- ❌ **NUNCA** ofrecer clases presenciales (activaría Cap. IX Bis LFT)
- ❌ **NUNCA** emitir CFDI a nombre del profesor (art. 83-IX CFF 2026)
- ❌ **NUNCA** bajo Carril B emitir otro tipo de CFDI que no sea de nómina (regla SAT, sin alternativa)
- ❌ **NUNCA** mostrar al alumno la fórmula del tabulador ni los multiplicadores (solo precio final)
- ❌ **NUNCA** decir "paga por cada clase" en marketing — usar "agenda cuando quieras, paga solo lo que uses"
- ❌ **NUNCA** saltarse la reserva de desempeño (15%/30 días)
- ✅ Tabulador con tope duro 1.5× (validar en código)
- ✅ Niveles SOLO por mérito automático (nunca autoseleccionados ni asignados)
- ✅ Documentar cada pago como "liquidación de comisión mercantil" (para el contador)
- ✅ Monitor RESICO en admin como PRIORIDAD ALTA

---

*Fin de especificación. Leer en conjunto con: CONTEXTO_YAENTRE_HANDOFF.md, ESPECIFICACION_QR_COMISIONES_CTO.md, INSTRUCCIONES_CENEVAL_CTO.md.*
