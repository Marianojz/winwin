# 🗺️ Guía: Sitemap.xml Dinámico en Vercel

## 📋 Resumen

Se ha implementado un sitemap.xml dinámico que se genera automáticamente desde Firebase, incluyendo:
- ✅ Rutas estáticas del sitio
- ✅ Subastas activas (dinámicas desde Firebase)
- ✅ Productos (dinámicos desde Firebase)
- ✅ Configuración SEO optimizada

---

## 🚀 Cómo Funciona

### 1. API Route Dinámico (`/api/sitemap.xml.ts`)

El sitemap se genera dinámicamente mediante un API route de Vercel que:
- Se conecta a Firebase Realtime Database
- Obtiene todas las subastas activas
- Obtiene todos los productos
- Genera el XML del sitemap en tiempo real

**URL del sitemap:** `https://www.clickio.com.ar/sitemap.xml`

### 2. Configuración en Vercel

El archivo `vercel.json` incluye un rewrite que redirige `/sitemap.xml` al API route:

```json
{
  "rewrites": [
    {
      "source": "/sitemap.xml",
      "destination": "/api/sitemap.xml"
    }
  ]
}
```

### 3. Robots.txt

Se ha creado `public/robots.txt` que apunta al sitemap:

```
Sitemap: https://www.clickio.com.ar/sitemap.xml
```

---

## 📁 Archivos Creados/Modificados

### Archivos Nuevos:
1. **`api/sitemap.xml.ts`** - API route que genera el sitemap dinámicamente
2. **`public/robots.txt`** - Archivo robots.txt que apunta al sitemap
3. **`scripts/generate-sitemap.ts`** - Script para generar sitemap estático (fallback)

### Archivos Modificados:
1. **`vercel.json`** - Agregado rewrite para `/sitemap.xml`

### Dependencias Agregadas:
- `@vercel/node` - Tipos para API routes de Vercel

---

## 🔧 Configuración

### Variables de Entorno (Opcional)

Puedes configurar variables de entorno en Vercel para personalizar la configuración:

1. Ve a **Vercel Dashboard** → Tu proyecto → **Settings** → **Environment Variables**
2. Agrega las siguientes variables (opcionales):
   - `FIREBASE_API_KEY` - API Key de Firebase
   - `FIREBASE_AUTH_DOMAIN` - Auth Domain de Firebase
   - `FIREBASE_PROJECT_ID` - Project ID de Firebase
   - `FIREBASE_STORAGE_BUCKET` - Storage Bucket de Firebase
   - `FIREBASE_MESSAGING_SENDER_ID` - Messaging Sender ID
   - `FIREBASE_APP_ID` - App ID de Firebase
   - `FIREBASE_DATABASE_URL` - URL de Realtime Database
   - `NEXT_PUBLIC_SITE_URL` - URL base del sitio (ej: `https://www.clickio.com.ar`)

**Nota:** Si no configuras estas variables, el código usará los valores por defecto del proyecto.

---

## ✅ Rutas Incluidas en el Sitemap

### Rutas Estáticas:
- `/` (Home) - Prioridad: 1.0, Frecuencia: daily
- `/subastas` - Prioridad: 0.9, Frecuencia: hourly
- `/tienda` - Prioridad: 0.9, Frecuencia: hourly
- `/login` - Prioridad: 0.5, Frecuencia: monthly
- `/registro` - Prioridad: 0.5, Frecuencia: monthly
- `/terminos` - Prioridad: 0.3, Frecuencia: yearly
- `/preguntas` - Prioridad: 0.4, Frecuencia: monthly
- `/ayuda` - Prioridad: 0.4, Frecuencia: monthly
- `/contacto` - Prioridad: 0.4, Frecuencia: monthly

### Rutas Dinámicas:
- `/subastas/:id` - Para cada subasta activa (Prioridad: 0.8, Frecuencia: hourly)
- `/producto/:id` - Para cada producto (Prioridad: 0.7, Frecuencia: weekly)

---

## 🧪 Verificar que Funciona

### 1. Verificar el Sitemap

Abre en tu navegador:
```
https://www.clickio.com.ar/sitemap.xml
```

Deberías ver un XML válido con todas las URLs del sitio.

### 2. Verificar Robots.txt

Abre en tu navegador:
```
https://www.clickio.com.ar/robots.txt
```

Deberías ver el contenido del robots.txt con la referencia al sitemap.

### 3. Verificar en Google Search Console

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Selecciona tu propiedad (clickio.com.ar)
3. Ve a **Sitemaps** en el menú lateral
4. Agrega: `sitemap.xml`
5. Haz clic en **Enviar**

Google comenzará a indexar tu sitio usando el sitemap.

---

## 🔄 Actualización Automática

El sitemap se actualiza automáticamente cada vez que se accede a `/sitemap.xml`:
- **Cache:** 1 hora (3600 segundos)
- **Stale-while-revalidate:** 24 horas

Esto significa que:
- El sitemap se regenera cada hora
- Si hay un error, se usa la versión en caché por hasta 24 horas
- Las subastas y productos nuevos aparecen automáticamente en el sitemap

---

## 🛠️ Mantenimiento

### Agregar Nuevas Rutas Estáticas

Edita `api/sitemap.xml.ts` y agrega la ruta en el array `staticRoutes`:

```typescript
const staticRoutes = [
  // ... rutas existentes
  { path: '/nueva-ruta', priority: '0.6', changefreq: 'weekly' },
];
```

### Cambiar Prioridades o Frecuencias

Modifica los valores en el array `staticRoutes`:
- **priority:** '0.0' a '1.0' (1.0 es la más importante)
- **changefreq:** 'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'

### Modificar Filtros de Subastas/Productos

Edita las funciones `getActiveAuctions()` y `getProducts()` en `api/sitemap.xml.ts` para cambiar qué elementos se incluyen.

---

## 🐛 Solución de Problemas

### Problema: El sitemap no se genera

**Solución:**
1. Verifica que el API route esté en `/api/sitemap.xml.ts`
2. Verifica que `vercel.json` tenga el rewrite correcto
3. Revisa los logs de Vercel para ver errores

### Problema: El sitemap no incluye subastas/productos

**Solución:**
1. Verifica que Firebase esté configurado correctamente
2. Verifica que las reglas de Firebase permitan lectura pública de `auctions` y `products`
3. Revisa la consola de Vercel para ver errores de conexión a Firebase

### Problema: Error 404 al acceder a /sitemap.xml

**Solución:**
1. Verifica que el rewrite esté en `vercel.json`
2. Asegúrate de que el archivo esté en `/api/sitemap.xml.ts` (no `.js`)
3. Verifica que Vercel haya detectado el API route (debería aparecer en el dashboard)

### Problema: El sitemap muestra URLs incorrectas

**Solución:**
1. Configura la variable de entorno `NEXT_PUBLIC_SITE_URL` en Vercel
2. O modifica `SITE_URL` en `api/sitemap.xml.ts`

---

## 📊 Beneficios SEO

✅ **Indexación más rápida:** Google puede encontrar todas tus páginas fácilmente
✅ **Contenido dinámico:** Las subastas y productos nuevos se indexan automáticamente
✅ **Priorización:** Las páginas importantes tienen mayor prioridad
✅ **Frecuencia de actualización:** Google sabe con qué frecuencia revisar cada página

---

## 🔒 Seguridad

- El sitemap solo incluye contenido público
- Las rutas privadas (`/admin`, `/perfil`, etc.) están excluidas en `robots.txt`
- El API route tiene manejo de errores y fallback a sitemap básico

---

## 📝 Notas Técnicas

- El sitemap se genera en tiempo real, no se pre-genera en build time
- Usa cache de Vercel para optimizar rendimiento
- Compatible con el estándar de sitemaps XML (protocolo 0.9)
- Máximo 50,000 URLs por sitemap (si superas esto, necesitarás sitemaps index)

---

**Última actualización:** $(date)
**Versión:** 1.0.0

