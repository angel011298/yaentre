# Especificación técnica — Horarios, cursos pregrabados, temporalidad y mensajería

> **De:** CLO/CFO/CMO (sesión legal-financiera)
> **Para:** CTO (sesión de desarrollo)
> **Fecha:** 23 de octubre de 2026
> **Complementa:** `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md`, `ESPECIFICACION_QR_COMISIONES_CTO.md`, `CONTEXTO_YAENTRE_HANDOFF.md`
> **No duplica:** esta spec cubre lo que falta. Los modelos, tabulador, pagos a profes, niveles por mérito y liquidación ya están en la spec del marketplace; aquí solo se hacen las referencias cruzadas necesarias.

---

## 0. Índice de lo que cubre este documento

| # | Tema | Sección |
|---|------|---------|
| 1 | Sistema de disponibilidad y horarios del profesor | §1 |
| 2 | Cursos pregrabados (Course Marketplace) + módulo de Regularización (cursos y clases en vivo) | §2 |
| 3 | Temporalidad de membresía / accesos | §3 |
| 4 | Corrección de mensajería ("no es otra página con videos") | §4 |
| 5 | Ajustes al esquema de pagos a profes (complemento) | §5 |
| 6 | Ajustes al tarifario de profes (complemento) | §6 |
| 7 | Guardrails adicionales | §7 |
| 8 | Prioridad de implementación | §8 |

---

## 1. Sistema de disponibilidad y horarios del profesor

### 1.1 Problema que resuelve

La spec del marketplace (§6) define el flujo de reserva, pero no cómo el profesor declara su disponibilidad ni cómo el alumno la consulta. Sin esto, el directorio no puede mostrar "horarios disponibles" y la reserva no funciona.

### 1.2 Modelo de datos

```prisma
// ============================================================
// DISPONIBILIDAD — agregar a prisma/schema.prisma
// ============================================================

model TeacherAvailability {
  id              String   @id @default(cuid())
  teacherId       String
  
  // Bloque recurrente semanal
  dayOfWeek       Int      // 0=domingo, 1=lunes, ..., 6=sábado
  startTime       String   // "09:00" (formato HH:mm, hora CDMX)
  endTime         String   // "11:00" (formato HH:mm, hora CDMX)
  
  // Control
  isActive        Boolean  @default(true)
  
  teacher         Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([teacherId])
  @@index([dayOfWeek])
}

model TeacherDateBlock {
  id              String   @id @default(cuid())
  teacherId       String
  
  // Bloqueo de fecha específica (vacaciones, imprevistos)
  blockedDate     DateTime @db.Date   // Solo la fecha, sin hora
  reason          String?             // Opcional, solo para el profesor
  
  teacher         Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime @default(now())
  
  @@unique([teacherId, blockedDate])
  @@index([teacherId])
  @@index([blockedDate])
}
```

**Agregar a modelo `Teacher` existente:**
```prisma
// Dentro del model Teacher (ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md §2.1):
availability    TeacherAvailability[]
dateBlocks      TeacherDateBlock[]
timezone        String   @default("America/Mexico_City")
```

### 1.3 Reglas de disponibilidad

```typescript
// src/lib/teachers/availability.ts

export const AVAILABILITY_RULES = {
  // Bloques mínimos de 1 hora, máximos de 4 horas continuas
  MIN_BLOCK_MINUTES: 60,
  MAX_BLOCK_MINUTES: 240,
  
  // Intervalo de granularidad: bloques de 30 minutos
  SLOT_GRANULARITY_MINUTES: 30,
  
  // Horario operable: 7:00 a 22:00 (hora CDMX)
  EARLIEST_HOUR: 7,
  LATEST_HOUR: 22,
  
  // Anticipación mínima para reservar: 4 horas
  MIN_BOOKING_ADVANCE_HOURS: 4,
  
  // Máximo de anticipación para reservar: 30 días
  MAX_BOOKING_ADVANCE_DAYS: 30,
  
  // Máximo de bloques semanales por profesor: 35 (5h/día × 7 días)
  MAX_WEEKLY_BLOCKS: 35,
} as const;

/**
 * Valida que un bloque de disponibilidad sea válido.
 */
export function validateAvailabilityBlock(block: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): { valid: boolean; error?: string } {
  // Validar día
  if (block.dayOfWeek < 0 || block.dayOfWeek > 6) {
    return { valid: false, error: 'Día inválido' };
  }
  
  // Parsear horas
  const [startH, startM] = block.startTime.split(':').map(Number);
  const [endH, endM] = block.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  // Validar rango horario
  if (startH < AVAILABILITY_RULES.EARLIEST_HOUR) {
    return { valid: false, error: `Horario más temprano: ${AVAILABILITY_RULES.EARLIEST_HOUR}:00` };
  }
  if (endH > AVAILABILITY_RULES.LATEST_HOUR || (endH === AVAILABILITY_RULES.LATEST_HOUR && endM > 0)) {
    return { valid: false, error: `Horario más tarde: ${AVAILABILITY_RULES.LATEST_HOUR}:00` };
  }
  
  // Validar duración
  const durationMinutes = endMinutes - startMinutes;
  if (durationMinutes < AVAILABILITY_RULES.MIN_BLOCK_MINUTES) {
    return { valid: false, error: `Mínimo ${AVAILABILITY_RULES.MIN_BLOCK_MINUTES} minutos por bloque` };
  }
  if (durationMinutes > AVAILABILITY_RULES.MAX_BLOCK_MINUTES) {
    return { valid: false, error: `Máximo ${AVAILABILITY_RULES.MAX_BLOCK_MINUTES / 60} horas por bloque` };
  }
  
  // Validar granularidad (múltiplo de 30 min)
  if (startMinutes % AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES !== 0 ||
      endMinutes % AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES !== 0) {
    return { valid: false, error: 'Los bloques deben ser en intervalos de 30 minutos' };
  }
  
  return { valid: true };
}
```

### 1.4 Motor de slots disponibles

```typescript
// src/lib/teachers/slot-calculator.ts

import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Mexico_City';

interface AvailableSlot {
  date: string;          // "2026-10-25"
  startTime: string;     // "09:00"
  endTime: string;       // "09:50" o "10:20" (según duración)
  dayOfWeek: number;
  scheduleCategory: 'DAYTIME' | 'EVENING' | 'WEEKEND';
}

/**
 * Calcula los slots disponibles de un profesor para los próximos N días.
 * Excluye:
 * - Fechas bloqueadas (TeacherDateBlock)
 * - Slots ya reservados (ClassSession con status != CANCELLED)
 * - Slots con anticipación insuficiente (< 4h)
 */
export function calculateAvailableSlots(params: {
  availability: TeacherAvailability[];
  dateBlocks: TeacherDateBlock[];
  existingBookings: ClassSession[];
  durationMinutes: 50 | 80;
  fromDate?: Date;       // Default: ahora
  daysAhead?: number;    // Default: 30
}): AvailableSlot[] {
  const {
    availability,
    dateBlocks,
    existingBookings,
    durationMinutes,
    fromDate = new Date(),
    daysAhead = AVAILABILITY_RULES.MAX_BOOKING_ADVANCE_DAYS,
  } = params;
  
  const now = toZonedTime(fromDate, TIMEZONE);
  const minBookingTime = new Date(now.getTime() + AVAILABILITY_RULES.MIN_BOOKING_ADVANCE_HOURS * 60 * 60 * 1000);
  const slots: AvailableSlot[] = [];
  
  // Set de fechas bloqueadas para búsqueda O(1)
  const blockedDates = new Set(
    dateBlocks.map(b => format(b.blockedDate, 'yyyy-MM-dd'))
  );
  
  // Set de slots ya ocupados: "2026-10-25T09:00"
  const bookedSlots = new Set(
    existingBookings
      .filter(b => !['CANCELLED'].includes(b.status))
      .map(b => format(toZonedTime(b.scheduledAt, TIMEZONE), "yyyy-MM-dd'T'HH:mm"))
  );
  
  // Iterar cada día
  for (let d = 0; d < daysAhead; d++) {
    const date = addDays(startOfDay(now), d);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    
    // Saltar fechas bloqueadas
    if (blockedDates.has(dateStr)) continue;
    
    // Buscar bloques de disponibilidad para este día de la semana
    const dayBlocks = availability.filter(
      a => a.dayOfWeek === dayOfWeek && a.isActive
    );
    
    for (const block of dayBlocks) {
      const [blockStartH, blockStartM] = block.startTime.split(':').map(Number);
      const [blockEndH, blockEndM] = block.endTime.split(':').map(Number);
      const blockStartMinutes = blockStartH * 60 + blockStartM;
      const blockEndMinutes = blockEndH * 60 + blockEndM;
      
      // Generar slots dentro del bloque
      for (let slotStart = blockStartMinutes; 
           slotStart + durationMinutes <= blockEndMinutes; 
           slotStart += AVAILABILITY_RULES.SLOT_GRANULARITY_MINUTES) {
        
        const slotStartH = Math.floor(slotStart / 60);
        const slotStartM = slotStart % 60;
        const slotEndMinutes = slotStart + durationMinutes;
        const slotEndH = Math.floor(slotEndMinutes / 60);
        const slotEndM = slotEndMinutes % 60;
        
        const startTimeStr = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
        const endTimeStr = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;
        const slotKey = `${dateStr}T${startTimeStr}`;
        
        // Validar anticipación mínima
        const slotDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
        if (slotDateTime < minBookingTime) continue;
        
        // Validar que no esté ocupado
        if (bookedSlots.has(slotKey)) continue;
        
        // Determinar categoría de horario (para tabulador)
        const scheduleCategory = getScheduleCategory(dayOfWeek, slotStartH);
        
        slots.push({
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          dayOfWeek,
          scheduleCategory,
        });
      }
    }
  }
  
  return slots;
}

/**
 * Determina la categoría de horario para el tabulador.
 * Ref: ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md §5.2
 */
function getScheduleCategory(
  dayOfWeek: number, 
  hour: number
): 'DAYTIME' | 'EVENING' | 'WEEKEND' {
  // Sábado (6) y domingo (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'WEEKEND';
  
  // L-V: 8:00-17:59 = diurno, 18:00-21:59 = nocturno
  if (hour >= 8 && hour < 18) return 'DAYTIME';
  return 'EVENING';
}
```

### 1.5 UX del profesor — Configuración de disponibilidad

```
┌──────────────────────────────────────────────────────────────┐
│ 📅 Mi disponibilidad semanal                                │
│                                                              │
│ Arrastra para crear bloques. Mínimo 1 hora, máximo 4 horas. │
│                                                              │
│         Lun    Mar    Mié    Jue    Vie    Sáb    Dom        │
│  7:00                                                        │
│  7:30                                                        │
│  8:00   ██                                                   │
│  8:30   ██                                                   │
│  9:00   ██     ██            ██     ██                       │
│  9:30   ██     ██            ██     ██                       │
│ 10:00   ██     ██            ██     ██                       │
│ 10:30   ██     ██            ██     ██                       │
│ 11:00          ██                                            │
│ 11:30          ██                                            │
│  ...                                                         │
│ 17:00                               ██     ██               │
│ 17:30                               ██     ██               │
│ 18:00                               ██     ██               │
│ 18:30                               ██     ██               │
│  ...                                                         │
│ 22:00                                                        │
│                                                              │
│ ██ = Disponible                                              │
│                                                              │
│ Zona horaria: Ciudad de México (GMT-6)                       │
│                                                              │
│ [Guardar cambios]                                            │
│                                                              │
│ ─────────────────────────────────────────────────            │
│ 🚫 Fechas bloqueadas                                         │
│                                                              │
│ + Agregar fecha bloqueada                                    │
│ • 1 nov 2026 — "Día de muertos" [Eliminar]                  │
│ • 20 nov 2026 — "Viaje" [Eliminar]                          │
└──────────────────────────────────────────────────────────────┘
```

**Implementación del selector:**
- Componente: grid semanal con drag-to-select (como Google Calendar)
- Cada celda = 30 minutos
- Al arrastrar se crea un bloque de disponibilidad
- Click sobre un bloque existente para eliminarlo
- Mobile: tap para toggle individual, long-press para seleccionar rango
- Librería recomendada: construir con CSS Grid + pointer events (sin dependencia externa)
- Persistencia: al guardar, se envían todos los bloques de la semana como un lote (replace all)

### 1.6 UX del alumno — Calendario de reserva

```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Agendar clase con Prof. Juan P.                          │
│ Materia: Matemáticas                                         │
│                                                              │
│ ◀  Octubre 2026  ▶                                          │
│ Lu  Ma  Mi  Ju  Vi  Sá  Do                                  │
│              1   2   3   4   5                                │
│  6   7   8   9  10  11  12                                   │
│ 13  14  15  16  17  18  19                                   │
│ 20  21  22 [23] 24  25  26    ← Hoy resaltado               │
│ 27  28  29  30  31                                           │
│                                                              │
│ Días con ● tienen horarios disponibles                       │
│ Días grises están bloqueados o pasados                       │
│                                                              │
│ ─── Jueves 23 oct ───                                        │
│                                                              │
│ Duración: ○ 50 min ($300)  ● 80 min ($450)                  │
│                                                              │
│ Horarios disponibles:                                        │
│ [  9:00 ] [ 10:00 ] [ 10:30 ] [ 14:00 ] [ 14:30 ]          │
│ [ 17:00 ] [ 17:30 ]                                         │
│                                                              │
│ Seleccionado: 17:00 — 18:20 (80 min)                        │
│ Precio: $450                                                 │
│                                                              │
│ 💳 Visa ****4242                                             │
│                                                              │
│         [ Agendar clase — $450 ]                             │
│                                                              │
│ Cancelación gratuita hasta 24h antes.                        │
└──────────────────────────────────────────────────────────────┘
```

**Flujo:**
1. Alumno selecciona profesor del directorio
2. Ve el calendario mensual con indicadores de disponibilidad (puntos verdes en días con slots)
3. Selecciona un día → se despliegan los slots disponibles para ese día
4. Selecciona duración (50 o 80 min) → los precios se recalculan en tiempo real (API `calculate-tariff`)
5. Selecciona slot → confirma con un click (tarjeta guardada de Premium)

### 1.7 Prevención de conflictos

```typescript
// src/lib/teachers/conflict-prevention.ts

/**
 * Verifica que un slot no colisione con clases existentes.
 * Incluye 10 minutos de buffer entre clases.
 */
export const CLASS_BUFFER_MINUTES = 10;

export function hasConflict(params: {
  teacherId: string;
  scheduledAt: Date;
  durationMinutes: number;
  existingBookings: ClassSession[];
}): boolean {
  const newStart = params.scheduledAt.getTime();
  const newEnd = newStart + (params.durationMinutes + CLASS_BUFFER_MINUTES) * 60 * 1000;
  
  return params.existingBookings
    .filter(b => b.teacherId === params.teacherId)
    .filter(b => !['CANCELLED'].includes(b.status))
    .some(b => {
      const existingStart = b.scheduledAt.getTime();
      const existingEnd = existingStart + (b.durationMinutes + CLASS_BUFFER_MINUTES) * 60 * 1000;
      // Hay conflicto si los rangos se solapan
      return newStart < existingEnd && newEnd > existingStart;
    });
}
```

### 1.8 Endpoints API — Disponibilidad

```
// ──── PROFESOR ────
GET    /api/teachers/me/availability        — Mi disponibilidad semanal
PUT    /api/teachers/me/availability        — Reemplazar toda la disponibilidad (lote)
GET    /api/teachers/me/date-blocks         — Mis fechas bloqueadas
POST   /api/teachers/me/date-blocks         — Agregar fecha bloqueada
DELETE /api/teachers/me/date-blocks/{id}    — Eliminar fecha bloqueada

// ──── ALUMNO PREMIUM ────
GET    /api/classes/teachers/{id}/slots     — Slots disponibles de un profesor
       Query params:
         ?from=2026-10-23        (fecha inicio, default: hoy)
         ?days=30                (días a consultar, max 30)
         ?duration=50            (50 o 80 minutos)
         ?subject=matematicas    (materia, para calcular precio)
```

---

## 2. Módulo de cursos pregrabados — Course Marketplace

### 2.1 Concepto

Un marketplace **independiente de los planes de admisión** (Free/Básico/Premium) donde profesores crean y venden cursos de video de cualquier materia. YaEntre actúa como plataforma intermediaria y cobra una comisión por cada venta.

**Diferencias clave con el marketplace de clases en vivo:**

| Aspecto | Clases en vivo (Premium) | Cursos pregrabados |
|---------|--------------------------|---------------------|
| Acceso | Solo Premium | Cualquier usuario registrado |
| Contenido | Sesión en vivo 1:1 | Videos pregrabados + recursos |
| Tema | Admisión (requiere Premium) o Regularización (ver §2.9) | Cualquier materia académica |
| Precio | Tabulador determinista de YaEntre | El profesor pone el precio |
| Pago al profe | 75% de la clase | 75% del precio del curso (misma comisión: 25%) |
| Temporalidad | Por sesión | Acceso permanente al comprar |
| Relación con planes | Requiere Premium activo | Independiente |

### 2.2 Modelo de datos

```prisma
// ============================================================
// CURSOS PREGRABADOS — agregar a prisma/schema.prisma
// ============================================================

model Course {
  id              String   @id @default(cuid())
  teacherId       String
  
  // Metadata
  title           String           // "Álgebra lineal desde cero"
  slug            String   @unique // "algebra-lineal-desde-cero"
  description     String   @db.Text // Descripción larga
  shortDescription String           // Para tarjetas (máx 160 chars)
  
  // Categorización
  category        CourseCategory
  subjectArea     String           // "matematicas", "fisica", etc.
  level           CourseLevel      // BASICO | INTERMEDIO | AVANZADO
  tags            String[]         // ["álgebra", "matrices", "vectores"]
  
  // Contenido
  modules         CourseModule[]
  totalDurationMinutes Int  @default(0) // Calculado: suma de todas las lecciones
  totalLessons    Int      @default(0)  // Calculado: total de lecciones
  
  // Precio (lo pone el profesor)
  priceCents      Int              // En centavos MXN
  originalPriceCents Int?          // Precio sin descuento (para mostrar tachado)
  isFree          Boolean  @default(false) // Curso gratuito (lead magnet del profe)
  
  // Comisión
  commissionRate  Float    @default(0.25)  // 25% para YaEntre (CONFIRMADO por Ángel, 23 oct)
  
  // Estado
  status          CourseStatus @default(DRAFT)
  publishedAt     DateTime?
  archivedAt      DateTime?
  
  // Imagen
  thumbnailUrl    String?          // Imagen de portada
  previewVideoUrl String?          // Video de preview (1-3 min)
  
  // Métricas
  totalEnrollments Int     @default(0)
  averageRating    Float   @default(0)
  totalRatings     Int     @default(0)
  totalRevenueCents Int    @default(0)
  
  // Relaciones
  teacher         Teacher  @relation(fields: [teacherId], references: [id])
  enrollments     CourseEnrollment[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([teacherId])
  @@index([status])
  @@index([category])
  @@index([subjectArea])
  @@index([priceCents])
}

model CourseModule {
  id          String   @id @default(cuid())
  courseId    String
  
  title       String           // "Módulo 1: Introducción al álgebra"
  description String?
  sortOrder   Int              // Orden dentro del curso
  
  lessons     CourseLesson[]
  
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@index([courseId])
  @@index([sortOrder])
}

model CourseLesson {
  id          String   @id @default(cuid())
  moduleId    String
  
  title       String           // "1.1 — ¿Qué es una variable?"
  type        LessonType       // VIDEO | TEXT | QUIZ | RESOURCE
  sortOrder   Int
  
  // Contenido de video
  videoUrl    String?          // URL en Supabase Storage
  videoDurationSeconds Int?    // Duración del video en segundos
  
  // Contenido de texto/recurso
  content     String?  @db.Text // Markdown
  resourceUrl String?          // PDF, doc descargable
  
  // Quiz embebido (opcional)
  quizData    Json?            // { questions: [...] }
  
  // Control
  isFreePreview Boolean @default(false)  // Lección gratis como muestra
  
  module      CourseModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  progress    CourseLessonProgress[]
  
  @@index([moduleId])
  @@index([sortOrder])
}

model CourseEnrollment {
  id          String   @id @default(cuid())
  courseId    String
  userId      String
  
  // Pago
  pricePaidCents    Int        // Lo que pagó (puede diferir del precio actual por descuento)
  stripePaymentId   String?
  paidAt            DateTime?
  
  // Progreso
  completedLessons  Int     @default(0)
  totalLessons      Int                  // Snapshot al momento de compra
  progressPercent   Float   @default(0)
  completedAt       DateTime?
  lastAccessedAt    DateTime?
  
  // Calificación
  rating            Int?    // 1-5
  review            String? @db.Text
  ratedAt           DateTime?
  
  // Estado
  status            EnrollmentStatus @default(ACTIVE)
  refundedAt        DateTime?
  
  course      Course   @relation(fields: [courseId], references: [id])
  lessonProgress CourseLessonProgress[]
  
  createdAt   DateTime @default(now())
  
  @@unique([courseId, userId])
  @@index([courseId])
  @@index([userId])
  @@index([status])
}

model CourseLessonProgress {
  id            String   @id @default(cuid())
  enrollmentId  String
  lessonId      String
  
  completed     Boolean  @default(false)
  completedAt   DateTime?
  
  // Para videos: tracking de progreso
  videoProgressSeconds Int? // Hasta dónde vio
  
  enrollment    CourseEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  lesson        CourseLesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  
  @@unique([enrollmentId, lessonId])
  @@index([enrollmentId])
  @@index([lessonId])
}

// --- ENUMS ---

enum CourseCategory {
  REGULARIZACION    // Materias escolares (álgebra, cálculo, física, etc.)
  IDIOMAS           // Inglés, francés, etc.
  HABILIDADES       // Estudio, productividad, etc.
  TECNOLOGIA        // Programación, Office, etc.
  OTRO              // Catch-all
}

enum CourseLevel {
  BASICO
  INTERMEDIO
  AVANZADO
}

enum CourseStatus {
  DRAFT             // En edición
  IN_REVIEW         // Enviado a revisión admin
  PUBLISHED         // Publicado y visible
  ARCHIVED          // Archivado (no visible, acceso existente se mantiene)
  REJECTED          // Rechazado en revisión (con motivo)
}

enum LessonType {
  VIDEO
  TEXT
  QUIZ
  RESOURCE
}

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  REFUNDED
}
```

### 2.3 Comisión y pagos

```typescript
// src/lib/courses/commission.ts

export const COURSE_COMMISSION = {
  // YaEntre se queda con el 25% (igual que clases en vivo)
  YAENTRE_RATE: 0.25,
  // Profesor recibe el 75%
  TEACHER_RATE: 0.75,
  
  // Precio mínimo de un curso de pago: $99 MXN
  MIN_PRICE_CENTS: 9900,
  // Precio máximo: $9,999 MXN
  MAX_PRICE_CENTS: 999900,
  
  // Payout mínimo (igual que clases en vivo): $300 MXN
  MIN_PAYOUT_CENTS: 30000,
} as const;

/**
 * Calcula la distribución de una venta de curso.
 * 
 * NOTA FISCAL: mismos carriles que clases en vivo.
 * - Carril A (profesor factura): profesor emite CFDI por el 75%, 
 *   YaEntre retiene ISR 2.5% + IVA 8%
 * - Carril B (asimilados): YaEntre emite CFDI de nómina
 * 
 * RESICO: bajo Carril B, el 100% del precio del curso suma al RESICO de Ángel.
 * Bajo Carril A, solo la comisión del 25%.
 */
export function calculateCourseRevenue(priceCents: number): {
  teacherCents: number;
  yaentreCents: number;
} {
  const teacherCents = Math.round(priceCents * COURSE_COMMISSION.TEACHER_RATE);
  const yaentreCents = priceCents - teacherCents;
  return { teacherCents, yaentreCents };
}

/**
 * Valida el precio que el profesor quiere poner a su curso.
 */
export function validateCoursePrice(priceCents: number, isFree: boolean): {
  valid: boolean;
  error?: string;
} {
  if (isFree) return { valid: true };
  
  if (priceCents < COURSE_COMMISSION.MIN_PRICE_CENTS) {
    return { valid: false, error: `Precio mínimo: $${COURSE_COMMISSION.MIN_PRICE_CENTS / 100} MXN` };
  }
  if (priceCents > COURSE_COMMISSION.MAX_PRICE_CENTS) {
    return { valid: false, error: `Precio máximo: $${COURSE_COMMISSION.MAX_PRICE_CENTS / 100} MXN` };
  }
  
  return { valid: true };
}
```

### 2.4 Liquidación de cursos — integración con motor existente

Los ingresos por cursos se liquidan con el **mismo motor semanal SPEI** del marketplace de clases (ref: `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md` §7). Se agregan al `TeacherPayout` existente.

```prisma
// Ajustar el modelo TeacherPayout existente para soportar ambos tipos:

// Agregar campo al modelo TeacherPayout:
  courseRevenueCents  Int    @default(0)  // Ingresos por cursos en este periodo
  classRevenueCents   Int    @default(0)  // Ingresos por clases en este periodo
  
// Agregar relación con enrollments:
  courseEnrollments   CourseEnrollment[]
```

```typescript
// src/lib/teachers/payout-calculator.ts (complemento)

/**
 * Calcula el payout semanal combinando clases en vivo + cursos.
 * Se agrega al cálculo existente del motor de liquidación.
 */
export function calculateWeeklyPayout(params: {
  completedClasses: ClassSession[];
  courseEnrollments: CourseEnrollment[];
  retentionRate: number; // 0.15
}): {
  classGrossCents: number;
  courseGrossCents: number;
  totalGrossCents: number;
  retentionCents: number;
  netCents: number;
} {
  // Clases en vivo (75% del valor de la clase)
  const classGrossCents = params.completedClasses
    .reduce((sum, c) => sum + c.teacherPayCents, 0);
  
  // Cursos (75% del precio pagado)
  const courseGrossCents = params.courseEnrollments
    .filter(e => e.status === 'ACTIVE' && e.paidAt)
    .reduce((sum, e) => sum + Math.round(e.pricePaidCents * COURSE_COMMISSION.TEACHER_RATE), 0);
  
  const totalGrossCents = classGrossCents + courseGrossCents;
  const retentionCents = Math.round(totalGrossCents * params.retentionRate);
  const netCents = totalGrossCents - retentionCents;
  
  return {
    classGrossCents,
    courseGrossCents,
    totalGrossCents,
    retentionCents,
    netCents,
  };
}
```

### 2.5 Almacenamiento de videos

```typescript
// src/lib/courses/video-storage.ts

export const VIDEO_STORAGE = {
  // Supabase Storage bucket para videos de cursos
  BUCKET: 'course-videos',
  
  // Límites
  MAX_FILE_SIZE_MB: 500,     // 500 MB por video
  MAX_TOTAL_COURSE_GB: 5,    // 5 GB por curso
  ALLOWED_FORMATS: ['mp4', 'webm', 'mov'],
  
  // Nomenclatura: courses/{courseId}/{moduleOrder}/{lessonOrder}_{slug}.mp4
  // Ejemplo: courses/clx123/01/01_que-es-variable.mp4
  
  // Acceso: solo usuarios con enrollment activo
  // Implementar con Supabase Storage policies (RLS)
  // NO usar URLs públicas
} as const;

/**
 * Genera la ruta de almacenamiento para un video.
 */
export function getVideoStoragePath(params: {
  courseId: string;
  moduleOrder: number;
  lessonOrder: number;
  slug: string;
  extension: string;
}): string {
  const moduleDir = String(params.moduleOrder).padStart(2, '0');
  const lessonPrefix = String(params.lessonOrder).padStart(2, '0');
  return `courses/${params.courseId}/${moduleDir}/${lessonPrefix}_${params.slug}.${params.extension}`;
}
```

**Políticas de acceso (Supabase RLS en Storage):**
```sql
-- Solo el profesor dueño puede subir/editar videos de su curso
CREATE POLICY "Teachers upload own course videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM "Course" c
    JOIN "Teacher" t ON t.id = c."teacherId"
    WHERE c.id = split_part(name, '/', 2)
    AND t."userId" = auth.uid()
  )
);

-- Solo usuarios con enrollment activo pueden ver los videos
-- O lecciones marcadas como isFreePreview
CREATE POLICY "Enrolled users view course videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-videos'
  AND (
    -- El profesor dueño siempre puede ver
    EXISTS (
      SELECT 1 FROM "Course" c
      JOIN "Teacher" t ON t.id = c."teacherId"
      WHERE c.id = split_part(name, '/', 2)
      AND t."userId" = auth.uid()
    )
    OR
    -- Usuarios con enrollment activo
    EXISTS (
      SELECT 1 FROM "CourseEnrollment" ce
      JOIN "Course" c ON c.id = ce."courseId"
      WHERE c.id = split_part(name, '/', 2)
      AND ce."userId" = auth.uid()
      AND ce.status = 'ACTIVE'
    )
  )
);
```

### 2.6 Flujo del profesor — Creación de curso

```
1. CREAR CURSO
   ├─ Título, descripción, categoría, nivel, imagen de portada
   ├─ Video de preview (1-3 min, opcional pero recomendado)
   └─ status = DRAFT

2. AGREGAR MÓDULOS
   ├─ Título del módulo (ej: "Módulo 1: Introducción")
   └─ Ordenar con drag-and-drop

3. AGREGAR LECCIONES A CADA MÓDULO
   ├─ Video: subir archivo → transcoding en background → URL
   ├─ Texto: editor Markdown (mismo editor que ya usa la app)
   ├─ Quiz: preguntas de opción múltiple (embebidas)
   ├─ Recurso: subir PDF/doc descargable
   └─ Marcar hasta 3 lecciones como "preview gratuito"

4. CONFIGURAR PRECIO
   ├─ Rango: $99 — $9,999 MXN (o gratis)
   ├─ Mostrar: "Recibirás $X por cada venta (75%)"
   ├─ Precio original (opcional): para mostrar descuento tachado
   └─ Validar con validateCoursePrice()

5. ENVIAR A REVISIÓN
   ├─ Validaciones automáticas:
   │   ├─ Al menos 1 módulo con al menos 1 lección
   │   ├─ Al menos 1 video de mínimo 5 minutos total
   │   ├─ Título y descripción no vacíos
   │   ├─ Imagen de portada
   │   └─ Precio válido (o marcado como gratuito)
   └─ status = IN_REVIEW

6. REVISIÓN ADMIN (Ángel)
   ├─ Verificar que el contenido es apropiado
   ├─ Verificar que no es contenido copiado / pirata
   ├─ Verificar calidad mínima (video/audio aceptable)
   ├─ Aprobar → status = PUBLISHED, publishedAt = now()
   └─ Rechazar → status = REJECTED + motivo
```

### 2.7 UX del alumno — Catálogo de cursos

```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Cursos                                                    │
│                                                              │
│ [Todos] [Regularización] [Idiomas] [Tecnología] [Otros]     │
│                                                              │
│ 🔍 Buscar cursos...                                          │
│                                                              │
│ Ordenar: [Más populares ▾]                                   │
│                                                              │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │  [thumb]    │  │  [thumb]    │  │  [thumb]    │          │
│ │             │  │             │  │             │          │
│ │ Álgebra     │  │ Inglés B2   │  │ Cálculo     │          │
│ │ lineal      │  │ intensivo   │  │ integral    │          │
│ │             │  │             │  │             │          │
│ │ Prof. Juan  │  │ Prof. Ana   │  │ Prof. Luis  │          │
│ │ ⭐ 4.8 (32) │  │ ⭐ 4.5 (18) │  │ ⭐ 4.9 (45) │          │
│ │ 12 lecciones│  │ 8 lecciones │  │ 15 lecciones│          │
│ │ 4h 30min    │  │ 3h 15min    │  │ 6h 10min    │          │
│ │             │  │             │  │             │          │
│ │ $499        │  │ GRATIS      │  │ $399 ~~$699~~│          │
│ │ [Ver curso] │  │ [Inscribirse]│  │ [Ver curso] │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

**Página de detalle del curso:**

```
┌──────────────────────────────────────────────────────────────┐
│ Álgebra lineal desde cero                                    │
│ Por Prof. Juan Pérez ⭐ Inicial                              │
│                                                              │
│ ┌──────────────────────────────────┐                        │
│ │   ▶ VIDEO DE PREVIEW (2:30)     │                        │
│ └──────────────────────────────────┘                        │
│                                                              │
│ Lo que aprenderás:                                           │
│ ✓ Sistemas de ecuaciones lineales                            │
│ ✓ Matrices y determinantes                                   │
│ ✓ Espacios vectoriales                                       │
│ ✓ Transformaciones lineales                                  │
│                                                              │
│ 12 lecciones · 4h 30min · Nivel Básico                      │
│ 32 alumnos inscritos · ⭐ 4.8 promedio                      │
│                                                              │
│ Contenido del curso:                                         │
│ ▼ Módulo 1: Introducción (3 lecciones)                      │
│    ▶ 1.1 ¿Qué es el álgebra lineal? — 12:00  🆓            │
│    🔒 1.2 Sistemas de ecuaciones — 18:00                     │
│    🔒 1.3 Quiz: conceptos básicos                            │
│ ▼ Módulo 2: Matrices (4 lecciones)                          │
│    🔒 2.1 Tipos de matrices — 15:00                          │
│    ...                                                       │
│                                                              │
│ ──────────────────────────────────────                       │
│                                                              │
│ $499 MXN                                                     │
│ Acceso permanente · Certificado al completar                 │
│                                                              │
│        [ Comprar curso — $499 ]                              │
│                                                              │
│ 🆓 = Lección gratuita de muestra                             │
│ 🔒 = Disponible al comprar                                   │
└──────────────────────────────────────────────────────────────┘
```

### 2.8 Endpoints API — Cursos

```
// ──── PÚBLICO (cualquier visitante) ────
GET    /api/courses                          — Catálogo de cursos publicados
       Query: ?category=REGULARIZACION&level=BASICO&sort=popular&q=algebra
GET    /api/courses/{slug}                   — Detalle del curso (info pública + módulos)

// ──── ALUMNO AUTENTICADO ────
POST   /api/courses/{slug}/enroll            — Inscribirse (pago via Stripe)
GET    /api/courses/{slug}/content           — Contenido completo (requiere enrollment)
PATCH  /api/courses/{slug}/progress/{lessonId} — Marcar lección completada
POST   /api/courses/{slug}/rate              — Calificar curso (1-5★ + reseña)
GET    /api/me/courses                       — Mis cursos (inscritos)

// ──── PROFESOR ────
GET    /api/teachers/me/courses              — Mis cursos (creados)
POST   /api/teachers/me/courses              — Crear curso nuevo (draft)
PATCH  /api/teachers/me/courses/{id}         — Editar curso (solo en DRAFT)
POST   /api/teachers/me/courses/{id}/modules — Agregar módulo
PATCH  /api/teachers/me/courses/{id}/modules/{moduleId}  — Editar módulo
POST   /api/teachers/me/courses/{id}/modules/{moduleId}/lessons — Agregar lección
PATCH  /api/teachers/me/courses/{id}/lessons/{lessonId}  — Editar lección
POST   /api/teachers/me/courses/{id}/submit  — Enviar a revisión
POST   /api/teachers/me/courses/{id}/videos/upload — Subir video (signed URL)
GET    /api/teachers/me/courses/{id}/analytics — Estadísticas del curso

// ──── ADMIN ────
GET    /api/admin/courses                    — Todos los cursos (con filtro de status)
GET    /api/admin/courses/pending-review     — Cursos pendientes de revisión
PATCH  /api/admin/courses/{id}/approve       — Aprobar curso
PATCH  /api/admin/courses/{id}/reject        — Rechazar curso (con motivo)
PATCH  /api/admin/courses/{id}/archive       — Archivar curso
```

### 2.9 Módulo de Regularización (CONFIRMADO por Ángel, 23 oct 2026)

"Regularización" = reforzar materias escolares (secundaria, bachillerato, licenciatura) para alumnos con bajo rendimiento. **Es un módulo independiente de los exámenes de admisión** y tiene **dos formatos**:

| Formato | Qué es | Precio | Comisión |
|---|---|---|---|
| **Cursos pregrabados** | Categoría `REGULARIZACION` del Course Marketplace (§2.1–2.8) | Libre del profesor ($99–$9,999) | 25% |
| **Clases en vivo de regularización** | Clases 1:1 en línea de materias escolares, con el mismo motor de reserva, aula y liquidación del marketplace de clases | Tabulador determinista propio (§2.10) | 25% |

#### 2.10 Clases en vivo de regularización — diseño

**Pista (`track`) de la clase.** Toda `ClassSession` pertenece a una de dos pistas:

```prisma
// Agregar a ClassSession (ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md §2.1):
  track        ClassTrack @default(ADMISION)

// Agregar a TeacherSubject:
  track        ClassTrack @default(ADMISION)
// (cambiar el unique a @@unique([teacherId, subjectKey, track]))

enum ClassTrack {
  ADMISION        // Preparación de examen de admisión UNAM/IPN — requiere Premium
  REGULARIZACION  // Refuerzo de materias escolares — NO requiere plan de admisión
}
```

**Acceso por pista:**

| Pista | ¿Quién puede reservar? | Requisitos |
|---|---|---|
| `ADMISION` | Solo alumno con **Premium activo** (sin cambios, regla inviolable del CONTEXTO §3.2) | Premium + tarjeta guardada |
| `REGULARIZACION` | **Cualquier usuario registrado** (Free, Básico, Premium o sin plan) | Cuenta + tarjeta guardada; si es menor de 18, consentimiento del tutor por liga (igual que Premium) |

> ⚠️ **Decisión de producto a validar por Ángel:** abrir regularización a usuarios sin Premium hace que parte del directorio se use sin pagar plan. Se asume correcto porque el módulo es un producto aparte y genera comisión por sesión. **La regla "Premium abre acceso al directorio, no incluye clases" no se altera:** Premium sigue siendo el requisito de la pista `ADMISION`. En copy, nunca vender Premium como "acceso a clases en general".

**Mismo profesor, dos pistas.** El profesor declara en onboarding en qué pista(s) enseña y qué materias. Su nivel (Inicial/Verificado/Destacado), calificación y métricas son **únicos** (suman entre pistas). Un profesor puede dar solo regularización sin dar admisión.

**Catálogo de materias de regularización** (`subjectKey` con prefijo `reg_`): sugerido inicial — matemáticas, física, química, biología, español, inglés, historia, geografía, cálculo, álgebra, estadística. El CTO debe dejarlo en tabla/constante editable, no hardcodeado en UI.

**Tarifa base propuesta (B) para regularización** (centavos MXN) — **valores propuestos por CFO, Ángel puede ajustarlos antes del deploy**:

```typescript
// src/lib/teachers/tariff.ts — agregar junto a BASE_RATES
export const BASE_RATES_REGULARIZACION: Record<string, number> = {
  reg_matematicas: 26000,   // $260
  reg_algebra: 26000,
  reg_calculo: 30000,       // $300
  reg_estadistica: 28000,
  reg_fisica: 28000,
  reg_quimica: 26000,
  reg_biologia: 24000,      // $240
  reg_espanol: 22000,       // $220
  reg_ingles: 26000,
  reg_historia: 22000,
  reg_geografia: 22000,
};
// Mismos multiplicadores N, D, A, H, Q y el MISMO tope duro 1.5×.
// calculateTariff() recibe `track` y elige la tabla de tarifas base.
// validateTariffInput() sigue prohibiendo cualquier dato del comprador.
```

Reglas:
- La fórmula, el tope 1.5× y los multiplicadores son **idénticos** a admisión; solo cambia la tabla `B`.
- El alumno ve solo el precio final. En la página de transparencia se publican rangos por materia **por pista**.
- Comisión 25% / profesor 75%, reserva de desempeño 15%/30 días, SPEI semanal y carriles A/B: **sin cambios** (misma `TeacherPayout`).
- `ClassSession.track` entra al reporte del admin y al monitor RESICO (mismo tratamiento fiscal que admisión).
- Disponibilidad y slots (§1): sin cambios. El endpoint de slots acepta `?track=REGULARIZACION`.
- Directorio: filtro por pista. Un usuario sin Premium solo ve y reserva la pista `REGULARIZACION`; la pista `ADMISION` muestra upsell a Premium.
- Cursos y clases de regularización comparten la sección **/regularizacion** del producto (landing propia + catálogo de cursos + directorio de profesores), separada visualmente de la preparación de admisión.

**Mensajería de la sección:** "Regulariza tus materias a tu ritmo: cursos en video y clases con profesores independientes verificados en YaEntre." Prohibido prometer calificación aprobatoria o resultado escolar (equivalente a la regla de no garantizar ingreso).

---

## 3. Temporalidad de membresía / accesos

### 3.1 Estudio de mercado — competencia

| Plataforma | Precio | Temporalidad | Renovación |
|-----------|--------|-------------|------------|
| **Unitips** | $279-$599/mes (auto-renew) o bloques 3/6/12 meses prepagados | Mensual auto-renew o bloque fijo | Garantía: 3 meses gratis si completó 100% y no quedó |
| **Conamat (en línea)** | ~$3,900 MXN | Autopaced, acceso fijo | Reactivación $800 para siguiente ciclo |
| **Unibetas** | $2,000 MXN | Hasta que llegue tu examen (2027) | Implícito: caduca al presentar |
| **Conamat (presencial)** | ~$7,700 MXN | 9 meses / 144 horas | Repetir gratis si cursó completo (presencial) |

**Hallazgos clave:**
- Todas las plataformas anclan el acceso al ciclo de examen, no al calendario.
- El modelo mensual (Unitips) genera churn y fricción constante.
- El modelo "hasta tu examen" (Unibetas) es simple pero ambiguo.
- YaEntre a $999 es un 75% más barato que Conamat y un 50% más barato que Unibetas.

### 3.2 Recomendación: 12 meses desde la compra

**Modelo elegido: acceso por 12 meses naturales desde la fecha de compra.**

```typescript
// src/lib/subscriptions/access-duration.ts

export const ACCESS_DURATION = {
  // Duración base de los planes de pago
  BASICO_DAYS: 365,        // 12 meses
  PREMIUM_DAYS: 365,       // 12 meses
  MENSUAL_DAYS: 30,        // 30 días (auto-renew via Stripe)
  FREE_DAYS: null,         // Sin caducidad
  
  // Extensión por costo extra
  EXTENSION_DAYS: 180,     // 6 meses
  EXTENSION_PRICE_CENTS: { // Precio de extensión
    BASICO: 49900,         // $499 MXN (50% del EB)
    PREMIUM: 89900,        // $899 MXN (50% del EB)
  },
  
  // Gracia: X días después de expirar antes de bloquear acceso
  GRACE_PERIOD_DAYS: 7,
} as const;
```

**Justificación:**

1. **Cubre dos rondas de examen automáticamente.** UNAM tiene convocatoria ~febrero y ~junio; IPN ~marzo y ~agosto. Con 12 meses el alumno presenta ambas sin pagar más.

2. **Simple de implementar y comunicar.** "12 meses de acceso" es claro. No depende de calendarios de universidades que cambian.

3. **Superior a la competencia.** Unitips cobra mensual (~$3,600/año por el plan similar); Conamat cobra $3,900 + $800 de reactivación. YaEntre a $999 por 12 meses es imbatible.

4. **Margen protegido.** Neto EB Básico = ~$777. Neto EB Premium = ~$1,427. Ambos muy por encima del piso de $500.

5. **Upsell natural.** La extensión de 6 meses a mitad de precio ($499/$899) captura a quienes no quedaron en la primera ronda sin regalar acceso indefinido.

### 3.3 Implementación

```prisma
// Ajustar modelo de suscripción existente:

model Subscription {
  // ... campos existentes ...
  
  // Temporalidad
  startsAt        DateTime  @default(now())
  expiresAt       DateTime  // startsAt + ACCESS_DURATION.X_DAYS
  
  // Extensión
  extendedAt      DateTime? // Fecha en que se compró extensión
  originalExpiresAt DateTime? // La fecha original antes de extender
  
  // Gracia
  graceEndsAt     DateTime? // expiresAt + GRACE_PERIOD_DAYS
  
  // Estado derivado (no campo, lógica):
  // ACTIVE: now < expiresAt
  // GRACE: expiresAt <= now < graceEndsAt
  // EXPIRED: now >= graceEndsAt
}
```

```typescript
// src/lib/subscriptions/access-check.ts

export type AccessStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'NONE';

export function checkAccessStatus(subscription: {
  expiresAt: Date;
  graceEndsAt: Date | null;
} | null): AccessStatus {
  if (!subscription) return 'NONE';
  
  const now = new Date();
  
  if (now < subscription.expiresAt) return 'ACTIVE';
  
  if (subscription.graceEndsAt && now < subscription.graceEndsAt) return 'GRACE';
  
  return 'EXPIRED';
}

/**
 * Calcula la fecha de expiración al momento de la compra.
 */
export function calculateExpirationDate(
  plan: 'MENSUAL' | 'BASICO' | 'PREMIUM',
  purchaseDate: Date = new Date()
): Date {
  const days = plan === 'MENSUAL' 
    ? ACCESS_DURATION.MENSUAL_DAYS 
    : ACCESS_DURATION.BASICO_DAYS; // Mismo para Básico y Premium
  
  const expires = new Date(purchaseDate);
  expires.setDate(expires.getDate() + days);
  return expires;
}

/**
 * Extiende la vigencia 6 meses.
 * Solo disponible si el acceso está ACTIVE o GRACE.
 * Se cobra ACCESS_DURATION.EXTENSION_PRICE_CENTS[plan].
 */
export function calculateExtensionDate(
  currentExpiresAt: Date,
): Date {
  const extended = new Date(currentExpiresAt);
  extended.setDate(extended.getDate() + ACCESS_DURATION.EXTENSION_DAYS);
  return extended;
}
```

### 3.4 UX de temporalidad

**En la página de precios:**

```
┌─────────────────────────────────────────────────┐
│ Plan Básico                                      │
│                                                  │
│ $999 MXN                                         │
│ (Early Bird — termina 30 nov)                    │
│                                                  │
│ ✓ 12 meses de acceso                             │
│ ✓ Cubre ambas convocatorias (feb + jun)          │
│ ✓ Simulacros y reactivos ilimitados              │
│ ✓ Ruta adaptativa + Entrómetro                   │
│                                                  │
│ [Comprar — $999]                                 │
└─────────────────────────────────────────────────┘
```

**Banner de expiración próxima (30 días antes):**

```
┌──────────────────────────────────────────────────┐
│ ⏰ Tu acceso a YaEntre expira el 15 de octubre.  │
│                                                  │
│ Extiende 6 meses más por solo $499.              │
│ Sigue practicando para la próxima convocatoria.  │
│                                                  │
│ [Extender acceso — $499]     [Ahora no]          │
└──────────────────────────────────────────────────┘
```

**En periodo de gracia (7 días post-expiración):**

```
┌──────────────────────────────────────────────────┐
│ ⚠️ Tu acceso expiró el 15 de octubre.             │
│                                                  │
│ Tienes hasta el 22 de octubre para extender.     │
│ Después de esa fecha perderás el acceso           │
│ a simulacros y contenido premium.                 │
│                                                  │
│ Tu progreso y estadísticas se conservan.          │
│                                                  │
│ [Extender 6 meses — $499]                        │
└──────────────────────────────────────────────────┘
```

### 3.5 Correos de temporalidad

| Cuándo | Asunto | Acción |
|--------|--------|--------|
| 30 días antes de expirar | "Tu acceso a YaEntre expira pronto" | CTA: Extender |
| 7 días antes | "Te quedan 7 días de acceso" | CTA: Extender |
| 1 día antes | "Último día de acceso — extiende ahora" | CTA: Extender |
| Día de expiración | "Tu acceso ha expirado" | CTA: Extender (gracia) |
| Fin de gracia | "Acceso finalizado — tu progreso está guardado" | CTA: Renovar plan completo |

**Nota:** el plan Mensual NO tiene extensión — tiene auto-renovación vía Stripe (subscription recurrente). El correo de aviso de renovación (5 días antes con liga de cancelación) ya está en el backlog del Bloque 1, §9.5 del CONTEXTO.

### 3.6 Endpoints API — Temporalidad

```
GET    /api/me/subscription          — Estado actual (incluye expiresAt, accessStatus)
POST   /api/me/subscription/extend   — Comprar extensión de 6 meses
GET    /api/admin/subscriptions/expiring  — Suscripciones por expirar (próximos 30 días)
```

---

## 4. Corrección de mensajería

### 4.1 El problema

La landing actual dice **"no es otra página con videos"** (o variantes como "no es otra plataforma de cursos grabados"). Sin embargo, YaEntre ahora incluirá:
1. **Clases en vivo con grabación** (Premium, marketplace de profesores)
2. **Cursos pregrabados** (Course Marketplace, independiente de planes)

Decir "no somos videos" mientras se venden videos es contradictorio y erosiona credibilidad.

### 4.2 Análisis

La intención original del mensaje era diferenciarse de plataformas como Coursera/Udemy/Khan Academy que **solo** ofrecen video pasivo. YaEntre se diferencia porque su core es un **simulador interactivo** con motor adaptativo, no un catálogo de videos.

El error no es tener videos — es posicionar YaEntre como si fueran excluyentes.

### 4.3 Solución: reposicionar, no eliminar

**Antes (problemático):**
> "No es otra página con videos"

**Después (correcto):**
> "No es solo ver videos. Es practicar hasta quedar."

**Copy completo recomendado para landing (sección de diferenciación):**

```
TÍTULO:        "Practicar > ver videos"
SUBTÍTULO:     "Los videos explican. YaEntre te entrena."
CUERPO:        "Nuestro simulador replica el examen real. 
                El Entrómetro te dice en qué materia enfocarte. 
                Y si necesitas reforzar un tema, tienes 
                clases con profesores verificados y cursos 
                a tu ritmo."
```

### 4.4 Reglas de copy actualizadas

**Eliminar de todo el sitio:**
- ❌ "No es otra página con videos"
- ❌ "No somos otra plataforma de cursos"
- ❌ "Aquí no verás videos"
- ❌ Cualquier negación directa de "videos" como concepto

**Reemplazar con:**
- ✅ "Practicar > ver videos" (comparativo, no excluyente)
- ✅ "Los videos explican. YaEntre te entrena." (complementario)
- ✅ "El examen no es de ver — es de resolver. Por eso YaEntre se enfoca en la práctica."
- ✅ "Simulacros que replican el examen real + clases para reforzar lo que necesites."

**Jerarquía de producto en el messaging:**
1. **Core (siempre primero):** simulador, motor adaptativo, Entrómetro, práctica
2. **Complemento (segundo):** clases en vivo con profesores verificados (Premium)
3. **Extra (tercero):** cursos pregrabados para reforzar cualquier materia

**Regla: nunca liderar con videos ni con clases.** El diferenciador de YaEntre es la práctica inteligente. Las clases y cursos son el complemento, no el producto principal.

### 4.5 Implementación — archivos a modificar

```
// Archivos que probablemente contienen el copy a actualizar:
// (el CTO debe buscar con grep todas las ocurrencias)

BUSCAR:
  grep -ri "no es otra" src/
  grep -ri "videos" src/app/(marketing)/
  grep -ri "otra página" src/
  grep -ri "otra plataforma" src/

ACTUALIZAR:
  src/app/(marketing)/page.tsx        — Landing principal
  src/app/(marketing)/pricing/page.tsx — Página de precios
  src/components/marketing/*.tsx       — Componentes de marketing
  
// También actualizar metadata/SEO si mencionan videos negativamente
```

---

## 5. Complementos al esquema de pagos a profes

> La spec completa de pagos está en `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md` §7. Aquí solo se documenta lo que cambia o se agrega.

### 5.1 Dos fuentes de ingreso para el profesor

Con el Course Marketplace, el profesor ahora tiene dos vías de ingreso:

| Fuente | Comisión YaEntre | Pago al profesor | Liquidación |
|--------|-----------------|------------------|-------------|
| **Clase en vivo** | 25% | 75% | Semanal SPEI |
| **Curso pregrabado** | 25% | 75% | Semanal SPEI (mismo ciclo) |

**Comisión única de 25% en todo (decisión de Ángel, 23 oct):** simplifica el contrato de comisión mercantil, la liquidación y la explicación al profesor ("YaEntre se queda 25% de todo lo que vendes"). Vigilar: el costo de almacenamiento/bandwidth de video corre por YaEntre; revisar la comisión de cursos si el gasto de Supabase Storage supera el margen (revisión sugerida al llegar a 20 cursos publicados).

### 5.2 Payout unificado

El `TeacherPayout` semanal ahora incluye ambas fuentes. En la hoja de pago que Ángel usa para el SPEI manual, se desglosar por fuente:

```
┌──────────────────────────────────────────────────────────────┐
│ 💰 Liquidación — Semana 20-26 oct 2026                      │
│                                                              │
│ Prof. Juan Pérez García                                      │
│ CLABE: 012180015812345678  Banco: BBVA                       │
│                                                              │
│ Clases en vivo:                                              │
│   4 clases completadas            $1,200.00                  │
│                                                              │
│ Cursos pregrabados:                                          │
│   12 inscripciones esta semana    $4,485.00                  │
│                                                              │
│ Bruto total:                      $5,685.00                  │
│ Reserva de desempeño (15%):       −$852.75                   │
│ ─────────────────────────────────────────────                │
│ NETO A TRANSFERIR:                $4,832.25                  │
│                                                              │
│ Referencia: YAENTRE-PO-A3F81B2C                              │
│                                                              │
│ [Marcar como transferido]                                    │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Impacto en monitor RESICO

El `calculateResicoStatus()` de la spec del marketplace (§10) debe sumar **también** los ingresos de cursos:

```typescript
// Complemento a src/lib/admin/resico-monitor.ts
// Agregar al cálculo existente:

export function calculateResicoStatusV2(
  subscriptionRevenueCents: number,
  classRevenue: { totalCents: number; commissionCents: number; carrils: { A: number; B: number } },
  courseRevenue: { totalCents: number; commissionCents: number; carrils: { A: number; B: number } },
  dayOfYear: number,
): ResicoStatus {
  // Clases: Carril B = total, Carril A = solo comisión 25%
  const classIncomeCents = classRevenue.totalCents; // Peor caso
  
  // Cursos: misma lógica
  // Carril B = total del curso, Carril A = solo comisión 25%
  const courseIncomeCents = courseRevenue.totalCents; // Peor caso
  
  const ytd = subscriptionRevenueCents + classIncomeCents + courseIncomeCents;
  
  // ... resto del cálculo igual que antes
}
```

---

## 6. Complementos al tarifario de profes

> El tabulador completo está en `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md` §5. Aquí solo se documenta lo que se agrega.

### 6.1 Tarifario de clases en vivo — sin cambios en la fórmula

El tabulador determinista `B × N × D × A × H × Q` con cap 1.5× **no cambia**. Lo único que se agrega es una segunda tabla de tarifa base `B` para la pista `REGULARIZACION` (ver §2.10). Todo lo demás de la spec del marketplace aplica tal cual.

### 6.2 Cursos pregrabados — precio libre del profesor

A diferencia de las clases en vivo (precio determinista), en los cursos pregrabados **el profesor pone el precio**. Esto es intencional:

- En clases en vivo, YaEntre controla la experiencia y la calidad (profesor verificado, en tiempo real)
- En cursos pregrabados, el contenido varía mucho en profundidad y duración; un tabulador determinista no tiene sentido
- El mercado (Udemy, Domestika, Platzi) usa precio libre del instructor

**Controles de YaEntre sobre el precio:**
- Mínimo: $99 MXN (o gratis)
- Máximo: $9,999 MXN
- Recomendación al profesor (no obligatoria): "Cursos de 1-3 horas: $199-$499. Cursos de 3-10 horas: $499-$999."

### 6.3 Nota sobre la tabla de tarifas base por materia

La tabla `BASE_RATES` de la spec del marketplace queda para la pista `ADMISION`; `BASE_RATES_REGULARIZACION` (§2.10) cubre la pista `REGULARIZACION`. Materias fuera de ambos catálogos (ej: programación, diseño) **no tienen clases en vivo**, solo cursos pregrabados (precio libre).

---

## 7. Guardrails adicionales

Estos se suman a los de `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md` §13 y `CONTEXTO_YAENTRE_HANDOFF.md` §8:

### 7.1 Cursos pregrabados

- ❌ **NUNCA** permitir que un curso pregrabado incluya contenido de los reactivos/banco de preguntas de YaEntre (propiedad intelectual de la plataforma)
- ❌ **NUNCA** subir videos sin verificar formato y tamaño (MAX 500 MB/video, 5 GB/curso)
- ❌ **NUNCA** dar acceso a videos sin enrollment activo (excepto lecciones de preview)
- ❌ **NUNCA** permitir que el profesor cambie el precio de un curso con enrollments activos sin notificar a los inscritos (precio de compra honrado siempre)
- ✅ El acceso al curso comprado es **permanente** (no caduca con la membresía de admisión)
- ✅ Si un curso se archiva, los alumnos inscritos **mantienen acceso** a lo que ya compraron
- ✅ Los videos se sirven desde Supabase Storage con RLS, **nunca** URLs públicas
- ✅ Máximo 3 lecciones de preview gratuito por curso

### 7.1b Regularización (clases en vivo)

- ❌ **NUNCA** permitir reservar una clase de pista `ADMISION` sin Premium activo (la pista `REGULARIZACION` sí es abierta)
- ❌ **NUNCA** prometer calificación aprobatoria, regularización garantizada ni resultado escolar en el copy
- ❌ **NUNCA** usar datos del alumno en el tabulador de regularización (misma validación `validateTariffInput`)
- ✅ Mismo tope duro 1.5× y mismos multiplicadores que admisión; solo cambia la tabla B
- ✅ Menores de 18: consentimiento del tutor por liga antes de la primera reserva, también en regularización

### 7.2 Disponibilidad y horarios

- ❌ **NUNCA** permitir reservar un slot que ya tiene otra clase (doble booking)
- ❌ **NUNCA** permitir reservar con menos de 4 horas de anticipación
- ❌ **NUNCA** ignorar las fechas bloqueadas del profesor
- ✅ Buffer de 10 minutos entre clases (incluido en validación de conflictos)
- ✅ Horario operable: 7:00-22:00 hora CDMX
- ✅ Toda la lógica de horarios en zona `America/Mexico_City`

### 7.3 Temporalidad

- ❌ **NUNCA** extender acceso gratis sin instrucción explícita de Ángel (admin)
- ❌ **NUNCA** bloquear acceso sin dar el periodo de gracia de 7 días
- ❌ **NUNCA** borrar progreso/estadísticas del alumno al expirar (solo bloquear acceso a contenido premium)
- ✅ Enviar los 5 correos de temporalidad (§3.5) sin falta
- ✅ La extensión se cobra al precio fijo de §3.2, independiente de la temporada (no aplica EB/TA/UM)

### 7.4 Mensajería

- ❌ **NUNCA** escribir "no es otra página con videos" ni variantes negativas de "videos"
- ❌ **NUNCA** liderar marketing con videos o clases — el diferenciador es la práctica
- ✅ Jerarquía: simulador/práctica → clases en vivo → cursos pregrabados

---

## 8. Prioridad de implementación

### 8.1 Orden sugerido

| Fase | Qué | Cuándo | Depende de |
|------|-----|--------|------------|
| **EB+1** | Temporalidad de acceso (§3) — `expiresAt`, lógica de acceso, correos | Inmediato post-EB | Nada (ajuste a suscripción existente) |
| **EB+1** | Corrección de mensajería (§4) — grep + replace copy | Inmediato post-EB | Nada |
| **Post-EB fase 1** | Sistema de disponibilidad del profesor (§1) | Junto con onboarding de profesores | Marketplace fase 1 |
| **Post-EB fase 1** | Calendario de reserva del alumno (§1.6) | Junto con disponibilidad | Disponibilidad |
| **Post-EB fase 1** | Pista `REGULARIZACION` en clases en vivo (§2.10): `ClassTrack`, tabla `BASE_RATES_REGULARIZACION`, filtro de directorio, acceso sin Premium | Junto con la reserva de clases | Reserva + pago de clase del marketplace |
| **Post-EB fase 2** | Course Marketplace: modelos + CRUD de cursos + subida de video (§2) | Después de primeros profes activos | Al menos 1 profesor onboardeado |
| **Post-EB fase 3** | Course Marketplace: catálogo público + compra + acceso a contenido + sección /regularizacion | Después de al menos 3 cursos publicados | Fase 2 de cursos |
| **Post-EB fase 4** | Course Marketplace: analytics del profesor + calificaciones | Después de primeras ventas | Fase 3 de cursos |

### 8.2 Para Early Bird NO se necesita nada de esta spec

Todo lo de este documento es post-EB. Para Early Bird:
- La temporalidad actual (si existe) puede quedarse como está; implementar §3 inmediatamente después
- El messaging se puede corregir en cualquier momento (grep + replace, no bloquea nada)
- El Course Marketplace y la regularización requieren profesores activos primero

### 8.3 Dependencias cruzadas

```
CONTEXTO_YAENTRE_HANDOFF.md (decisiones maestras)
    |
    +-- ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md
    |   +-- Pagos a profes (S7) <- este doc S5 lo complementa con cursos
    |   +-- Tabulador (S5) <- este doc S2.10/S6 agrega la pista REGULARIZACION
    |   +-- Niveles (S4) <- sin cambios (nivel unico entre pistas)
    |   +-- Onboarding (S3) <- agregar seleccion de pista(s) y materias
    |
    +-- ESPECIFICACION_QR_COMISIONES_CTO.md
    |   +-- Cursos y clases NO generan comision de referido (solo planes; ver S8.4)
    |
    +-- ESTE DOCUMENTO
        +-- S1: Disponibilidad (NUEVO - prerequisito de reserva de clases)
        +-- S2: Course Marketplace + Regularizacion (NUEVO)
        +-- S3: Temporalidad (NUEVO - afecta suscripciones existentes)
        +-- S4: Mensajeria (CORRECCION - solo copy)
        +-- S5: Pagos complemento (extiende spec marketplace)
        +-- S6: Tarifario complemento (aclara spec marketplace)
```

### 8.4 Comisiones de referido en cursos y clases

**DECISIÓN FINAL:** La comisión de referido (niveles 1, 2 y 3) aplica **solo a la venta de planes de admisión** (Básico y Premium; el Mensual no genera comisión, como ya define la spec QR), **no a cursos pregrabados ni a clases en vivo** (ni de admisión ni de regularización). Razón: con comisión de 25%, YaEntre retiene ~$25–$125 en un curso de $99–$499; un referido de $150 haría el neto negativo. El código debe rechazar cualquier `ReferralSale` cuyo origen no sea un plan, y el descuento de $100 del código de Embajador tampoco aplica a cursos ni clases.

### 8.5 Decisiones de Ángel registradas en esta spec (23 oct 2026)

| Tema | Decisión |
|---|---|
| Comisión de cursos pregrabados | **25%** (profesor 75%), igual que clases en vivo |
| Regularización | Módulo independiente de admisión con **cursos pregrabados + clases en vivo** (pista `REGULARIZACION`) |
| Temporalidad | **12 meses** desde la compra + extensión de 6 meses ($499 Básico / $899 Premium) + gracia 7 días |
| Mensajería | "Practicar > ver videos" (reemplaza "no es otra página con videos") |

**Pendiente de validar por Ángel:** (a) tarifas base de regularización (§2.10), (b) abrir la pista `REGULARIZACION` a usuarios sin Premium, (c) precios de extensión (§3.2).

---

*Fin de especificación. Leer en conjunto con: `CONTEXTO_YAENTRE_HANDOFF.md`, `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md`, `ESPECIFICACION_QR_COMISIONES_CTO.md`.*
