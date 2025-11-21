# 🔧 Cambiar el Dominio en el Selector de Cuentas de Google

## 📋 Problema

Cuando los usuarios hacen clic en "Iniciar sesión con Google", aparece:
```
Ir a clikio-773fa.firebaseapp.com
```

Queremos que aparezca:
```
Ir a Clickio.com.ar
```

---

## ✅ Solución: Configurar en Firebase Console

### Paso 1: Ir a Firebase Console

1. Abre tu navegador y ve a: **https://console.firebase.google.com/**
2. Selecciona el proyecto: **clikio-773fa** (o el nombre de tu proyecto)

### Paso 2: Configurar Dominios Autorizados

1. En el menú lateral izquierdo, haz clic en **"Authentication"** (Autenticación)
2. Ve a la pestaña **"Settings"** (Configuración) - está en la parte superior
3. Desplázate hasta la sección **"Authorized domains"** (Dominios autorizados)
4. Haz clic en **"Add domain"** o **"Agregar dominio"**
5. Agrega: `clickio.com.ar`
6. Haz clic en **"Add"** o **"Agregar"**
7. (Opcional) También agrega: `www.clickio.com.ar`

### Paso 3: Verificar Configuración del Proyecto

1. Ve a **⚙️ Settings** (Configuración del proyecto) - icono de engranaje en la parte superior
2. Haz clic en **"Project settings"** (Configuración del proyecto)
3. En la sección **"Your apps"** (Tus aplicaciones), verifica que el dominio esté listado
4. Si no aparece, puedes agregarlo manualmente

### Paso 4: Configurar OAuth Consent Screen (Opcional pero recomendado)

1. Ve a: **https://console.cloud.google.com/apis/credentials/consent**
2. Selecciona el proyecto: **clikio-773fa**
3. En **"Application name"** (Nombre de la aplicación), escribe: **Clickio**
4. En **"Application home page"** (Página de inicio), escribe: **https://clickio.com.ar**
5. Haz clic en **"Save"** (Guardar)

---

## ⚠️ Notas Importantes

1. **El cambio puede tardar unos minutos** en propagarse
2. **Limpia la caché del navegador** después de hacer los cambios
3. **El texto exacto** que aparece puede variar según el navegador y la configuración de Google
4. **Si usas un dominio personalizado**, asegúrate de que esté correctamente configurado en Vercel/DNS

---

## 🔍 Verificar que Funciona

1. Cierra todas las sesiones de Google en tu navegador
2. Ve a tu aplicación en: `https://clickio.com.ar` (o tu dominio)
3. Haz clic en "Iniciar sesión con Google"
4. Deberías ver "Ir a clickio.com.ar" o "Clickio" en lugar de "clikio-773fa.firebaseapp.com"

---

## ❓ Si No Funciona

1. **Espera 5-10 minutos** - Los cambios en Firebase pueden tardar en propagarse
2. **Limpia la caché del navegador** completamente (Ctrl+Shift+Delete)
3. **Verifica que el dominio esté autorizado** en Firebase Console
4. **Verifica que el dominio esté configurado correctamente** en Vercel/DNS
5. **Prueba en modo incógnito** para evitar problemas de caché

---

**¡Listo!** 🎉 Con estos pasos, el selector de cuentas de Google debería mostrar "Clickio.com.ar" en lugar del dominio de Firebase.

