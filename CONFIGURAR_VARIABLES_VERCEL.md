# 🔧 Configurar Variables de Entorno en Vercel

## ⚠️ Error Actual

Si ves este error en producción:
```
Firebase: Error (auth/invalid-api-key)
```

**Causa:** Las variables de entorno de Firebase no están configuradas en Vercel.

---

## 📋 Solución: Configurar Variables en Vercel

### Paso 1: Ir a la Configuración de Vercel

1. Ve a: **https://vercel.com/dashboard**
2. Selecciona tu proyecto **winwin** (o el nombre que tenga)
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Variables de Firebase

Agrega **TODAS** estas variables (una por una):

| Variable | Valor |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyDhJldFdxpezX2MCANk67PBIWPbZacevEc` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `clikio-773fa.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `clikio-773fa` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `clikio-773fa.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `930158513107` |
| `VITE_FIREBASE_APP_ID` | `1:930158513107:web:685ebe622ced3398e8bd26` |
| `VITE_FIREBASE_DATABASE_URL` | `https://clikio-773fa-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-13J0SJPW40` |

**Para cada variable:**
1. Haz clic en **"Add New"** o **"Agregar Nueva"**
2. Escribe el **nombre** de la variable (ej: `VITE_FIREBASE_API_KEY`)
3. Escribe el **valor** de la variable
4. Marca las casillas:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development** (opcional)
5. Haz clic en **"Save"**

### Paso 3: Agregar Variable de Google Maps (Opcional)

Si usas Google Maps, agrega también:

| Variable | Valor |
|----------|-------|
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyDZjD0_YSivgYk2Kta4sFyV6ZFKM-RUYCM` |

---

## 🚀 Paso 4: Hacer Nuevo Deploy

Después de agregar todas las variables:

### Opción A: Redeploy Automático

1. Ve a **Deployments** en Vercel
2. Haz clic en los **tres puntos (...)** del último deployment
3. Selecciona **"Redeploy"**
4. Espera a que termine el deploy

### Opción B: Push a Git (si está conectado)

Si Vercel está conectado a GitHub, simplemente haz un nuevo commit:

```powershell
git commit --allow-empty -m "trigger: redeploy con variables de entorno"
git push origin main
```

---

## ✅ Paso 5: Verificar

Después del deploy:

1. Abre tu aplicación en producción
2. Abre la **consola del navegador** (F12)
3. Deberías ver: `✅ Todas las variables de entorno de Firebase están configuradas`
4. **NO** deberías ver: `auth/invalid-api-key`

---

## 🔍 Verificar Variables Configuradas

Para verificar que todas las variables están configuradas:

1. Ve a **Settings** → **Environment Variables** en Vercel
2. Deberías ver **8 variables** (7 de Firebase + 1 de Google Maps)
3. Todas deben tener ✅ en **Production**

---

## ⚠️ Notas Importantes

1. **Las variables deben empezar con `VITE_`** - Esto es necesario para que Vite las incluya en el build
2. **No incluyas espacios** antes o después del valor
3. **Copia y pega exactamente** los valores (sin comillas)
4. **Después de agregar variables, SIEMPRE haz un nuevo deploy**

---

## 🆘 Si Sigue Sin Funcionar

1. **Verifica que todas las variables estén en Vercel:**
   - Ve a Settings → Environment Variables
   - Cuenta cuántas variables hay (deberían ser 8)

2. **Verifica que el deploy sea reciente:**
   - Las variables solo se aplican en nuevos deploys
   - Si agregaste variables después del último deploy, haz un redeploy

3. **Revisa los logs del build:**
   - Ve a Deployments → selecciona el deployment → Build Logs
   - Busca errores relacionados con variables de entorno

4. **Verifica la consola del navegador:**
   - Abre F12 → Console
   - Busca mensajes que digan qué variables faltan

---

## 📞 Soporte

Si después de seguir estos pasos sigue sin funcionar:
1. Verifica que las credenciales de Firebase sean correctas
2. Verifica que el proyecto de Firebase esté activo
3. Revisa los logs de Vercel para más detalles

