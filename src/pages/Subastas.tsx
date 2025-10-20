import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useStore } from '../store/useStore';
import AuctionCard from '../components/AuctionCard';

const Subastas = () => {
  const { auctions } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredAuctions = auctions.filter(auction => {
    const matchesSearch = auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || auction.categoryId === filter;
    const isActive = auction.status === 'active';
    return matchesSearch && matchesFilter && isActive;
  });

  return (
    <div className="subastas-page">
      <div className="container">
        <div className="page-header">
          <h1>Subastas Activas</h1>
          <p>Ofertá en tiempo real y llevate los mejores productos</p>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Buscar subastas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box">
            <Filter size={20} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todas las categorías</option>
              <option value="1">Electrónica</option>
              <option value="2">Moda</option>
              <option value="3">Hogar</option>
              <option value="4">Deportes</option>
              <option value="5">Juguetes</option>
              <option value="6">Libros</option>
            </select>
          </div>
        </div>

        <div className="info-banner">
          <h3>¿Cómo funcionan las subastas?</h3>
          <ul>
            <li>Cada oferta debe ser múltiplo de $500</li>
            <li>Podés comprar directamente con el precio de "Compra Ya"</li>
            <li>Si ganás, tenés 48hs para pagar o la subasta se republica</li>
          </ul>
        </div>

        <div className="auctions-grid">
          {filteredAuctions.length > 0 ? (
            filteredAuctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} />
            ))
          ) : (
            <div className="no-results">
              <p>No se encontraron subastas que coincidan con tu búsqueda</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .subastas-page {
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
        .filter-box {
          flex: 1;
          min-width: 250px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          border: 2px solid var(--border);
          transition: border-color 0.2s ease;
        }

        .search-box:focus-within,
        .filter-box:focus-within {
          border-color: var(--primary);
        }

        .search-box input,
        .filter-box select {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 1rem;
          outline: none;
        }

        .search-box svg,
        .filter-box svg {
          color: var(--text-secondary);
        }

        .info-banner {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          padding: 2rem;
          border-radius: 1rem;
          color: white;
          margin-bottom: 3rem;
        }

        .info-banner h3 {
          margin-bottom: 1rem;
          color: white;
        }

        .info-banner ul {
          list-style: none;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

        .auctions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
          .subastas-page {
            padding: 2rem 0;
          }

          .filters-section {
            flex-direction: column;
          }

          .search-box,
          .filter-box {
            min-width: 100%;
          }

          .info-banner ul {
            grid-template-columns: 1fr;
          }

          .auctions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Subastas;
