# 🔍 Guía: SEO, Robots.txt y Hreflang

## 📋 Resumen

Se ha implementado una configuración completa de SEO que incluye:
- ✅ **Robots.txt optimizado** con mejores prácticas
- ✅ **Sitemap dinámico** que incluye productos y subastas
- ✅ **Etiquetas Hreflang** para expansión internacional
- ✅ **Indexación optimizada** de páginas clave

---

## 🤖 Robots.txt

### Ubicación
`public/robots.txt`

### Características Implementadas

#### 1. **Permisos Granulares**
- ✅ Permite indexación de páginas públicas importantes
- ✅ Bloquea rutas privadas y administrativas
- ✅ Excluye archivos técnicos y APIs

#### 2. **Configuración por Bot**
- **Googlebot:** Configuración optimizada con crawl-delay
- **Googlebot-Image:** Permite indexación de imágenes
- **Bingbot:** Configuración específica para Bing
- **Bots maliciosos:** Bloqueados (AhrefsBot, SemrushBot, DotBot)

#### 3. **Rutas Permitidas**
```
Allow: /
Allow: /subastas
Allow: /tienda
Allow: /producto/
Allow: /subastas/
Allow: /terminos
Allow: /preguntas
Allow: /ayuda
Allow: /contacto
```

#### 4. **Rutas Bloqueadas**
```
Disallow: /admin
Disallow: /perfil
Disallow: /carrito
Disallow: /notificaciones
Disallow: /completar-perfil
Disallow: /login
Disallow: /registro
Disallow: /api/
```

### Verificar Robots.txt

Visita: `https://www.clickio.com.ar/robots.txt`

Deberías ver el contenido completo del archivo.

---

## 🗺️ Sitemap Dinámico

### Ubicación
`api/sitemap.xml.ts` (API route de Vercel)

### URL del Sitemap
`https://www.clickio.com.ar/sitemap.xml`

### Contenido Incluido

#### 1. **Rutas Estáticas**
- `/` (Home) - Prioridad: 1.0
- `/subastas` - Prioridad: 0.9
- `/tienda` - Prioridad: 0.9
- `/terminos`, `/preguntas`, `/ayuda`, `/contacto` - Prioridad: 0.3-0.4

#### 2. **Subastas Dinámicas**
- Todas las subastas activas desde Firebase
- Prioridad: 0.8
- Frecuencia de actualización: hourly
- Incluye `lastmod` (última modificación)

#### 3. **Productos Dinámicos**
- Todos los productos con stock disponible
- Prioridad: 0.7
- Frecuencia de actualización: weekly
- Incluye `lastmod` (última modificación)

### Mejoras Implementadas

✅ **Metadatos completos:** Incluye `lastmod` para cada URL
✅ **Filtrado inteligente:** Solo incluye contenido relevante (subastas activas, productos con stock)
✅ **Cache optimizado:** 1 hora de cache, 24 horas de stale-while-revalidate
✅ **Manejo de errores:** Fallback a sitemap básico si hay problemas

### Verificar Sitemap

1. **Visita el sitemap:**
   ```
   https://www.clickio.com.ar/sitemap.xml
   ```

2. **Valida el XML:**
   - Usa [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
   - Verifica que todas las URLs sean accesibles

3. **Envía a Google Search Console:**
   - Ve a [Google Search Console](https://search.google.com/search-console)
   - Selecciona tu propiedad
   - Ve a **Sitemaps**
   - Agrega: `sitemap.xml`
   - Haz clic en **Enviar**

---

## 🌍 Etiquetas Hreflang

### Componente
`src/components/Hreflang.tsx`

### Propósito
Las etiquetas hreflang indican a los motores de búsqueda qué versión de idioma/país mostrar a los usuarios según su ubicación e idioma preferido.

### Configuración Actual

Por defecto, está configurado solo para Argentina (es-AR):

```typescript
const languages: LanguageConfig[] = [
  {
    code: 'es',
    country: 'AR',
    url: 'https://www.clickio.com.ar',
    default: true,
  },
];
```

### Expandir a Otros Países

Cuando quieras expandir a otros países, edita `src/components/Hreflang.tsx`:

```typescript
const languages: LanguageConfig[] = [
  {
    code: 'es',
    country: 'AR',
    url: 'https://www.clickio.com.ar',
    default: true,
  },
  {
    code: 'es',
    country: 'MX',
    url: 'https://www.clickio.com.mx',
  },
  {
    code: 'pt',
    country: 'BR',
    url: 'https://www.clickio.com.br',
  },
  {
    code: 'en',
    country: 'US',
    url: 'https://www.clickio.com',
  },
];
```

### Cómo Funciona

1. **Se agrega automáticamente al `<head>`** de cada página
2. **Incluye etiqueta `x-default`** para el idioma por defecto
3. **Se actualiza dinámicamente** cuando cambias de página
4. **Mantiene la ruta actual** (pathname + query params)

### Ejemplo de HTML Generado

```html
<link rel="alternate" hreflang="x-default" href="https://www.clickio.com.ar/subastas" />
<link rel="alternate" hreflang="es-AR" href="https://www.clickio.com.ar/subastas" />
```

### Verificar Hreflang

1. **Inspecciona el HTML:**
   - Abre cualquier página en el navegador
   - Inspecciona el elemento (F12)
   - Busca en `<head>` las etiquetas `<link rel="alternate" hreflang="...">`

2. **Usa herramientas de validación:**
   - [Google Search Console](https://search.google.com/search-console) - Reporte de cobertura internacional
   - [Hreflang Tags Testing Tool](https://technicalseo.com/tools/hreflang/)

---

## 📊 Indexación de Páginas Clave

### Páginas Prioritarias para SEO

#### 1. **Página Principal** (`/`)
- **Prioridad:** 1.0 (máxima)
- **Frecuencia:** daily
- **Meta tags:** Configurados en `index.html`

#### 2. **Subastas** (`/subastas`)
- **Prioridad:** 0.9
- **Frecuencia:** hourly
- **Contenido dinámico:** Se actualiza constantemente

#### 3. **Tienda** (`/tienda`)
- **Prioridad:** 0.9
- **Frecuencia:** hourly
- **Contenido dinámico:** Productos con stock

#### 4. **Detalles de Subasta** (`/subastas/:id`)
- **Prioridad:** 0.8
- **Frecuencia:** hourly
- **Incluido en sitemap:** Automáticamente para subastas activas

#### 5. **Detalles de Producto** (`/producto/:id`)
- **Prioridad:** 0.7
- **Frecuencia:** weekly
- **Incluido en sitemap:** Automáticamente para productos con stock

### Mejoras de Indexación

✅ **Solo contenido relevante:** El sitemap filtra automáticamente:
- Subastas activas o programadas
- Productos con stock disponible
- Excluye contenido expirado o sin stock

✅ **Metadatos completos:** Cada URL incluye:
- `lastmod` (fecha de última modificación)
- `changefreq` (frecuencia de actualización)
- `priority` (prioridad relativa)

✅ **Actualización automática:** El sitemap se regenera cada hora con contenido actualizado

---

## 🔧 Configuración y Mantenimiento

### Actualizar Robots.txt

Edita `public/robots.txt` directamente. Los cambios se reflejarán en el próximo deploy.

### Actualizar Sitemap

El sitemap se actualiza automáticamente. Si necesitas cambiar prioridades o frecuencias:

1. Edita `api/sitemap.xml.ts`
2. Modifica el array `staticRoutes`
3. Ajusta las funciones `getActiveAuctions()` o `getProducts()` si necesitas cambiar filtros

### Agregar Nuevos Idiomas/Países

1. Edita `src/components/Hreflang.tsx`
2. Agrega la configuración del nuevo país en el array `languages`
3. Asegúrate de que el dominio esté configurado en Vercel
4. El componente agregará automáticamente las etiquetas hreflang

### Verificar Indexación

1. **Google Search Console:**
   - Ve a **Cobertura** para ver qué páginas están indexadas
   - Ve a **Mejoras** para ver problemas de indexación
   - Usa **Inspección de URLs** para verificar páginas específicas

2. **Bing Webmaster Tools:**
   - Similar a Google Search Console
   - Verifica indexación en Bing

3. **Herramientas de terceros:**
   - [Ahrefs Site Audit](https://ahrefs.com/site-audit)
   - [SEMrush Site Audit](https://www.semrush.com/site-audit/)

---

## ✅ Checklist de Verificación

### Robots.txt
- [ ] El archivo es accesible en `/robots.txt`
- [ ] Las rutas públicas están permitidas
- [ ] Las rutas privadas están bloqueadas
- [ ] El sitemap está referenciado

### Sitemap
- [ ] El sitemap es accesible en `/sitemap.xml`
- [ ] El XML es válido
- [ ] Incluye todas las rutas estáticas
- [ ] Incluye subastas activas
- [ ] Incluye productos con stock
- [ ] Está enviado a Google Search Console

### Hreflang
- [ ] Las etiquetas aparecen en el `<head>` de cada página
- [ ] Incluye etiqueta `x-default`
- [ ] Las URLs son correctas
- [ ] Se actualiza al cambiar de página

### Indexación
- [ ] Las páginas principales están indexadas
- [ ] Los productos aparecen en búsquedas
- [ ] Las subastas aparecen en búsquedas
- [ ] No hay errores en Google Search Console

---

## 🐛 Solución de Problemas

### Problema: Robots.txt no se actualiza

**Solución:**
- Verifica que el archivo esté en `public/robots.txt`
- Asegúrate de hacer deploy en Vercel
- Limpia la caché del navegador

### Problema: Sitemap no incluye productos/subastas

**Solución:**
1. Verifica que Firebase esté configurado correctamente
2. Verifica que las reglas de Firebase permitan lectura pública
3. Revisa los logs de Vercel para ver errores
4. Verifica que los productos tengan `stock > 0`
5. Verifica que las subastas estén activas

### Problema: Hreflang no aparece en el HTML

**Solución:**
1. Verifica que `<Hreflang />` esté en `App.tsx`
2. Verifica que el componente esté dentro del `<Router>`
3. Inspecciona el HTML en el navegador (no en el código fuente)
4. Verifica que no haya errores en la consola

### Problema: Páginas no se indexan

**Solución:**
1. Verifica que estén en el sitemap
2. Verifica que robots.txt las permita
3. Usa Google Search Console para solicitar indexación
4. Verifica que las páginas sean accesibles públicamente
5. Asegúrate de que tengan contenido único y relevante

---

## 📝 Notas Técnicas

### Robots.txt
- Debe estar en la raíz del dominio (`/robots.txt`)
- Se sirve como archivo estático desde `public/robots.txt`
- Los cambios requieren redeploy

### Sitemap
- Se genera dinámicamente en cada request
- Tiene cache de 1 hora
- Máximo 50,000 URLs (si superas esto, necesitas sitemap index)

### Hreflang
- Se agrega dinámicamente al DOM
- No afecta el rendimiento (solo agrega etiquetas `<link>`)
- Compatible con React Router

---

## 🚀 Próximos Pasos Recomendados

1. **Monitorear indexación:**
   - Revisa Google Search Console semanalmente
   - Verifica qué páginas se indexan
   - Identifica problemas de indexación

2. **Optimizar contenido:**
   - Asegúrate de que cada página tenga contenido único
   - Agrega meta descriptions relevantes
   - Optimiza títulos y headings

3. **Expandir internacionalmente:**
   - Cuando expandas a otros países, actualiza hreflang
   - Crea sitemaps separados por país si es necesario
   - Configura dominios en Vercel

4. **Monitorear rendimiento SEO:**
   - Usa Google Search Console para ver impresiones y clics
   - Analiza qué páginas tienen mejor rendimiento
   - Optimiza las páginas con bajo rendimiento

---

**Última actualización:** $(date)
**Versión:** 1.0.0

