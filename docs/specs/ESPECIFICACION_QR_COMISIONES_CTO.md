# Especificación técnica — Programa de comisiones por QR

> **De:** CLO/CFO/CMO (sesión legal-financiera)
> **Para:** CTO (sesión de desarrollo)
> **Fecha:** 22 de septiembre de 2026
> **Depende de:** precios confirmados ($999 Básico, $1,799 Premium)

---

## 1. Resumen ejecutivo

Tres niveles de comisionistas, diferenciados por **cómo se les paga** (no por quién son). El nivel masivo (Referido) paga en crédito/descuento — cero huella fiscal. El efectivo (Embajador) es solo adultos con RFC. El B2B (Aliado) factura limpiamente.

---

## 2. Los tres niveles

### Nivel 1 — Referido (masivo, viral)

| Campo | Valor |
|---|---|
| **Quién** | Cualquier usuario (alumno o padre), incluidos menores |
| **Cómo funciona** | Comparte un link/QR único → si alguien compra, el referidor recibe crédito |
| **Recompensa** | Crédito en cuenta (descuento en su próxima compra o extensión de vigencia) |
| **Monto** | **$150 MXN en crédito** por cada venta atribuida |
| **Huella fiscal** | **Cero** — un descuento comercial no es ingreso gravable |
| **Límite** | Sin límite de referidos; el crédito se acumula pero NO se canjea por efectivo |
| **Vigencia del crédito** | 12 meses desde la fecha de acreditación |

**Reglas de negocio:**
- El referido NO puede ser uno mismo (mismo email/cuenta)
- El comprador debe completar el pago para que se acredite
- Si el comprador pide reembolso (válvula interna 48h), se revierte el crédito
- Un menor de edad SIEMPRE recibe crédito, nunca efectivo (aunque sea mayor al momento del canje)
- El crédito se muestra en el dashboard del usuario con fecha de expiración

### Nivel 2 — Embajador (comisionista individual)

| Campo | Valor |
|---|---|
| **Quién** | Persona **mayor de 18 años con RFC activo** |
| **Cómo funciona** | QR/código personal → cobra comisión en efectivo por cada venta |
| **Recompensa** | **$150 MXN en efectivo** por venta atribuida |
| **Huella fiscal** | Mismos carriles que profesores: B (asimilados, **default**) o A (embajador factura, excepción) |
| **Contrato** | Contrato de comisión mercantil (adhesión digital, mismo modelo que profesores) |
| **Liquidación** | Semanal o quincenal (al acumular mínimo $300) |

**Reglas de negocio:**
- Requiere onboarding: RFC, CLABE, aceptar contrato de adhesión, verificar mayoría de edad
- Si no puede facturar → Carril B (asimilados a salarios, lo opera el contador)
- NO exclusividad — puede promover otros productos
- Si se detecta fraude (autocompras, granjas de cuentas) → suspensión inmediata + retención de comisiones pendientes
- El embajador NO puede ser empleado de YaEntre (Ángel es el único; esto es para el futuro)

### Nivel 3 — Aliado comercial (B2B)

| Campo | Valor |
|---|---|
| **Quién** | Persona moral o PFAE: escuela, academia, cibercafé, papelería |
| **Cómo funciona** | Código mayorista o QR de punto de venta → comisión o descuento por volumen |
| **Recompensa** | Negociable: comisión por venta o precio mayorista (ej. 10 licencias Básico a $899 c/u con 15% de descuento = $764/licencia) |
| **Huella fiscal** | Limpia — el aliado factura su comisión a YaEntre |
| **Contrato** | Convenio comercial B2B (no adhesión; se negocia caso por caso) |

**Reglas de negocio:**
- No lanzar en Early Bird — activar cuando haya volumen suficiente (fase 2)
- Requiere validación manual: constancia de situación fiscal + giro compatible
- El aliado NO revende — solo refiere. La venta siempre pasa por yaentre.com

---

## 3. Arquitectura técnica

### 3.1 Modelo de datos

```prisma
// Agregar al schema de Prisma

model ReferralCode {
  id          String   @id @default(cuid())
  code        String   @unique  // Código alfanumérico corto (ej: "PEDRO2026")
  userId      String?  // Si es un usuario registrado (nivel 1 y 2)
  type        ReferralType  // REFERIDO | EMBAJADOR | ALIADO
  createdAt   DateTime @default(now())
  active      Boolean  @default(true)
  
  // Solo para Embajador/Aliado
  holderName  String?
  holderRfc   String?
  holderClabe String?
  paymentRail PaymentRail?  // COMISION_MERCANTIL | ASIMILADOS
  
  // Relaciones
  user        User?    @relation(fields: [userId], references: [id])
  sales       ReferralSale[]
  
  @@index([code])
  @@index([userId])
}

model ReferralSale {
  id              String   @id @default(cuid())
  referralCodeId  String
  purchaseId      String   // ID de la compra en Stripe/interno
  buyerUserId     String
  saleAmount      Int      // Monto de la venta en centavos
  commissionAmount Int     // Monto de la comisión en centavos ($150 = 15000)
  commissionType  CommissionType  // CREDIT | CASH
  status          CommissionStatus // PENDING | ACCRUED | PAID | REVERSED
  createdAt       DateTime @default(now())
  paidAt          DateTime?
  reversedAt      DateTime?
  reverseReason   String?
  
  referralCode    ReferralCode @relation(fields: [referralCodeId], references: [id])
  
  @@index([referralCodeId])
  @@index([buyerUserId])
  @@index([status])
}

enum ReferralType {
  REFERIDO
  EMBAJADOR
  ALIADO
}

enum PaymentRail {
  COMISION_MERCANTIL
  ASIMILADOS
}

enum CommissionType {
  CREDIT
  CASH
}

enum CommissionStatus {
  PENDING    // Venta completada, comisión en espera (periodo antifraude 7 días)
  ACCRUED    // Acreditada (crédito visible / efectivo liquidable)
  PAID       // Efectivo transferido (solo CASH)
  REVERSED   // Revertida (reembolso del comprador o fraude)
}
```

### 3.2 Flujo del QR/Link

```
1. GENERACIÓN
   ├─ Usuario registrado → se le genera un ReferralCode automáticamente
   │   └─ type: REFERIDO (default)
   │   └─ code: generado (6-8 chars alfanuméricos, sin ambigüedad: sin 0/O, 1/l/I)
   └─ Embajador → onboarding manual → se le genera código personalizable
       └─ type: EMBAJADOR
       └─ code: puede elegir (ej: "PEDRO2026"), validar unicidad

2. DISTRIBUCIÓN
   ├─ QR: imagen PNG/SVG generada con el URL: yaentre.com/r/{code}
   │   └─ Descargable desde el dashboard del usuario
   │   └─ Incluir logo de YaEntre/Tino en el centro del QR
   └─ Link: yaentre.com/r/{code} (copiar al portapapeles con un click)

3. ATRIBUCIÓN
   ├─ Al visitar yaentre.com/r/{code}:
   │   └─ Redirect a yaentre.com con parámetro ?ref={code}
   │   └─ Guardar en cookie (30 días) Y en localStorage
   │   └─ Si el visitante ya tiene una atribución → FIRST TOUCH wins (no sobrescribir)
   ├─ Al registrarse:
   │   └─ Persistir la atribución en el perfil del usuario (campo referredBy)
   └─ Al comprar:
       └─ Crear ReferralSale con status PENDING
       └─ Iniciar periodo antifraude de 7 días

4. ACREDITACIÓN
   ├─ Después de 7 días sin reembolso ni marca de fraude:
   │   └─ Status → ACCRUED
   │   ├─ Si commissionType = CREDIT → acreditar $150 en cuenta del referidor
   │   └─ Si commissionType = CASH → agregar al pool de liquidación semanal
   └─ Si hay reembolso dentro de los 7 días:
       └─ Status → REVERSED, reverseReason = "refund"
```

### 3.3 Generación del QR

```typescript
// src/lib/referrals/qr-generator.ts
// Usar librería `qrcode` (npm)
// No usar servicio externo — generar server-side

import QRCode from 'qrcode';

export async function generateReferralQR(code: string): Promise<Buffer> {
  const url = `https://yaentre.com/r/${code}`;
  
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#7C3AED',  // Marca YaEntre
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H', // Alto, para permitir logo en centro
  });
}
```

### 3.4 Antifraude (básico, para arrancar)

```typescript
// src/lib/referrals/antifraud.ts

export function detectFraud(sale: ReferralSale, referrer: User, buyer: User): string | null {
  // 1. Autocompra
  if (referrer.id === buyer.id) return 'self_purchase';
  
  // 2. Mismo email (variaciones con +)
  const normalizeEmail = (e: string) => e.split('+')[0].toLowerCase();
  if (normalizeEmail(referrer.email) === normalizeEmail(buyer.email)) return 'same_email';
  
  // 3. Mismo dispositivo (fingerprint si disponible)
  // Implementar con PostHog device ID si está disponible
  
  // 4. Velocidad sospechosa: > 5 ventas del mismo referrer en 24h
  // Consultar ReferralSale.count({referralCodeId, createdAt > 24h ago})
  
  // 5. Patrón: referrer crea cuenta → compra → reembolso → repite
  // Consultar historial de reversiones del referrer
  
  return null; // Sin fraude detectado
}
```

---

## 4. Dashboard del usuario (UI)

### Para el Referido (nivel 1)

Sección en el dashboard del alumno:

```
┌──────────────────────────────────────────┐
│ 🎯 Invita y gana                         │
│                                          │
│ Tu código: ANGEL123                      │
│ [📋 Copiar link]  [📱 Descargar QR]     │
│                                          │
│ Crédito acumulado: $300                  │
│ Referidos exitosos: 2                    │
│                                          │
│ Historial:                               │
│ • María G. — 15 sep — $150 ✅           │
│ • Pedro L. — 18 sep — $150 ✅           │
│ • Juan R. — 21 sep — $150 ⏳ (5 días)  │
│                                          │
│ Tu crédito se aplica automáticamente     │
│ en tu próxima compra o renovación.       │
└──────────────────────────────────────────┘
```

### Para el Embajador (nivel 2)

Panel separado, accesible tras onboarding:

```
┌──────────────────────────────────────────┐
│ 💰 Panel de Embajador                    │
│                                          │
│ Tu código: PEDRO2026                     │
│ [📋 Copiar]  [📱 QR]  [📊 Materiales]  │
│                                          │
│ Este mes:                                │
│ Ventas atribuidas: 8                     │
│ Comisión generada: $1,200                │
│ Pendiente de pago: $600                  │
│ Próxima liquidación: 25 sep              │
│                                          │
│ Histórico:                               │
│ Sep 2026: $1,200 (8 ventas)             │
│ Ago 2026: $900 (6 ventas)              │
│                                          │
│ CLABE: ****1234  RFC: XXXX******XX      │
│ [Actualizar datos]                       │
└──────────────────────────────────────────┘
```

---

## 5. Endpoints API

```
POST   /api/referrals/generate     — Generar código para usuario autenticado
GET    /api/referrals/qr/{code}    — Descargar QR como PNG
GET    /api/referrals/stats        — Estadísticas del referidor autenticado
GET    /api/referrals/history      — Historial de ventas referidas

// Solo admin
GET    /api/admin/referrals        — Lista de todos los referidores
GET    /api/admin/referrals/fraud  — Alertas de fraude
POST   /api/admin/referrals/{id}/suspend — Suspender referidor

// Redirect público
GET    /r/{code}                   — Redirect con atribución (middleware)
```

---

## 6. Regla de los $500 netos

**La comisión de referido ($150) ya está calculada para mantener el piso de $500:**

```
Básico $999:
  Precio:                    $999.00
  − IVA incluido (16%):      −$137.79
  − Stripe (3.6% + $3):      −$38.96
  − ISR RESICO (1%):          −$9.99
  − Comisión referido:       −$150.00
  = Neto con referido:        $662.26  ✅ > $500

Sin referido:
  = Neto:                     $812.26  ✅

Premium $1,799:
  Con referido $150:          $1,158.83  ✅
```

**Tope duro en código:** ningún descuento, crédito o combinación de promociones puede dejar el neto por debajo de $500 en Básico.

```typescript
// src/lib/referrals/commission.ts
export const REFERRAL_COMMISSION_MXN_CENTS = 15000; // $150

export function validateNetAfterCommission(priceCents: number): boolean {
  const net = 0.8117 * (priceCents / 100) - 33.48 - (REFERRAL_COMMISSION_MXN_CENTS / 100);
  return net >= 500;
}
```

---

## 7. Prioridad de implementación

| Fase | Qué | Cuándo |
|---|---|---|
| **Early Bird** | Solo Nivel 1 (Referido en crédito) | Lanzamiento ~15 oct |
| **Post-EB** | Nivel 2 (Embajador en efectivo) | Cuando haya contador contratado |
| **Fase 2** | Nivel 3 (Aliado B2B) | Cuando haya volumen + negociación caso por caso |

**Para Early Bird solo se necesita:**
1. Modelo ReferralCode + ReferralSale
2. Generación de código al registrarse
3. Redirect `/r/{code}` con cookie
4. Atribución en checkout (webhook de Stripe)
5. Acreditación automática a los 7 días
6. Sección "Invita y gana" en dashboard
7. Antifraude básico

---

## 8. Guardrails

- ❌ NUNCA pagar efectivo a menores de edad
- ❌ NUNCA permitir autocompra (mismo usuario o email normalizado)
- ❌ NUNCA sobrescribir una atribución existente (first touch wins)
- ❌ NUNCA acreditar comisión antes de los 7 días antifraude
- ❌ NUNCA dejar que la combinación precio − comisiones netas < $500 en Básico
- ✅ El crédito expira a los 12 meses
- ✅ El QR se genera server-side (no servicio externo)
- ✅ Documentar cada comisión en efectivo como comisión mercantil (para el contador)

---

*Fin de especificación. La sesión CLO produce el contrato de adhesión del Embajador por separado.*
