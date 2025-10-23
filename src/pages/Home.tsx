import { useNavigate } from 'react-router-dom';
import { Gavel, Store, TrendingUp, Shield, Clock, Award } from 'lucide-react';
import { useStore } from '../store/useStore';
import AuctionCard from '../components/AuctionCard';
import ProductCard from '../components/ProductCard';

const Home = () => {
  const navigate = useNavigate();
  const { auctions, products } = useStore();
  
  // Primero las destacadas, luego las normales
  const featuredAuctions = auctions
    .filter(a => a.status === 'active')
    .sort((a, b) => {
      // Prioridad: destacadas primero
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      // Luego por fecha más reciente
      return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
    })
    .slice(0, 6);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Bienvenido a <span className="text-gradient">Subasta Argenta</span>
              </h1>
              <p className="hero-subtitle">
                La plataforma líder de subastas y ventas online en Argentina. 
                Descubrí productos únicos y conseguí las mejores ofertas.
              </p>
              <div className="hero-buttons">
                <Link to="/subastas" className="btn btn-primary btn-lg">
                  <Gavel size={20} />
                  Ver Subastas
                </Link>
                <Link to="/tienda" className="btn btn-outline btn-lg">
                  <Store size={20} />
                  Ir a la Tienda
                </Link>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">{auctions.length}</span>
                  <span className="stat-label">Subastas Activas</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{products.length}</span>
                  <span className="stat-label">Productos en Tienda</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">1000+</span>
                  <span className="stat-label">Usuarios Activos</span>
                </div>
              </div>
            </div>
            <div className="hero-image">
              <img 
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800" 
                alt="Subasta" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Auction */}
      {featuredAuction && (
        <section className="featured-auction">
          <div className="container">
            <div className="section-header">
              <h2>
                <Gavel size={32} />
                Subasta Destacada
              </h2>
              <p>No te pierdas esta increíble oportunidad</p>
            </div>
            <div className="featured-auction-content">
              <AuctionCard auction={featuredAuction} />
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">¿Por qué elegir Subasta Argenta?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={32} />
              </div>
              <h3>Seguro y Confiable</h3>
              <p>Todas las transacciones están protegidas y verificadas</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Clock size={32} />
              </div>
              <h3>Subastas en Tiempo Real</h3>
              <p>Ofertá en tiempo real y seguí las subastas minuto a minuto</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <TrendingUp size={32} />
              </div>
              <h3>Mejores Precios</h3>
              <p>Conseguí productos de calidad a precios increíbles</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Award size={32} />
              </div>
              <h3>Productos Verificados</h3>
              <p>Todos los productos son verificados por nuestro equipo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="home-products">
        <div className="container">
          <div className="section-header">
            <h2>
              <Store size={32} />
              Productos Destacados de la Tienda
            </h2>
            <Link to="/tienda" className="section-link">
              Ver todos →
            </Link>
          </div>
          <div className="products-grid">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">¿Cómo Funciona?</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Registrate</h3>
              <p>Creá tu cuenta con tu email y validá tu identidad con DNI</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Explorá y Ofertá</h3>
              <p>Navegá por las subastas y productos, ofertá en las que te interesen</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Ganás y Pagás</h3>
              <p>Si ganás la subasta, tenés 48hs para pagar con MercadoPago</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Recibís tu Producto</h3>
              <p>Coordinamos el envío o retiro de tu producto ganado</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .home-page {
          min-height: 100vh;
        }

        .hero {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
          padding: 4rem 0;
          margin-bottom: 4rem;
        }

        .hero-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          margin-bottom: 1.5rem;
        }

        .text-gradient {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .btn-lg {
          padding: 1rem 2rem;
          font-size: 1.125rem;
        }

        .hero-stats {
          display: flex;
          gap: 3rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Poppins', sans-serif;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .hero-image {
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 20px 60px var(--shadow-lg);
        }

        .hero-image img {
          width: 100%;
          height: auto;
          display: block;
        }

        .featured-auction {
          padding: 4rem 0;
          background: var(--bg-secondary);
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .section-header p {
          font-size: 1.125rem;
          color: var(--text-secondary);
        }

        .section-link {
          color: var(--primary);
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .section-link:hover {
          color: var(--secondary);
        }

        .featured-auction-content {
          max-width: 500px;
          margin: 0 auto;
        }

        .features {
          padding: 4rem 0;
        }

        .section-title {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 3rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          text-align: center;
          padding: 2rem;
          background: var(--bg-secondary);
          border-radius: 1rem;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px var(--shadow-lg);
        }

        .feature-icon {
          display: inline-flex;
          padding: 1rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 1rem;
          color: white;
          margin-bottom: 1.5rem;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .feature-card p {
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .home-products {
          padding: 4rem 0;
          background: var(--bg-secondary);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .how-it-works {
          padding: 4rem 0;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .step {
          text-align: center;
          padding: 2rem 1rem;
        }

        .step-number {
          display: inline-flex;
          width: 60px;
          height: 60px;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          border-radius: 50%;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          font-family: 'Poppins', sans-serif;
        }

        .step h3 {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .step p {
          color: var(--text-secondary);
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .hero-image {
            order: -1;
          }

          .hero-stats {
            gap: 1.5rem;
          }

          .stat-number {
            font-size: 2rem;
          }

          .section-header {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
