# 🔒 Reglas de Firestore para Producción

## ⚠️ Problema Actual
Tus reglas actuales expiran el **16 de noviembre de 2025** y permiten acceso total a todos.

## ✅ Reglas Seguras para Producción

Reemplaza tus reglas actuales con estas:

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
    
    // Reglas para mensajes
    match /messages/{messageId} {
      // Solo el usuario puede leer sus propios mensajes o admins
      allow read: if request.auth != null && 
                     (resource.data.userId == request.auth.uid || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow write: if request.auth != null;
    }
    
    // Reglas para notificaciones
    match /notifications/{notificationId} {
      // Solo el usuario puede leer sus propias notificaciones
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }
    
    // Reglas para otros documentos (si los tienes)
    match /{document=**} {
      // Denegar acceso por defecto
      allow read, write: if false;
    }
  }
}
```

## 🔧 Cómo Aplicar

1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto
3. Firestore Database → **Reglas**
4. Reemplaza todo el contenido
5. Haz clic en **"Publicar"**

---

## 📝 Nota

Si necesitas acceso más abierto temporalmente para desarrollo, puedes usar:

```javascript
match /{document=**} {
  allow read, write: if request.auth != null; // Solo usuarios autenticados
}
```

Pero las reglas de arriba son más seguras para producción.

