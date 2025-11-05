# 🚀 Firebase - Configuración para Producción

## 📋 Guía Completa para Producción

Esta guía te ayuda a configurar Firebase con reglas de seguridad apropiadas para producción.

---

## ⚠️ IMPORTANTE: Antes de Producción

### 1. Configurar Usuarios Admin

**ANTES** de aplicar las reglas de producción, marca usuarios como administradores:

1. Firebase Console → **Realtime Database** → **Datos**
2. Ve a `users/{tuUserId}`
3. Agrega: `"isAdmin": true`

**Ejemplo:**
```json
{
  "users": {
    "uBzBwtZvkcYvReRa1nEGs9mKI5E2": {
      "id": "uBzBwtZvkcYvReRa1nEGs9mKI5E2",
      "username": "Mariano",
      "email": "mariano@example.com",
      "isAdmin": true  ← Agregar esto
    }
  }
}
```

---

## 📋 Aplicar Reglas de Producción

### Paso 1: Realtime Database

1. Firebase Console → **Realtime Database** → **Reglas**
2. Copia el contenido de `firebase-realtime-database.rules.production.json`
3. Pega en el editor
4. Haz clic en **"Publicar"**
5. Espera 30 segundos

### Paso 2: Firestore

1. Firebase Console → **Firestore Database** → **Reglas**
2. Copia el contenido de `firestore.rules.production`
3. Pega en el editor
4. Haz clic en **"Publicar"**

### Paso 3: Storage

1. Firebase Console → **Storage** → **Reglas**
2. Copia el contenido de `storage.rules.production`
3. Pega en el editor
4. Haz clic en **"Publicar"**

**⚠️ NOTA**: Las reglas de Storage requieren que Firestore esté activado.

---

## 🔒 Seguridad en Producción

### Realtime Database

| Recurso | Lectura | Escritura |
|---------|---------|-----------|
| `auctions` | Pública | Solo Admins |
| `products` | Pública | Solo Admins |
| `orders` | Usuario/Admin | Usuario/Admin |
| `messages` | Remitente/Destinatario/Admin | Remitente/Destinatario/Admin |
| `homeConfig` | Pública | Solo Admins |
| `notifications` | Propio usuario | Usuario/Admin |
| `users` | Propio usuario/Admin | Propio usuario/Admin |
| `bots` | Pública | Solo Admins |
| `action_logs` | Solo Admins | Usuarios autenticados |
| `tracking_clicks` | Solo Admins | Usuarios autenticados |
| `tracking_searches` | Solo Admins | Usuarios autenticados |

### Firestore

- ✅ Validación estricta de datos
- ✅ Prevención de cambios no autorizados
- ✅ Solo usuarios autenticados

### Storage

- ✅ Validación de tipos (solo imágenes)
- ✅ Límites de tamaño estrictos
- ✅ Solo admins pueden subir imágenes de subastas/productos
- ✅ Usuarios solo pueden subir sus avatares

---

## ✅ Checklist de Producción

Antes de poner en producción:

- [ ] Al menos un usuario tiene `isAdmin: true`
- [ ] Reglas de Realtime Database aplicadas
- [ ] Reglas de Firestore aplicadas
- [ ] Reglas de Storage aplicadas
- [ ] Probado en entorno de staging
- [ ] Backup de datos realizado
- [ ] Documentación actualizada

---

## 🧪 Pruebas Recomendadas

1. **Lectura pública**: Usuarios no autenticados pueden ver subastas/productos
2. **Autenticación**: Usuarios no autenticados NO pueden escribir
3. **Permisos de admin**: Usuarios con `isAdmin: true` pueden escribir en subastas/productos
4. **Permisos de usuario**: Usuarios pueden ver sus propios pedidos/mensajes

---

## 🔄 Volver a Desarrollo

Si necesitas volver a las reglas de desarrollo:

1. Usa los archivos sin `.production`:
   - `firebase-realtime-database.rules.json`
   - `firestore.rules`
   - `storage.rules`
2. Copia y pega en Firebase Console
3. Publica las reglas

---

**¡Listo para producción!** 🎉

