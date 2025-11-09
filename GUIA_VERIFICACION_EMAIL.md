# 📧 Guía de Verificación de Email

Esta guía explica cómo configurar y personalizar el sistema de verificación de email en Firebase Authentication.

---

## 📋 Contenido

1. [Configuración del Template de Email](#configuración-del-template-de-email)
2. [Personalización del Template](#personalización-del-template)
3. [Medidas Anti-Spam](#medidas-anti-spam)
4. [Solución de Problemas](#solución-de-problemas)

---

## 📝 Configuración del Template de Email

### Paso 1: Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Templates**

### Paso 2: Configurar Email de Verificación

1. Haz clic en **Email address verification**
2. Configura los siguientes campos:

#### Asunto del Email
```
Confirma tu cuenta en Clikio
```

#### Cuerpo del Email (HTML)

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu cuenta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #FF6B00, #0044AA); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">¡Bienvenido a Clikio!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1a1a1a; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{displayName}}</strong>,
              </p>
              
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                Gracias por registrarte en Clikio. Para activar tu cuenta y comenzar a disfrutar de nuestras subastas y productos, necesitamos verificar tu dirección de email.
              </p>

              <!-- Botón de Confirmación -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{link}}" style="display: inline-block; padding: 16px 32px; background-color: #FF6B00; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);">
                      Confirmar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instrucciones Alternativas -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f5f7fa; border-radius: 8px; border-left: 4px solid #FF6B00;">
                <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 14px; font-weight: 600;">
                  ¿El botón no funciona?
                </p>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Copiá y pegá este enlace en tu navegador:
                </p>
                <p style="margin: 10px 0 0; word-break: break-all;">
                  <a href="{{link}}" style="color: #FF6B00; text-decoration: underline; font-size: 12px;">{{link}}</a>
                </p>
              </div>

              <!-- Información Importante -->
              <div style="margin: 30px 0; padding: 15px; background-color: #fff3e0; border-radius: 8px; border: 1px solid #ffb74d;">
                <p style="margin: 0; color: #e65100; font-size: 14px; line-height: 1.6;">
                  ⚠️ <strong>Importante:</strong> Este enlace expira en 24 horas. Si no verificás tu cuenta en ese tiempo, deberás solicitar un nuevo email de verificación.
                </p>
              </div>

              <!-- Footer -->
              <p style="margin: 30px 0 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                Si no creaste una cuenta en Clikio, podés ignorar este email de forma segura.
              </p>
            </td>
          </tr>

          <!-- Footer del Email -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f5f7fa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 12px;">
                © 2024 Clikio. Todos los derechos reservados.
              </p>
              <p style="margin: 0; color: #999999; font-size: 11px;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Cuerpo del Email (Texto Plano)

```
¡Bienvenido a Clikio!

Hola {{displayName}},

Gracias por registrarte en Clikio. Para activar tu cuenta y comenzar a disfrutar de nuestras subastas y productos, necesitamos verificar tu dirección de email.

Confirma tu cuenta haciendo clic en el siguiente enlace:
{{link}}

¿El enlace no funciona?
Copiá y pegá este enlace en tu navegador:
{{link}}

⚠️ IMPORTANTE: Este enlace expira en 24 horas. Si no verificás tu cuenta en ese tiempo, deberás solicitar un nuevo email de verificación.

Si no creaste una cuenta en Clikio, podés ignorar este email de forma segura.

© 2024 Clikio. Todos los derechos reservados.
Este es un email automático, por favor no respondas a este mensaje.
```

### Paso 3: Configurar Remitente

1. En **Action URL**, configura la URL de redirección:
   ```
   https://tu-dominio.com/login?verified=true
   ```

2. En **From name**, configura:
   ```
   Clikio
   ```

3. En **From email**, configura:
   ```
   no-reply@tu-dominio.com
   ```

---

## 🎨 Personalización del Template

### Variables Disponibles

Firebase proporciona las siguientes variables en los templates:

- `{{displayName}}` - Nombre del usuario
- `{{email}}` - Email del usuario
- `{{link}}` - Enlace de verificación (generado automáticamente)
- `{{unsubscribe}}` - Enlace para cancelar suscripción (si aplica)

### Personalizar Colores

En el template HTML, puedes cambiar los colores:

- **Primary (Naranja):** `#FF6B00`
- **Secondary (Azul):** `#0044AA`
- **Background:** `#f5f7fa`
- **Text Primary:** `#1a1a1a`
- **Text Secondary:** `#666666`

### Personalizar Nombre de la Plataforma

Reemplaza todas las instancias de "Clikio" con el nombre de tu plataforma.

---

## 🛡️ Medidas Anti-Spam

### 1. Configurar Registros DNS

#### SPF (Sender Policy Framework)

Agrega este registro TXT en tu DNS:

```
Tipo: TXT
Nombre: @ (o tu dominio)
Valor: v=spf1 include:_spf.google.com ~all
```

**Para Gmail/Google Workspace:**
```
v=spf1 include:_spf.google.com ~all
```

#### DKIM (DomainKeys Identified Mail)

Si usas Google Workspace o un servicio de email:

1. Genera las claves DKIM en tu proveedor de email
2. Agrega los registros TXT que te proporcionen
3. Ejemplo (Google Workspace):
   ```
   Nombre: google._domainkey
   Tipo: TXT
   Valor: [proporcionado por Google]
   ```

#### DMARC (Domain-based Message Authentication)

Agrega este registro TXT:

```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=quarantine; rua=mailto:admin@tu-dominio.com
```

**Niveles de política:**
- `p=none` - Solo monitoreo (recomendado para empezar)
- `p=quarantine` - Enviar a spam
- `p=reject` - Rechazar completamente

### 2. Balance HTML/Texto Plano

- ✅ Incluye versión HTML y texto plano
- ✅ Mantén proporción 60% HTML, 40% texto
- ✅ Evita imágenes pesadas (máximo 100KB)
- ✅ Usa imágenes alojadas en servidor confiable

### 3. Evitar Palabras Trigger de Spam

**Evita estas palabras en el asunto:**
- ❌ "GRATIS", "GANA", "URGENTE", "CLICK AQUÍ"
- ❌ Múltiples signos de exclamación (!!!)
- ❌ Todo en mayúsculas
- ❌ Emojis excesivos

**Usa estas alternativas:**
- ✅ "Confirma tu cuenta"
- ✅ "Verifica tu email"
- ✅ "Activa tu cuenta"

### 4. Autenticación del Dominio

#### Para Firebase (Gmail)

Firebase usa Gmail para enviar emails. Para mejorar la reputación:

1. **Verifica tu dominio en Google Search Console**
2. **Configura SPF correctamente** (ver arriba)
3. **Usa un dominio dedicado** para emails transaccionales

#### Para Servicios de Email Dedicados

Si usas SendGrid, Mailgun, etc.:

1. Verifica tu dominio en el servicio
2. Configura los registros DNS que te proporcionen
3. Usa IPs dedicadas si es posible

### 5. Mejores Prácticas de Contenido

#### Estructura del Email

✅ **Buenas prácticas:**
- Asunto claro y descriptivo (50-60 caracteres)
- Saludo personalizado
- Botón de acción prominente
- Instrucciones alternativas
- Información de expiración
- Footer con información legal

❌ **Evitar:**
- Enlaces acortados (bit.ly, etc.)
- Múltiples enlaces sospechosos
- Contenido solo en imágenes
- Archivos adjuntos
- JavaScript o iframes

#### Diseño Responsive

- Ancho máximo: 600px
- Fuentes web-safe o sistema
- Botones con área táctil mínima: 44x44px
- Contraste adecuado (WCAG AA)

---

## 🔧 Configuración en el Código

### URL de Redirección Post-Verificación

En `RegistroMobile.tsx` y otros componentes de registro:

```typescript
await sendEmailVerification(user, {
  url: `${window.location.origin}/login?verified=true`,
  handleCodeInApp: false
});
```

### Manejar Verificación en Login

En `Login.tsx`, puedes detectar si el usuario viene de verificación:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === 'true') {
    // Mostrar mensaje de éxito
    setSuccess('¡Email verificado exitosamente! Ya podés iniciar sesión.');
  }
}, []);
```

---

## 🐛 Solución de Problemas

### Email no llega

1. **Revisa la carpeta de spam**
2. **Verifica que el email sea correcto**
3. **Espera 5-10 minutos** (puede haber delay)
4. **Revisa los logs de Firebase Console** → Authentication → Users
5. **Verifica que el template esté configurado correctamente**

### Email llega a spam

1. **Configura SPF, DKIM, DMARC** (ver sección de medidas anti-spam)
2. **Revisa el contenido** del email (evita palabras trigger)
3. **Verifica la reputación del dominio** en:
   - [MXToolbox](https://mxtoolbox.com/)
   - [Mail-Tester](https://www.mail-tester.com/)

### Enlace de verificación no funciona

1. **Verifica que la URL de redirección esté configurada** en Firebase
2. **Asegúrate de que el dominio esté autorizado** en Firebase Authentication
3. **Revisa que el token no haya expirado** (24 horas)

### Error al reenviar email

1. **Verifica el cooldown** (60 segundos mínimo)
2. **Revisa los logs de la consola** del navegador
3. **Asegúrate de que el usuario esté autenticado**

---

## 📊 Monitoreo

### Métricas a Revisar

1. **Tasa de entrega** (Firebase Console → Authentication)
2. **Tasa de apertura** (si usas servicio de email dedicado)
3. **Tasa de clics** en el botón de verificación
4. **Tiempo de verificación** promedio

### Herramientas de Testing

- [Mail-Tester](https://www.mail-tester.com/) - Prueba de spam score
- [MXToolbox](https://mxtoolbox.com/) - Verificación de DNS
- [Email on Acid](https://www.emailonacid.com/) - Preview en diferentes clientes

---

## ✅ Checklist de Implementación

- [ ] Template HTML configurado en Firebase
- [ ] Template de texto plano configurado
- [ ] Asunto personalizado
- [ ] Remitente configurado (no-reply@dominio.com)
- [ ] URL de redirección configurada
- [ ] SPF configurado en DNS
- [ ] DKIM configurado (si aplica)
- [ ] DMARC configurado
- [ ] Modal de verificación integrado en registro
- [ ] Contador de reenvío funcionando
- [ ] Manejo de verificación en login
- [ ] Testing en diferentes clientes de email
- [ ] Verificación de spam score

---

## 📚 Recursos Adicionales

- [Firebase Email Templates](https://firebase.google.com/docs/auth/custom-email-handler)
- [SPF Record Syntax](https://www.openspf.org/SPF_Record_Syntax)
- [DKIM Overview](https://dkim.org/)
- [DMARC Guide](https://dmarc.org/wiki/FAQ)

---

**Última actualización:** Diciembre 2024

