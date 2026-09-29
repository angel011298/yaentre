# Retorno — Bloque 3 (RESICO, fiscal, referidos, roles y soporte)

> De: sesión de desarrollo (CTO) · Para: sesión CLO/CFO/CMO + Ángel
> Fecha: 29 de septiembre de 2026
> Rama: `claude/intelligent-gates-sxp9pr` (repo `angel011298/yaentre`)
> Flujo: **entrega de archivos, no despliegue.** `vercel --prod` lo corre Ángel.
> Documentos de partida: `CONTEXTO_YAENTRE_HANDOFF.md` (gana ante un conflicto), `ESPECIFICACION_MARKETPLACE_PROFESORES_CTO.md` (§10, monitor RESICO) y `ESPECIFICACION_QR_COMISIONES_CTO.md`.

## Resumen

De los 4 puntos del encargo: **4 entregados y verificados**, con dos límites que ya eran parte del encargo —el efectivo de referidos (Nivel 2 Embajador, Nivel 3 Aliado) y el motor de liquidaciones/CFDI siguen **bloqueados** esperando al contador— y **una decisión tuya sin cerrar (§6.5)** sobre la que construí con los valores de la spec.

| # | Punto | Estado |
|---|---|---|
| 1 | **Monitor de techo RESICO** (spec §10) — semáforo por carril | ✅ Listo |
| 2 | **Tablero fiscal**: IVA por enterar, retenciones del día 17, reserva de desempeño | ✅ Listo — ⚠️ tasas de retención abiertas (§6.6/§6.7), preguntas #14-#16 |
| 3 | **Programa de referidos / comisionistas / aliados** (QR spec completa) | ✅ **Nivel 1 (crédito) listo** · ⛔ Nivel 2 y 3 **bloqueados** (contador, §6.3/§6.4) · ⚠️ §6.5 sin confirmar, preguntas #1-#10 |
| 4 | **Roles**: admin completo, contador (solo lectura fiscal), soporte (ARCO/reembolsos) | ✅ Listo — ⚠️ ARCO rectificación/cancelación por terceros **no** están, pregunta #22 |

Además, fuera del encargo pero necesario y declarado: **Next.js 16.2.12 → 16.3.3** (dos avisos críticos de ejecución remota sin autenticación que ponían `security:deps` en rojo) y dos overrides de dependencias (ver §Dependencias y pregunta #26).

`pnpm typecheck`, `pnpm lint` y `pnpm build` en **verde**; `pnpm test:unit` **2 125 / 2 125** (130 archivos), **dos corridas completas seguidas sin un rojo intermitente**; `pnpm referrals:integration` **82 / 82 contra un Postgres 16 real**; mutación comprobada sobre cada control nuevo (ver §Verificaciones).

### ⛔ Lo que NO se hizo y por qué

- **Nivel 2 (Embajador en efectivo) y Nivel 3 (Aliado B2B).** Como pediste, solo Nivel 1. El modelo de la spec (§3.1) trae los campos `holderName/holderRfc/holderClabe/paymentRail` y `CommissionType.CASH`; **están en el schema pero ningún código los escribe**, y un código de tipo `EMBAJADOR`/`ALIADO` **no atribuye nada** (probado contra la base real). No hay panel de Embajador, ni onboarding de RFC/CLABE, ni pool de liquidación, ni contrato. Todo eso espera al contador, igual que el marketplace (#27).
- **Retenciones efectuadas de ISR/IVA y CFDI de retenciones.** El tablero muestra retenciones **solo como escenarios** (1 % y 2.5 % de ISR) porque la tasa exacta de la plataforma es una consulta abierta al fiscalista (§6.6) y no existe una tasa de retención de IVA confirmada (§6.7). «Retenciones efectuadas» vale $0 porque el motor de liquidación no está activo.

---

## Qué se hizo, por punto

### 1) Monitor de techo RESICO — LISTO (`9fd15a4`)
`src/lib/admin/resico-monitor.ts` (puro) + `src/lib/db/resico.ts` + tarjeta en `/admin/profesores` y `/fiscal/resico` + `GET /api/admin/resico`.
- **Por carril**, como pediste: suscripciones al 100 %; **Carril A** (`COMISION_MERCANTIL`) cuenta **solo la comisión** de YaEntre; **Carril B** (`ASIMILADOS`) cuenta el **valor completo** de la clase retenida. La cifra «todo en B» (el peor caso de la spec §10) se conserva **como referencia**, con el ahorro de la migración a Carril A.
- Semáforo por **décimas de punto enteras** (sin coma flotante en las fronteras): verde < 60 %, amarillo < 80 %, rojo ≥ 80 % del techo de $3.5M, redondeo hacia abajo. Año fiscal en **hora de México** (UTC−6 fijo); base de **efectivo** por `Payment.paidAt` y `ClassSession.paidAt`; un reembolso resta en el mes en que se hace.
- ⚠️ **Contradicción de la spec resuelta a favor de tu instrucción**: el código de la spec §10 suma todo como Carril B mientras su propia UI y tu mensaje piden el desglose por carril. Seguí el desglose por carril; #14 lo deja para que lo valide el contador.

### 2) Tablero fiscal — LISTO (`761c98e`)
`/fiscal` (contador y admin), `GET /api/fiscal/summary` y `GET /api/fiscal/export?month=AAAA-MM`.
- **IVA por enterar por mes**: 16 % **incluido** en el precio, calculado sobre el **total del mes** (no pago por pago: acumularía centavos), con devoluciones restadas en el mes en que se **hacen**. **Fecha límite el día 17** del mes siguiente, recorrida al lunes si cae en fin de semana, con estado vigente/próximo/vencido.
- **Retenciones**: escenarios de ISR al 1 % y 2.5 % sobre las bases retenibles; **ninguna tasa de IVA inventada**.
- **Reserva de desempeño** de las clases retenidas (15 %/30 días) con su fecha de liberación.
- **«Cobertura de datos»**: un panel que **declara lo que el sistema no ve** en vez de subestimar en silencio. Hoy: las **renovaciones del plan Mensual (`invoice.paid`) no crean fila de `Payment`** (hueco heredado de F8) → el ingreso fiscal está subestimado por ese concepto (#15).
- **CSV para el CFDI global mensual**: sin datos personales, con BOM UTF-8 **escrito como escape** (encontré que estaba como carácter literal invisible; ver §Hallazgos), `no-store`, `attachment`, y **la descarga queda en la bitácora antes de entregarse**.
- Datos nuevos: `Payment.paidAt` (cuándo se COBRÓ; en OXXO/SPEI la fila nace días antes) y tabla `payment_refunds` (un reembolso con SU fecha).

### 3) Programa de referidos — Nivel 1 LISTO (`b3759f1`, `f02c652`)
**Modelo** (spec §3.1; **modifica `prisma/schema.prisma`**, autorizado): `ReferralCode`, `ReferralSale` (`purchaseId` ÚNICO: una compra, una venta), y —porque la spec no define cómo se gasta el crédito— `ReferralCreditLot` (un lote de $150 por venta acreditada) y `ReferralCreditRedemption` (lo que un checkout aparta); `UserProfile.referredByCodeId`. Cuatro tablas de **solo servidor** (RLS sin política + REVOKE).
- **Código y enlace**: 8 símbolos de un alfabeto de 31 sin 0/O/1/I/L, con `crypto.randomInt`, lista de cadenas bloqueadas (una grosería en un cartel es una queja segura) y unicidad `(persona, tipo)` que cierra la carrera de dos clics. Se genera al registrarse (alumno **o tutor**) y, si falló, al abrir «Invita y gana».
- **`/r/{código}`** (§3.2-3.3): redirige y escribe la cookie `ye_ref` (httpOnly, `sameSite=lax`, `secure` en producción, 30 días). **First touch wins**: con una atribución ya guardada no se sobreescribe ni se consulta la base; una cookie **corrupta** no cuenta como atribución. Solo códigos REFERIDO activos. La atribución se **persiste al registrarse**, solo en el `create` del perfil.
- **QR** (§3.3): `qrcode` para la matriz y **PNG propio con el logo de Tino al centro** (18 % del lado, corrección H). **Se DECODIFICA con un lector real (jsQR)** y un logo de 60 % sí lo rompe: el verde significa algo. Lo miré como imagen.
- **Tope duro de $500 netos** (§6, tu instrucción): en **enteros**, `neto = ⌊0.8117 × pagado⌋ − $33.48 − comisión ≥ $500`. Mínimo pagado exacto: **$657.24 sin comisión, $842.04 con la de $150**. Comparado contra la fórmula flotante de la spec en 400 000 precios (solo difiere a ±1 centavo del propio umbral). **Todos los precios de Básico y Premium de la matriz lo cumplen; ningún precio del Mensual** (su neto ya no llega a $500 sin comisión), así que queda fuera **por construcción** (#2).
- **Crédito en el checkout**: se aparta con actualizaciones **condicionales** (dos checkouts simultáneos no gastan el mismo saldo: verificado contra Postgres real), baja el monto cobrado (`price_data`; un Price fijo de Stripe no admite rebaja), se **consume en la misma transacción** que activa el plan y se **libera** si el pago falla o la sesión expira (manejo nuevo de `checkout.session.expired`; el reconciliador diario lo cubre si el evento no está suscrito). El tope aplicable **resta también la comisión de esa misma compra** si el comprador vino de un referidor: en Básico $999 caben $341.76 de crédito sin referidor (dos lotes) y $156.96 con referidor (uno). Si el crédito no se puede consultar o apartar, la acción **devuelve un error**; no cobra el precio completo por la libre.
- **Antifraude básico** (§3.4): autocompra (misma cuenta) y **mismo correo** nacen `REVERSED` y sin comisión; **velocidad** (> 5 ventas del mismo código en 24 h) y **patrón de reversiones** (≥ 2 en 90 días) **retienen** la acreditación hasta que un admin maestro resuelva. ⚠️ **La normalización de correo de la spec está rota** (#4). «Mismo dispositivo» **no** se implementó (#6).
- **Acreditación diaria** (§3.2): a los 7 días, sin reembolso ni marca. Verifica `payment_refunds` **y pregunta a Stripe**; si Stripe no responde **no acredita** y lo reporta (falla cerrado). Corre dentro del cron diario de reconciliación (**`vercel.json` intacto**: Hobby solo admite dos crons y están ocupados), con pasos aislados que responden 500 si uno falló, no un `0` limpio.
- **La venta se registra DESPUÉS del commit del pago**, nunca dentro de la transacción que activa el plan (un fallo del programa no puede revertir un acceso pagado ni volver un 200 en 500), y el respaldo diario recoge lo que se quedó atrás.
- **Tableros** (§4): `/app/invitar` (alumno) y `/tutor/invitar` (tutor, tema claro): código, copiar enlace, descargar QR, crédito con vencimiento, en verificación, referidos exitosos, historial, «cómo funciona». Aviso de crédito en el paywall y enlaces desde el perfil y el panel del tutor. **El historial no muestra quién compró** (#8).
- **Endpoints** (§5): `POST /api/referrals/generate`, `GET /api/referrals/qr/{code}` (solo el código propio; otro o inexistente = 404), `/stats`, `/history`; admin `GET /api/admin/referrals`, `/fraud`, `POST /{id}/suspend`, y —además— `/reinstate` y `/resolve-flag`. `/admin/referidos` con alertas y referidores. Las de escritura: **cuatro condiciones de G99 + admin maestro**.
- **Cuenta y privacidad**: anonimizar la cuenta desactiva su código y **pierde el crédito** (#9); la exportación ARCO incluye su programa **sin datos de compradores**.

### 4) Roles — LISTO (`6d2a12d`, `be6ede3`)
`UserRole` += `ACCOUNTANT` y `SUPPORT` (**modifica el schema**, declarado). Una **matriz de capacidades pura** (`src/lib/admin/capabilities.ts`), enumerada a mano:

| Rol | Puede |
|---|---|
| ADMIN | todo el panel `/admin` + fiscal + soporte. Lo destructivo sigue exigiendo **admin maestro** (`MASTER_ADMIN_EMAILS`) |
| ACCOUNTANT | **solo lectura fiscal** (`/fiscal`, RESICO). Nada de cuentas, bóveda, bitácora ni acciones |
| SUPPORT | buscar una cuenta y su ficha, **ARCO** (exportar datos, retirar marketing) y reembolsar **solo dentro de la válvula** |

- Las zonas nuevas viven en **`/fiscal` y `/soporte`, fuera de `/admin`** a propósito: el layout de `/admin` exige ADMIN y muchas páginas se apoyan solo en él; admitir ahí a un contador habría abierto la bitácora y la bóveda sin tocar esas páginas. **Cada** página, ruta y acción llama a su guard por su cuenta y un **barrido del código fuente** pone en rojo un archivo sin guard. `is_admin()` en la base sigue siendo solo ADMIN. Inicio de sesión, `/app` y el service worker ya conocen los roles nuevos.
- **Soporte (`/soporte`)**: búsqueda, ficha (identidad, planes, cobrado/reembolsado, válvula — **sin** actividad de estudio ni contraseñas; abrirla deja `support.ficha_viewed`), **ARCO acceso** (JSON descargable, auditado **antes** de entregarse, `no-store`) y **oposición** (retirar marketing).
- **Reembolso** con **válvula de 48 h y consumo cero** (handoff §3.1, «no publicada como derecho»): soporte solo dentro; **ADMIN siempre maestro**; los hechos y el monto salen de la base, **nunca del input** (esquema estricto). Stripe con clave de idempotencia (pago + lo ya devuelto) y `metadata.origin = 'support'`. Tras mover el dinero **nada se revierte ni queda en silencio**: baja del plan, **devolución del crédito de referidos gastado en esa compra** y reversa de la venta de referido, cada paso con su reporte. Un reembolso pendiente (OXXO/SPEI) se avisa.
- **Webhook `charge.refunded` + reconciliación diaria (3 días)**: `payment_refunds` por `stripeRefundId` **único** (webhook, soporte y reconciliación pueden llegar en cualquier orden sin contar dos veces), solo reembolsos exitosos, reversa de la venta de referido, y una **alerta a Sentry** ante un reembolso **total** hecho **fuera de la app** sobre un plan activo: **no se revoca el acceso en silencio** (quitarle el plan a alguien a días de su examen por un evento externo es una decisión, no un efecto colateral).

---

## Hallazgos que conviene que conozcas

1. **La normalización de correo de la spec §3.4 no detecta lo que quiere detectar.** `e.split('+')[0]` pierde el dominio: `pedro+1@gmail.com` → `pedro`, que **no** es igual a `pedro@gmail.com`; y `ana+a@gmail.com` y `ana+b@yahoo.com` darían ambos `ana`. Usé una versión corregida (alias `+`, puntos solo en Gmail, `googlemail`) y dejé en las pruebas la demostración del defecto.
2. **El cuadro de la spec §6 contradice su propio código.** El cuadro da $662.26 de neto para Básico $999 con referido; la fórmula (`0.8117 × precio − 33.48 − 150`) da **$627.40**. El cuadro omite el fijo de $33.48 y el IVA de la comisión de Stripe. Seguí el **código** de la spec y la fórmula del contexto maestro, que coinciden (#3).
3. **Un BOM invisible en el CSV fiscal** (U+FEFF escrito como carácter): bastaba que un formateador lo quitara para que Excel leyera mal todos los acentos sin que nada lo delatara. Es la misma clase de defecto que el backspace de `security:authz`. Ahora es un escape y hay un barrido que impide su regreso.
4. **`security:deps` estaba en rojo**: dos avisos **críticos** de Next.js (ejecución remota sin autenticación, en el servidor sobre Windows y en la API de optimización de imágenes) más `sharp` y `fast-uri`. Subí los overrides de `sharp`/`fast-uri` y actualicé Next a **16.3.3** (la versión mínima parcheada; hay 16.3.7). Verde: typecheck, lint, 2 125 pruebas, build. **No** corrí Playwright ni un preview (#26).
5. **Una prueba con 400 000 aserciones** reventaba el timeout de 5 s en la corrida completa (rojo intermitente, la firma de G73b). Se acumulan las discrepancias y se afirma una vez.

---

## Verificaciones corridas

| Verificación | Resultado |
|---|---|
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | ✅ (build con Next 16.3.3) |
| `pnpm test:unit` | ✅ **2 125 / 2 125**, 130 archivos; **dos corridas seguidas** sin rojo intermitente |
| Migraciones 0022 y 0023 **aplicadas DOS veces** sobre un **Postgres 16 real** (idempotencia) | ✅ |
| Paridad schema ↔ migraciones vs `prisma migrate diff --from-url` | ✅ **«This is an empty migration»** (0 diferencias) |
| RLS solo-servidor de las 5 tablas nuevas, **por efecto** con `SET ROLE anon/authenticated/acierta_app` | ✅ los dos primeros: `permission denied`; `acierta_app`: lee |
| `pnpm referrals:integration` contra Postgres real (concurrencia, unicidad, reservas simultáneas, reversas, reembolsos, historial sin datos del comprador) | ✅ **82 / 82** |
| QR: PNG válido (CRC de cada chunk), ≈ 400 px, violeta de marca, y **decodificado con jsQR** en 25 códigos al azar | ✅ (y un logo de 60 % lo rompe: rojo alcanzable) |
| Barrido de la regla «ningún esquema del borde acepta un id de usuario» (réplica del de `security:authz`) | ✅ 249 archivos; único ofensor: `src/lib/admin/schemas.ts`, la excepción autorizada de G99 |
| Barrido de guards en `/fiscal`, `/soporte`, `/r`, `/api/referrals`, `/api/admin/referrals`, `/api/support` y servicios | ✅ |
| Matrices de autorización: capacidades (92), referidos admin (54), soporte (47), reembolso: rol × maestro × válvula (22) | ✅ los roles sin capacidad figuran **dentro** de `MASTER_ADMIN_EMAILS`, para que solo el rol pueda detenerlos |
| Copy prohibido («garantía», «próximamente», «nuestros profesores», «equipo docente») en la interfaz nueva | ✅ |
| Caracteres de control invisibles en `src`, `app`, `scripts`, `prisma`, `tests`, `public` | ✅ (control positivo con el backspace de G99 y el BOM) |
| **Mutaciones** (cada una puso el test en rojo): comisión, piso, redondeo, off-by-one del mínimo, planes elegibles, autocompra/correo/velocidad, vencimiento del crédito y orden de consumo, first-touch, cookie sin httpOnly/Secure, limitador de `/r`, saldo sin condición, acreditar sin verificar reembolso, acreditar con Stripe caído, liberar no idempotente, historial que filtra el id del comprador o la marca de fraude, apartado sin liberar en cada camino de fallo, venta registrada DENTRO de la transacción, sin compuerta de maestro, bitácora sin `await`, rol equivocado, id de la ruta ignorado, esquema permisivo, reembolso sin válvula, todo ADMIN maestro, monto tomado del input, sin idempotencia, doble conteo de reembolsos, alerta ante reembolso de soporte o parcial | ✅ **0 mutantes sobrevivientes** (los que sobrevivieron al principio se resolvieron endureciendo la prueba, no la mutación) |

**No pude correr** (sin credenciales ni red hacia esos servicios): nada contra **Stripe real** (la API de reembolsos, `charge.refunded`, el reembolso pendiente de OXXO/SPEI, el Checkout con `price_data` rebajado); nada contra **Supabase real** (los privilegios por defecto de tablas nuevas difieren de mi base de prueba); `pnpm security:*` con el rol de producción; **Playwright**; y **no revisé las pantallas nuevas en un navegador** (solo tipos, build, un render de servidor y la imagen del QR). Un verde de `security:*` con otro rol no dice nada (G73b).

---

## Acciones manuales para Ángel (en este orden)

1. **Aplicar `0022` y luego `0023` como `postgres`** por el panel/API de Supabase (**no** `prisma db execute`). **Antes** de `vercel --prod`: el webhook ya escribe `payments.paidAt` y falla sin la columna. Después: `pnpm prisma migrate diff` (solo deben salir los índices de rendimiento de 0012) y `pnpm security:grants` con el rol de producción, porque las tablas nuevas nacen con los privilegios por defecto de Supabase.
2. **Suscribir el webhook de Stripe a `charge.refunded`** (además de `payment_intent.succeeded` y `checkout.session.expired`). Sin él el respaldo diario lo recoge con hasta un día de retraso. El de producción se crea a mano (checklist actualizada).
3. **Promover las cuentas de contador y de soporte** desde `/admin/usuarios` (cambio de rol; requiere admin maestro). Verificar con cada una que **`/admin` la rechaza** y que solo ve lo suyo.
4. **`MASTER_ADMIN_EMAILS` configurada** en Vercel (reembolsos fuera de la válvula, suspender referidores, resolver marcas). Vacía = nadie puede: es a propósito.
5. **Probar Next 16.3.3 en un preview** antes de producción (login, simulador, checkout de prueba, imágenes) y correr Playwright con credenciales.
6. **Probar con Stripe en modo prueba, de punta a punta**: una compra con crédito de referidos (el monto rebajado llega bien a Stripe y `amount_total` = lo pagado), un reembolso de soporte dentro de la válvula, un reembolso desde el panel de Stripe (debe aparecer en `payment_refunds` y disparar la alerta si es total sobre un plan activo) y un checkout abandonado (el crédito vuelve).
7. **CLO — textos**: el **Aviso de Privacidad** debe mencionar la cookie `ye_ref`, el programa de referidos y que la persona **no** ve quién compró; los **Términos** deben decir que el crédito es un descuento (no efectivo), vence a los 12 meses, no se convierte en dinero, se pierde al eliminar la cuenta y se devuelve si se reembolsa la compra en que se gastó. Hoy la pantalla ya lo dice, pero el texto legal manda.
8. **No cambia** nada de: interruptores `SALES_OPEN`/`MARKETPLACE_OPEN`, llaves de Stripe, `vercel.json`. Recuerda que el plan Hobby **prohíbe uso comercial** (bloqueador de G72).

---

## Preguntas abiertas (no las adiviné)

**Referidos (handoff §6.5 sigue sin confirmación tuya explícita: construí con los valores de la spec — $150 en crédito, Nivel 1 — y el monto es una sola constante)**
1. 🔴 **§6.5** — ¿confirmas los tres niveles con referido masivo en crédito y efectivo solo adultos con RFC, y el tope de $150? Si cambia el monto, cambia `REFERRAL_COMMISSION_MXN_CENTS` y el piso se recalcula solo.
2. **El plan Mensual queda fuera de comisión y de crédito.** Su neto ($46.87 en Early Bird) ya está muy por debajo de $500 sin ninguna comisión, así que el tope duro lo excluye solo. El mockup de la spec §4 dice «se aplica en tu próxima compra **o renovación**»: no lo hice para Mensual. ¿Lo confirmas? (Relacionado con la existencia misma del Mensual, §6.1, que sigue abierta.)
3. **Cuadro de la spec §6 vs su fórmula** ($662.26 vs $627.40, hallazgo #2). Seguí la fórmula. ¿El cuadro era ilustrativo?
4. **Normalización de correo** (hallazgo #1): usé la versión corregida. Sin acción, solo enterado.
5. **Cookie y `localStorage`**: la spec pide guardar en las dos; usé **solo cookie** (el redirect es del servidor y `CLAUDE.md` prohíbe `localStorage` para esto). Perdemos la atribución de quien borre cookies y visite otra vez; es el comportamiento estándar.
6. **Sin huella de dispositivo** (§3.4, punto 3): exigiría guardar un identificador por visitante —la mayoría, menores— para un beneficio marginal (el mismo cuarto y el mismo wifi es lo normal, no el fraude). ¿Lo dejamos fuera?
7. **Umbrales del antifraude** que la spec no fija: reversiones ≥ **2 en 90 días**; velocidad > **5 en 24 h**. Son constantes; conviene ajustarlas con datos reales.
8. **El historial no muestra quién compró** (la spec §4 dibuja «María G.»). Por minimización de datos (muchos compradores son menores, LFPDPPP). Solo se ve la fecha y el estado. ¿De acuerdo?
9. **El crédito se pierde al eliminar la cuenta** y **se devuelve** si se reembolsa la compra en que se gastó. Y el crédito aplicado es **conservador** (resta la comisión de la propia venta *y* el crédito del mismo neto, aunque ese crédito sea en origen la comisión de otra venta): prefiere regalar menos a arriesgar el piso. Aplica también a Premium. ¿Correcto?
10. **Nivel 1 no envía correo** al acreditarse (evita crear un tipo de notificación sin decidir si es opt-in). ¿Quieres aviso «ganaste $150»?

**Soporte y reembolsos**
11. **«Consumo cero» no está definido en el contexto maestro.** Lo medí como **cero sesiones de estudio** (diagnóstico, práctica o simulacro) iniciadas desde que se activó el plan, además de ≤ 48 h desde el cobro. Es conservador: quien abrió un simulacro y lo dejó ya consumió contenido (los reactivos se sirven completos al abrirlo, G67). ¿Es esa la definición?
12. **Soporte no reembolsa fuera de la válvula** y un ADMIN no maestro tampoco: solo el maestro. ¿Quieres que soporte pueda escalar con un motivo a una cola para el maestro?
13. **Un reembolso desde el panel de Stripe no revoca el acceso**: solo alerta. ¿Prefieres revocar automáticamente los reembolsos totales? Lo evité por irreversible (el alumno puede estar a días del examen).

**Fiscal**
14. **RESICO por carril vs «todo en B»** (la spec §10): dejé el desglose por carril y la cifra «todo en B» como referencia. Que lo valide el contador. Además, los importes van **con IVA incluido** (margen de seguridad ~16 %) y por base de efectivo.
15. 🔴 **Las renovaciones del plan Mensual no se registran como `Payment`** (`invoice.paid` no se maneja): el ingreso fiscal está subestimado por ese concepto y **el tablero lo declara**. ¿Lo implemento? Depende de si el Mensual sigue existiendo (§6.1).
16. **Tasas de retención de plataforma** (§6.6, ISR 1 % vs 2.5 %) y **retención de IVA** (§6.7): siguen abiertas; el tablero solo muestra escenarios. Tampoco está modelado el **IVA acreditable** (el IVA de la comisión de Stripe): para el contador.
17. **Fecha límite del día 17** recorrida al lunes si cae en fin de semana: asumí el criterio general. Que lo confirme el contador.
18. **Retención de datos de pago**: 5 años (art. 30 CFF) — `payment_refunds` no se borra en cascada al eliminar una cuenta porque las cuentas se anonimizan, no se eliminan.

**Roles y privacidad**
19. **Contador y soporte no tienen espacio de alumno** (`/app` los manda a su zona) y no pueden tener código de referido. ¿Correcto?
20. **Abrir una ficha de soporte queda en la bitácora** (`support.ficha_viewed`). Es más estricto que `/admin/usuarios` (que no audita lecturas). ¿Igualamos hacia arriba o hacia abajo?
21. **La ficha de soporte muestra el correo y los cobros** de la persona. Nada de actividad de estudio. ¿Suficiente para atender un ARCO?
22. **ARCO rectificación y cancelación a nombre de un tercero: no están.** La cancelación es eliminar la cuenta, que la persona hace desde su perfil; hacerlo por otra exige **verificar identidad** primero (proceso del CLO). La oposición sí (retirar marketing) y el acceso sí (exportación).
23. **ARCO acceso**: la exportación es un JSON con todo lo de la persona, incluidas sus respuestas de examen. Es el derecho de acceso completo; ¿quieres una versión resumida?
24. **Roles y `MASTER_ADMIN_EMAILS`**: cambiar a alguien a `ACCOUNTANT`/`SUPPORT` sigue siendo acción de admin maestro. Un maestro no puede cambiar su propio rol (regla de G99).

**Dependencias y operación**
25. Nuevas: `qrcode` 1.5.4 (producción), `jsqr` y `@types/qrcode` (solo desarrollo, para decodificar el QR en las pruebas).
26. **Next 16.3.3**: probar en preview (acción #5). Hay 16.3.7 disponible; no la tomé para no mover más de lo necesario. Quedan **3 avisos moderados** de `pnpm audit`, por debajo del umbral.
27. **Sigue bloqueado por el contador** (§6.3, §6.4, §6.6, §6.7): Nivel 2/3 de referidos (efectivo, RFC, CLABE, contrato de adhesión), motor de liquidación semanal, CFDI de retenciones/nómina. Cuando confirmes que el contador validó el proceso, son el siguiente bloque.

---

## Bitácora de commits de este bloque
`9fd15a4` monitor RESICO · `6d2a12d` roles de personal y matriz de capacidades · `761c98e` tablero fiscal · `b3759f1` referidos (datos, atribución, antifraude, acreditación, checkout) · `f02c652` «Invita y gana», QR y administración de referidos · `be6ede3` soporte, ARCO, reembolsos y sincronía de Stripe · `0f018fa` Next.js 16.3.3 · (último) documentación y retorno.
