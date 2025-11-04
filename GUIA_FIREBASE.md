# 🔥 Guía Completa: Configurar Firebase Realtime Database

## 📋 Paso 1: Acceder a Firebase Console

1. Abre tu navegador y ve a: **https://console.firebase.google.com/**
2. Inicia sesión con tu cuenta de Google
3. Selecciona tu proyecto (o créalo si no existe)
   - Si no tienes proyecto, haz clic en "Agregar proyecto"
   - Dale un nombre (ej: "winwin-app")
   - Sigue los pasos del asistente

---

## 📋 Paso 2: Crear/Activar Realtime Database

1. En el menú lateral izquierdo, busca **"Realtime Database"**
2. Si no está activado:
   - Haz clic en "Crear base de datos"
   - Selecciona la ubicación (elige la más cercana a tu región)
   - **IMPORTANTE**: Elige **"Modo de prueba"** (Test Mode) temporalmente
   - Haz clic en "Listo"

---

## 📋 Paso 3: Configurar Reglas de Seguridad

### Opción A: Desde Firebase Console (Recomendado para empezar)

1. En la página de Realtime Database, haz clic en la pestaña **"Reglas"** (arriba)
2. Verás un editor con código JSON
3. **Reemplaza TODO** el contenido con estas reglas:

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

4. Haz clic en **"Publicar"** (arriba a la derecha)
5. Confirma los cambios

### Opción B: Usando Firebase CLI (Avanzado)

Si tienes Firebase CLI instalado:

```bash
# 1. Inicializar Firebase (si no lo has hecho)
firebase init

# 2. Desplegar reglas
firebase deploy --only database
```

---

## 📋 Paso 4: Obtener la URL de tu Realtime Database

1. En la página de Realtime Database, haz clic en la pestaña **"Datos"**
2. En la parte superior verás una URL como:
   ```
   https://TU-PROYECTO-default-rtdb.firebaseio.com/
   ```
3. Copia esta URL (la necesitarás para verificar la configuración)

---

## 📋 Paso 5: Verificar la Configuración en tu Código

1. Abre el archivo: `src/config/firebase.ts`
2. Verifica que la URL de Realtime Database esté correcta:
   ```typescript
   export const realtimeDb = getDatabase(app);
   ```
3. Asegúrate de que tu proyecto Firebase esté configurado correctamente

---

## 📋 Paso 6: Probar la Configuración

1. Abre tu aplicación en el navegador
2. Abre la consola del navegador (F12)
3. Intenta crear un producto desde el panel de admin
4. Deberías ver en la consola:
   - ✅ `🔥 Guardando producto nuevo en Firebase...`
   - ✅ `✅ Producto guardado en Firebase correctamente`
5. Ve a Firebase Console → Realtime Database → Datos
6. Deberías ver que aparece el producto en `products/product_XXXXX`

---

## 🔒 Paso 7: Reglas de Seguridad (Opcional - Más Seguro)

Las reglas actuales permiten lectura/escritura a todos. Para producción, puedes hacerlas más seguras:

```json
{
  "rules": {
    "auctions": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "products": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true"
    },
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || (root.child('users').child(auth.uid).child('isAdmin').val() == true)",
        ".write": "$uid === auth.uid || (root.child('users').child(auth.uid).child('isAdmin').val() == true)"
      }
    }
  }
}
```

**Nota**: Estas reglas requieren autenticación y permisos de admin. Para empezar, usa las reglas simples del Paso 3.

---

## ❌ Solución de Problemas

### Error: "PERMISSION_DENIED"
- **Causa**: Las reglas no están configuradas correctamente
- **Solución**: 
  1. Ve a Firebase Console → Realtime Database → Reglas
  2. Verifica que las reglas estén publicadas
  3. Asegúrate de que `.read: true` y `.write: true` estén configurados

### Error: "Database not found"
- **Causa**: La URL de la base de datos no coincide
- **Solución**: 
  1. Verifica la URL en Firebase Console
  2. Verifica que `firebase.ts` tenga la configuración correcta

### Los datos no aparecen en Firebase
- **Causa**: Puede haber un error silencioso
- **Solución**: 
  1. Abre la consola del navegador (F12)
  2. Busca errores en rojo
  3. Verifica que veas los mensajes de éxito de Firebase

### No se sincronizan cambios entre dispositivos
- **Causa**: El hook `useSyncFirebase` no está funcionando
- **Solución**: 
  1. Verifica que `useSyncFirebase` esté importado en `App.tsx`
  2. Verifica la consola para mensajes de sincronización
  3. Asegúrate de que las reglas permitan lectura

---

## ✅ Checklist de Verificación

- [ ] Firebase Console abierto
- [ ] Realtime Database creada y activa
- [ ] Reglas configuradas y publicadas
- [ ] URL de base de datos verificada
- [ ] Producto de prueba creado exitosamente
- [ ] Producto visible en Firebase Console
- [ ] Sin errores de PERMISSION_DENIED en consola
- [ ] Sincronización funcionando entre dispositivos

---

## 📞 Ayuda Adicional

Si tienes problemas:
1. Revisa la consola del navegador (F12) para errores
2. Verifica que las reglas estén publicadas en Firebase
3. Asegúrate de que Realtime Database esté activa
4. Verifica que tu proyecto Firebase esté correctamente configurado

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación estará completamente sincronizada con Firebase. Todos los cambios que haga cualquier admin se reflejarán automáticamente en todos los dispositivos en tiempo real.

