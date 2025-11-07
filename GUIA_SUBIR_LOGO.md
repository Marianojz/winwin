# 📤 Guía para Subir el Logo de Clikio a Firebase Storage

Esta guía te ayudará a subir el logo de Clikio a Firebase Storage para que esté disponible en tu aplicación.

## 📋 Requisitos Previos

- Tener el archivo del logo (PNG, SVG, o WebP)
- Acceso a Firebase Console con permisos de administrador
- Proyecto Firebase: `clikio-773fa`
- Estar logueado como administrador en la aplicación

## 🎯 Opción 1: Subir desde el Admin Panel (MÁS FÁCIL - Recomendado) ⭐

Esta es la forma más fácil y directa:

1. **Inicia sesión como administrador** en tu aplicación
2. Ve a **`/admin`** en tu navegador
3. Busca la sección **"Editor de Página de Inicio"**
4. En la sección **"Logo y Configuración del Sitio"**, encontrarás un área para subir el logo
5. **Arrastra y suelta** tu archivo del logo en esa área, o haz clic para seleccionarlo
6. El logo se subirá automáticamente a Firebase Storage
7. La URL se actualizará automáticamente en la configuración
8. Haz clic en **"Guardar Todo"** para guardar los cambios

✅ **Ventajas:** No necesitas usar Firebase Console ni comandos. Todo se hace desde la interfaz web.

---

## 🎯 Opción 2: Subir desde Firebase Console

### Paso 1: Acceder a Firebase Storage

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto **clikio-773fa**
3. En el menú lateral, haz clic en **Storage**
4. Si es la primera vez, haz clic en **Comenzar** para habilitar Storage

### Paso 2: Crear la Carpeta del Logo

1. En la interfaz de Storage, haz clic en **Iniciar**
2. Una vez que Storage esté habilitado, verás una carpeta llamada `default`
3. Haz clic en **Agregar archivo** o arrastra el archivo del logo
4. **Importante:** Antes de subir, crea la estructura de carpetas:
   - Haz clic en la carpeta `default`
   - Crea una nueva carpeta llamada `logo` (si no existe)
   - O simplemente sube el archivo con el nombre: `logo/clickio-logo.png`

### Paso 3: Subir el Logo

1. Haz clic en **Subir archivo** dentro de la carpeta `logo`
2. Selecciona tu archivo del logo (puede ser `.png`, `.svg`, o `.webp`)
3. Si el archivo se llama diferente, renómbralo a `clickio-logo.png` (o el formato que prefieras)
4. Espera a que termine la subida

### Paso 4: Obtener la URL Pública

1. Una vez subido, haz clic en el archivo del logo
2. Se abrirá un panel con los detalles del archivo
3. Busca la sección **URL** o **URL de descarga**
4. Copia la URL completa. Debería verse así:
   ```
   https://firebasestorage.googleapis.com/v0/b/clikio-773fa.firebasestorage.app/o/logo%2Fclickio-logo.png?alt=media&token=XXXXX
   ```

### Paso 5: Actualizar el Código

1. Abre el archivo `src/types/homeConfig.ts`
2. Busca la línea con `logoUrl`:
   ```typescript
   logoUrl: 'https://firebasestorage.googleapis.com/v0/b/clikio-773fa.firebasestorage.app/o/logo%2Fclickio-logo.png?alt=media',
   ```
3. Reemplaza la URL con la que copiaste de Firebase Console
4. Guarda el archivo

### Paso 6: Verificar Permisos de Storage

1. En Firebase Console, ve a **Storage** → **Reglas**
2. Asegúrate de que las reglas permitan lectura pública:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /logo/{allPaths=**} {
         allow read: if true;  // Permite lectura pública del logo
         allow write: if request.auth != null && request.auth.token.admin == true;
       }
       // ... otras reglas
     }
   }
   ```

---

## 🚀 Opción 3: Subir usando Script PowerShell (Rápido)

Si prefieres usar un script automatizado:

1. **Coloca tu archivo del logo** en alguna carpeta (ej: `C:\Users\Mariano PCe\Downloads\logo.png`)
2. **Abre PowerShell** en la raíz del proyecto
3. **Ejecuta el script:**
   ```powershell
   .\subir-logo.ps1 -ArchivoLogo "C:\ruta\a\tu\logo.png"
   ```
4. El script te guiará y mostrará la URL una vez subido

---

## 🚀 Opción 4: Subir usando Firebase CLI (Avanzado)

Si prefieres usar la línea de comandos:

### Paso 1: Instalar Firebase CLI (si no lo tienes)

```powershell
npm install -g firebase-tools
```

O usar npx (recomendado en Windows):
```powershell
npx firebase-tools --version
```

### Paso 2: Iniciar Sesión

```powershell
npx firebase-tools login
```

Esto abrirá tu navegador para autenticarte.

### Paso 3: Seleccionar el Proyecto

```powershell
npx firebase-tools use clikio-773fa
```

### Paso 4: Subir el Logo

Coloca tu archivo del logo en la raíz del proyecto (o en una carpeta `assets/logo/`) y ejecuta:

```powershell
npx firebase-tools storage:upload logo/clickio-logo.png --bucket clikio-773fa.firebasestorage.app
```

O si el archivo está en otra ubicación:

```powershell
npx firebase-tools storage:upload "ruta/a/tu/logo.png" --bucket clikio-773fa.firebasestorage.app --destination "logo/clickio-logo.png"
```

---

## ✅ Verificación

Después de subir el logo:

1. **Verifica la URL en el navegador:**
   - Abre la URL del logo en una nueva pestaña
   - Deberías ver la imagen del logo

2. **Verifica en la aplicación:**
   - Ejecuta `npm run dev`
   - Abre la aplicación en el navegador
   - El logo debería aparecer en el Navbar

3. **Verifica en el Admin Panel:**
   - Ve a `/admin`
   - En la sección "Editor de Página de Inicio"
   - El logo debería mostrarse correctamente

---

## 🔧 Solución de Problemas

### Error: "Permission denied"
- **Solución:** Verifica las reglas de Storage en Firebase Console
- Asegúrate de que la regla de lectura pública esté habilitada para la carpeta `logo/`

### Error: "File not found"
- **Solución:** Verifica que el archivo se haya subido correctamente
- Revisa la ruta en Firebase Storage
- Asegúrate de que la URL en el código coincida con la ruta real

### El logo no se muestra en la aplicación
- **Solución:** 
  1. Verifica que la URL sea correcta
  2. Revisa la consola del navegador para ver errores
  3. Asegúrate de que `homeConfig` esté cargando desde Firebase
  4. Verifica que el componente `Navbar` esté usando `homeConfig.siteSettings.logoUrl`

---

## 📝 Notas Importantes

- **Formato recomendado:** PNG con fondo transparente o SVG
- **Tamaño recomendado:** 
  - Logo principal: mínimo 512x512px
  - Favicon: 32x32px, 64x64px, 192x192px, 512x512px
- **Nombre del archivo:** Usa nombres sin espacios ni caracteres especiales
- **Optimización:** Comprime la imagen antes de subirla para mejorar el rendimiento

---

## 🎨 Crear Favicons desde el Logo

Una vez que tengas el logo principal, puedes crear los favicons:

1. Usa una herramienta online como [Favicon Generator](https://realfavicongenerator.net/)
2. Sube tu logo
3. Descarga los archivos generados
4. Colócalos en la carpeta `public/`:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`

---

¿Necesitas ayuda con algún paso específico? ¡Avísame!

