import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente Hreflang para SEO internacional
 * Agrega etiquetas hreflang al <head> del documento
 * 
 * Uso:
 * - Agrega <Hreflang /> en tu App.tsx o layout principal
 * - Configura los idiomas/países en el array languages
 */
interface LanguageConfig {
  code: string; // Código ISO 639-1 (es, en, pt, etc.)
  country?: string; // Código ISO 3166-1 (AR, US, BR, etc.)
  url: string; // URL completa de la versión en ese idioma
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

const Hreflang = () => {
  const location = useLocation();

  useEffect(() => {
    // Obtener la URL actual sin el dominio
    const currentPath = location.pathname + location.search;
    
    // Crear o actualizar etiquetas hreflang
    const updateHreflangTags = () => {
      // Remover etiquetas hreflang existentes
      const existingTags = document.querySelectorAll('link[rel="alternate"][hreflang]');
      existingTags.forEach(tag => tag.remove());

      // Agregar etiqueta x-default (idioma por defecto)
      const defaultLang = languages.find(lang => lang.default) || languages[0];
      const defaultLink = document.createElement('link');
      defaultLink.rel = 'alternate';
      defaultLink.hreflang = 'x-default';
      defaultLink.href = `${defaultLang.url}${currentPath}`;
      document.head.appendChild(defaultLink);

      // Agregar etiquetas para cada idioma
      languages.forEach(lang => {
        const hreflangCode = lang.country 
          ? `${lang.code}-${lang.country}` 
          : lang.code;
        
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflangCode;
        link.href = `${lang.url}${currentPath}`;
        document.head.appendChild(link);
      });
    };

    updateHreflangTags();
  }, [location.pathname, location.search]);

  // Este componente no renderiza nada en el DOM
  return null;
};

export default Hreflang;

