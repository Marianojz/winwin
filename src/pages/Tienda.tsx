import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import { trackSearch } from '../utils/tracking';
import { useSEO, generateProductListStructuredData } from '../hooks/useSEO';

const Tienda = () => {
  const { products, user } = useStore();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const searchTimeoutRef = useRef<number | null>(null);
  const lastSearchedRef = useRef<string>('');

  // Leer parámetro de categoría de la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoriaParam = params.get('categoria');
    if (categoriaParam && ['1', '2', '3', '4', '5', '6'].includes(categoriaParam)) {
      setCategoryFilter(categoriaParam);
    }
  }, [location.search]);

  let filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
    return matchesSearch && matchesCategory && product.stock > 0;
  });

  // SEO: Schema.org para lista de productos
  useSEO({
    title: 'Tienda - Productos en Venta',
    description: 'Descubrí nuestra amplia selección de productos. Precios fijos, stock en tiempo real y envío seguro.',
    url: 'https://www.clickio.com.ar/tienda',
    type: 'website',
    structuredData: filteredProducts.length > 0 
      ? generateProductListStructuredData(filteredProducts.slice(0, 50)) // Limitar a 50 para evitar schemas muy grandes
      : undefined
  });

  // Trackear búsquedas con debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim() && searchTerm.trim() !== lastSearchedRef.current) {
      searchTimeoutRef.current = window.setTimeout(() => {
        if (searchTerm.trim().length >= 3) { // Solo trackear búsquedas de 3+ caracteres
          trackSearch(searchTerm.trim(), filteredProducts.length, user?.id, user?.username);
          lastSearchedRef.current = searchTerm.trim();
        }
      }, 1000) as unknown as number; // Esperar 1 segundo después del último cambio
    }

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, filteredProducts.length, user?.id, user?.username]);

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'rating':
        return b.averageRating - a.averageRating;
      default:
        return 0;
    }
  });

  // SEO: Meta tags para página de tienda
  const categoryNames: { [key: string]: string } = {
    '1': 'Electrónica',
    '2': 'Moda',
    '3': 'Hogar',
    '4': 'Deportes',
    '5': 'Juguetes',
    '6': 'Libros'
  };

  const categoryName = categoryFilter !== 'all' ? categoryNames[categoryFilter] : undefined;
  const pageTitle = categoryName 
    ? `Productos de ${categoryName} | Tienda Clikio`
    : 'Tienda Oficial | Productos de Calidad | Clikio';
  const pageDescription = categoryName
    ? `Encuentra los mejores productos de ${categoryName} en Clikio. Precios fijos, stock en tiempo real y envío rápido.`
    : 'Tienda oficial de Clikio con productos de calidad, precios fijos y envío rápido. Stock en tiempo real y pago seguro con MercadoPago.';

  useSEO({
    title: pageTitle,
    description: pageDescription,
    url: categoryName 
      ? `https://www.clickio.com.ar/tienda?categoria=${categoryFilter}`
      : 'https://www.clickio.com.ar/tienda',
    type: 'website'
  });

  return (
    <div className="tienda-page">
      <div className="container">
        <div className="page-header">
          <h1>Tienda Oficial</h1>
          <p>Productos de calidad con precios fijos y envío rápido</p>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box">
            <Filter size={18} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Todas las categorías</option>
              <option value="1">Electrónica</option>
              <option value="2">Moda</option>
              <option value="3">Hogar</option>
              <option value="4">Deportes</option>
              <option value="5">Juguetes</option>
              <option value="6">Libros</option>
            </select>
          </div>

          <div className="sort-box">
            <SlidersHorizontal size={18} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Más recientes</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
              <option value="rating">Mejor valorados</option>
            </select>
          </div>
        </div>

        <div className="results-info">
          <span>{filteredProducts.length} productos encontrados</span>
        </div>

        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="no-results">
              <p>No se encontraron productos que coincidan con tu búsqueda</p>
            </div>
          )}
        </div>

        {/* Información de compra movida después de los productos */}
        <div className="info-banner">
          <h3>Información de compra</h3>
          <ul>
            <li>Todos los precios son fijos</li>
            <li>Stock en tiempo real</li>
            <li>Pago seguro con MercadoPago</li>
            <li>Los carritos no aseguran el stock</li>
          </ul>
        </div>
      </div>

      <style>{`
        .tienda-page {
          min-height: 100vh;
          padding: 3rem 0;
        }

        .page-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .page-header h1 {
          font-size: clamp(2rem, 4vw, 3rem);
          margin-bottom: 0.5rem;
        }

        .page-header p {
          font-size: 1.125rem;
          color: var(--text-secondary);
        }

        .filters-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .search-box,
        .filter-box,
        .sort-box {
          flex: 1;
          min-width: 200px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          border: 2px solid var(--border);
          transition: border-color 0.2s ease;
        }

        .search-box {
          flex: 2;
        }

        .search-box:focus-within,
        .filter-box:focus-within,
        .sort-box:focus-within {
          border-color: var(--primary);
        }

        .search-box input,
        .filter-box select,
        .sort-box select {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text-primary) !important;
          font-size: 1rem;
          outline: none;
        }
        
        .filter-box select option,
        .sort-box select option {
          background-color: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
        }

        .search-box svg,
        .filter-box svg,
        .sort-box svg {
          color: var(--text-secondary);
        }

        .info-banner {
          background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
          padding: 2rem;
          border-radius: 1rem;
          color: white;
          margin-bottom: 2rem;
        }

        .info-banner h3 {
          margin-bottom: 1rem;
          color: white;
        }

        .info-banner ul {
          list-style: none;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.75rem;
        }

        .info-banner li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .info-banner li:before {
          content: "✓";
          font-weight: 700;
          font-size: 1.25rem;
        }

        .results-info {
          margin-bottom: 1.5rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .no-results {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: var(--bg-secondary);
          border-radius: 1rem;
        }

        .no-results p {
          font-size: 1.125rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .tienda-page {
            padding: 1.5rem 0;
          }

          .page-header {
            margin-bottom: 1.5rem;
          }

          .page-header h1 {
            font-size: 1.5rem;
          }

          .page-header p {
            font-size: 0.875rem;
          }

          .filters-section {
            flex-direction: column;
            gap: 0.625rem;
            margin-bottom: 1.5rem;
          }

          .search-box,
          .filter-box,
          .sort-box {
            min-width: 100%;
            padding: 0.625rem 0.875rem;
            font-size: 0.9375rem;
          }

          .search-box input,
          .filter-box select,
          .sort-box select {
            font-size: 0.9375rem;
          }

          .search-box svg,
          .filter-box svg,
          .sort-box svg {
            width: 18px;
            height: 18px;
          }

          .info-banner {
            padding: 1.25rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }

          .info-banner ul {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .info-banner h3 {
            font-size: 1rem;
            margin-bottom: 0.75rem;
          }

          .info-banner li {
            font-size: 0.875rem;
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .results-info {
            font-size: 0.875rem;
            margin-bottom: 1rem;
          }
        }

        @media (max-width: 480px) {
          .tienda-page {
            padding: 1.5rem 0;
          }

          .page-header {
            margin-bottom: 2rem;
          }

          .info-banner {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Tienda;
