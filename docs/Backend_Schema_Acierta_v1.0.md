# Backend Schema — Acierta
## Data Model & Database Specification · v1.0

| Campo | Detalle |
|---|---|
| **Producto** | Acierta (acierta.mx) |
| **Documento** | Backend Schema Specification |
| **Versión** | 1.0 |
| **Fecha** | 9 de julio de 2026 |
| **Base de datos** | Supabase PostgreSQL |
| **ORM** | Prisma |
| **Depende de** | PRD v1.0 · TRD v1.0 · Flujo de App v1.0 |
| **Estado** | Schema final ejecutable — fuente de verdad de la capa de datos |

---

## Tabla de contenidos

1. Propósito y principios del modelo
2. Diagrama entidad-relación (ERD)
3. Referencia de enums
4. `schema.prisma` completo y ejecutable
5. Diccionario de datos (entidades clave)
6. Índices y estrategia de performance
7. Row Level Security (RLS)
8. Estrategia de datos semilla (seed)
9. Plan de migración desde Certifik PLD
10. Integridad referencial, cascadas y borrado
11. Escalabilidad y decisiones diferidas

---

## 1. Propósito y principios del modelo

Este documento reconcilia todas las decisiones de datos dispersas en los documentos anteriores en un único schema coherente y ejecutable. Respecto al blueprint original, esta versión **añade** los modelos que el TRD y el Flujo de App introdujeron: `Subscription`, `Payment`, `ProcessedStripeEvent`, `ParentLink`, `ParentLinkCode`, `QuestionReport` y `NotificationPreference`, además de estados formales (`SessionStatus`, `SubscriptionStatus`).

### Principios

| # | Principio | Implicación |
|---|---|---|
| S1 | **Prisma es la fuente de verdad** | El schema genera los tipos de toda la app; ningún acceso a datos fuera de él. |
| S2 | **Taxonomía dinámica, no hardcodeada** | Institución → Área → Materia → Tema es data, no código. Agregar UAM/EXANI es seed, no deploy. |
| S3 | **Fase 2 preparada, inactiva** | Campos de video/profesor existen con `status=INACTIVE`; no requieren migración futura. |
| S4 | **Estados explícitos** | Sesiones, suscripciones y pagos tienen máquinas de estado formalizadas en enums. |
| S5 | **Idempotencia de pagos** | Los eventos de Stripe se registran para no procesar dos veces. |
| S6 | **Histórico preservable** | El `LearningProfile` sobrevive entre ciclos (clave para re-engagement de rechazados). |
| S7 | **RLS obligatorio** | Ninguna tabla sin política de seguridad a nivel de fila. |

---

## 2. Diagrama entidad-relación (ERD)

```
┌──────────────────────── TAXONOMÍA DE CONTENIDO ────────────────────────┐
│                                                                          │
│  Institution ──1:N──▶ Level ──1:N──▶ Exam ──1:N──▶ Area ──1:N──▶ Subject │
│                                         │            │              │     │
│                                         │            │ 1:N          │ 1:N │
│                                         │            ▼              ▼     │
│                                         │          Career         Topic   │
│                                         │                           │     │
│                                         │                           │ 1:N │
│                                         │                           ▼     │
│                                         │                       Question   │
│                                         │                       │  │  │    │
│                                         │              1:N ◀─────┘  │  └──▶ │
│                                         │        ExplanationLayer    │  ContentItem
│                                         │                            │  (Phase 2)
│                                         │                       1:N  │     │
│                                         │                     QuestionReport │
└─────────────────────────────────────────┼────────────────────────────┘
                                           │
┌──────────────────────── USUARIO Y APRENDIZAJE ───┼─────────────────────┐
│                                                    │                     │
│  UserProfile ──1:1──▶ LearningProfile              │ (targetExam)        │
│      │  │  │  │                                     │                     │
│      │  │  │  └──1:1──▶ StreakRecord                │                     │
│      │  │  └─────1:N──▶ WeakTopic ──▶ (Topic)       │                     │
│      │  └────────1:N──▶ ExamSession ──N:1──▶ Exam ◀─┘                     │
│      │                     │                                             │
│      │                     └──1:N──▶ SessionAnswer ──N:1──▶ Question      │
│      │                                                                    │
│      ├──1:N──▶ Subscription ──1:N──▶ Payment                              │
│      ├──1:N──▶ NotificationPreference                                     │
│      │                                                                    │
│      └── vinculación parental:                                            │
│           ParentLink (parentProfile ↔ studentProfile)                     │
│           ParentLinkCode (código 6 dígitos, TTL)                          │
│                                                                           │
│  ProcessedStripeEvent (idempotencia de webhooks — standalone)             │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Referencia de enums

| Enum | Valores | Uso |
|---|---|---|
| `InstitutionCode` | `UNAM`, `IPN`, `UAM`, `CENEVAL`, `CNBV` | Identifica institución (CNBV conservado del sistema PLD) |
| `LevelType` | `MEDIA_SUPERIOR`, `SUPERIOR` | Nivel educativo |
| `SessionMode` | `DIAGNOSTIC`, `TOPIC_DRILL`, `AREA_PRACTICE`, `FULL_SIMULATION` | Tipo de sesión |
| `SessionStatus` | `IN_PROGRESS`, `COMPLETED`, `COMPLETED_BY_TIMEOUT`, `ABANDONED` | Estado de la sesión |
| `DifficultyLevel` | `BEGINNER`, `BASIC`, `INTERMEDIATE`, `ADVANCED`, `EXPERT` | Dificultad del reactivo |
| `UserRole` | `STUDENT`, `PARENT`, `ADMIN` | Rol del usuario |
| `SubscriptionPlan` | `MONTHLY`, `SEASON_PASS`, `PREMIUM` | Plan contratado |
| `SubscriptionStatus` | `PENDING`, `ACTIVE`, `FAILED`, `EXPIRED`, `CANCELED` | Estado de suscripción |
| `PricingSeason` | `EARLY_BIRD`, `HIGH_SEASON`, `LAST_MINUTE` | Temporada de precio |
| `PaymentMethod` | `CARD`, `OXXO`, `SPEI` | Método de pago |
| `PaymentStatus` | `PENDING`, `SUCCEEDED`, `FAILED` | Estado del pago |
| `ContentType` | `VIDEO_LECTURE`, `LIVESTREAM`, `PROFESSOR_NOTE`, `PDF_MATERIAL`, `PRACTICE_SET` | Tipo de contenido (Fase 2) |
| `ContentStatus` | `INACTIVE`, `DRAFT`, `ACTIVE` | Visibilidad (Fase 1 = INACTIVE) |
| `NotificationType` | `STREAK_RISK`, `PARENT_WEEKLY`, `EXAM_COUNTDOWN`, `MARKETING` | Tipo de notificación opt-in |

---

## 4. `schema.prisma` completo y ejecutable

```prisma
// ═══════════════════════════════════════════════════════════════════
// Acierta — schema.prisma (v1.0)
// Base: Supabase PostgreSQL · ORM: Prisma
// Migración inicial: npx prisma migrate dev --name acierta_init
// ═══════════════════════════════════════════════════════════════════

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // pooled (pgbouncer)
  directUrl = env("DIRECT_URL")         // directa para migraciones
}

// ─────────────────────────── ENUMS ───────────────────────────

enum InstitutionCode {
  UNAM
  IPN
  UAM
  CENEVAL
  CNBV
}

enum LevelType {
  MEDIA_SUPERIOR
  SUPERIOR
}

enum SessionMode {
  DIAGNOSTIC
  TOPIC_DRILL
  AREA_PRACTICE
  FULL_SIMULATION
}

enum SessionStatus {
  IN_PROGRESS
  COMPLETED
  COMPLETED_BY_TIMEOUT
  ABANDONED
}

enum DifficultyLevel {
  BEGINNER
  BASIC
  INTERMEDIATE
  ADVANCED
  EXPERT
}

enum UserRole {
  STUDENT
  PARENT
  ADMIN
}

enum SubscriptionPlan {
  MONTHLY
  SEASON_PASS
  PREMIUM
}

enum SubscriptionStatus {
  PENDING
  ACTIVE
  FAILED
  EXPIRED
  CANCELED
}

enum PricingSeason {
  EARLY_BIRD
  HIGH_SEASON
  LAST_MINUTE
}

enum PaymentMethod {
  CARD
  OXXO
  SPEI
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
}

enum ContentType {
  VIDEO_LECTURE
  LIVESTREAM
  PROFESSOR_NOTE
  PDF_MATERIAL
  PRACTICE_SET
}

enum ContentStatus {
  INACTIVE
  DRAFT
  ACTIVE
}

enum NotificationType {
  STREAK_RISK
  PARENT_WEEKLY
  EXAM_COUNTDOWN
  MARKETING
}

// ──────────────────── TAXONOMÍA DE CONTENIDO ────────────────────

model Institution {
  id        String          @id @default(cuid())
  code      InstitutionCode @unique
  name      String
  logoUrl   String?
  levels    Level[]
  createdAt DateTime        @default(now())

  @@map("institutions")
}

model Level {
  id            String      @id @default(cuid())
  institutionId String
  institution   Institution @relation(fields: [institutionId], references: [id], onDelete: Cascade)
  type          LevelType
  name          String
  exams         Exam[]

  @@unique([institutionId, type])
  @@map("levels")
}

model Exam {
  id             String        @id @default(cuid())
  levelId        String
  level          Level         @relation(fields: [levelId], references: [id], onDelete: Cascade)
  year           Int
  name           String
  durationMins   Int           // UNAM: 180, IPN: ~180
  totalQuestions Int           // UNAM: 120, IPN: 140
  examDate       DateTime?     // fecha oficial del examen (para countdown/vigencia)
  isActive       Boolean       @default(true)
  areas          Area[]
  sessions       ExamSession[]
  profiles       UserProfile[] @relation("TargetExam")

  @@unique([levelId, year])
  @@map("exams")
}

model Area {
  id        String    @id @default(cuid())
  examId    String
  exam      Exam      @relation(fields: [examId], references: [id], onDelete: Cascade)
  code      String    // "AREA_1", "IPN_FISMAT"...
  name      String
  colorHex  String
  iconEmoji String?
  position  Int
  subjects  Subject[]
  careers   Career[]

  @@unique([examId, code])
  @@map("areas")
}

model Career {
  id              String        @id @default(cuid())
  areaId          String
  area            Area          @relation(fields: [areaId], references: [id], onDelete: Cascade)
  name            String
  minAciertos     Int?          // aciertos mínimos históricos de ingreso
  minAciertosYear Int?
  acceptanceRate  Float?
  targetedBy      UserProfile[] @relation("TargetCareer")

  @@map("careers")
}

model Subject {
  id             String        @id @default(cuid())
  areaId         String
  area           Area          @relation(fields: [areaId], references: [id], onDelete: Cascade)
  name           String
  iconEmoji      String?
  position       Int
  questionWeight Int           @default(1) // # reactivos esperados en el examen real
  topics         Topic[]
  contentItems   ContentItem[]

  @@map("subjects")
}

model Topic {
  id           String        @id @default(cuid())
  subjectId    String
  subject      Subject       @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  name         String
  position     Int
  questions    Question[]
  weakTopics   WeakTopic[]
  contentItems ContentItem[]

  @@map("topics")
}

model Question {
  id         String             @id @default(cuid())
  topicId    String
  topic      Topic              @relation(fields: [topicId], references: [id], onDelete: Cascade)
  stem       String             @db.Text
  imageUrl   String?
  options    Json               // [{ id:"A", text, isCorrect }, ...]
  difficulty DifficultyLevel    @default(INTERMEDIATE)
  sourceYear Int?
  isVerified Boolean            @default(false)

  explanations ExplanationLayer[]
  answers      SessionAnswer[]
  reports      QuestionReport[]

  // ── Fase 2 (nullable, INACTIVE en Fase 1) ──
  videoLectureId  String?
  videoLecture    ContentItem? @relation("QuestionVideo", fields: [videoLectureId], references: [id])
  professorNoteId String?
  professorNote   ContentItem? @relation("QuestionNote", fields: [professorNoteId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([topicId, isVerified])
  @@index([difficulty])
  @@map("questions")
}

model ExplanationLayer {
  id           String   @id @default(cuid())
  questionId   String
  question     Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  layer        Int      // 1..4
  title        String
  content      String   @db.Text
  latexContent String?

  @@unique([questionId, layer])
  @@map("explanation_layers")
}

model QuestionReport {
  id         String   @id @default(cuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  reportedBy String   // userId
  reason     String?
  resolved   Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([questionId, resolved])
  @@map("question_reports")
}

// ──────────────── CONTENIDO FASE 2 (INACTIVO) ────────────────

model ContentItem {
  id              String        @id @default(cuid())
  type            ContentType
  status          ContentStatus @default(INACTIVE) // ← NUNCA ACTIVE en Fase 1
  title           String?
  url             String?
  thumbnailUrl    String?
  durationSeconds Int?
  scheduledAt     DateTime?

  subjectId   String?
  subject     Subject?   @relation(fields: [subjectId], references: [id])
  topicId     String?
  topic       Topic?     @relation(fields: [topicId], references: [id])
  professorId String?
  professor   Professor? @relation(fields: [professorId], references: [id])

  questionsVideo Question[] @relation("QuestionVideo")
  questionsNote  Question[] @relation("QuestionNote")

  createdAt DateTime @default(now())

  @@map("content_items")
}

model Professor {
  id          String        @id @default(cuid())
  name        String
  bio         String?
  avatarUrl   String?
  subjectTags String[]
  content     ContentItem[]

  @@map("professors")
}

// ──────────────── USUARIO Y APRENDIZAJE ────────────────

model UserProfile {
  id       String   @id @default(cuid())
  userId   String   @unique // Supabase Auth UID
  role     UserRole @default(STUDENT)

  displayName String?
  avatarUrl   String?
  themePref   String  @default("dark") // "dark" | "light"
  badges      String[] @default([])    // ["EARLY_BIRD", ...]

  // Examen objetivo
  targetExamId   String?
  targetExam     Exam?   @relation("TargetExam", fields: [targetExamId], references: [id])
  targetCareerId String?
  targetCareer   Career? @relation("TargetCareer", fields: [targetCareerId], references: [id])

  // Onboarding
  diagnosticDone Boolean @default(false)
  onboardingStep Int     @default(0)

  // Relaciones de aprendizaje
  learningProfile LearningProfile?
  streak          StreakRecord?
  weakTopics      WeakTopic[]
  sessions        ExamSession[]

  // Comercial
  subscriptions Subscription[]

  // Preferencias
  notificationPrefs NotificationPreference[]

  // Vinculación parental (dos lados)
  asParentLinks  ParentLink[] @relation("ParentSide")
  asStudentLinks ParentLink[] @relation("StudentSide")
  linkCodes      ParentLinkCode[]

  createdAt DateTime @default(now())

  @@index([userId])
  @@map("user_profiles")
}

model LearningProfile {
  userProfileId  String      @id
  userProfile    UserProfile @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  predictedScore Int?
  lastPredicted  DateTime?
  confidence     Float?
  totalQuestions Int         @default(0)
  correctAnswers Int         @default(0)
  totalStudyMins Int         @default(0)
  updatedAt      DateTime    @updatedAt

  @@map("learning_profiles")
}

model WeakTopic {
  userProfileId String
  userProfile   UserProfile @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  topicId       String
  topic         Topic       @relation(fields: [topicId], references: [id], onDelete: Cascade)
  hitRate       Float
  attempts      Int         @default(0)
  updatedAt     DateTime    @updatedAt

  @@id([userProfileId, topicId])
  @@index([userProfileId, hitRate])
  @@map("weak_topics")
}

model StreakRecord {
  userProfileId    String      @id
  userProfile      UserProfile @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  currentStreak    Int         @default(0)
  longestStreak    Int         @default(0)
  lastActivityDate DateTime?
  totalActiveDays  Int         @default(0)

  @@index([lastActivityDate])
  @@map("streak_records")
}

// ──────────────── SESIONES DE EXAMEN ────────────────

model ExamSession {
  id            String        @id @default(cuid())
  userProfileId String
  userProfile   UserProfile   @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  examId        String
  exam          Exam          @relation(fields: [examId], references: [id])
  mode          SessionMode
  status        SessionStatus @default(IN_PROGRESS)

  startedAt     DateTime  @default(now())
  finishedAt    DateTime?
  timeLimitSecs Int

  score      Int?
  percentile Float?

  // Integridad del simulador
  tabBlurCount             Int     @default(0)
  rightClickAttempts       Int     @default(0)
  keyboardShortcutAttempts Int     @default(0)
  suspicionEvents          Json?
  completedFullscreen      Boolean @default(false)

  answers SessionAnswer[]

  @@index([userProfileId, mode])
  @@index([userProfileId, status])
  @@map("exam_sessions")
}

model SessionAnswer {
  id             String      @id @default(cuid())
  sessionId      String
  session        ExamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  questionId     String
  question       Question    @relation(fields: [questionId], references: [id])
  selectedOption String?     // "A".."D" | null (omitida)
  isCorrect      Boolean
  timeSpentSecs  Int
  position       Int

  @@unique([sessionId, questionId])
  @@index([sessionId])
  @@map("session_answers")
}

// ──────────────── COMERCIAL (PAGOS) ────────────────

model Subscription {
  id            String             @id @default(cuid())
  userProfileId String
  userProfile   UserProfile        @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  plan          SubscriptionPlan
  status        SubscriptionStatus @default(PENDING)
  season        PricingSeason
  hasGuarantee  Boolean            @default(false) // true para PREMIUM

  // Referencias Stripe
  stripeCustomerId        String?
  stripeSubscriptionId    String? // solo MONTHLY (recurring)
  stripeCheckoutSessionId String? @unique

  startedAt DateTime?
  expiresAt DateTime? // Pase/Premium: = fecha del examen

  payments  Payment[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([userProfileId, status])
  @@map("subscriptions")
}

model Payment {
  id             String        @id @default(cuid())
  subscriptionId String
  subscription   Subscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  amountMxn      Int           // en centavos
  method         PaymentMethod
  status         PaymentStatus @default(PENDING)
  stripePaymentIntentId String? @unique
  createdAt      DateTime      @default(now())

  @@map("payments")
}

// Idempotencia de webhooks de Stripe
model ProcessedStripeEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique // Stripe event.id
  eventType   String
  processedAt DateTime @default(now())

  @@map("processed_stripe_events")
}

// ──────────────── VINCULACIÓN PARENTAL ────────────────

model ParentLink {
  id               String      @id @default(cuid())
  parentProfileId  String
  parentProfile    UserProfile @relation("ParentSide", fields: [parentProfileId], references: [id], onDelete: Cascade)
  studentProfileId String
  studentProfile   UserProfile @relation("StudentSide", fields: [studentProfileId], references: [id], onDelete: Cascade)
  createdAt        DateTime    @default(now())

  @@unique([parentProfileId, studentProfileId])
  @@map("parent_links")
}

model ParentLinkCode {
  id               String      @id @default(cuid())
  code             String      @unique // 6 dígitos
  studentProfileId String
  studentProfile   UserProfile @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  expiresAt        DateTime    // TTL 10 min
  usedAt           DateTime?
  createdAt        DateTime    @default(now())

  @@index([code])
  @@map("parent_link_codes")
}

// ──────────────── PREFERENCIAS DE NOTIFICACIÓN ────────────────

model NotificationPreference {
  id            String           @id @default(cuid())
  userProfileId String
  userProfile   UserProfile      @relation(fields: [userProfileId], references: [id], onDelete: Cascade)
  type          NotificationType
  enabled       Boolean          @default(true)

  @@unique([userProfileId, type])
  @@map("notification_preferences")
}
```

---

## 5. Diccionario de datos (entidades clave)

### `Exam` — el corazón de la modularidad

Cada examen define sus reglas (`durationMins`, `totalQuestions`, `examDate`). Cambiar el formato de un examen (ej. si UNAM pasa de 120 a 130 reactivos en 2027) es **editar una fila, no desplegar código**. El `examDate` alimenta el countdown del dashboard y la `expiresAt` del Pase de Temporada.

### `Subject.questionWeight` — el motor del Aciertómetro

Es el número esperado de reactivos de esa materia en el examen real (ej. Matemáticas = 26 en UNAM Área 1). El predictor pondera el `hitRate` del alumno por este peso. Es el vínculo directo entre la taxonomía y la predicción.

### `Question.isVerified` — el guard de calidad

Ningún reactivo con `isVerified = false` es visible para usuarios (garantizado por RLS + lógica). El pipeline de IA inserta con `false`; el panel admin lo pone en `true` tras revisión humana.

### `LearningProfile` — el activo de retención

Sobrevive entre ciclos de examen. Cuando un alumno rechazado vuelve para la siguiente convocatoria, su perfil histórico (debilidades, predicción) sigue ahí. Es la razón tangible para regresar a Acierta en vez de empezar de cero.

### `Subscription` + `Payment` + `ProcessedStripeEvent` — pagos a prueba de fallos

- `Subscription.stripeCheckoutSessionId` es `@unique` → previene doble suscripción.
- `expiresAt` controla la vigencia del Pase en la app (no en Stripe).
- `ProcessedStripeEvent.eventId` es `@unique` → idempotencia: un webhook nunca se procesa dos veces.

### `ParentLinkCode` — vinculación segura y efímera

Código de 6 dígitos con TTL de 10 minutos. El alumno lo genera; el tutor lo consume. `usedAt` lo invalida tras el primer uso.

---

## 6. Índices y estrategia de performance

Índices definidos en el schema (vía `@@index`) más los recomendados a nivel SQL:

```sql
-- Ya declarados en Prisma (@@index):
--   questions(topic_id, is_verified)      → selección adaptativa
--   questions(difficulty)                 → filtro por dificultad
--   weak_topics(user_profile_id, hit_rate)→ temas débiles ordenados
--   exam_sessions(user_profile_id, mode)  → conteo de simulacros (muro suave)
--   exam_sessions(user_profile_id, status)→ sesiones abiertas
--   session_answers(session_id)           → scoring
--   subscriptions(user_profile_id, status)→ verificar plan activo
--   question_reports(question_id, resolved)→ moderación

-- Índice parcial recomendado (solo reactivos publicables):
CREATE INDEX idx_questions_publishable
  ON questions(topic_id, difficulty)
  WHERE is_verified = true;

-- Para el conteo diario de drill (muro metered):
CREATE INDEX idx_answers_by_session_created
  ON session_answers(session_id);
```

| Query crítica | Índice que la soporta |
|---|---|
| ¿Cuántos simulacros completó el FREE? | `exam_sessions(user_profile_id, mode)` |
| Selección adaptativa de reactivos débiles | `weak_topics(user_profile_id, hit_rate)` + `questions(topic_id, is_verified)` |
| ¿Tiene plan activo? | `subscriptions(user_profile_id, status)` |
| Scoring de una sesión | `session_answers(session_id)` |
| Reactivos reportados pendientes | `question_reports(question_id, resolved)` |

---

## 7. Row Level Security (RLS)

RLS es obligatorio en todas las tablas con datos de usuario. Políticas clave (referencia completa en el TRD §5):

```sql
-- user_profiles: cada quien su perfil; el padre lee el del alumno vinculado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "parent_reads_student" ON user_profiles
  FOR SELECT USING (
    id IN (
      SELECT student_profile_id FROM parent_links pl
      JOIN user_profiles p ON p.id = pl.parent_profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- questions: autenticados leen verificadas; ADMIN ve todas
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_verified" ON questions
  FOR SELECT USING (
    is_verified = true
    OR EXISTS (SELECT 1 FROM user_profiles
               WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- exam_sessions: dueño + padre vinculado (solo lectura)
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_sessions" ON exam_sessions
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

-- subscriptions / payments: solo el dueño
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscriptions" ON subscriptions
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );
```

> **Nota:** las escrituras del sistema (webhook de Stripe activando un plan, motor adaptativo escribiendo `WeakTopics`) usan el `SUPABASE_SERVICE_ROLE_KEY`, que bypassa RLS. Esas rutas viven solo en el servidor y validan autorización a nivel de aplicación.

---

## 8. Estrategia de datos semilla (seed)

El seed puebla la taxonomía (instituciones, exámenes, áreas, materias, temas) — **no los reactivos** (esos vienen del pipeline de IA). Se ejecuta con `npx prisma db seed`.

### 8.1 Orden de seed

```
1. Institution (UNAM, IPN, UAM, CENEVAL)
2. Level (por institución)
3. Exam (con durationMins, totalQuestions, examDate 2027)
4. Area (UNAM: 4 áreas; IPN: 3 ramas; etc.)
5. Career (por área, con minAciertos históricos)
6. Subject (con questionWeight real por examen)
7. Topic (del temario oficial)
   → los reactivos se cargan después vía pipeline + panel admin
```

### 8.2 Ejemplo de seed (UNAM Área 1)

```typescript
// prisma/seed/unam.ts
const unam = await prisma.institution.create({
  data: { code: 'UNAM', name: 'Universidad Nacional Autónoma de México' },
});

const superior = await prisma.level.create({
  data: { institutionId: unam.id, type: 'SUPERIOR', name: 'Licenciatura' },
});

const exam2027 = await prisma.exam.create({
  data: {
    levelId: superior.id,
    year: 2027,
    name: 'Concurso de Selección Licenciatura 2027',
    durationMins: 180,
    totalQuestions: 120,
    examDate: new Date('2027-05-15'),
  },
});

const area1 = await prisma.area.create({
  data: {
    examId: exam2027.id,
    code: 'AREA_1',
    name: 'Ciencias Físico-Matemáticas y las Ingenierías',
    colorHex: '#7C3AED',
    iconEmoji: '📐',
    position: 1,
  },
});

// Materias con su peso real de reactivos en el examen
await prisma.subject.createMany({
  data: [
    { areaId: area1.id, name: 'Matemáticas', questionWeight: 26, position: 1, iconEmoji: '➗' },
    { areaId: area1.id, name: 'Física',      questionWeight: 16, position: 2, iconEmoji: '⚛️' },
    { areaId: area1.id, name: 'Química',     questionWeight: 12, position: 3, iconEmoji: '🧪' },
    { areaId: area1.id, name: 'Español',     questionWeight: 18, position: 4, iconEmoji: '📖' },
    // ... resto de materias del área
  ],
});

// Carreras ancla con aciertos mínimos históricos
await prisma.career.createMany({
  data: [
    { areaId: area1.id, name: 'Ingeniería en Computación', minAciertos: 96, minAciertosYear: 2025 },
    { areaId: area1.id, name: 'Arquitectura', minAciertos: 88, minAciertosYear: 2025 },
    // ...
  ],
});
```

### 8.3 Seed por feature flag

Las instituciones detrás de feature flag (UAM, EXANI II) se siembran pero sus exámenes arrancan con `isActive` controlado por la lógica de la app hasta activar el flag. Esto permite tener la data lista antes de exponerla.

---

## 9. Plan de migración desde Certifik PLD

La migración es **no destructiva**: conserva los datos de PLD y agrega la nueva estructura.

```
FASE A — Preservar
  1. Marcar tablas PLD existentes; no eliminar.
  2. Crear Institution { code: CNBV } y mapear el contenido PLD histórico ahí.

FASE B — Extender
  3. npx prisma migrate dev --name acierta_init
     → crea todas las tablas nuevas (institutions, exams, areas, ...).
  4. Aplicar RLS a todas las tablas.

FASE C — Poblar
  5. npx prisma db seed → taxonomía UNAM/IPN/UAM/EXANI.
  6. Pipeline de IA → reactivos (isVerified=false) → panel admin → true.

FASE D — Reutilizar lógica
  7. El motor de sesiones/scoring de PLD se adapta a los nuevos SessionMode.
     La estructura Question (MCQ, 4 opciones) es idéntica → reutilización directa.
```

### Mapeo conceptual PLD → Acierta

| PLD (origen) | Acierta (destino) |
|---|---|
| Certificación PLD/CNBV | `Institution { code: CNBV }` (conservado) |
| Ley | `Area` |
| Capítulo | `Subject` |
| Sección/Tema | `Topic` |
| Pregunta (MCQ) | `Question` (estructura idéntica) |
| Sesión de examen | `ExamSession` (+ nuevos modos y estados) |
| Respuesta | `SessionAnswer` (+ `timeSpentSecs`) |
| Usuario | `UserProfile` (+ perfiles de aprendizaje) |

---

## 10. Integridad referencial, cascadas y borrado

| Relación | Regla de borrado | Racional |
|---|---|---|
| `Institution → Level → Exam → Area → Subject → Topic` | `onDelete: Cascade` | Borrar una institución limpia toda su taxonomía |
| `Topic → Question → ExplanationLayer` | `Cascade` | Borrar un reactivo limpia sus explicaciones |
| `UserProfile → LearningProfile / StreakRecord / WeakTopic` | `Cascade` | Borrar cuenta limpia datos derivados |
| `ExamSession → SessionAnswer` | `Cascade` | Borrar sesión limpia respuestas |
| `Subscription → Payment` | `Cascade` | Borrar suscripción limpia pagos asociados |
| `Question → SessionAnswer` | **Sin cascade** (Restrict) | No borrar un reactivo que tiene respuestas históricas; usar soft-hide |
| `Career → UserProfile` (targetCareer) | `SetNull` implícito (nullable) | Si se borra una carrera, el perfil no se rompe |

> **Regla de borrado de reactivos:** los reactivos con respuestas históricas **no se borran** (romperían el histórico de aprendizaje). Se "ocultan" con un flag lógico o se despublican (`isVerified = false`). El borrado duro solo aplica a reactivos sin uso.

> **Borrado de cuenta (LFPDPPP):** el derecho de cancelación del usuario se implementa borrando `UserProfile` (cascada a datos derivados). Las filas de `Payment` requeridas por obligaciones fiscales se anonimizan en vez de borrarse.

---

## 11. Escalabilidad y decisiones diferidas

| Tema | MVP | Cuándo escalar |
|---|---|---|
| Percentiles (vs otros usuarios) | Query agregada bajo demanda | `pg_cron` nocturno si p95 > 800ms |
| Conteo de simulacros FREE | Query con índice | Materializar contador si crece el volumen |
| Historial de sesiones | Sin particionar | Particionar `exam_sessions` por año si supera millones de filas |
| `suspicionEvents` (JSON) | Columna JSONB | Tabla dedicada si se requiere análisis complejo de integridad |
| Banco de reactivos | Cache de Next.js por tema | CDN/edge cache si el catálogo crece mucho |
| Búsqueda de reactivos (admin) | Filtros SQL simples | Full-text search de Postgres si el banco supera decenas de miles |

---

## Apéndice — Resumen de modelos

| Modelo | Propósito | Nuevo vs. blueprint |
|---|---|---|
| Institution, Level, Exam, Area, Career, Subject, Topic | Taxonomía de contenido | Del blueprint |
| Question, ExplanationLayer | Banco de reactivos | Del blueprint |
| QuestionReport | Moderación de calidad | **Nuevo** |
| ContentItem, Professor | Contenido Fase 2 (inactivo) | Del blueprint |
| UserProfile, LearningProfile, WeakTopic, StreakRecord | Usuario y aprendizaje | Del blueprint (+ badges, themePref) |
| ExamSession, SessionAnswer | Sesiones de examen | Del blueprint (+ SessionStatus) |
| Subscription, Payment, ProcessedStripeEvent | Comercial / pagos | **Nuevo** |
| ParentLink, ParentLinkCode | Vinculación parental | **Nuevo** |
| NotificationPreference | Preferencias opt-in | **Nuevo** |

---

*Fin del documento · Backend Schema Acierta v1.0 · Schema ejecutable, listo para `prisma migrate`*
*Serie: Estudio → Blueprint → PRD → TRD → UI/UX → Flujo de App → **Backend Schema** → Plan de Implementación*
