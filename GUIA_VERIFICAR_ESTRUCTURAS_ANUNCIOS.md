# 🔍 Guía: Verificar Estructuras de Datos - Sistema de Anuncios

Esta es la **segunda guía del plan de despliegue** - Fase 1.2: Crear Estructuras de Datos.

## 📋 Objetivo

Verificar que las estructuras de datos para anuncios se crean correctamente en Firebase Realtime Database.

---

## ✅ Paso 1: Verificar Estructura Base

### 1.1. Abrir Firebase Console

1. Ve a: **https://console.firebase.google.com/**
2. Selecciona tu proyecto: **"subasta-argenta-winwin"**
3. Ve a: **Realtime Database** → **Datos**

### 1.2. Verificar Estructura Existente

Deberías ver las siguientes estructuras base:
- `auctions/`
- `products/`
- `users/`
- `orders/`
- `messages/`
- `homeConfig/`
- `notifications/`

> ✅ Si ves estas estructuras, el paso 1 está completo.

---

## 📦 Paso 2: Crear Estructura de Anuncios

Las estructuras se crearán automáticamente cuando uses el sistema. Vamos a crearlas manualmente para verificar.

### 2.1. Crear Anuncio desde Admin Panel

1. Abre tu aplicación en el navegador
2. Inicia sesión como **admin**
3. Ve a **Admin Panel** → Tab **"Anuncios"**
4. Haz clic en **"Nuevo Anuncio"**
5. Completa el formulario:
   - **Título**: "Anuncio de Verificación"
   - **Contenido**: "Este anuncio es para verificar las estructuras de datos"
   - **Tipo**: "text"
   - **Prioridad**: "low"
   - **Destinatarios**: "all_users"
   - **Programación**: "inmediata"
6. Haz clic en **"Guardar"** o **"Crear"**

### 2.2. Verificar en Firebase Console

1. Ve a Firebase Console → **Realtime Database** → **Datos**
2. Busca la estructura `announcements/`
3. Deberías ver algo como:
   ```
   announcements/
     └── {id_del_anuncio}/
         ├── id: "{id_del_anuncio}"
         ├── title: "Anuncio de Verificación"
         ├── content: "Este anuncio es para verificar..."
         ├── type: "text"
         ├── priority: "low"
         ├── status: "active"
         ├── targetUsers: "all_users"
         ├── createdAt: "2025-01-27T..."
         └── createdBy: "{tu_user_id}"
   ```

> ✅ Si ves esta estructura, el paso 2 está completo.

---

## 👤 Paso 3: Verificar Estructura de Usuario

### 3.1. Ver Anuncio como Usuario

1. Abre tu aplicación en otra pestaña o modo incógnito
2. Inicia sesión como **usuario regular** (no admin)
3. Ve a la página **Home** (donde está el widget de anuncios)
4. Deberías ver el anuncio que creaste

### 3.2. Verificar en Firebase Console

1. Ve a Firebase Console → **Realtime Database** → **Datos**
2. Busca la estructura `user_announcements/`
3. Navega a `user_announcements/{user_id}/{announcement_id}`
4. Deberías ver algo como:
   ```
   user_announcements/
     └── {user_id}/
         └── {announcement_id}/
             ├── read: false
             ├── dismissed: false
             └── receivedAt: "2025-01-27T..."
   ```

> ✅ Si ves esta estructura, el paso 3 está completo.

---

## 📊 Paso 4: Verificar Estructura de Analytics

### 4.1. Interactuar con Anuncio

1. Como usuario regular, haz click en el anuncio
2. O descarta el anuncio (botón X)
3. Esto generará eventos de engagement

### 4.2. Verificar en Firebase Console

1. Ve a Firebase Console → **Realtime Database** → **Datos**
2. Busca la estructura `announcement_engagement/`
3. Navega a `announcement_engagement/{announcement_id}/`
4. Deberías ver eventos como:
   ```
   announcement_engagement/
     └── {announcement_id}/
         └── {event_id}/
             ├── announcementId: "{announcement_id}"
             ├── userId: "{user_id}"
             ├── action: "view" o "click" o "dismiss"
             ├── timestamp: "2025-01-27T..."
             └── metadata: { ... }
   ```

> ✅ Si ves esta estructura, el paso 4 está completo.

---

## 🔍 Paso 5: Verificación Completa

### 5.1. Checklist de Estructuras

Verifica que existen las siguientes estructuras:

- [ ] `announcements/` - Contiene los anuncios creados
- [ ] `user_announcements/` - Contiene el estado de anuncios por usuario
- [ ] `announcement_engagement/` - Contiene eventos de interacción

### 5.2. Verificar Datos

Para cada estructura, verifica:

**announcements/**
- [ ] Tiene campo `id`
- [ ] Tiene campo `title`
- [ ] Tiene campo `content`
- [ ] Tiene campo `type` (text, image, urgent, promotional)
- [ ] Tiene campo `status` (active, expired, draft)
- [ ] Tiene campo `priority` (low, medium, high)
- [ ] Tiene campo `createdAt`
- [ ] Tiene campo `createdBy`

**user_announcements/{userId}/{announcementId}/**
- [ ] Tiene campo `read` (boolean)
- [ ] Tiene campo `dismissed` (boolean)
- [ ] Tiene campo `receivedAt` (timestamp)

**announcement_engagement/{announcementId}/{eventId}/**
- [ ] Tiene campo `announcementId`
- [ ] Tiene campo `userId`
- [ ] Tiene campo `action` (view, click, dismiss, link_click, image_click)
- [ ] Tiene campo `timestamp`

---

## 🚨 Solución de Problemas

### No se crea la estructura `announcements/`

**Causa**: Error al crear el anuncio o permisos incorrectos.

**Solución**:
1. Verifica que eres admin (`isAdmin: true`)
2. Revisa la consola del navegador (F12) para ver errores
3. Verifica que las reglas Firebase están aplicadas
4. Intenta crear otro anuncio

### No se crea la estructura `user_announcements/`

**Causa**: El usuario no está autenticado o no hay anuncios activos.

**Solución**:
1. Verifica que el usuario está autenticado
2. Verifica que hay anuncios activos en `announcements/`
3. Recarga la página Home
4. Verifica que el anuncio tiene `targetUsers: "all_users"` o incluye al usuario

### No se crea la estructura `announcement_engagement/`

**Causa**: No se han registrado interacciones aún.

**Solución**:
1. Asegúrate de hacer click en el anuncio
2. O descarta el anuncio
3. Espera unos segundos
4. Recarga Firebase Console

---

## ✅ Checklist Final

- [ ] Estructura `announcements/` existe y tiene datos
- [ ] Estructura `user_announcements/` existe y tiene datos
- [ ] Estructura `announcement_engagement/` existe y tiene datos
- [ ] Todos los campos requeridos están presentes
- [ ] Los datos tienen el formato correcto

---

## 📚 Próximos Pasos

Una vez completada esta guía, continúa con:

1. **GUIA_TESTING_PERMISOS_ANUNCIOS.md** - Testing de permisos y seguridad

---

**Última actualización**: 2025-01-27
**Versión**: 1.0.0
**Fase**: 1.2 - Backend

