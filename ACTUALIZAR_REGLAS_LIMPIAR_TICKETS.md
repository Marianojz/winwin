# 🔧 Actualizar Reglas de Firebase para Limpiar Tickets y Mensajes

## ⚠️ Problema

Al intentar eliminar todos los tickets o mensajes de contacto desde el panel de admin, aparece el error:
```
PERMISSION_DENIED: Permission denied
```

## ✅ Solución

Las reglas de Firebase Realtime Database necesitan permitir que los admins puedan eliminar todos los tickets y mensajes de contacto.

## 📋 Pasos para Actualizar

### 1. Ir a Firebase Console
- Ve a [Firebase Console](https://console.firebase.google.com/)
- Seleccioná tu proyecto

### 2. Ir a Realtime Database → Reglas
- En el menú lateral, click en **"Realtime Database"**
- Click en la pestaña **"Reglas"**

### 3. Actualizar las Reglas

Copiá y pegá el contenido completo del archivo `firebase-realtime-database.rules.json` (o `firebase-realtime-database.rules.production.json` si estás en producción) en el editor de reglas.

**O simplemente actualizá estas secciones:**

#### Para `tickets`:
```json
"tickets": {
  ".read": "auth != null",
  ".write": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true",
  "$ticketId": {
    ".read": "auth != null && (data.child('userId').val() == auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)",
    ".write": "auth != null && (newData.child('userId').val() == auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)",
    ".validate": "auth != null && (newData.child('userId').val() == auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)"
  }
}
```

#### Para `contactMessages`:
```json
"contactMessages": {
  ".read": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true",
  ".write": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true",
  "$messageId": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true",
    ".write": true
  }
}
```

### 4. Publicar las Reglas
- Click en **"Publicar"**
- Esperá unos segundos a que se actualicen

### 5. Verificar
- Volvé a intentar eliminar todos los tickets o mensajes desde el panel de admin
- Debería funcionar sin errores

## 🔍 Cambios Realizados

1. **`tickets`**: Se agregó `.write` a nivel raíz que solo permite a los admins eliminar todos los tickets
2. **`contactMessages`**: Se cambió `.write: true` a `.write` con verificación de admin para mayor seguridad

## ⚠️ Nota Importante

- Solo los usuarios con `isAdmin: true` en Realtime Database pueden eliminar todos los tickets/mensajes
- Los usuarios normales solo pueden crear y modificar sus propios tickets
- Esta es una operación destructiva que no se puede deshacer

