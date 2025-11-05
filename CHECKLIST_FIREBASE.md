# ✅ Checklist de Configuración de Firebase

Usa este checklist para asegurarte de que todo esté configurado correctamente.

---

## 🔥 Firebase Console - Configuración Inicial

### Paso 1: Acceder a Firebase Console
- [ ] Accedí a https://console.firebase.google.com/
- [ ] Inicié sesión con mi cuenta de Google
- [ ] Seleccioné el proyecto: **subasta-argenta-winwin**

---

## 📊 Realtime Database

### Configuración
- [ ] Realtime Database está activado
- [ ] URL verificada: `https://subasta-argenta-winwin-default-rtdb.firebaseio.com/`
- [ ] Reglas copiadas desde `firebase-realtime-database.rules.json`
- [ ] Reglas publicadas (botón verde "Publicar")
- [ ] Esperé 1-2 minutos después de publicar

### Estructura de Datos (se creará automáticamente)
- [ ] `auctions/` - Para subastas
- [ ] `products/` - Para productos
- [ ] `orders/` - Para pedidos
- [ ] `messages/` - Para mensajes
- [ ] `homeConfig/` - Para configuración del inicio
- [ ] `notifications/` - Para notificaciones
- [ ] `users/` - Para usuarios
- [ ] `bots/` - Para bots

---

## 🔥 Firestore Database

### Configuración
- [ ] Firestore está activado
- [ ] Modo: **Modo de prueba** (temporalmente)
- [ ] Ubicación: **us-central1** (o la más cercana)
- [ ] Reglas copiadas desde `firestore.rules`
- [ ] Reglas publicadas

### Colecciones (se crearán automáticamente si las usas)
- [ ] `users/` - Si usas Firestore para usuarios
- [ ] `messages/` - Si usas Firestore para mensajes
- [ ] `notifications/` - Si usas Firestore para notificaciones

---

## 📦 Firebase Storage

### Configuración
- [ ] Storage está activado
- [ ] Ubicación: **us-central1** (misma que las bases de datos)
- [ ] Reglas copiadas desde `storage.rules`
- [ ] Reglas publicadas

### Carpetas (se crearán automáticamente)
- [ ] `auctions/` - Para imágenes de subastas
- [ ] `products/` - Para imágenes de productos
- [ ] `avatars/` - Para avatares de usuarios
- [ ] `images/` - Para imágenes generales
- [ ] `banners/` - Para banners y promociones

---

## 🔐 Firebase Authentication

### Configuración
- [ ] Authentication está activado
- [ ] Proveedor de Google está habilitado (si lo usas)
- [ ] Configuración de dominio autorizado completada

---

## ✅ Verificación en la Aplicación

### Sincronización en Tiempo Real
- [ ] Abrí la aplicación en el navegador
- [ ] Abrí la Consola del Desarrollador (F12)
- [ ] Verifico estos mensajes en la consola:
  - `🔄 INICIANDO SINCRONIZACIÓN FIREBASE...`
  - `✅ Firebase - Subastas sincronizadas: X`
  - `✅ Productos sincronizados: X`
  - `✅ Configuración de home cargada desde Firebase`

### Funcionalidades de Mensajes
- [ ] Puedo enviar mensajes desde el panel de admin
- [ ] Los mensajes aparecen en Firebase Console → Realtime Database → `messages/`
- [ ] Los mensajes se sincronizan en tiempo real entre dispositivos

### Funcionalidades de Configuración
- [ ] Puedo guardar configuración del inicio desde AdminPanel
- [ ] La configuración aparece en Firebase Console → Realtime Database → `homeConfig`
- [ ] La configuración se carga en la página Home
- [ ] Los cambios se reflejan en tiempo real

### Funcionalidades de Imágenes
- [ ] Puedo subir imágenes en subastas
- [ ] Puedo subir imágenes en productos
- [ ] Las imágenes aparecen en Firebase Console → Storage
- [ ] Las imágenes se muestran correctamente en la aplicación

### Sincronización entre Dispositivos
- [ ] Abrí la app en dos navegadores diferentes
- [ ] Creé una subasta en uno
- [ ] La subasta apareció automáticamente en el otro navegador
- [ ] Los cambios se reflejan en tiempo real

---

## 🐛 Verificación de Errores

### Consola del Navegador
- [ ] No hay errores de "Permission denied"
- [ ] No hay errores de "databaseURL is not defined"
- [ ] No hay errores de conexión a Firebase

### Firebase Console
- [ ] No hay errores en los logs de Realtime Database
- [ ] No hay errores en los logs de Firestore
- [ ] No hay errores en los logs de Storage

---

## 📝 Notas Adicionales

### Si encuentras errores:
1. Verifica que todas las reglas estén publicadas
2. Espera 1-2 minutos después de publicar reglas
3. Limpia la caché del navegador (Ctrl+Shift+Delete)
4. Recarga la página (F5)

### Para producción:
- [ ] Cambiar reglas de "Modo de prueba" a reglas más seguras
- [ ] Agregar validación de autenticación más estricta
- [ ] Configurar límites de uso y facturación

---

## ✨ Estado Final

- [ ] **Todo está funcionando correctamente**
- [ ] **Los mensajes se sincronizan**
- [ ] **La configuración se guarda y carga**
- [ ] **Las imágenes se suben correctamente**
- [ ] **La sincronización en tiempo real funciona**

---

**🎉 ¡Felicitaciones! Tu aplicación está completamente configurada con Firebase.**

Si tienes algún problema, revisa la guía completa en `GUIA_COMPLETA_FIREBASE.md`

