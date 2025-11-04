# 🔥 Configurar Firestore Y Realtime Database

## ⚠️ IMPORTANTE: Son dos servicios diferentes

Firebase tiene **dos bases de datos diferentes**:

1. **Firestore** - Base de datos de documentos (usuarios, mensajes, notificaciones)
2. **Realtime Database** - Base de datos en tiempo real (productos, subastas, pedidos)

**Cada una tiene sus propias reglas que debes configurar.**

---

## 📋 Paso 1: Configurar Realtime Database (URGENTE)

Este es el servicio que está causando el error `PERMISSION_DENIED`.

### 1.1. Ir a Realtime Database
1. Firebase Console → **Realtime Database** (menú lateral)
2. Pestaña **"Reglas"**

### 1.2. Pegar estas reglas:

```json
{
  "rules": {
    "auctions": {
      ".read": true,
      ".write": true
    },
    "products": {
      ".read": true,
      ".write": true
    },
    "orders": {
      ".read": true,
      ".write": true
    },
    "users": {
      ".read": true,
      ".write": true
    },
    "messages": {
      ".read": true,
      ".write": true
    },
    "notifications": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 1.3. Publicar
- Haz clic en **"Publicar"**
- ✅ Esto solucionará el error `PERMISSION_DENIED`

---

## 📋 Paso 2: Actualizar Reglas de Firestore (IMPORTANTE)

Tus reglas actuales **expiran el 16 de noviembre**. Configúralas ahora.

### 2.1. Ir a Firestore
1. Firebase Console → **Firestore Database** (menú lateral)
2. Pestaña **"Reglas"**

### 2.2. Reemplazar con reglas seguras:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Usuarios: solo el propio usuario o admins
    match /users/{userId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow write: if request.auth != null && 
                      (request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // Mensajes: solo el usuario o admins
    match /messages/{messageId} {
      allow read: if request.auth != null && 
                     (resource.data.userId == request.auth.uid || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      allow write: if request.auth != null;
    }
    
    // Notificaciones: solo el usuario
    match /notifications/{notificationId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }
    
    // Denegar todo lo demás por defecto
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.3. Publicar
- Haz clic en **"Publicar"**
- ✅ Esto evitará que expire el 16 de noviembre

---

## 🔍 Verificación

Después de configurar ambas:

### Realtime Database:
- ✅ Deberías poder crear productos sin error
- ✅ Deberías poder crear pedidos sin error
- ✅ Los cambios se sincronizan entre dispositivos

### Firestore:
- ✅ Los usuarios pueden actualizar sus propios datos
- ✅ Los admins pueden ver/editar todo
- ✅ Las reglas no expiran

---

## 📊 Resumen Visual

```
Firebase Console
├── Realtime Database ← CONFIGURAR PRIMERO (URGENTE)
│   └── [Reglas] → Pegar JSON
│
└── Firestore Database ← CONFIGURAR DESPUÉS (IMPORTANTE)
    └── [Reglas] → Pegar JavaScript
```

---

## ⚡ Prioridad

1. **AHORA**: Realtime Database (está causando el error)
2. **DESPUÉS**: Firestore (expira el 16 de noviembre)

---

## ✅ Checklist

- [ ] Realtime Database → Reglas configuradas y publicadas
- [ ] Error PERMISSION_DENIED desapareció
- [ ] Firestore → Reglas actualizadas y publicadas
- [ ] Reglas de Firestore no expiran

