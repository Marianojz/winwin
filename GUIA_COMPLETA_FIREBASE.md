# 🔥 Guía Completa: Configurar Firebase para WinWin

Esta guía te ayudará a habilitar **todos los servicios de Firebase** necesarios para tu aplicación, incluyendo mensajes, configuración, sincronización en tiempo real, y más.

---

## 📋 Índice

1. [Configuración de Firebase Realtime Database](#1-configuración-de-firebase-realtime-database)
2. [Configuración de Firestore](#2-configuración-de-firestore)
3. [Configuración de Firebase Storage](#3-configuración-de-firebase-storage)
4. [Verificación y Pruebas](#4-verificación-y-pruebas)
5. [Solución de Problemas](#5-solución-de-problemas)

---

## 1. Configuración de Firebase Realtime Database

### 1.1. Acceder a Firebase Console

1. Ve a: **https://console.firebase.google.com/**
2. Inicia sesión con tu cuenta de Google
3. Selecciona tu proyecto: **"subasta-argenta-winwin"**

### 1.2. Activar Realtime Database (si no está activado)

1. En el menú lateral, busca **"Realtime Database"** (ícono de base de datos)
2. Si ves un botón "Crear base de datos":
   - Haz clic en **"Crear base de datos"**
   - Selecciona ubicación: **us-central1** (o la más cercana a tu región)
   - Modo: **"Modo de prueba"** (Test Mode) - Lo cambiaremos después
   - Haz clic en **"Listo"**

### 1.3. Configurar Reglas de Realtime Database

1. En la página de Realtime Database, haz clic en la pestaña **"Reglas"** (arriba)
2. **Reemplaza TODO** el contenido con estas reglas:

```json
{
  "rules": {
    // Subastas - Todos pueden leer, solo admin puede escribir
    "auctions": {
      ".read": true,
      ".write": true
    },
    
    // Productos - Todos pueden leer, solo admin puede escribir
    "products": {
      ".read": true,
      ".write": true
    },
    
    // Pedidos - Todos pueden leer y escribir (para desarrollo)
    "orders": {
      ".read": true,
      ".write": true
    },
    
    // Mensajes - Usuarios autenticados pueden leer/escribir sus propios mensajes
    "messages": {
      "$conversationId": {
        ".read": "auth != null && (data.child('fromUserId').val() == auth.uid || data.child('toUserId').val() == auth.uid)",
        ".write": "auth != null && (newData.child('fromUserId').val() == auth.uid || newData.child('toUserId').val() == auth.uid || auth.uid == 'admin')"
      }
    },
    
    // Configuración de Home - Todos pueden leer, solo admin puede escribir
    "homeConfig": {
      ".read": true,
      ".write": "auth != null && (auth.uid == 'admin' || root.child('users').child(auth.uid).child('isAdmin').val() == true)"
    },
    
    // Notificaciones - Usuarios autenticados
    "notifications": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null"
      }
    },
    
    // Usuarios - Solo el propio usuario o admin
    "users": {
      "$userId": {
        ".read": "auth != null && (auth.uid == $userId || root.child('users').child(auth.uid).child('isAdmin').val() == true)",
        ".write": "auth != null && (auth.uid == $userId || root.child('users').child(auth.uid).child('isAdmin').val() == true)"
      }
    },
    
    // Bots - Solo lectura para todos, escritura solo admin
    "bots": {
      ".read": true,
      ".write": "auth != null && (auth.uid == 'admin' || root.child('users').child(auth.uid).child('isAdmin').val() == true)"
    },
    
    // Logs de acciones - Solo usuarios autenticados
    "action_logs": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    
    // Tracking de clicks - Lectura solo autenticados, escritura para todos
    "tracking_clicks": {
      ".read": "auth != null",
      ".write": true
    },
    
    // Tracking de búsquedas - Lectura solo autenticados, escritura para todos
    "tracking_searches": {
      ".read": "auth != null",
      ".write": true
    }
  }
}
```

3. Haz clic en **"Publicar"** (botón verde, arriba a la derecha)
4. Confirma los cambios

### 1.4. Verificar URL de Realtime Database

1. En la pestaña **"Datos"**, verifica que la URL sea:
   ```
   https://subasta-argenta-winwin-default-rtdb.firebaseio.com/
   ```
2. Esta URL ya está configurada en tu `firebase.ts` ✅

---

## 2. Configuración de Firestore

### 2.1. Activar Firestore (si no está activado)

1. En el menú lateral, busca **"Firestore Database"**
2. Si ves "Crear base de datos":
   - Haz clic en **"Crear base de datos"**
   - Modo: **"Modo de prueba"** (temporalmente)
   - Ubicación: **us-central1** (o la más cercana)
   - Haz clic en **"Siguiente"** y luego **"Habilitar"**

### 2.2. Configurar Reglas de Firestore

1. En Firestore Database, haz clic en la pestaña **"Reglas"**
2. **Reemplaza TODO** el contenido con estas reglas:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Reglas para usuarios
    match /users/{userId} {
      // Permitir lectura/escritura solo al propio usuario o a admins
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow write: if request.auth != null && 
                      (request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // Reglas para mensajes (si los usas en Firestore)
    match /messages/{messageId} {
      allow read: if request.auth != null && 
                     (resource.data.userId == request.auth.uid || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow write: if request.auth != null;
    }
    
    // Reglas para notificaciones
    match /notifications/{notificationId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }
    
    // Reglas para otros documentos
    match /{document=**} {
      // Permitir acceso solo a usuarios autenticados
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Haz clic en **"Publicar"**

---

## 3. Configuración de Firebase Storage

### 3.1. Activar Storage (si no está activado)

1. En el menú lateral, busca **"Storage"**
2. Si ves "Empezar":
   - Haz clic en **"Empezar"**
   - Acepta los términos y condiciones
   - Ubicación: **us-central1** (misma que las bases de datos)
   - Haz clic en **"Listo"**

### 3.2. Configurar Reglas de Storage

1. En Storage, haz clic en la pestaña **"Reglas"**
2. **Reemplaza TODO** el contenido con estas reglas:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Imágenes de subastas - Lectura pública, escritura solo autenticados
    match /auctions/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Imágenes de productos - Lectura pública, escritura solo autenticados
    match /products/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Avatares de usuarios - Lectura pública, escritura solo el propio usuario
    match /avatars/{userId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 2 * 1024 * 1024 && // 2MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Imágenes generales - Lectura pública, escritura solo autenticados
    match /images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Banners y promociones - Lectura pública, escritura solo autenticados
    match /banners/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                      request.resource.contentType.matches('image/.*');
    }
    
    // Denegar todo lo demás por defecto
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Haz clic en **"Publicar"**

---

## 4. Verificación y Pruebas

### 4.1. Verificar que los Servicios están Activos

1. **Realtime Database**: Debe mostrar la página de datos (puede estar vacía)
2. **Firestore Database**: Debe mostrar "No hay documentos" o datos existentes
3. **Storage**: Debe mostrar "No hay archivos" o archivos existentes

### 4.2. Verificar Sincronización en Tiempo Real

1. Abre tu aplicación en el navegador
2. Abre la **Consola del Desarrollador** (F12)
3. Busca estos mensajes en la consola:
   - `🔄 INICIANDO SINCRONIZACIÓN FIREBASE...`
   - `✅ Firebase - Subastas sincronizadas: X`
   - `✅ Productos sincronizados: X`
   - `✅ Configuración de home cargada desde Firebase`

### 4.3. Probar Funcionalidades

#### Probar Mensajes:
1. Abre el panel de administración
2. Ve a la sección de mensajes
3. Envía un mensaje de prueba
4. Verifica en Firebase Console → Realtime Database → `messages/` que aparezca el mensaje

#### Probar Configuración de Home:
1. En AdminPanel, edita la configuración del inicio
2. Haz clic en "Guardar"
3. Verifica en Firebase Console → Realtime Database → `homeConfig` que se guarde
4. Abre la página Home y verifica que se cargue la configuración

#### Probar Subida de Imágenes:
1. Crea una nueva subasta o producto
2. Sube una imagen
3. Verifica en Firebase Console → Storage → `auctions/` o `products/` que aparezca la imagen

#### Probar Sincronización:
1. Abre la app en dos navegadores diferentes
2. Crea una subasta en uno
3. Verifica que aparezca automáticamente en el otro (sincronización en tiempo real)

---

## 5. Solución de Problemas

### ❌ Error: "Permission denied"

**Causa**: Las reglas no están configuradas correctamente o no están publicadas.

**Solución**:
1. Verifica que las reglas estén publicadas (botón "Publicar" en verde)
2. Revisa que las reglas coincidan exactamente con las de esta guía
3. Espera 1-2 minutos después de publicar las reglas

### ❌ Error: "databaseURL is not defined"

**Causa**: La URL de Realtime Database no está configurada.

**Solución**:
1. Verifica que en `firebase.ts` tengas:
   ```typescript
   databaseURL: "https://subasta-argenta-winwin-default-rtdb.firebaseio.com/"
   ```
2. Verifica que Realtime Database esté activado en Firebase Console

### ❌ Los mensajes no se sincronizan

**Causa**: El archivo `messages.ts` puede estar usando localStorage en lugar de Firebase.

**Solución**:
1. Verifica que `messages.ts` esté usando `realtimeDb` de Firebase
2. Si usa localStorage, actualiza el archivo para usar Firebase Realtime Database

### ❌ Las imágenes no se suben

**Causa**: Las reglas de Storage pueden estar bloqueando la subida.

**Solución**:
1. Verifica que las reglas de Storage permitan escritura
2. Verifica que el archivo sea menor a 5MB
3. Verifica que el formato sea JPG, PNG o WEBP

### ❌ No se sincroniza entre dispositivos

**Causa**: El hook `useSyncFirebase` no está siendo usado o hay errores de conexión.

**Solución**:
1. Verifica que `useSyncFirebase` esté importado y usado en `App.tsx`
2. Revisa la consola del navegador por errores
3. Verifica tu conexión a internet

---

## 📝 Checklist de Verificación

- [ ] Realtime Database activado y configurado
- [ ] Reglas de Realtime Database publicadas
- [ ] Firestore activado y configurado
- [ ] Reglas de Firestore publicadas
- [ ] Storage activado y configurado
- [ ] Reglas de Storage publicadas
- [ ] Mensajes funcionando en Firebase
- [ ] Configuración de home guardándose en Firebase
- [ ] Imágenes subiéndose correctamente
- [ ] Sincronización en tiempo real funcionando

---

## 🔒 Seguridad en Producción

**⚠️ IMPORTANTE**: Las reglas actuales son para desarrollo. Para producción, deberías:

1. **Realtime Database**: Agregar validación de autenticación más estricta
2. **Firestore**: Agregar validación de datos
3. **Storage**: Agregar validación de tamaño y tipo más estricta

**Ejemplo de reglas más seguras para producción**:

```json
{
  "rules": {
    "auctions": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true"
    }
  }
}
```

---

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12) para ver errores
2. Revisa los logs de Firebase Console
3. Verifica que todos los servicios estén activados

---

**¡Listo!** 🎉 Tu aplicación debería estar completamente configurada con Firebase y sincronizándose en tiempo real entre todos los usuarios.

