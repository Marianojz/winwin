import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

// Configuración de Firebase (usa variables de entorno si están disponibles)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDhJldFdxpezX2MCANk67PBIWPbZacevEc",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "clikio-773fa.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "clikio-773fa",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "clikio-773fa.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "930158513107",
  appId: process.env.FIREBASE_APP_ID || "1:930158513107:web:685ebe622ced3398e8bd26",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://clikio-773fa-default-rtdb.firebaseio.com",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// URL base del sitio (usa variable de entorno o dominio por defecto)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 
                 (process.env.VERCEL_URL 
                   ? `https://${process.env.VERCEL_URL}` 
                   : 'https://www.clickio.com.ar');

// Rutas estáticas del sitio
const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/subastas', priority: '0.9', changefreq: 'hourly' },
  { path: '/tienda', priority: '0.9', changefreq: 'hourly' },
  { path: '/como-funciona', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/login', priority: '0.5', changefreq: 'monthly' },
  { path: '/registro', priority: '0.5', changefreq: 'monthly' },
  { path: '/terminos', priority: '0.3', changefreq: 'yearly' },
  { path: '/preguntas', priority: '0.4', changefreq: 'monthly' },
  { path: '/ayuda', priority: '0.4', changefreq: 'monthly' },
  { path: '/contacto', priority: '0.4', changefreq: 'monthly' },
];

// Categorías de productos para indexación (páginas dedicadas)
const categoryPages = [
  { id: '1', name: 'Electrónica', path: '/categoria/1' },
  { id: '2', name: 'Moda', path: '/categoria/2' },
  { id: '3', name: 'Hogar', path: '/categoria/3' },
  { id: '4', name: 'Deportes', path: '/categoria/4' },
  { id: '5', name: 'Juguetes', path: '/categoria/5' },
  { id: '6', name: 'Libros', path: '/categoria/6' },
  { id: '7', name: 'Belleza y Cuidado Personal', path: '/categoria/7' },
  { id: '8', name: 'Automotriz', path: '/categoria/8' },
  { id: '9', name: 'Mascotas', path: '/categoria/9' },
  { id: '10', name: 'Jardín y Exterior', path: '/categoria/10' },
];

// Categorías con query parameters (para compatibilidad)
const categories = [
  { id: '1', name: 'Electrónica', path: '/tienda?categoria=1' },
  { id: '2', name: 'Moda', path: '/tienda?categoria=2' },
  { id: '3', name: 'Hogar', path: '/tienda?categoria=3' },
  { id: '4', name: 'Deportes', path: '/tienda?categoria=4' },
  { id: '5', name: 'Juguetes', path: '/tienda?categoria=5' },
  { id: '6', name: 'Libros', path: '/tienda?categoria=6' },
];

// Artículos del blog
const blogArticles = [
  { slug: 'que-regalar-navidad-guia-regaleria-argentina', path: '/blog/que-regalar-navidad-guia-regaleria-argentina' },
  { slug: 'guia-comprar-online-seguro-argentina', path: '/blog/guia-comprar-online-seguro-argentina' },
  { slug: 'mejor-precio-electronica', path: '/blog/mejor-precio-electronica' },
  { slug: '10-consejos-vender-rapido-online', path: '/blog/10-consejos-vender-rapido-online' },
  { slug: 'preguntas-frecuentes-compras-online', path: '/blog/preguntas-frecuentes-compras-online' },
  { slug: 'historia-exito-vendedor-destacado', path: '/blog/historia-exito-vendedor-destacado' },
];

// Función para obtener subastas activas desde Firebase con metadatos
async function getActiveAuctions(): Promise<Array<{ id: string; lastmod?: string }>> {
  try {
    const auctionsRef = ref(db, 'auctions');
    const snapshot = await get(auctionsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const data = snapshot.val();
    const auctions: Array<{ id: string; lastmod?: string }> = [];
    const now = Date.now();
    
    // Filtrar solo subastas activas o programadas
    Object.keys(data).forEach((key) => {
      const auction = data[key];
      const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
      const status = auction.status || 'active';
      
      // Incluir subastas activas, programadas o que terminen en el futuro
      if (
        (status === 'active' || status === 'scheduled') &&
        endTime > now
      ) {
        // Obtener fecha de última modificación
        const lastmod = auction.updatedAt || auction.createdAt || auction.endTime;
        auctions.push({
          id: key,
          lastmod: lastmod ? new Date(lastmod).toISOString().split('T')[0] : undefined
        });
      }
    });
    
    return auctions;
  } catch (error) {
    console.error('Error obteniendo subastas:', error);
    return [];
  }
}

// Función para obtener productos desde Firebase con metadatos
async function getProducts(): Promise<Array<{ id: string; lastmod?: string }>> {
  try {
    const productsRef = ref(db, 'products');
    const snapshot = await get(productsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const data = snapshot.val();
    const products: Array<{ id: string; lastmod?: string }> = [];
    
    Object.keys(data).forEach((key) => {
      const product = data[key];
      // Solo incluir productos con stock disponible
      if (product.stock > 0) {
        const lastmod = product.updatedAt || product.createdAt;
        products.push({
          id: key,
          lastmod: lastmod ? new Date(lastmod).toISOString().split('T')[0] : undefined
        });
      }
    });
    
    return products;
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    return [];
  }
}

// Configuración de idiomas para hreflang (debe coincidir con Hreflang.tsx)
const hreflangLanguages = [
  {
    code: 'es',
    country: 'AR',
    url: 'https://www.clickio.com.ar',
    default: true,
  },
  // Agregar más idiomas cuando se expanda a otros países
];

// Función para generar etiquetas hreflang en el sitemap
function generateHreflangTags(loc: string): string {
  if (hreflangLanguages.length <= 1) {
    return ''; // No hay necesidad de hreflang si solo hay un idioma
  }

  const tags: string[] = [];
  const urlPath = new URL(loc).pathname + new URL(loc).search;

  // Agregar x-default
  const defaultLang = hreflangLanguages.find(lang => lang.default) || hreflangLanguages[0];
  if (defaultLang) {
    tags.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultLang.url}${urlPath}" />`);
  }

  // Agregar cada idioma
  hreflangLanguages.forEach(lang => {
    const hreflangCode = lang.country 
      ? `${lang.code}-${lang.country}` 
      : lang.code;
    tags.push(`    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${lang.url}${urlPath}" />`);
  });

  return tags.join('\n');
}

// Función para generar el XML del sitemap
function generateSitemapXML(urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>): string {
  const urlsXML = urls.map(url => {
    const lastmod = url.lastmod || new Date().toISOString().split('T')[0];
    const hreflangTags = generateHreflangTags(url.loc);
    
    let urlBlock = `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${url.changefreq || 'weekly'}</changefreq>
    <priority>${url.priority || '0.5'}</priority>`;
    
    if (hreflangTags) {
      urlBlock += `\n${hreflangTags}`;
    }
    
    urlBlock += `\n  </url>`;
    return urlBlock;
  }).join('\n');

  // Agregar namespace xhtml para hreflang si hay múltiples idiomas
  const xmlns = hreflangLanguages.length > 1 
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${xmlns}>
${urlsXML}
</urlset>`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Configurar headers para XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    // Obtener datos dinámicos
    const [auctionIds, productIds] = await Promise.all([
      getActiveAuctions(),
      getProducts(),
    ]);

    // Construir lista de URLs
    const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];

    // Agregar rutas estáticas
    staticRoutes.forEach(route => {
      urls.push({
        loc: `${SITE_URL}${route.path}`,
        changefreq: route.changefreq,
        priority: route.priority,
      });
    });

    // Agregar subastas dinámicas con metadatos
    auctionIds.forEach(auction => {
      urls.push({
        loc: `${SITE_URL}/subastas/${auction.id}`,
        lastmod: auction.lastmod,
        changefreq: 'hourly',
        priority: '0.8',
      });
    });

    // Agregar productos dinámicos con metadatos
    productIds.forEach(product => {
      urls.push({
        loc: `${SITE_URL}/producto/${product.id}`,
        lastmod: product.lastmod,
        changefreq: 'weekly',
        priority: '0.7',
      });
    });

    // Agregar páginas de categorías dedicadas
    categoryPages.forEach(category => {
      urls.push({
        loc: `${SITE_URL}${category.path}`,
        changefreq: 'daily',
        priority: '0.8',
      });
    });

    // Agregar categorías con query parameters (para compatibilidad)
    categories.forEach(category => {
      urls.push({
        loc: `${SITE_URL}${category.path}`,
        changefreq: 'daily',
        priority: '0.75',
      });
    });

    // Agregar artículos del blog
    blogArticles.forEach(article => {
      urls.push({
        loc: `${SITE_URL}${article.path}`,
        changefreq: 'weekly',
        priority: '0.7',
      });
    });

    // Generar XML
    const sitemapXML = generateSitemapXML(urls);

    // Enviar respuesta
    res.status(200).send(sitemapXML);
  } catch (error) {
    console.error('Error generando sitemap:', error);
    
    // En caso de error, devolver sitemap básico con solo rutas estáticas
    const fallbackUrls = staticRoutes.map(route => ({
      loc: `${SITE_URL}${route.path}`,
      changefreq: route.changefreq,
      priority: route.priority,
    }));
    
    const fallbackXML = generateSitemapXML(fallbackUrls);
    res.status(200).send(fallbackXML);
  }
}

