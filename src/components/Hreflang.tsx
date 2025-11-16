import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente Hreflang para SEO internacional
 * Agrega etiquetas hreflang al <head> del documento para indicar a los motores de búsqueda
 * las versiones alternativas de la página en diferentes idiomas/países.
 * 
 * Mejoras implementadas:
 * - Validación de URLs
 * - Self-referencing (la página actual incluye su propio hreflang)
 * - Manejo de errores robusto
 * - Soporte para query parameters y hash
 * 
 * Uso:
 * - Ya está agregado en App.tsx
 * - Configura los idiomas/países en el array languages
 */
interface LanguageConfig {
  code: string; // Código ISO 639-1 (es, en, pt, etc.)
  country?: string; // Código ISO 3166-1 (AR, US, BR, etc.)
  url: string; // URL completa de la versión en ese idioma (debe incluir https://)
  default?: boolean; // Si es el idioma por defecto
}

// Configuración de idiomas/países
// Actualiza esto cuando expandas a otros países
const languages: LanguageConfig[] = [
  {
    code: 'es',
    country: 'AR',
    url: 'https://www.clickio.com.ar',
    default: true, // Español argentino es el idioma por defecto
  },
  // Descomenta y configura cuando expandas a otros países:
  // {
  //   code: 'es',
  //   country: 'MX',
  //   url: 'https://www.clickio.com.mx',
  // },
  // {
  //   code: 'pt',
  //   country: 'BR',
  //   url: 'https://www.clickio.com.br',
  // },
  // {
  //   code: 'en',
  //   country: 'US',
  //   url: 'https://www.clickio.com',
  // },
];

/**
 * Valida que una URL sea válida y absoluta
 */
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Normaliza la URL asegurando que termine correctamente
 */
const normalizeUrl = (baseUrl: string, path: string): string => {
  // Remover trailing slash del baseUrl si existe
  const cleanBase = baseUrl.replace(/\/$/, '');
  // Asegurar que path comience con /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

const Hreflang = () => {
  const location = useLocation();

  useEffect(() => {
    // Obtener la URL actual sin el dominio (pathname + search, sin hash para SEO)
    const currentPath = location.pathname + location.search;
    
    // Crear o actualizar etiquetas hreflang
    const updateHreflangTags = () => {
      try {
        // Remover etiquetas hreflang existentes
        const existingTags = document.querySelectorAll('link[rel="alternate"][hreflang]');
        existingTags.forEach(tag => tag.remove());

        // Validar que hay idiomas configurados
        if (!languages || languages.length === 0) {
          console.warn('[Hreflang] No hay idiomas configurados');
          return;
        }

        // Obtener el idioma por defecto
        const defaultLang = languages.find(lang => lang.default) || languages[0];
        
        if (!defaultLang) {
          console.error('[Hreflang] No se encontró idioma por defecto');
          return;
        }

        // Validar URL del idioma por defecto
        if (!isValidUrl(defaultLang.url)) {
          console.error(`[Hreflang] URL inválida para idioma por defecto: ${defaultLang.url}`);
          return;
        }

        // Agregar etiqueta x-default (idioma por defecto)
        const defaultLink = document.createElement('link');
        defaultLink.rel = 'alternate';
        defaultLink.hreflang = 'x-default';
        defaultLink.href = normalizeUrl(defaultLang.url, currentPath);
        document.head.appendChild(defaultLink);

        // Agregar etiquetas para cada idioma
        languages.forEach((lang, index) => {
          // Validar URL
          if (!isValidUrl(lang.url)) {
            console.warn(`[Hreflang] URL inválida para idioma ${index}: ${lang.url}`);
            return;
          }

          // Generar código hreflang (es-AR, en-US, etc.)
          const hreflangCode = lang.country 
            ? `${lang.code}-${lang.country}` 
            : lang.code;
          
          // Crear y agregar etiqueta
          const link = document.createElement('link');
          link.rel = 'alternate';
          link.hreflang = hreflangCode;
          link.href = normalizeUrl(lang.url, currentPath);
          document.head.appendChild(link);
        });

        // Self-referencing: Agregar hreflang para la URL actual
        // Esto es importante para SEO - la página debe referenciarse a sí misma
        const currentHost = window.location.origin;
        const currentLang = languages.find(lang => {
          try {
            const langUrl = new URL(lang.url);
            return langUrl.origin === currentHost;
          } catch {
            return false;
          }
        });

        if (currentLang) {
          const selfHreflangCode = currentLang.country 
            ? `${currentLang.code}-${currentLang.country}` 
            : currentLang.code;
          
          // Verificar que no exista ya (para evitar duplicados)
          const existingSelf = document.querySelector(
            `link[rel="alternate"][hreflang="${selfHreflangCode}"][href="${normalizeUrl(currentHost, currentPath)}"]`
          );

          if (!existingSelf) {
            const selfLink = document.createElement('link');
            selfLink.rel = 'alternate';
            selfLink.hreflang = selfHreflangCode;
            selfLink.href = normalizeUrl(currentHost, currentPath);
            document.head.appendChild(selfLink);
          }
        }
      } catch (error) {
        console.error('[Hreflang] Error actualizando etiquetas hreflang:', error);
      }
    };

    // Pequeño delay para asegurar que el DOM esté listo
    const timeoutId = setTimeout(updateHreflangTags, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname, location.search]);

  // Este componente no renderiza nada en el DOM
  return null;
};

export default Hreflang;

