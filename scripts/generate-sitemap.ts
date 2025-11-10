import { writeFileSync } from 'fs';
import { join } from 'path';

// URL base del sitio
const SITE_URL = 'https://www.clickio.com.ar';

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

// Generar sitemap estático
function generateStaticSitemap() {
  const urls = staticRoutes.map(route => ({
    loc: `${SITE_URL}${route.path}`,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  const sitemapXML = generateSitemapXML(urls);
  
  // Escribir en la carpeta public para que se copie a dist
  const publicPath = join(process.cwd(), 'public', 'sitemap.xml');
  writeFileSync(publicPath, sitemapXML, 'utf-8');
  
  console.log('✅ Sitemap estático generado en public/sitemap.xml');
  console.log(`   Incluye ${urls.length} rutas estáticas`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateStaticSitemap();
}

export { generateStaticSitemap };

