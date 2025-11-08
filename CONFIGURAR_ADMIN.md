# 👑 Configurar Usuario Administrador

## 📋 Pasos para Habilitar Admin

Necesitas configurar el admin en **dos lugares** para que funcione correctamente:

### 1️⃣ Paso 1: Configurar en Firestore Database

1. Ve a **Firebase Console**: https://console.firebase.google.com/
2. Selecciona tu proyecto: **`clikio-773fa`** (o el nombre de tu proyecto)
3. Ve a **Firestore Database** → **Datos**
4. Busca la colección **`users`**
5. Encuentra tu usuario (el que acabas de registrar)
   - Tu User ID debería ser: `uk7dN7ERMKXyWdq74V0R73fplqe2` (según los logs)
6. Haz clic en el documento de tu usuario
7. Haz clic en el botón **"Agregar campo"** o **"Add field"**
8. Agrega estos campos:
   - **Campo:** `role` → **Valor:** `admin` (tipo: string)
     - ⚠️ **IMPORTANTE:** Escribe solo `admin` (sin comillas)
   - **Campo:** `isAdmin` → **Valor:** `true` (tipo: boolean)
     - ⚠️ **IMPORTANTE:** Escribe solo `true` (sin comillas, y debe ser boolean, no string)
9. Haz clic en **"Actualizar"** o **"Update"**

### 2️⃣ Paso 2: Configurar en Realtime Database

1. En Firebase Console, ve a **Realtime Database** → **Datos**
2. Busca la carpeta **`users`**
3. Busca tu User ID: `uk7dN7ERMKXyWdq74V0R73fplqe2`
4. Si ya existe, haz clic en él
5. Si no existe, haz clic en **"Agregar"** o **"Add"** y crea: `users/uk7dN7ERMKXyWdq74V0R73fplqe2`
6. Agrega o modifica:
   - **Campo:** `isAdmin` → **Valor:** `true` (tipo: boolean)
     - ⚠️ **IMPORTANTE:** Escribe solo `true` (sin comillas, y asegúrate de seleccionar tipo "boolean", NO "string")
   - (Opcional) También puedes agregar:
     - `email`: tu email (tipo: string)
     - `username`: tu nombre de usuario (tipo: string)
7. Haz clic en **"Actualizar"** o **"Update"**

### 3️⃣ Paso 3: Verificar

1. **Cierra sesión** en tu aplicación web
2. **Vuelve a iniciar sesión**
3. Deberías ver:
   - Acceso al panel de administración (`/admin`)
   - Permisos de admin en todas las funciones

---

## 🔍 Cómo Encontrar tu User ID

Si no estás seguro de cuál es tu User ID:

1. Ve a **Firebase Console** → **Authentication** → **Users**
2. Busca tu email en la lista
3. Tu User ID está en la columna **"UID"** (algo como: `uk7dN7ERMKXyWdq74V0R73fplqe2`)

---

## 📝 Estructura Final en Firestore

Tu documento en Firestore debería verse así:

```json
{
  "username": "Mariano Zequeira",
  "email": "tu-email@gmail.com",
  "role": "admin",           ← Agregar esto (escribe: admin sin comillas)
  "isAdmin": true,           ← Agregar esto (escribe: true sin comillas, tipo boolean)
  "dni": "...",
  "phone": "...",
  "active": true,
  "createdAt": "..."
}
```

**⚠️ NOTA:** Las comillas en el JSON de ejemplo son solo para mostrar la estructura. En Firebase Console:
- Para `role`: Escribe solo `admin` (sin comillas)
- Para `isAdmin`: Escribe solo `true` (sin comillas) y asegúrate de seleccionar tipo **boolean**

---

## 📝 Estructura Final en Realtime Database

Tu documento en Realtime Database debería verse así:

```json
{
  "users": {
    "uk7dN7ERMKXyWdq74V0R73fplqe2": {
      "isAdmin": true,       ← Agregar esto (escribe: true sin comillas)
      "email": "tu-email@gmail.com",
      "username": "Mariano Zequeira",
      "lastSynced": "..."
    }
  }
}
```

**⚠️ NOTA:** Las comillas en el JSON de ejemplo son solo para mostrar la estructura. En Firebase Console:
- Para `isAdmin`: Escribe solo `true` (sin comillas) y asegúrate de que sea tipo **boolean**, NO string

---

## ⚠️ Importante

- **Debes configurar AMBOS lugares** (Firestore Y Realtime Database)
- **Después de configurar, cierra sesión y vuelve a iniciar sesión**
- El sistema sincroniza automáticamente, pero es mejor hacerlo manualmente la primera vez

## 🔒 Problema Común: Error de Permisos en Storage

Si ves este error al intentar subir imágenes:
```
Firebase Storage: User does not have permission to access 'logo/...'. (storage/unauthorized)
```

### 🔍 Diagnóstico

**Causa:** Las reglas de Firebase Storage (en producción) requieren que el usuario esté marcado como admin en **Firestore**, no solo en Realtime Database.

### ✅ Solución Paso a Paso

#### Opción 1: Si estás en DESARROLLO (Recomendado)

1. Ve a **Firebase Console** → **Storage** → **Reglas**
2. Copia el contenido completo del archivo `storage.rules` (sin `.production`)
3. Pega en el editor de Firebase Console
4. Haz clic en **"Publicar"**
5. Espera 30 segundos
6. **Cierra sesión y vuelve a iniciar sesión** en tu aplicación
7. Intenta subir la imagen nuevamente

#### Opción 2: Si estás en PRODUCCIÓN

1. **Verifica en Firestore:**
   - Ve a **Firestore Database** → **Datos** → Colección `users`
   - Encuentra tu usuario (User ID: `uk7dN7ERMKXyWdq74V0R73fplqe2`)
   - Verifica que `isAdmin` sea `true` (tipo **boolean**, NO string)
   - Si `role` existe, debería ser `"admin"` (string), no `true` (boolean)

2. **Actualiza las reglas de Storage:**
   - Ve a **Firebase Console** → **Storage** → **Reglas**
   - Copia el contenido completo del archivo `storage.rules.production`
   - Pega en el editor de Firebase Console
   - Haz clic en **"Publicar"**
   - Espera 30 segundos

3. **Cierra sesión y vuelve a iniciar sesión** en tu aplicación
   - Esto actualiza el token de autenticación con los nuevos permisos

4. Intenta subir la imagen nuevamente

### ⚠️ Notas Importantes

- **Las reglas de Storage no pueden leer Realtime Database**, solo Firestore
- **El token de autenticación se actualiza al iniciar sesión**, por eso es importante cerrar y volver a iniciar sesión
- **Si `isAdmin` está como string `"true"` en lugar de boolean `true`**, las reglas fallarán
- **El campo `role` debe ser `"admin"` (string)**, no `true` (boolean)

---

## ✅ Verificación Rápida

Después de configurar y volver a iniciar sesión:

1. Deberías poder acceder a `/admin`
2. En la consola del navegador deberías ver: `✅ Usuario actualizado en Realtime Database: ... isAdmin: true`
3. Deberías ver opciones de administrador en el menú

---

**¡Listo!** 🎉 Con estos pasos deberías tener acceso completo como administrador.

