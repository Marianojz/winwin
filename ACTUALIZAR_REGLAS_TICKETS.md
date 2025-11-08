# 🔧 Actualizar Reglas de Firebase para Tickets

## ⚠️ IMPORTANTE: Actualizar Reglas en Firebase Console

Para que el sistema de tickets funcione, necesitás actualizar las reglas de **Realtime Database** en Firebase Console.

---

## 📋 Pasos para Actualizar las Reglas

### 1. Abrir Firebase Console

1. Ve a: **https://console.firebase.google.com/**
2. Selecciona tu proyecto: **"subasta-argenta-winwin"**
3. Ve a: **Realtime Database** → pestaña **"Reglas"**

### 2. Copiar las Nuevas Reglas

**Opción A: Si estás en DESARROLLO (Recomendado ahora)**
- Abrí el archivo: `firebase-realtime-database.rules.json`
- **COPIA TODO** el contenido (Ctrl+A, Ctrl+C)

**Opción B: Si estás en PRODUCCIÓN**
- Abrí el archivo: `firebase-realtime-database.rules.production.json`
- **COPIA TODO** el contenido (Ctrl+A, Ctrl+C)

### 3. Aplicar las Reglas

1. En Firebase Console → **Realtime Database** → **Reglas**
2. **BORRA TODO** el contenido actual del editor
3. **PEGA** el contenido que copiaste
4. Haz clic en **"Publicar"** (botón verde)
5. **Espera 30-60 segundos** para que se propaguen los cambios

### 4. Verificar

1. Recargá la aplicación (F5 o Ctrl+F5)
2. Intentá crear un ticket desde `/ayuda`
3. Deberías ver: `✅ Ticket creado: TKT-2025-XXXX`
4. **NO** deberías ver errores de `permission_denied`

---

## 🔍 Nuevas Reglas Agregadas

Se agregaron las siguientes secciones a las reglas:

### Tickets
```json
"tickets": {
  ".read": "auth != null",
  "$ticketId": {
    ".read": "auth != null && (data.child('userId').val() == auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)",
    ".write": "auth != null && (newData.child('userId').val() == auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)",
    ".validate": "auth != null && (newData.child('userId').val() == auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)"
  }
}
```

**Permisos:**
- ✅ Usuarios autenticados pueden leer la lista de tickets (el código del cliente filtra solo los suyos)
- ✅ Usuarios autenticados pueden crear tickets (solo con su propio userId)
- ✅ Usuarios pueden leer sus propios tickets individuales
- ✅ Admins pueden leer y actualizar todos los tickets

### Mensajes de Contacto
```json
"contactMessages": {
  ".read": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true",
  ".write": true,
  "$messageId": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true",
    ".write": true
  }
}
```

**Permisos:**
- ✅ Cualquiera puede crear mensajes de contacto (no requiere autenticación)
- ✅ Solo admins pueden leer los mensajes de contacto
- ✅ Permite escritura tanto a nivel superior como en nodos hijos (necesario para `push()`)

---

## ✅ Después de Actualizar

1. **Cerrá sesión y volvé a iniciar sesión** en la aplicación
2. Intentá crear un ticket desde `/ayuda`
3. Intentá enviar un mensaje desde `/contacto`
4. Verificá en el panel de admin (pestaña "Tickets") que aparezcan los tickets y mensajes

---

## 🐛 Si Sigue Fallando

1. **Esperá 1-2 minutos** después de publicar las reglas
2. **Limpiá la caché del navegador** (Ctrl+Shift+Delete)
3. **Recargá la aplicación** con Ctrl+F5
4. **Verificá que estés autenticado** (deberías ver tu nombre en el navbar)
5. **Verificá en Firebase Console** que las reglas se hayan publicado correctamente

---

**¡Listo!** 🎉 Con esto deberías poder crear tickets y enviar mensajes de contacto sin problemas.

