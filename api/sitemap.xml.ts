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
  { path: '/login', priority: '0.5', changefreq: 'monthly' },
  { path: '/registro', priority: '0.5', changefreq: 'monthly' },
  { path: '/terminos', priority: '0.3', changefreq: 'yearly' },
  { path: '/preguntas', priority: '0.4', changefreq: 'monthly' },
  { path: '/ayuda', priority: '0.4', changefreq: 'monthly' },
  { path: '/contacto', priority: '0.4', changefreq: 'monthly' },
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

// Función para generar el XML del sitemap
function generateSitemapXML(urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>): string {
  const urlsXML = urls.map(url => {
    const lastmod = url.lastmod || new Date().toISOString().split('T')[0];
    return `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${url.changefreq || 'weekly'}</changefreq>
    <priority>${url.priority || '0.5'}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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

