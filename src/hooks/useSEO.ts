import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.clickio.com.ar';

interface SEOData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  structuredData?: object;
}

/**
 * Hook para manejar SEO dinámico (meta tags y structured data)
 */
export const useSEO = (data: SEOData) => {
  const location = useLocation();

  useEffect(() => {
    const currentUrl = data.url || `${SITE_URL}${location.pathname}`;
    const title = data.title ? `${data.title} | Clikio` : 'Clikio - Plataforma de subastas y tienda online';
    const description = data.description || 'Clikio - Plataforma de subastas y tienda online con productos de calidad';
    const image = data.image || `${SITE_URL}/favicon.svg`;
    const type = data.type || 'website';

    // Actualizar título
    document.title = title;

    // Función para actualizar o crear meta tag
    const updateMetaTag = (name: string, content: string, attribute: 'name' | 'property' = 'name') => {
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Meta tags básicos
    updateMetaTag('description', description);
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', currentUrl, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:site_name', 'Clikio', 'property');
    updateMetaTag('og:locale', 'es_AR', 'property');
    
    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // Structured Data (JSON-LD)
    if (data.structuredData) {
      // Remover structured data existente
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Agregar nuevo structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(data.structuredData);
      document.head.appendChild(script);
    }
  }, [data, location.pathname]);
};

/**
 * Genera structured data para un producto
 */
export const generateProductStructuredData = (product: {
  id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  stock: number;
  averageRating: number;
  ratings: Array<{ rating: number; comment: string; username: string }>;
}) => {
  const productUrl = `${SITE_URL}/producto/${product.id}`;
  const imageUrl = product.images[0]?.startsWith('http') 
    ? product.images[0] 
    : `${SITE_URL}${product.images[0]}`;

  const aggregateRating = product.ratings.length > 0 ? {
    '@type': 'AggregateRating',
    ratingValue: product.averageRating,
    reviewCount: product.ratings.length,
    bestRating: 5,
    worstRating: 1
  } : undefined;

  const reviews = product.ratings.map(rating => ({
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: rating.username
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating.rating,
      bestRating: 5,
      worstRating: 1
    },
    reviewBody: rating.comment
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map(img => 
      img.startsWith('http') ? img : `${SITE_URL}${img}`
    ),
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'Clikio'
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'ARS',
      price: product.price,
      availability: product.stock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Clikio'
      }
    },
    ...(aggregateRating && { aggregateRating }),
    ...(reviews.length > 0 && { review: reviews })
  };
};

/**
 * Genera structured data para una página de categoría
 */
export const generateCategoryStructuredData = (categoryName: string, categoryUrl: string, productCount: number) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: categoryName,
    url: categoryUrl,
    description: `Productos de ${categoryName} en Clikio`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: productCount,
      itemListElement: {
        '@type': 'ListItem',
        position: 1,
        name: categoryName
      }
    }
  };
};

