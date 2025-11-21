# 🔒 Guía: Desplegar Reglas de Seguridad Corregidas

## ✅ Estado Actual

Las reglas de seguridad han sido corregidas en los siguientes archivos:
- ✅ `firestore.rules` - Reglas de Firestore corregidas
- ✅ `firebase-realtime-database.rules.json` - Reglas de Realtime Database corregidas
- ✅ `storage.rules` - Reglas de Storage corregidas

## 🚀 Desplegar las Reglas

### Opción 1: Usar el Script Automático (Recomendado)

1. **Asegúrate de estar autenticado en Firebase:**
   ```powershell
   npx firebase-tools login
   ```
   Esto abrirá tu navegador para autenticarte.

2. **Ejecuta el script de despliegue:**
   ```powershell
   .\desplegar-reglas-seguridad.ps1
   ```

El script desplegará automáticamente las tres reglas de seguridad.

### Opción 2: Desplegar Manualmente

Si prefieres hacerlo paso a paso:

1. **Autenticarse en Firebase:**
   ```powershell
   npx firebase-tools login
   ```

2. **Seleccionar el proyecto:**
   ```powershell
   npx firebase-tools use clikio-773fa
   ```

3. **Desplegar reglas de Firestore:**
   ```powershell
   npx firebase-tools deploy --only firestore:rules
   ```

4. **Desplegar reglas de Realtime Database:**
   ```powershell
   npx firebase-tools deploy --only database
   ```

5. **Desplegar reglas de Storage:**
   ```powershell
   npx firebase-tools deploy --only storage
   ```

## ✅ Verificación

Después de desplegar, verifica en Firebase Console:

1. **Firestore Rules:**
   - Ve a Firebase Console → Firestore Database → Rules
   - Verifica que las reglas coincidan con `firestore.rules`

2. **Realtime Database Rules:**
   - Ve a Firebase Console → Realtime Database → Rules
   - Verifica que las reglas coincidan con `firebase-realtime-database.rules.json`

3. **Storage Rules:**
   - Ve a Firebase Console → Storage → Rules
   - Verifica que las reglas coincidan con `storage.rules`

## 🔍 Pruebas Recomendadas

Después de desplegar, prueba:

1. **Como usuario no autenticado:**
   - ✅ Debe poder leer subastas y productos
   - ❌ NO debe poder escribir en auctions, products, orders
   - ❌ NO debe poder leer logs, tracking, bots

2. **Como usuario autenticado normal:**
   - ✅ Debe poder leer subastas y productos
   - ✅ Debe poder escribir en su propio perfil
   - ❌ NO debe poder escribir en auctions, products (solo admin)
   - ❌ NO debe poder leer logs, tracking (solo admin)

3. **Como administrador:**
   - ✅ Debe poder hacer todo lo anterior
   - ✅ Debe poder escribir en auctions, products
   - ✅ Debe poder leer logs, tracking, bots

## ⚠️ Importante

- Las reglas de producción (`firestore.rules.production`, `storage.rules.production`, etc.) son más restrictivas
- Si estás en producción, considera usar las reglas de producción
- Siempre prueba en desarrollo antes de desplegar a producción

## 🐛 Solución de Problemas

### Error: "Permission denied"
- Verifica que estés autenticado: `npx firebase-tools login`
- Verifica que tengas permisos de administrador en el proyecto

### Error: "Project not found"
- Verifica el ID del proyecto: `npx firebase-tools projects:list`
- Selecciona el proyecto correcto: `npx firebase-tools use clikio-773fa`

### Las reglas no se actualizan
- Espera unos minutos, Firebase puede tardar en propagar los cambios
- Verifica en Firebase Console que las reglas se hayan actualizado

