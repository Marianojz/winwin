# ✅ Checklist de Optimización de Rendimiento - Clikio

Este documento contiene la lista de verificación completa para optimizar Core Web Vitals y lograr un score Lighthouse > 90.

---

## 📊 Core Web Vitals

### ✅ 1. LCP (Largest Contentful Paint) < 2.5s en móvil

**Estado:** ⚠️ **Requiere verificación y optimización continua**

**Implementaciones:**
- ✅ Componente `OptimizedImage` creado (`src/components/OptimizedImage.tsx`)
- ✅ Preload de fuentes críticas en `index.html`
- ✅ CSS crítico inline en `<head>`
- ✅ Preconnect a Google Fonts
- ✅ Lazy loading de componentes no críticos

**Acciones necesarias:**
- [ ] Identificar el elemento LCP (usualmente hero image o heading)
- [ ] Preload el recurso LCP si es una imagen externa
- [ ] Optimizar la imagen LCP:
  - [ ] Convertir a WebP/AVIF
  - [ ] Redimensionar a tamaño apropiado
  - [ ] Usar `OptimizedImage` con `priority={true}`
- [ ] Minimizar render-blocking resources:
  - [ ] Defer JavaScript no crítico
  - [ ] Inline CSS crítico (✅ ya implementado)
- [ ] Optimizar servidor/CDN:
  - [ ] Usar CDN cercano al usuario
  - [ ] Habilitar HTTP/2 o HTTP/3
  - [ ] Comprimir respuestas (gzip/brotli)

**Herramientas de verificación:**
- [PageSpeed Insights](https://pagespeed.web.dev/)
- Chrome DevTools Performance tab
- WebPageTest.org

**Meta tag para preload de imagen LCP:**
```html
<link rel="preload" as="image" href="/path/to/hero-image.webp" />
```

---

### ✅ 2. FID (First Input Delay) < 100ms

**Nota:** FID ha sido reemplazado por INP (Interaction to Next Paint) en 2024, pero el objetivo sigue siendo < 100ms.

**Estado:** ⚠️ **Requiere verificación**

**Implementaciones:**
- ✅ Code splitting configurado en `vite.config.ts`
- ✅ Lazy loading de componentes pesados
- ✅ JavaScript minificado y optimizado
- ✅ Eliminación de `console.log` en producción

**Acciones necesarias:**
- [ ] Reducir JavaScript bloqueante:
  - [ ] Defer scripts no críticos
  - [ ] Usar `async` o `defer` en scripts externos
  - [ ] Dividir código en chunks más pequeños (✅ ya configurado)
- [ ] Optimizar event listeners:
  - [ ] Usar event delegation cuando sea posible
  - [ ] Debounce/throttle en eventos frecuentes
  - [ ] Remover listeners no utilizados
- [ ] Minimizar trabajo en el hilo principal:
  - [ ] Usar Web Workers para tareas pesadas
  - [ ] Usar `requestIdleCallback` para tareas no críticas
- [ ] Optimizar React:
  - [ ] Usar `React.memo` para componentes que no cambian frecuentemente
  - [ ] Usar `useMemo` y `useCallback` apropiadamente
  - [ ] Evitar re-renders innecesarios

**Verificación:**
- [ ] Medir FID/INP en Chrome DevTools
- [ ] Verificar en PageSpeed Insights
- [ ] Probar en dispositivos móviles reales (no solo emuladores)

---

### ✅ 3. CLS (Cumulative Layout Shift) < 0.1

**Estado:** ✅ **Implementado**

**Implementaciones:**
- ✅ Componente `OptimizedImage` con dimensiones explícitas
- ✅ Aspect ratio containers para prevenir layout shift
- ✅ CSS crítico inline para evitar FOUC
- ✅ Dimensiones explícitas en imágenes (`width` y `height`)

**Acciones necesarias:**
- [ ] Asegurar que todas las imágenes tengan `width` y `height`:
  - [ ] Reemplazar `<img>` por `<OptimizedImage>` en componentes críticos
  - [ ] Agregar dimensiones explícitas a todas las imágenes
- [ ] Evitar contenido dinámico que cause shift:
  - [ ] Reservar espacio para anuncios/banners
  - [ ] Usar skeletons/placeholders con dimensiones correctas
  - [ ] Evitar insertar contenido después de que la página carga
- [ ] Optimizar fuentes:
  - [ ] Usar `font-display: swap` (✅ ya implementado)
  - [ ] Preload fuentes críticas (✅ ya implementado)
- [ ] Verificar en Chrome DevTools:
  - [ ] Abrir Performance tab
  - [ ] Grabar carga de página
  - [ ] Revisar "Layout Shift" events

**Componentes a actualizar:**
- [ ] `ProductCard` - usar `OptimizedImage`
- [ ] `AuctionCard` - usar `OptimizedImage`
- [ ] `Blog` - usar `OptimizedImage` para imágenes de artículos
- [ ] `Home` - usar `OptimizedImage` para hero images

---

## 🖼️ Optimización de Imágenes

### ✅ 4. Todas las imágenes usando OptimizedImage (similar a Next/Image)

**Estado:** ⚠️ **Componente creado, requiere migración**

**Implementaciones:**
- ✅ Componente `OptimizedImage` creado con:
  - Lazy loading automático
  - Soporte para WebP/AVIF
  - Dimensiones explícitas para prevenir CLS
  - Placeholder blur opcional
  - Responsive images

**Acciones necesarias:**
- [ ] Migrar componentes a usar `OptimizedImage`:
  - [ ] `ProductCard.tsx`
  - [ ] `AuctionCard.tsx`
  - [ ] `Blog.tsx` y `BlogArticle.tsx`
  - [ ] `Home.tsx` (hero images)
  - [ ] `CategoriaPage.tsx`
- [ ] Agregar dimensiones explícitas a todas las imágenes
- [ ] Usar `priority={true}` para imágenes above-the-fold

**Ejemplo de uso:**
```tsx
import OptimizedImage from '../components/OptimizedImage';

<OptimizedImage
  src="/hero-image.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority={true}
  quality={85}
/>
```

---

### ✅ 5. Imágenes en formato WebP/AVIF

**Estado:** ⚠️ **Soporte implementado, requiere conversión de assets**

**Implementaciones:**
- ✅ Función `compressImageToWebP` en `src/utils/imageCompression.ts`
- ✅ Componente `OptimizedImage` con detección de soporte WebP/AVIF
- ✅ Compresión automática en uploads (avatares, productos)

**Acciones necesarias:**
- [ ] Convertir imágenes estáticas a WebP:
  - [ ] Usar herramienta como `sharp` o `imagemin`
  - [ ] Crear versión WebP de cada imagen
  - [ ] Actualizar referencias en código
- [ ] Implementar fallback automático:
  - [ ] Detectar soporte del navegador
  - [ ] Servir WebP si está disponible, sino JPG/PNG
- [ ] Para imágenes dinámicas (Firebase Storage):
  - [ ] Convertir al subir (✅ ya implementado para avatares)
  - [ ] Extender a productos y subastas
- [ ] Considerar AVIF para mejor compresión:
  - [ ] AVIF ofrece ~50% mejor compresión que WebP
  - [ ] Soporte creciente en navegadores modernos

**Herramientas:**
- `sharp` (Node.js)
- `imagemin` con plugins
- Online: Squoosh.app, CloudConvert

---

## 🔤 Optimización de Fuentes

### ✅ 6. Fonts optimizados (Google Fonts con display: swap)

**Estado:** ✅ **Implementado**

**Implementaciones:**
- ✅ `font-display: swap` en Google Fonts (ya incluido en URL)
- ✅ Preload de fuentes críticas en `index.html`
- ✅ Preconnect a `fonts.googleapis.com` y `fonts.gstatic.com`

**Verificación:**
- [ ] Verificar en Chrome DevTools Network tab que las fuentes se cargan correctamente
- [ ] Verificar que no hay FOIT (Flash of Invisible Text)
- [ ] Verificar que `font-display: swap` está activo

**Optimizaciones adicionales:**
- [ ] Considerar self-hosting de fuentes para mejor control
- [ ] Subset de fuentes (solo caracteres necesarios)
- [ ] Preload de variantes más usadas (400, 600, 700)

---

## 📦 Optimización de JavaScript

### ✅ 7. JavaScript bundle < 200KB

**Estado:** ⚠️ **Requiere verificación después de build**

**Implementaciones:**
- ✅ Code splitting configurado en `vite.config.ts`
- ✅ Manual chunks para vendors separados
- ✅ Lazy loading de componentes no críticos
- ✅ Minificación con Terser
- ✅ Eliminación de `console.log` en producción

**Acciones necesarias:**
- [ ] Verificar tamaño de bundles después de build:
  ```bash
  npm run build
  # Revisar dist/assets/js/ para ver tamaños
  ```
- [ ] Analizar bundle:
  - [ ] Usar `vite-bundle-visualizer` o `rollup-plugin-visualizer`
  - [ ] Identificar dependencias grandes
  - [ ] Considerar alternativas más ligeras
- [ ] Optimizar dependencias:
  - [ ] Revisar si todas las dependencias son necesarias
  - [ ] Usar tree-shaking efectivo
  - [ ] Considerar reemplazar librerías pesadas
- [ ] Code splitting adicional:
  - [ ] Separar rutas en chunks independientes
  - [ ] Lazy load componentes pesados (mapas, editores, etc.)

**Configuración actual en `vite.config.ts`:**
- React vendor: ~150KB
- Firebase vendor: ~200KB
- UI vendor (lucide-react): ~50KB
- Map vendor (leaflet): ~150KB

**Objetivo:** Cada chunk < 200KB, total inicial < 200KB

---

## 🎨 Optimización de CSS

### ✅ 8. CSS crítico inline, resto diferido

**Estado:** ✅ **Implementado**

**Implementaciones:**
- ✅ CSS crítico inline en `index.html` (minificado)
- ✅ CSS completo en `src/index.css` (cargado normalmente)
- ✅ CSS por componente (code splitting)

**Acciones necesarias:**
- [ ] Verificar que CSS crítico cubre above-the-fold:
  - [ ] Navbar
  - [ ] Hero section
  - [ ] Botones principales
  - [ ] Tipografía básica
- [ ] Optimizar CSS crítico:
  - [ ] Remover estilos no usados
  - [ ] Minificar más agresivamente
  - [ ] Mantener solo lo esencial
- [ ] Defer CSS no crítico:
  - [ ] Usar `media="print"` y cambiar a `all` con JavaScript
  - [ ] O usar `preload` con `onload`

**CSS crítico actual incluye:**
- Variables CSS básicas
- Reset básico
- Estilos de body y #root
- Navbar básico
- Botones básicos
- Responsive básico

---

## 💾 Cache Headers

### ✅ 9. Caché headers configurados

**Estado:** ✅ **Implementado en vercel.json**

**Implementaciones:**
- ✅ `vercel.json` creado con headers de cache
- ✅ Assets estáticos: 1 año (immutable)
- ✅ HTML: 1 hora (must-revalidate)
- ✅ API: 5 minutos (s-maxage 10 minutos)
- ✅ Sitemap/robots.txt: cache apropiado

**Headers configurados:**
- **Assets (JS/CSS/images):** `Cache-Control: public, max-age=31536000, immutable`
- **HTML:** `Cache-Control: public, max-age=3600, must-revalidate`
- **API:** `Cache-Control: public, max-age=300, s-maxage=600`
- **Sitemap:** `Cache-Control: public, max-age=3600, s-maxage=7200`

**Verificación:**
- [ ] Desplegar en Vercel y verificar headers:
  ```bash
  curl -I https://www.clickio.com.ar/assets/js/main-*.js
  ```
- [ ] Verificar que `immutable` está presente en assets
- [ ] Verificar que HTML tiene `must-revalidate`

**Nota:** Si no usas Vercel, configura headers en tu servidor/CDN:
- **Netlify:** `_headers` file
- **Apache:** `.htaccess`
- **Nginx:** configuración del servidor

---

## 🎯 Score Lighthouse

### ✅ 10. Score Lighthouse móvil > 90

**Estado:** ⚠️ **Requiere verificación después de todas las optimizaciones**

**Métricas objetivo:**
- **Performance:** > 90
- **Accessibility:** > 90
- **Best Practices:** > 90
- **SEO:** > 90

**Acciones necesarias:**
- [ ] Ejecutar Lighthouse en modo móvil:
  - [ ] Chrome DevTools → Lighthouse tab
  - [ ] Seleccionar "Mobile"
  - [ ] Ejecutar auditoría
- [ ] Revisar oportunidades:
  - [ ] Eliminar recursos no utilizados
  - [ ] Reducir tiempo de ejecución de JavaScript
  - [ ] Minimizar trabajo del hilo principal
  - [ ] Reducir impacto de terceros
- [ ] Optimizar según recomendaciones:
  - [ ] Implementar todas las optimizaciones anteriores
  - [ ] Revisar y corregir warnings
  - [ ] Optimizar recursos de terceros (Google Fonts, Leaflet, etc.)

**Checklist rápido:**
- [ ] LCP < 2.5s
- [ ] FID/INP < 100ms
- [ ] CLS < 0.1
- [ ] TTI (Time to Interactive) < 3.8s
- [ ] TBT (Total Blocking Time) < 200ms
- [ ] Speed Index < 3.4s

---

## 📋 Resumen de Estado

| Item | Estado | Prioridad |
|------|--------|-----------|
| LCP < 2.5s | ⚠️ Requiere verificación | Alta |
| FID/INP < 100ms | ⚠️ Requiere verificación | Alta |
| CLS < 0.1 | ✅ Implementado | - |
| OptimizedImage | ⚠️ Requiere migración | Media |
| WebP/AVIF | ⚠️ Requiere conversión | Media |
| Fonts optimizados | ✅ Implementado | - |
| Bundle < 200KB | ⚠️ Requiere verificación | Alta |
| CSS crítico | ✅ Implementado | - |
| Cache headers | ✅ Implementado | - |
| Lighthouse > 90 | ⚠️ Requiere verificación | Alta |

---

## 🚀 Próximos Pasos Recomendados

### Inmediato (Esta semana):
1. **Migrar imágenes a OptimizedImage**
   - Empezar con componentes más visibles (Home, ProductCard)
   - Agregar dimensiones explícitas

2. **Verificar bundle size**
   - Ejecutar build y analizar tamaños
   - Optimizar dependencias grandes

3. **Ejecutar Lighthouse**
   - Identificar problemas principales
   - Priorizar optimizaciones

### Corto plazo (Próximas 2 semanas):
4. **Convertir imágenes a WebP**
   - Usar herramienta de conversión
   - Actualizar referencias

5. **Optimizar LCP**
   - Identificar elemento LCP
   - Preload y optimizar

6. **Monitoreo continuo**
   - Configurar alertas en PageSpeed Insights
   - Revisar métricas semanalmente

---

## 🔍 Herramientas de Verificación

1. **PageSpeed Insights** - https://pagespeed.web.dev/
2. **Chrome DevTools** - Performance y Lighthouse tabs
3. **WebPageTest** - https://www.webpagetest.org/
4. **Bundle Analyzer** - `vite-bundle-visualizer`
5. **Chrome User Experience Report** - Datos reales de usuarios

---

**Última actualización:** 2025-01-16
**Mantenido por:** Equipo de Desarrollo Clikio

