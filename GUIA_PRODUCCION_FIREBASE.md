# 🚀 Guía de Configuración para Producción - Firebase

Esta guía te ayudará a configurar Firebase con reglas de seguridad apropiadas para producción.

---

## ⚠️ IMPORTANTE: Diferencias entre Desarrollo y Producción

### Desarrollo (Actual)
- Reglas más permisivas para facilitar el desarrollo
- Permite acceso sin autenticación en algunos casos
- Útil para pruebas rápidas

### Producción (Recomendado)
- Reglas más estrictas y seguras
- Requiere autenticación en la mayoría de casos
- Solo admins pueden modificar datos críticos
- Validación de datos más estricta

---

## 📋 Paso 1: Configurar Usuarios Admin en Firebase

**ANTES de aplicar las reglas de producción**, necesitas marcar usuarios como administradores:

1. Ve a Firebase Console → **Realtime Database** → **Datos**
2. Navega a `users/{userId}`
3. Agrega el campo `isAdmin: true` a los usuarios que deben ser administradores

**Ejemplo:**
```json
{
  "users": {
    "uBzBwtZvkcYvReRa1nEGs9mKI5E2": {
      "id": "uBzBwtZvkcYvReRa1nEGs9mKI5E2",
      "username": "Mariano",
      "email": "mariano@example.com",
      "isAdmin": true  // ← Agregar esto
    }
  }
}
```

---

## 📋 Paso 2: Aplicar Reglas de Realtime Database (Producción)

1. Ve a Firebase Console → **Realtime Database** → **Reglas**
2. Abre el archivo `firebase-realtime-database.rules.production.json`
3. **Copia TODO** el contenido
4. **Pega** en el editor de reglas de Firebase
5. Haz clic en **"Publicar"**
6. Espera 1-2 minutos

**⚠️ IMPORTANTE**: Las reglas de producción requieren que los usuarios tengan `isAdmin: true` en su perfil para poder escribir en subastas, productos, bots, etc.

---

## 📋 Paso 3: Aplicar Reglas de Firestore (Producción)

1. Ve a Firebase Console → **Firestore Database** → **Reglas**
2. Abre el archivo `firestore.rules.production`
3. **Copia TODO** el contenido
4. **Pega** en el editor de reglas de Firestore
5. Haz clic en **"Publicar"**

---

## 📋 Paso 4: Aplicar Reglas de Storage (Producción)

1. Ve a Firebase Console → **Storage** → **Reglas**
2. Abre el archivo `storage.rules.production`
3. **Copia TODO** el contenido
4. **Pega** en el editor de reglas de Storage
5. Haz clic en **"Publicar"**

**⚠️ NOTA**: Las reglas de Storage de producción requieren que Firestore esté activado para verificar si un usuario es admin.

---

## 🔒 Seguridad en Producción - Detalles

### Realtime Database

#### Subastas y Productos
- ✅ **Lectura**: Pública (cualquiera puede ver)
- ✅ **Escritura**: Solo admins (`isAdmin: true`)

#### Pedidos
- ✅ **Lectura**: Solo el propio usuario o admins
- ✅ **Escritura**: Solo el propio usuario o admins

#### Mensajes
- ✅ **Lectura**: Solo el remitente, destinatario o admins
- ✅ **Escritura**: Solo el remitente, destinatario o admins

#### Logs y Tracking
- ✅ **Lectura**: Solo admins
- ✅ **Escritura**: Cualquier usuario autenticado

### Firestore

- ✅ Validación de datos más estricta
- ✅ Prevención de cambios no autorizados en `isAdmin`
- ✅ Solo usuarios autenticados pueden acceder

### Storage

- ✅ Validación de tipos de archivo (solo imágenes)
- ✅ Límites de tamaño estrictos
- ✅ Solo admins pueden subir imágenes de subastas/productos
- ✅ Usuarios solo pueden subir sus propios avatares

---

## ✅ Checklist de Verificación

Antes de poner en producción, verifica:

- [ ] **Usuarios admin configurados**: Al menos un usuario tiene `isAdmin: true`
- [ ] **Reglas de Realtime Database aplicadas** desde `firebase-realtime-database.rules.production.json`
- [ ] **Reglas de Firestore aplicadas** desde `firestore.rules.production`
- [ ] **Reglas de Storage aplicadas** desde `storage.rules.production`
- [ ] **Probado en un entorno de staging** antes de producción
- [ ] **Backup de datos** realizado antes de aplicar cambios
- [ ] **Documentación actualizada** para el equipo

---

## 🧪 Pruebas Recomendadas

Después de aplicar las reglas de producción, prueba:

1. **Lectura pública**:
   - [ ] Cualquier usuario puede ver subastas y productos (sin autenticación)
   - [ ] Cualquier usuario puede ver imágenes públicas

2. **Autenticación requerida**:
   - [ ] Usuarios no autenticados NO pueden escribir en subastas/productos
   - [ ] Usuarios no autenticados NO pueden ver mensajes
   - [ ] Usuarios no autenticados NO pueden ver pedidos

3. **Permisos de admin**:
   - [ ] Usuarios con `isAdmin: true` pueden escribir en subastas/productos
   - [ ] Usuarios con `isAdmin: true` pueden ver logs y tracking
   - [ ] Usuarios sin `isAdmin: true` NO pueden escribir en subastas/productos

4. **Permisos de usuario**:
   - [ ] Usuarios pueden ver sus propios pedidos
   - [ ] Usuarios pueden ver sus propios mensajes
   - [ ] Usuarios pueden subir sus propios avatares

---

## 🔄 Revertir a Desarrollo

Si necesitas volver a las reglas de desarrollo:

1. Usa los archivos originales:
   - `firebase-realtime-database.rules.json` (desarrollo)
   - `firestore.rules` (desarrollo)
   - `storage.rules` (desarrollo)

2. Copia y pega en Firebase Console
3. Publica las reglas

---

## 📞 Soporte

Si encuentras problemas:

1. **Errores de permisos**: Verifica que el usuario tenga `isAdmin: true` si necesita escribir en subastas/productos
2. **Errores de autenticación**: Verifica que el usuario esté autenticado antes de realizar operaciones
3. **Errores de Storage**: Verifica que Firestore esté activado y configurado

---

## 🎯 Resumen de Archivos

### Desarrollo
- `firebase-realtime-database.rules.json`
- `firestore.rules`
- `storage.rules`

### Producción
- `firebase-realtime-database.rules.production.json`
- `firestore.rules.production`
- `storage.rules.production`

---

**¡Listo para producción!** 🎉 Asegúrate de probar todo en un entorno de staging antes de aplicar en producción real.

