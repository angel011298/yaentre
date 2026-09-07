# Correos de autenticación de Supabase (G70b)

> Copia versionada de las **plantillas de correo de Supabase Auth**. Viven en
> un dashboard, no en el repo: si alguien las resetea, este archivo es la
> única forma de recuperarlas. Proyecto `fumluvvzskhdxcyljbmx` (Acierta) →
> **Authentication → Emails → Templates**.
>
> Fase que las escribió: **G70b (2026-09-06)**. Antes estaban en el inglés
> por defecto de Supabase, lo que violaba la regla de `CLAUDE.md` de español
> mexicano en todo el copy de cara al usuario.

---

## 1. La configuración de URLs (Authentication → URL Configuration)

| Campo | Valor |
|---|---|
| **Site URL** | `https://yaentre.com` |
| **Redirect URLs** | `https://yaentre.com/**` y `https://www.yaentre.com/**` |

Hasta G70b el Site URL era `http://localhost:3000`: el enlace de
verificación que recibía un usuario real lo mandaba a una página muerta
(su cuenta sí quedaba confirmada, pero el aterrizaje no existía).

El Site URL no es solo el destino por defecto: **se expone como
`{{ .SiteURL }}` dentro de las plantillas**, y tres de las seis lo usan para
construir su enlace. Cambiarlo cambia esos correos.

---

## 2. 🔴 Por qué NO se usa `{{ .ConfirmationURL }}`

Es el error que se habría colado si solo se hubiera arreglado el Site URL.

`{{ .ConfirmationURL }}` genera un enlace a
`https://<ref>.supabase.co/auth/v1/verify?token=…&type=signup&redirect_to=<Site URL>`:
GoTrue verifica el token **en su propio servidor** y luego redirige al
`redirect_to` **sin ningún parámetro**.

Pero `app/auth/confirm/route.ts` (el destino, desde G60) espera el patrón
**`token_hash` + `type`** y llama a `supabase.auth.verifyOtp()` él mismo.
Sin `token_hash` cae en su rama de error y redirige a
`/login?error=verification_failed`. Es decir: con el Site URL arreglado
**pero la plantilla por defecto**, el usuario acabaría viendo un error de
verificación aunque su cuenta hubiera quedado confirmada — un fallo más
confuso que el original.

Por eso cada plantilla construye el enlace a mano contra la app:

| Plantilla | `href` del botón |
|---|---|
| Confirm sign up | `{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=signup` |
| Reset password | `{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery` |
| Invite user | `{{ .SiteURL }}/auth/confirm?next=/app&amp;token_hash={{ .TokenHash }}&amp;type=invite` |
| Magic link or OTP | `{{ .SiteURL }}/auth/confirm?next=/app&amp;token_hash={{ .TokenHash }}&amp;type=magiclink` |
| Change email address | `{{ .SiteURL }}/auth/confirm?next=/app&amp;token_hash={{ .TokenHash }}&amp;type=email_change` |
| Reauthentication | (sin enlace — usa `{{ .Token }}`) |

**`{{ .RedirectTo }}` en las dos primeras, y no `{{ .SiteURL }}`, es
deliberado:** `app/actions/auth.ts` ya manda un `emailRedirectTo` con el
`next` correcto para cada caso — `/tutor` para un registro de tutor,
`/app` para un alumno, `/actualizar-password` para la recuperación. Colgarse
de `{{ .SiteURL }}` en esas dos mandaría a todos los tutores al tablero de
alumno. Las otras cuatro no nacen de la app (las dispara el dashboard o la
API de administración) y ahí `.RedirectTo` puede venir vacío, así que usan
`{{ .SiteURL }}` con un `next` fijo.

El `token_hash` que emite el proyecto viene con prefijo `pkce_` porque
`@supabase/ssr` usa el flujo PKCE. `verifyOtp({ token_hash })` lo acepta tal
cual — es el patrón oficial de Supabase para Next.js del lado del servidor.

---

## 3. El envoltorio común

Las seis plantillas comparten el mismo envoltorio, idéntico al `wrapEmail()`
de `src/lib/email/templates.ts` (mismo morado `#7C3AED`, mismo ancho 480 px,
mismo radio 16 px), para que los correos de Supabase y los de Resend se vean
como el mismo producto. `{{BLOQUE}}` es lo único que cambia entre plantillas.

```html
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
  <div style="padding: 24px 0; text-align: center;">
    <span style="font-size: 20px; font-weight: 700; color: #7C3AED;">YaEntre</span>
  </div>
  <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 24px;">
{{BLOQUE}}
  </div>
  <div style="padding: 20px 8px; text-align: center; font-size: 12px; color: #888;">YaEntre &middot; yaentre.com</div>
</div>
```

Dentro del bloque se repiten tres piezas. `HREF` es el `href` de la tabla de
arriba, literal:

```html
<!-- BOTÓN -->
    <p style="margin: 0 0 20px;"><a href="HREF" style="display: inline-block; background: #7C3AED; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 12px;">ETIQUETA</a></p>

<!-- ENLACE DE RESPALDO (para clientes de correo que no pintan el botón) -->
    <p style="font-size: 13px; line-height: 1.6; color: #555; margin: 0 0 16px;">Si el bot&oacute;n no te funciona, copia y pega esta direcci&oacute;n en tu navegador:<br /><a href="HREF" style="color: #7C3AED; word-break: break-all;">HREF</a></p>

<!-- NOTA AL PIE -->
    <p style="font-size: 13px; line-height: 1.6; color: #555; margin: 0;">TEXTO</p>
```

Los acentos van como entidades HTML (`&oacute;`, `&ntilde;`, `&iexcl;`…)
para no depender de la codificación con que el SMTP arme el mensaje.

---

## 4. Las seis plantillas

### 4.1 Confirm sign up

**Asunto:** `Confirma tu correo y entra a YaEntre`

```html
    <h1 style="font-size: 18px; margin: 0 0 12px;">&iexcl;Ya casi entras!</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Confirma tu correo para activar tu cuenta de YaEntre y empezar a prepararte para tu examen de admisi&oacute;n. Es el &uacute;ltimo paso.</p>
    [BOTÓN → "Confirmar mi correo"]
    [ENLACE DE RESPALDO]
    [NOTA: Si t&uacute; no creaste esta cuenta, puedes ignorar este correo.]
```

### 4.2 Invite user

**Asunto:** `Te invitaron a entrar a YaEntre`

```html
    <h1 style="font-size: 18px; margin: 0 0 12px;">Te est&aacute;n esperando en YaEntre</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Alguien te invit&oacute; a crear tu cuenta en YaEntre para prepararte para los ex&aacute;menes de admisi&oacute;n de la UNAM, el IPN, la UAM y el CENEVAL. Acepta la invitaci&oacute;n y empieza cuando quieras.</p>
    [BOTÓN → "Aceptar la invitaci&oacute;n"]
    [ENLACE DE RESPALDO]
    [NOTA: Si no esperabas esta invitaci&oacute;n, puedes ignorar este correo.]
```

### 4.3 Magic link or OTP

**Asunto:** `Tu enlace para entrar a YaEntre`

```html
    <h1 style="font-size: 18px; margin: 0 0 12px;">Entra sin escribir tu contrase&ntilde;a</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Da clic en el bot&oacute;n y entras directo a tu cuenta de YaEntre. El enlace sirve una sola vez y caduca pronto.</p>
    [BOTÓN → "Entrar a YaEntre"]
    [ENLACE DE RESPALDO]
    <p style="font-size: 13px; line-height: 1.6; color: #555; margin: 0 0 16px;">Tambi&eacute;n puedes escribir este c&oacute;digo en la app: <strong style="color: #1a1a1a; letter-spacing: 2px;">{{ .Token }}</strong></p>
    [NOTA: Si t&uacute; no pediste este acceso, ignora este correo.]
```

### 4.4 Change email address

**Asunto:** `Confirma tu nuevo correo en YaEntre`

```html
    <h1 style="font-size: 18px; margin: 0 0 12px;">Confirma tu nuevo correo</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Pediste cambiar el correo de tu cuenta de YaEntre a <strong>{{ .NewEmail }}</strong>. Conf&iacute;rmalo para terminar el cambio.</p>
    [BOTÓN → "Confirmar el cambio"]
    [ENLACE DE RESPALDO]
    [NOTA: Si t&uacute; no pediste este cambio, ignora este correo: tu correo actual se queda como est&aacute;.]
```

### 4.5 Reset password

**Asunto:** `Restablece tu contraseña de YaEntre`

```html
    <h1 style="font-size: 18px; margin: 0 0 12px;">&iquest;Olvidaste tu contrase&ntilde;a?</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Nos pasa a todos. Da clic para crear una nueva y seguir tu preparaci&oacute;n justo donde te quedaste.</p>
    [BOTÓN → "Crear una contrase&ntilde;a nueva"]
    [ENLACE DE RESPALDO]
    [NOTA: Si t&uacute; no pediste este cambio, ignora este correo: tu contrase&ntilde;a sigue igual.]
```

### 4.6 Reauthentication

**Asunto:** `{{ .Token }} es tu código de confirmación — YaEntre`

```html
    <h1 style="font-size: 18px; margin: 0 0 12px;">Confirma que eres t&uacute;</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Escribe este c&oacute;digo en YaEntre para continuar. Caduca en unos minutos.</p>
    <p style="margin: 0 0 20px; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #7C3AED;">{{ .Token }}</p>
    [NOTA: Si t&uacute; no lo pediste, ignora este correo y no compartas el c&oacute;digo con nadie.]
```

---

## 5. Las plantillas del grupo *Security* siguen en inglés — a propósito

`Password changed`, `Email address changed`, `Phone number changed`,
`Sign-in method linked`, `Sign-in method removed`, `MFA method added` y
`MFA method removed` conservan el texto por defecto de Supabase **porque las
siete están DESHABILITADAS** (verificado en G70b: los 7 interruptores en
`false`). Ningún usuario las recibe hoy.

**Si alguna vez se encienden, hay que traducirlas antes** — cada una es copy
de cara al usuario y cae bajo la misma regla de `CLAUDE.md`.

---

## 6. Cómo verificar sin adivinar

No hace falta un buzón: la **API de Resend devuelve el HTML exacto** de cada
correo que salió por su SMTP, incluidos los que origina Supabase Auth.

```bash
# con RESEND_API_KEY en el entorno (está en Vercel producción)
curl -s -H "Authorization: Bearer $RESEND_API_KEY" "https://api.resend.com/emails?limit=5"
curl -s -H "Authorization: Bearer $RESEND_API_KEY" "https://api.resend.com/emails/<id>"
```

El primero lista id, destinatario, asunto y `last_event`; el segundo trae
`.html` y `.text` ya renderizados.

Así se comprobó en G70b que las cuatro plantillas alcanzables desde fuera
(registro, recuperación, magic link, cambio de correo) salen en español y con
el enlace a `https://yaentre.com/auth/confirm?...`. `Invite user` y
`Reauthentication` no se pueden disparar sin `SUPABASE_SERVICE_ROLE_KEY` ni
MFA, así que se verificaron releyéndolas del dashboard tras recargar.

Para disparar los correos sin pasar por la interfaz:

```bash
# magic link
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/otp" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"...","create_user":false}'

# cambio de correo (requiere un access_token del usuario)
curl -s -X PUT "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/user" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"email":"..."}'
```

**Ojo con el gasto de correos:** el proyecto está en el plan gratuito de
Resend (100 correos/día, ver `docs/ESCALA.md`). Cada verificación consume uno.

---

## 7. 🟠 La trampa de `{{ .RedirectTo }}` fuera de producción (G71)

Encontrado corriendo el E2E de registro contra `http://localhost:3000`.

**Qué pasa.** `app/actions/auth.ts` manda
`emailRedirectTo: ${getSiteUrl()}/auth/confirm?next=…`. Si ese origen **no
está en la lista de Redirect URLs** de Supabase Auth, GoTrue no lo usa: degrada
`{{ .RedirectTo }}` al **Site URL pelado**, sin ruta y sin query. La plantilla,
que concatena `{{ .RedirectTo }}&amp;token_hash=…`, produce entonces:

```
https://yaentre.com&token_hash=pkce_8fc2c70c…&type=signup
```

Eso **no es una URL**: `yaentre.com&token_hash=…` se lee como nombre de host. El
enlace no aterriza en una página equivocada — está muerto. Es el mismo tipo de
fallo que G70b vino a arreglar, por otra puerta.

**Alcance real hoy.** En producción `NEXT_PUBLIC_SITE_URL` es
`https://yaentre.com`, que sí está permitido, así que **ningún usuario real está
afectado** (verificado en G71 con un registro real de punta a punta: el enlace
llegó bien formado y confirmó la cuenta). Lo que rompe es todo lo que no sea
producción: desarrollo local, despliegues de vista previa de Vercel y la prueba
E2E `registro → onboarding → diagnóstico → tablero`, que por eso no puede
correr en local.

**Remedio (acción del dueño, una línea).** Authentication → URL Configuration →
**Redirect URLs**, agregar el origen desde el que se vaya a correr:

| Para qué | Entrada |
|---|---|
| Desarrollo local y E2E | `http://localhost:3000/**` |
| Vistas previa de Vercel | `https://*-angel011298s-projects.vercel.app/**` |

**Regla general:** la lista de Redirect URLs tiene que contener **todos** los
orígenes desde los que la app llegue a mandar correos de autenticación. La
plantilla da por hecho que `{{ .RedirectTo }}` ya trae `?next=…` para que su
`&` continúe la query; en cuanto GoTrue la degrada, ese `&` la rompe. No hay
forma de blindar la plantilla desde el repositorio: el arreglo es la lista.
