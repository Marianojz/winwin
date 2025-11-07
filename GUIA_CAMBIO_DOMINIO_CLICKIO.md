# 🚀 Guía Completa: Cambio a clickio.com.ar y Nueva Base Firebase

## 📋 Resumen de lo que vamos a hacer

1. **Crear un nuevo proyecto Firebase desde cero** (limpio, sin datos antiguos)
2. **Configurar el dominio clickio.com.ar en Firebase**
3. **Actualizar el código con las nuevas credenciales**
4. **Configurar Vercel con el nuevo dominio**

---

## 🔥 PASO 1: Crear Nuevo Proyecto Firebase (Desde Cero)

### 1.1. Ir a Firebase Console
1. Abre tu navegador y ve a: **https://console.firebase.google.com/**
2. Inicia sesión con tu cuenta de Google

### 1.2. Crear Nuevo Proyecto
1. Haz clic en el botón **"Agregar proyecto"** o **"Create a project"**
2. **Nombre del proyecto:** `clickio` (o `clickio-app` si el nombre está ocupado)
3. Haz clic en **"Continuar"**
4. **Google Analytics (Opcional):**
   - Si **VAS A USAR** Google Analytics: ✅ **Marca** la casilla "Enable Google Analytics for this project"
   - Si **NO VAS A USAR** Google Analytics: ❌ **Desmarca** la casilla
   - **Nota:** Si lo habilitas, aparecerá `measurementId` en las credenciales (útil para analíticas)
5. Haz clic en **"Crear proyecto"**
6. Espera 1-2 minutos mientras se crea el proyecto
7. Cuando termine, haz clic en **"Continuar"**

### 1.3. Habilitar Authentication (Autenticación)
1. En el menú lateral izquierdo, haz clic en **"Authentication"** (o "Autenticación")
2. Haz clic en **"Comenzar"** o **"Get started"**
3. Ve a la pestaña **"Sign-in method"** (Métodos de inicio de sesión)
4. Habilita **"Correo electrónico/Contraseña"**:
   - Haz clic en "Correo electrónico/Contraseña"
   - Activa el interruptor
   - Haz clic en **"Guardar"**
5. Habilita **"Google"** (opcional pero recomendado):
   - Haz clic en "Google"
   - Activa el interruptor
   - Selecciona tu email como correo de soporte
   - Haz clic en **"Guardar"**

### 1.4. Crear Realtime Database
1. En el menú lateral, haz clic en **"Realtime Database"**
2. Haz clic en **"Crear base de datos"** o **"Create database"**
3. **Ubicación:** Selecciona la más cercana a Argentina (por ejemplo: `southamerica-east1`)
4. **Modo de inicio:** Selecciona **"Modo de prueba"** (Test mode) - Solo temporalmente
   - ⚠️ **IMPORTANTE:** Lo cambiaremos inmediatamente después
5. Haz clic en **"Habilitar"**
6. **Copia la URL de la base de datos** (algo como: `https://clickio-default-rtdb.firebaseio.com/`)
   - La necesitarás más adelante
7. **INMEDIATAMENTE después de crear, configura las reglas:**
   - Ve a la pestaña **"Reglas"** (arriba)
   - **BORRA TODO** el contenido actual
   - Abre el archivo `REGLAS_FIREBASE.txt` de tu proyecto
   - **COPIA TODO** el contenido
   - **PEGA** en el editor de Firebase
   - Haz clic en **"Publicar"** (botón verde)
   - ✅ **Listo:** Ya tienes las reglas de seguridad configuradas desde el inicio

### 1.5. Crear Firestore Database (Opcional pero recomendado)
1. En el menú lateral, haz clic en **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. **Modo de inicio:** Selecciona **"Modo de prueba"** (temporal)
4. **Ubicación:** Selecciona la misma que Realtime Database
5. Haz clic en **"Habilitar"**
6. **INMEDIATAMENTE después, configura las reglas:**
   - Ve a la pestaña **"Reglas"** (arriba)
   - **BORRA TODO** el contenido actual
   - Abre el archivo `firestore.rules` de tu proyecto
   - **COPIA TODO** el contenido
   - **PEGA** en el editor de Firebase
   - Haz clic en **"Publicar"**
   - ✅ **Listo:** Ya tienes las reglas de Firestore configuradas correctamente

### 1.6. Habilitar Storage (Almacenamiento)
1. En el menú lateral, haz clic en **"Storage"**
2. Haz clic en **"Comenzar"** o **"Get started"**
3. Acepta los términos y haz clic en **"Siguiente"**
4. **Ubicación:** Selecciona la misma que las bases de datos
5. Haz clic en **"Listo"**
6. **INMEDIATAMENTE después, configura las reglas:**
   - Ve a la pestaña **"Reglas"** (arriba)
   - **BORRA TODO** el contenido actual
   - Abre el archivo `storage.rules` de tu proyecto
   - **COPIA TODO** el contenido
   - **PEGA** en el editor de Firebase
   - Haz clic en **"Publicar"**
   - ✅ **Listo:** Ya tienes las reglas de Storage configuradas correctamente (con límites de tamaño, tipos de archivo, etc.)

### 1.7. Obtener las Credenciales de Firebase
1. En el menú lateral, haz clic en el **⚙️ (Configuración del proyecto)** → **"Configuración del proyecto"**
2. Desplázate hacia abajo hasta **"Tus aplicaciones"**
3. Haz clic en el ícono **"</>"** (Web) para agregar una app web
4. **Apodo de la app:** `clickio-web`
5. **NO marques** "También configura Firebase Hosting"
6. Haz clic en **"Registrar app"**
7. **¡IMPORTANTE!** Copia TODA la configuración que aparece (firebaseConfig)
   - Debería verse algo así:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "clickio.firebaseapp.com",
     projectId: "clickio",
     storageBucket: "clickio.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456",
     measurementId: "G-XXXXXXXXXX"  // ← Opcional: Solo si habilitaste Google Analytics
   };
   ```
   - **Nota sobre `measurementId`:** 
     - Si habilitaste Google Analytics al crear el proyecto, aparecerá este campo
     - Si NO habilitaste Google Analytics, este campo NO aparecerá (y está bien)
     - Si planeas usar Google Analytics, inclúyelo en tu configuración
8. **Guarda esta información** en un archivo de texto temporal (lo necesitarás en el Paso 3)

---

## 🔒 PASO 2: Verificar Reglas de Seguridad (Ya configuradas en Paso 1)

### ✅ Las reglas ya están configuradas
Si seguiste el Paso 1 correctamente, **ya configuraste las reglas** inmediatamente después de crear cada servicio. Esto es más seguro que dejar las bases de datos en modo de prueba.

### 2.1. Verificar Reglas de Realtime Database
1. Ve a **Realtime Database** → pestaña **"Reglas"**
2. Verifica que las reglas coincidan con el contenido de `REGLAS_FIREBASE.txt`
3. Si necesitas actualizarlas, hazlo y haz clic en **"Publicar"**

### 2.2. Verificar Reglas de Firestore (Si lo usas)
1. Ve a **Firestore Database** → **Reglas**
2. Verifica que las reglas coincidan con el contenido de `firestore.rules`
3. Si necesitas actualizarlas, copia el contenido de `firestore.rules` y haz clic en **"Publicar"**

### 2.3. Verificar Reglas de Storage (Si lo usas)
1. Ve a **Storage** → **Reglas**
2. Verifica que las reglas coincidan con el contenido de `storage.rules`
3. Si necesitas actualizarlas, copia el contenido de `storage.rules` y haz clic en **"Publicar"**

### 💡 ¿Por qué configurar las reglas inmediatamente?
- **Más seguro:** Evita dejar la base de datos abierta al público
- **Mejor práctica:** Configuración correcta desde el inicio
- **Menos pasos:** No necesitas volver después a configurar reglas

---

## 💻 PASO 3: Actualizar el Código del Proyecto

> **Nota:** Este paso lo harás DESPUÉS de obtener las credenciales en el Paso 1.7

### 3.1. Actualizar Configuración de Firebase
1. Abre el archivo: `src/config/firebase.ts`
2. Reemplaza TODO el objeto `firebaseConfig` con las nuevas credenciales que copiaste en el Paso 1.7
3. **IMPORTANTE:** Asegúrate de incluir también el `databaseURL` de Realtime Database
4. **Si copiaste `measurementId`** de Firebase Console, inclúyelo también
5. El archivo debería quedar así (con TUS credenciales):
   ```typescript
   const firebaseConfig = {
     apiKey: "TU_API_KEY_AQUI",
     authDomain: "clickio.firebaseapp.com",
     projectId: "clickio",
     storageBucket: "clickio.firebasestorage.app",
     messagingSenderId: "TU_SENDER_ID",
     appId: "TU_APP_ID",
     databaseURL: "https://clickio-default-rtdb.firebaseio.com/",  // ← Tu URL de Realtime Database
     measurementId: "G-XXXXXXXXXX"  // ← Opcional: Solo si habilitaste Google Analytics
   };
   ```
   - **Nota:** Si no tienes `measurementId`, simplemente no lo incluyas (no es necesario)

### 3.2. Verificar que no haya referencias al proyecto antiguo
- El código ya está actualizado automáticamente cuando cambies `firebaseConfig`
- No necesitas cambiar nada más en el código

---

## 🌐 PASO 4: Configurar Dominio en Firebase Hosting (Opcional)

### 4.1. Si quieres usar Firebase Hosting
1. Ve a **Hosting** en Firebase Console
2. Haz clic en **"Comenzar"**
3. Sigue las instrucciones para conectar tu dominio

### 4.2. Si prefieres usar Vercel (Recomendado)
- Continúa con el Paso 5

---

## 🚀 PASO 5: Configurar Vercel con el Nuevo Dominio

### 5.1. Preparar el Proyecto para Vercel
1. Asegúrate de que tu proyecto esté en GitHub/GitLab/Bitbucket
2. Si no está, haz un commit y push de todos los cambios

### 5.2. Conectar Dominio en Vercel
1. Ve a **https://vercel.com/** e inicia sesión
2. Selecciona tu proyecto
3. Ve a **Settings** → **Domains**
4. Haz clic en **"Add"** o **"Agregar"**
5. Escribe: `clickio.com.ar`
6. Haz clic en **"Add"**

### 5.3. Configurar DNS del Dominio
Vercel te dará instrucciones específicas, pero generalmente necesitas:

**Opción A: Si tienes acceso al panel de DNS de tu dominio:**
1. Ve al panel de tu proveedor de dominio (donde compraste clickio.com.ar)
2. Agrega estos registros DNS:
   - **Tipo:** `A` o `CNAME`
   - **Nombre:** `@` (para clickio.com.ar) o `www` (para www.clickio.com.ar)
   - **Valor:** El que Vercel te indique (algo como `76.76.21.21` o `cname.vercel-dns.com`)

**Opción B: Si usas un proveedor común:**
- **GoDaddy, Namecheap, etc.:** Sigue las instrucciones de Vercel
- **Cloudflare:** Agrega un registro CNAME apuntando a Vercel

### 5.4. Verificar Dominio
1. Espera 5-10 minutos después de configurar DNS
2. Vercel verificará automáticamente el dominio
3. Cuando aparezca un ✅ verde, está listo

### 5.5. Configurar Variables de Entorno en Vercel (Si es necesario)
1. En Vercel, ve a **Settings** → **Environment Variables**
2. Si tu código usa variables de entorno, agrégalas aquí
3. Para este proyecto, generalmente NO necesitas variables adicionales

---

## ✅ PASO 6: Verificar que Todo Funcione

### 6.1. Probar Localmente
1. Abre una terminal en tu proyecto
2. Ejecuta: `npm install` (por si acaso)
3. Ejecuta: `npm run dev`
4. Abre: `http://localhost:5173`
5. Prueba:
   - Registro de usuario
   - Login
   - Crear una subasta (si eres admin)
   - Verificar que los datos se guarden en Firebase

### 6.2. Probar en Producción
1. Despliega en Vercel (si no se despliega automáticamente)
2. Visita: `https://clickio.com.ar`
3. Prueba las mismas funcionalidades
4. Verifica en Firebase Console que los datos se estén guardando

---

## 🔍 PASO 7: Verificar en Firebase Console

### 7.1. Verificar Datos
1. Ve a Firebase Console → **Realtime Database**
2. Deberías ver datos nuevos (usuarios, subastas, etc.)
3. Si ves datos del proyecto antiguo, significa que estás usando el proyecto incorrecto

### 7.2. Verificar Authentication
1. Ve a **Authentication** → **Users**
2. Deberías ver usuarios nuevos registrados
3. Si ves usuarios antiguos, verifica que estés en el proyecto correcto

---

## ⚠️ IMPORTANTE: Checklist Final

Antes de considerar que todo está listo, verifica:

- [ ] Nuevo proyecto Firebase creado con nombre "clickio"
- [ ] Authentication habilitado (Email/Password y Google)
- [ ] Realtime Database creado y **reglas configuradas INMEDIATAMENTE** (no en modo prueba)
- [ ] Firestore creado (si lo usas) y **reglas configuradas INMEDIATAMENTE**
- [ ] Storage habilitado (si lo usas) y **reglas configuradas INMEDIATAMENTE**
- [ ] Credenciales actualizadas en `src/config/firebase.ts`
- [ ] Dominio configurado en Vercel
- [ ] DNS configurado correctamente
- [ ] Aplicación funciona en localhost
- [ ] Aplicación funciona en producción (clickio.com.ar)
- [ ] Datos se guardan en el nuevo proyecto Firebase (verificar en Console)

---

## 🆘 Solución de Problemas

### Problema: "No puedo crear el proyecto en Firebase"
**Solución:** 
- Verifica que no tengas demasiados proyectos (límite gratuito: ~10 proyectos)
- Intenta con un nombre diferente: `clickio-app`, `clickio-web`, etc.

### Problema: "Las reglas no funcionan"
**Solución:**
- Espera 1-2 minutos después de publicar
- Limpia la caché del navegador (Ctrl+Shift+Delete)
- Verifica que copiaste TODAS las reglas correctamente

### Problema: "El dominio no funciona en Vercel"
**Solución:**
- Verifica que los DNS estén configurados correctamente
- Espera hasta 24 horas (generalmente es más rápido)
- Usa herramientas como `nslookup` o `dig` para verificar DNS

### Problema: "Los datos no se guardan"
**Solución:**
- Verifica que las credenciales en `firebase.ts` sean correctas
- Verifica que las reglas de Firebase permitan escritura
- Abre la consola del navegador (F12) y busca errores

---

## 📝 Notas Finales

- **El proyecto antiguo (`subasta-argenta-winwin`) seguirá existiendo** pero no se usará
- **Todos los datos nuevos** se guardarán en el nuevo proyecto `clickio`
- **Los usuarios tendrán que registrarse de nuevo** (es una base de datos nueva)
- **Puedes eliminar el proyecto antiguo** cuando estés seguro de que todo funciona

---

**¡Listo!** 🎉 Con estos pasos deberías tener todo funcionando con el nuevo dominio y la nueva base de datos.

Si tienes dudas en algún paso, detente y pregunta antes de continuar.

