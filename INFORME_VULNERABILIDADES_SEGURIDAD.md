# 🔒 INFORME DE VULNERABILIDADES DE SEGURIDAD

**Fecha de revisión:** $(date)  
**Repositorio:** winwin  
**Tipo de proyecto:** Aplicación React + Firebase (Subastas)

---

## ⚠️ VULNERABILIDADES CRÍTICAS

### 1. 🔴 CRÍTICA: Credenciales de Firebase expuestas en código fuente

**Ubicación:** `src/config/firebase.ts` (líneas 10-19)

**Problema:**
```10:19:src/config/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyDhJldFdxpezX2MCANk67PBIWPbZacevEc",
  authDomain: "clikio-773fa.firebaseapp.com",
  projectId: "clikio-773fa",
  storageBucket: "clikio-773fa.firebasestorage.app",
  messagingSenderId: "930158513107",
  appId: "1:930158513107:web:685ebe622ced3398e8bd26",
  databaseURL: "https://clikio-773fa-default-rtdb.firebaseio.com",
  measurementId: "G-13J0SJPW40"
};
```

**Riesgo:** 
- Las credenciales de Firebase están hardcodeadas en el código fuente
- Cualquier persona con acceso al repositorio puede ver estas credenciales
- Si el repositorio es público, estas credenciales están expuestas públicamente
- Aunque las API keys de Firebase tienen restricciones, es una mala práctica de seguridad

**Recomendación:**
- Mover las credenciales a variables de entorno usando `.env`
- Agregar `.env` al `.gitignore` (ya está agregado, pero verificar que no se haya subido)
- Usar `import.meta.env.VITE_FIREBASE_API_KEY` en lugar de valores hardcodeados
- Rotar las credenciales si el repositorio ha sido público

---

### 2. 🔴 CRÍTICA: API Key de Google Maps expuesta en código fuente

**Ubicación:** `src/config/googleMaps.ts` (línea 26)

**Problema:**
```24:26:src/config/googleMaps.ts
if (!apiKeyFromEnv && import.meta.env.DEV) {
  console.warn('⚠️ Usando API key temporal para desarrollo (el servidor necesita reiniciarse)');
  apiKeyFromEnv = 'AIzaSyDqrLcDMRPASXE7dJO7OsqaGa63VLLayJw'; // Key temporal solo para desarrollo
```

**Riesgo:**
- API Key de Google Maps hardcodeada en el código
- Aunque está marcada como "temporal", está en el repositorio
- Puede ser usada por terceros, generando costos no autorizados
- Violación de las mejores prácticas de Google Cloud Platform

**Recomendación:**
- Eliminar inmediatamente la API key del código
- Configurar restricciones en Google Cloud Console:
  - Restricción por dominio HTTP referrer
  - Restricción por IP (si es posible)
  - Límites de cuota diaria
- Usar solo variables de entorno
- Rotar la API key si el repositorio ha sido público

---

### 3. 🔴 CRÍTICA: Reglas de Firebase Realtime Database completamente abiertas

**Ubicación:** `firebase-realtime-database.rules.json` (líneas 3-14)

**Problema:**
```3:14:firebase-realtime-database.rules.json
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
```

**Riesgo:**
- Cualquier usuario (incluso no autenticado) puede leer y escribir en `auctions`, `products` y `orders`
- Permite modificación/eliminación de datos sin autenticación
- Permite lectura de información sensible sin restricciones
- Riesgo de manipulación de datos, spam, y ataques de denegación de servicio

**Recomendación:**
- Implementar autenticación obligatoria para todas las operaciones
- Restringir escritura solo a usuarios autenticados
- Implementar validación de datos en las reglas
- Usar las reglas de producción como base: `firebase-realtime-database.rules.production.json`

---

### 4. 🟠 ALTA: Reglas de Firestore demasiado permisivas

**Ubicación:** `firestore.rules` (líneas 32-36)

**Problema:**
```32:36:firestore.rules
// Reglas para otros documentos
match /{document=**} {
  // Permitir acceso solo a usuarios autenticados
  allow read, write: if request.auth != null;
}
```

**Riesgo:**
- Cualquier usuario autenticado puede leer y escribir en cualquier documento
- No hay validación de propiedad de datos
- Permite acceso a datos de otros usuarios
- Falta de principio de menor privilegio

**Recomendación:**
- Usar las reglas de producción (`firestore.rules.production`) que son más restrictivas
- Implementar reglas específicas para cada colección
- Validar propiedad de datos antes de permitir escritura
- Denegar por defecto: `allow read, write: if false;`

---

### 5. 🟠 ALTA: Tracking y logs completamente abiertos

**Ubicación:** `firebase-realtime-database.rules.json` (líneas 89-100)

**Problema:**
```89:100:firebase-realtime-database.rules.json
"action_logs": {
  ".read": true,
  ".write": true
},
"tracking_clicks": {
  ".read": true,
  ".write": true
},
"tracking_searches": {
  ".read": true,
  ".write": true
},
```

**Riesgo:**
- Cualquier persona puede leer logs y datos de tracking
- Exposición de información sobre comportamiento de usuarios
- Permite escritura sin restricciones, lo que puede corromper datos analíticos
- Riesgo de inyección de datos falsos

**Recomendación:**
- Lectura solo para administradores
- Escritura solo para usuarios autenticados (o solo desde el servidor)
- Implementar validación de estructura de datos

---

### 6. 🟠 ALTA: Regla de Storage permite escritura sin validación de admin

**Ubicación:** `storage.rules` (líneas 6-12, 14-20, etc.)

**Problema:**
```6:12:storage.rules
// Imágenes de subastas - Lectura pública, escritura solo autenticados
match /auctions/{imageId} {
  allow read: if true;
  allow write: if request.auth != null && 
                  request.resource.size < 5 * 1024 * 1024 && // 5MB máximo
                  request.resource.contentType.matches('image/.*');
}
```

**Riesgo:**
- Cualquier usuario autenticado puede subir imágenes a subastas y productos
- No hay validación de que el usuario sea admin o propietario
- Permite que usuarios normales modifiquen contenido de subastas
- Riesgo de spam de imágenes o contenido malicioso

**Recomendación:**
- Usar las reglas de producción (`storage.rules.production`) que validan `isAdmin()`
- Restringir escritura solo a administradores para subastas y productos
- Mantener escritura libre solo para avatares de usuarios (con validación de propiedad)

---

### 7. 🟡 MEDIA: Validación de permisos de admin basada solo en Realtime Database

**Ubicación:** Múltiples archivos de reglas

**Problema:**
Las reglas verifican `isAdmin` desde Realtime Database, pero este valor puede ser manipulado si las reglas de usuarios no están bien protegidas.

**Riesgo:**
- Si un usuario puede escribir su propio `isAdmin: true` en Realtime Database, puede escalar privilegios
- Falta de validación en el servidor para operaciones críticas

**Recomendación:**
- Verificar `isAdmin` desde Firestore (fuente de verdad) en lugar de Realtime Database
- Implementar validación en Cloud Functions para operaciones críticas
- Las reglas de producción ya usan Firestore para verificar admin, seguir ese patrón

---

### 8. 🟡 MEDIA: ContactMessages permite escritura sin restricciones

**Ubicación:** `firebase-realtime-database.rules.json` (línea 133)

**Problema:**
```132:134:firebase-realtime-database.rules.json
"$messageId": {
  ".read": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true",
  ".write": true
}
```

**Riesgo:**
- Cualquier persona (incluso no autenticada) puede escribir mensajes de contacto
- Permite spam y abuso del sistema de contacto
- No hay validación de estructura de datos

**Recomendación:**
- Requerir autenticación para escritura: `".write": "auth != null"`
- Implementar validación de estructura de datos
- Considerar rate limiting en Cloud Functions

---

### 9. 🟡 MEDIA: Falta de validación de entrada en algunos formularios

**Ubicación:** Varios archivos de páginas

**Problema:**
Aunque hay validación básica en el frontend, no hay validación en las reglas de Firebase para asegurar estructura de datos.

**Riesgo:**
- Datos malformados pueden ser insertados si se bypass el frontend
- Falta de sanitización puede permitir inyección de datos

**Recomendación:**
- Agregar validación en las reglas de Firebase usando `.validate`
- Validar tipos de datos, rangos, y formatos
- Las reglas de producción ya tienen algunas validaciones, extenderlas

---

### 10. 🟢 BAJA: Información de depuración en producción

**Ubicación:** `src/config/firebase.ts`, `src/config/googleMaps.ts`

**Problema:**
Múltiples `console.log` y `console.warn` que exponen información del sistema.

**Riesgo:**
- Información de depuración visible en consola del navegador
- Puede revelar estructura interna del sistema

**Recomendación:**
- Usar variables de entorno para controlar logs
- Eliminar o deshabilitar logs en producción
- Usar herramientas de logging profesionales

---

## 📋 RESUMEN DE PRIORIDADES

### 🔴 CRÍTICO - Resolver inmediatamente:
1. ✅ Mover credenciales de Firebase a variables de entorno
2. ✅ Eliminar API Key de Google Maps del código
3. ✅ Restringir reglas de Realtime Database (auctions, products, orders)
4. ✅ Implementar autenticación obligatoria

### 🟠 ALTA - Resolver pronto:
5. ✅ Usar reglas de producción de Firestore
6. ✅ Restringir acceso a logs y tracking
7. ✅ Implementar validación de admin en Storage

### 🟡 MEDIA - Planificar:
8. ✅ Validar permisos de admin desde Firestore
9. ✅ Restringir escritura de ContactMessages
10. ✅ Agregar validación de datos en reglas

### 🟢 BAJA - Mejoras:
11. ✅ Limpiar logs de depuración en producción

---

## 🛠️ PLAN DE ACCIÓN RECOMENDADO

### Paso 1: Credenciales (URGENTE)
1. Crear archivo `.env` con variables de entorno
2. Mover todas las credenciales a variables de entorno
3. Actualizar código para usar `import.meta.env`
4. Verificar que `.env` esté en `.gitignore`
5. Rotar credenciales si el repositorio ha sido público

### Paso 2: Reglas de Firebase (URGENTE)
1. Usar `firebase-realtime-database.rules.production.json` como base
2. Aplicar restricciones de autenticación a todas las rutas
3. Implementar validación de datos
4. Probar reglas en entorno de desarrollo antes de producción

### Paso 3: Storage Rules (ALTA PRIORIDAD)
1. Usar `storage.rules.production` como base
2. Implementar validación de admin para subastas/productos
3. Mantener permisos de usuario solo para avatares

### Paso 4: Validación y Testing
1. Revisar todas las reglas de seguridad
2. Probar con usuarios no autenticados
3. Probar con usuarios autenticados normales
4. Probar con usuarios admin
5. Verificar que no se puedan escalar privilegios

---

## 📚 RECURSOS Y REFERENCIAS

- [Firebase Security Rules Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud API Key Security](https://cloud.google.com/docs/authentication/api-keys)

---

**Nota:** Este informe se generó mediante revisión automatizada del código. Se recomienda una revisión manual adicional por un experto en seguridad.

