# 🚀 Guía de Deploy en Vercel - Versión con Seguridad

## ✅ Estado Actual

- ✅ Cambios de seguridad fusionados en `main`
- ✅ Repositorio actualizado en GitHub
- ⏳ Pendiente: Configurar variables de entorno en Vercel

---

## 📋 Paso 1: Configurar Variables de Entorno en Vercel

### 1.1. Ir a la Configuración del Proyecto

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**

### 1.2. Agregar Variables de Firebase

Agrega las siguientes variables (todas deben empezar con `VITE_`):

```
VITE_FIREBASE_API_KEY=AIzaSyDhJldFdxpezX2MCANk67PBIWPbZacevEc
VITE_FIREBASE_AUTH_DOMAIN=clikio-773fa.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=clikio-773fa
VITE_FIREBASE_STORAGE_BUCKET=clikio-773fa.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=930158513107
VITE_FIREBASE_APP_ID=1:930158513107:web:685ebe622ced3398e8bd26
VITE_FIREBASE_DATABASE_URL=https://clikio-773fa-default-rtdb.firebaseio.com
VITE_FIREBASE_MEASUREMENT_ID=G-13J0SJPW40
```

### 1.3. Agregar Variable de Google Maps

```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDZjD0_YSivgYk2Kta4sFyV6ZFKM-RUYCM
```

### 1.4. Configurar para Todos los Entornos

Para cada variable:
- ✅ Marca **Production**
- ✅ Marca **Preview**
- ✅ Marca **Development** (si aplica)

---

## 🚀 Paso 2: Hacer Deploy

### Opción A: Deploy Automático (Recomendado)

Si Vercel está conectado a tu repositorio de GitHub, el deploy se hará automáticamente cuando hagas push a `main`.

**Para forzar un nuevo deploy:**
1. Ve a tu proyecto en Vercel
2. Haz clic en **Deployments**
3. Haz clic en los tres puntos (...) del último deployment
4. Selecciona **Redeploy**

### Opción B: Deploy Manual con Vercel CLI

Si prefieres usar la CLI:

```powershell
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## ✅ Paso 3: Verificar el Deploy

Después del deploy, verifica:

1. **La aplicación carga correctamente**
2. **No hay errores en la consola del navegador**
3. **Firebase se conecta correctamente** (deberías ver el mensaje: "✅ Todas las variables de entorno de Firebase están configuradas")
4. **Google Maps funciona** (si usas el selector de direcciones)

---

## 🔍 Solución de Problemas

### Error: "Variables de entorno de Firebase faltantes"

**Solución:**
- Verifica que todas las variables estén en Vercel
- Asegúrate de que empiecen con `VITE_`
- Haz un nuevo deploy después de agregar las variables

### Error: "Invalid API Key" de Google Maps

**Solución:**
- Verifica que `VITE_GOOGLE_MAPS_API_KEY` esté configurada en Vercel
- Verifica que la API key tenga restricciones correctas en Google Cloud Console
- Agrega tu dominio de Vercel a las restricciones de la API key

### El deploy no se actualiza

**Solución:**
- Verifica que hayas hecho push a `main` en GitHub
- Espera unos minutos (Vercel puede tardar en detectar cambios)
- Haz un redeploy manual desde el dashboard

---

## 📝 Checklist de Deploy

- [ ] Variables de entorno configuradas en Vercel
- [ ] Todas las variables tienen `VITE_` al inicio
- [ ] Variables configuradas para Production, Preview y Development
- [ ] Deploy completado exitosamente
- [ ] Aplicación funciona correctamente
- [ ] Firebase conecta correctamente
- [ ] Google Maps funciona (si aplica)
- [ ] No hay errores en consola

---

## 🔒 Seguridad en Producción

✅ **Credenciales protegidas:** Todas las credenciales están en variables de entorno, no en el código  
✅ **Reglas de Firebase:** Desplegadas y funcionando  
✅ **Sin errores de permisos:** El código maneja correctamente los errores de permisos  

---

## 📞 Soporte

Si tienes problemas con el deploy:
1. Revisa los logs en Vercel (Deployments → selecciona el deployment → View Function Logs)
2. Verifica la consola del navegador para errores
3. Asegúrate de que todas las variables de entorno estén configuradas

---

**¡Listo para producción!** 🎉

