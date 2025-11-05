# 🚀 Configuración para Producción - Resumen Rápido

## ⚡ Pasos Rápidos

### 1. Configurar Usuario Admin
1. Firebase Console → **Realtime Database** → **Datos**
2. Ve a `users/{tuUserId}`
3. Agrega: `"isAdmin": true`

### 2. Aplicar Reglas de Producción

#### Realtime Database
1. Firebase Console → **Realtime Database** → **Reglas**
2. Copia contenido de `firebase-realtime-database.rules.production.json`
3. Pega y publica

#### Firestore
1. Firebase Console → **Firestore Database** → **Reglas**
2. Copia contenido de `firestore.rules.production`
3. Pega y publica

#### Storage
1. Firebase Console → **Storage** → **Reglas**
2. Copia contenido de `storage.rules.production`
3. Pega y publica

## 📋 Archivos de Producción

- `firebase-realtime-database.rules.production.json` - Reglas Realtime DB
- `firestore.rules.production` - Reglas Firestore
- `storage.rules.production` - Reglas Storage
- `GUIA_PRODUCCION_FIREBASE.md` - Guía completa

## ⚠️ Importante

- Las reglas de producción requieren `isAdmin: true` para escribir en subastas/productos
- Solo usuarios autenticados pueden ver sus propios pedidos y mensajes
- Las reglas de Storage requieren Firestore activado

## 🔄 Volver a Desarrollo

Usa los archivos sin `.production`:
- `firebase-realtime-database.rules.json`
- `firestore.rules`
- `storage.rules`

