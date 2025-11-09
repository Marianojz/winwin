# 🔑 Guía Rápida: Configurar API Key de Google Maps

## ✅ Paso 1: API Key Configurada

Tu API key ya está configurada en el archivo `.env`:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDqrLcDMRPASXE7dJO7OsqaGa63VLLayJw
```

## ⚠️ Paso 2: Reiniciar el Servidor de Desarrollo

**IMPORTANTE:** Si tienes el servidor de desarrollo corriendo, debes reiniciarlo para que cargue la nueva variable de entorno.

1. Detén el servidor (Ctrl + C en la terminal)
2. Inicia el servidor nuevamente:
   ```bash
   npm run dev
   ```

## 🔍 Paso 3: Verificar que las APIs estén Habilitadas

Asegúrate de que en Google Cloud Console tengas habilitadas estas APIs:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Library**
4. Verifica que estén habilitadas:
   - ✅ **Maps JavaScript API**
   - ✅ **Places API**
   - ✅ **Geocoding API**

## 🔒 Paso 4: Configurar Restricciones de la API Key (Recomendado)

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en tu API key
3. En **Application restrictions**, selecciona **HTTP referrers**
4. Agrega tus dominios:
   ```
   localhost:5173/*
   localhost:3000/*
   tu-dominio.com/*
   *.tu-dominio.com/*
   ```
5. En **API restrictions**, selecciona **Restrict key** y elige solo:
   - Maps JavaScript API
   - Places API
   - Geocoding API
6. Guarda los cambios

## 🧪 Paso 5: Probar la Implementación

1. Reinicia el servidor de desarrollo
2. Navega a la página de registro: `/registro-mobile`
3. Deberías ver:
   - ✅ Campo de búsqueda de direcciones con autocompletado
   - ✅ Mapa interactivo con marcador arrastrable
   - ✅ Campos desglosados (calle, número, piso, etc.)

## 🐛 Solución de Problemas

### Error: "This API key is not authorized"
- Verifica que las 3 APIs estén habilitadas en Google Cloud Console
- Revisa las restricciones de la API key
- Asegúrate de que `localhost:5173` esté en la lista de referrers permitidos

### El mapa no se muestra
- Verifica que el servidor se haya reiniciado después de crear el `.env`
- Revisa la consola del navegador (F12) para ver errores
- Verifica que `GOOGLE_MAPS_API_KEY` tenga un valor en la consola:
  ```javascript
  console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  ```

### Autocompletado no funciona
- Verifica que Places API esté habilitada
- Revisa que la API key tenga permisos para Places API
- Verifica las restricciones de la API key

## 📝 Checklist de Verificación

- [x] API key agregada al archivo `.env`
- [ ] Servidor de desarrollo reiniciado
- [ ] Maps JavaScript API habilitada
- [ ] Places API habilitada
- [ ] Geocoding API habilitada
- [ ] Restricciones de API key configuradas (opcional pero recomendado)
- [ ] Componente probado en `/registro-mobile`

## 🎯 Próximos Pasos

Una vez que todo funcione correctamente:

1. **Probar en producción**: Configura la variable de entorno en tu plataforma de hosting (Vercel, Netlify, etc.)
2. **Monitorear uso**: Revisa el uso de la API en Google Cloud Console para evitar costos inesperados
3. **Configurar cuotas**: Establece límites diarios en Google Cloud Console para proteger tu cuenta

## 📚 Recursos

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [Places API Docs](https://developers.google.com/maps/documentation/places/web-service)
- [Geocoding API Docs](https://developers.google.com/maps/documentation/geocoding)
- [Google Cloud Console](https://console.cloud.google.com/)

