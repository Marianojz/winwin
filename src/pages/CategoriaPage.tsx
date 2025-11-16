import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import { useSEO } from '../hooks/useSEO';
import { useIsMobile } from '../hooks/useMediaQuery';

// Configuración de categorías
const categories: { [key: string]: { name: string; description: string; keywords: string[] } } = {
  '1': {
    name: 'Electrónica',
    description: 'Descubre los mejores productos electrónicos en Clikio. Smartphones, tablets, laptops, accesorios y más tecnología al mejor precio.',
    keywords: ['electrónica', 'smartphones', 'tablets', 'laptops', 'tecnología', 'gadgets', 'accesorios electrónicos']
  },
  '2': {
    name: 'Moda',
    description: 'Encuentra las últimas tendencias en moda. Ropa, calzado, accesorios y complementos para hombre, mujer y niños. Estilo y calidad garantizados.',
    keywords: ['moda', 'ropa', 'calzado', 'accesorios moda', 'tendencias', 'vestimenta', 'complementos']
  },
  '3': {
    name: 'Hogar',
    description: 'Todo para tu hogar. Muebles, decoración, electrodomésticos, menaje y artículos para hacer de tu casa un lugar único y acogedor.',
    keywords: ['hogar', 'muebles', 'decoración', 'electrodomésticos', 'menaje', 'artículos hogar', 'cocina']
  },
  '4': {
    name: 'Deportes',
    description: 'Equipamiento deportivo de calidad. Ropa deportiva, calzado, accesorios y equipos para todos los deportes. Mantente activo con Clikio.',
    keywords: ['deportes', 'equipamiento deportivo', 'ropa deportiva', 'calzado deportivo', 'fitness', 'gimnasio', 'running']
  },
  '5': {
    name: 'Juguetes',
    description: 'Juguetes educativos y de entretenimiento para todas las edades. Desde bebés hasta adolescentes. Diversión y aprendizaje garantizados.',
    keywords: ['juguetes', 'juegos', 'juguetes educativos', 'muñecas', 'peluches', 'juegos de mesa', 'juguetes bebé']
  },
  '6': {
    name: 'Libros',
    description: 'Amplia selección de libros. Novelas, cuentos, libros técnicos, educativos y más. Encuentra tu próxima lectura favorita en Clikio.',
    keywords: ['libros', 'novelas', 'cuentos', 'libros técnicos', 'lectura', 'literatura', 'libros educativos']
  },
  '7': {
    name: 'Belleza y Cuidado Personal',
    description: 'Productos de belleza y cuidado personal. Cosméticos, perfumes, productos para el cabello y la piel. Cuídate y luce radiante.',
    keywords: ['belleza', 'cosméticos', 'perfumes', 'cuidado personal', 'maquillaje', 'skincare', 'productos belleza']
  },
  '8': {
    name: 'Automotriz',
    description: 'Accesorios y repuestos para tu vehículo. Herramientas, accesorios de interior y exterior, repuestos y más para mantener tu auto en perfecto estado.',
    keywords: ['automotriz', 'accesorios auto', 'repuestos', 'herramientas auto', 'cuidado vehículo', 'accesorios coche']
  },
  '9': {
    name: 'Mascotas',
    description: 'Todo para tus mascotas. Alimento, juguetes, accesorios, productos de higiene y cuidado. El bienestar de tu mejor amigo es nuestra prioridad.',
    keywords: ['mascotas', 'alimento mascotas', 'juguetes mascotas', 'accesorios mascotas', 'cuidado mascotas', 'perros', 'gatos']
  },
  '10': {
    name: 'Jardín y Exterior',
    description: 'Productos para tu jardín y espacios exteriores. Herramientas de jardinería, plantas, muebles de exterior y decoración. Crea tu espacio verde ideal.',
    keywords: ['jardín', 'jardinería', 'herramientas jardín', 'plantas', 'muebles exterior', 'decoración exterior', 'espacios verdes']
  }
};

const CategoriaPage = () => {
  const { categoriaId } = useParams<{ categoriaId: string }>();
  const { products } = useStore();
  const isMobile = useIsMobile();

  const category = categoriaId ? categories[categoriaId] : null;
  const categoryName = category?.name || 'Categoría';
  
  // Filtrar productos de la categoría
  const categoryProducts = categoriaId 
    ? products.filter(p => p.categoryId === categoriaId && p.stock > 0)
    : [];

  // SEO
  useSEO({
    title: `Productos de ${categoryName} | Tienda Online Clikio`,
    description: category?.description || `Encuentra los mejores productos de ${categoryName} en Clikio. Calidad garantizada y envío rápido.`,
    url: `https://www.clickio.com.ar/categoria/${categoriaId}`,
    type: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: categoryName,
      description: category?.description,
      url: `https://www.clickio.com.ar/categoria/${categoriaId}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: categoryProducts.length,
        itemListElement: categoryProducts.slice(0, 10).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: product.name,
            url: `https://www.clickio.com.ar/producto/${product.id}`
          }
        }))
      }
    }
  });

  if (!category) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Categoría no encontrada</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>La categoría que buscas no existe.</p>
          <Link to="/tienda" className="btn btn-primary">Volver a la Tienda</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: isMobile ? '1.5rem 0' : '2rem 0' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        {/* Breadcrumbs */}
        <nav style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Inicio</Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--text-secondary)' }}>/</span>
          <Link to="/tienda" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tienda</Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--text-secondary)' }}>/</span>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{categoryName}</span>
        </nav>

        {/* Header de Categoría */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: isMobile ? '2rem' : '3rem', 
            fontWeight: 700, 
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {categoryName}
          </h1>
          <p style={{ 
            fontSize: isMobile ? '1rem' : '1.25rem', 
            color: 'var(--text-secondary)', 
            maxWidth: '800px', 
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            {category.description}
          </p>
        </div>

        {/* Información de resultados */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {categoryProducts.length} {categoryProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
          </p>
        </div>

        {/* Grid de productos */}
        {categoryProducts.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            {categoryProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            background: 'var(--bg-secondary)', 
            borderRadius: '1rem' 
          }}>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              No hay productos disponibles en esta categoría en este momento.
            </p>
            <Link to="/tienda" className="btn btn-primary">Ver todas las categorías</Link>
          </div>
        )}

        {/* Sección SEO: Contenido descriptivo */}
        <section style={{ 
          marginTop: '4rem', 
          padding: '2rem', 
          background: 'var(--bg-secondary)', 
          borderRadius: '1rem' 
        }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 700 }}>
            ¿Por qué comprar {categoryName.toLowerCase()} en Clikio?
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
            gap: '1.5rem' 
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                ✓ Calidad Garantizada
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Todos nuestros productos de {categoryName.toLowerCase()} pasan por un riguroso control de calidad antes de llegar a tus manos.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                ✓ Envío Rápido
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Recibe tus productos de {categoryName.toLowerCase()} en tiempo récord. Envíos a todo el país con seguimiento en tiempo real.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                ✓ Precios Competitivos
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Los mejores precios del mercado en {categoryName.toLowerCase()}. Compara y verás la diferencia.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                ✓ Atención al Cliente
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Nuestro equipo está disponible para ayudarte con cualquier consulta sobre productos de {categoryName.toLowerCase()}.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CategoriaPage;

