import { Link } from 'react-router-dom';
import { Gavel, Store, TrendingUp, Shield, Clock, Award } from 'lucide-react';
import { useStore } from '../store/useStore';
import AuctionCard from '../components/AuctionCard';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { HomeConfig, defaultHomeConfig } from '../types/homeConfig';
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

const Home = () => {
  const { auctions, products } = useStore();
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(defaultHomeConfig);

  useEffect(() => {
    try {
      const homeConfigRef = ref(realtimeDb, 'homeConfig');
      
      // Escuchar cambios en tiempo real desde Firebase
      const unsubscribe = onValue(homeConfigRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
          // Cargar TODOS los campos desde Firebase
          setHomeConfig({
            ...defaultHomeConfig,
            ...data,
            siteSettings: data.siteSettings || defaultHomeConfig.siteSettings,
            themeColors: data.themeColors || defaultHomeConfig.themeColors,
            sectionTitles: data.sectionTitles || defaultHomeConfig.sectionTitles,
            heroTitle: data.heroTitle || defaultHomeConfig.heroTitle,
            heroSubtitle: data.heroSubtitle || defaultHomeConfig.heroSubtitle,
            heroImageUrl: data.heroImageUrl || defaultHomeConfig.heroImageUrl,
            banners: data.banners?.map((b: any) => ({
              ...b,
              createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
              updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined
            })) || [],
            promotions: data.promotions?.map((p: any) => ({
              ...p,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              startDate: p.startDate ? new Date(p.startDate) : undefined,
              endDate: p.endDate ? new Date(p.endDate) : undefined
            })) || [],
            aboutSection: data.aboutSection || defaultHomeConfig.aboutSection,
            contactSection: data.contactSection || defaultHomeConfig.contactSection,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
          });
          console.log('✅ Configuración de home cargada desde Firebase');
        } else {
          // Si no hay configuración en Firebase, usar la por defecto
          console.log('⚠️ No hay configuración en Firebase, usando valores por defecto');
          setHomeConfig(defaultHomeConfig);
        }
      }, (error) => {
        console.error('❌ Error cargando configuración del inicio desde Firebase:', error);
        setHomeConfig(defaultHomeConfig);
      });
      
      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Error configurando listener de homeConfig:', error);
      setHomeConfig(defaultHomeConfig);
    }
  }, []);
  
  // Filtrar subastas destacadas y activas (primero destacadas, luego por fecha)
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

  // Primera subasta destacada para mostrar
  const featuredAuction = featuredAuctions[0];

  // Productos destacados con stock disponible
  const featuredProducts = products.filter(p => p.stock > 0).slice(0, 4);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                {homeConfig.heroTitle || 'Bienvenido a Clikio'}
              </h1>
              <p className="hero-subtitle">
                {homeConfig.heroSubtitle || 'La plataforma líder de subastas y ventas online en Argentina. Descubrí productos únicos y conseguí las mejores ofertas.'}
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
                src={homeConfig.heroImageUrl || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800"} 
                alt="Subasta" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Banners Publicitarios */}
      {homeConfig.banners.filter(b => b.active).length > 0 && (
        <section className="banners" style={{ padding: '2rem 0', background: 'var(--bg-secondary)' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {homeConfig.banners.filter(b => b.active).map(banner => (
                <div key={banner.id} style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {banner.imageUrl && (
                    <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  )}
                  {banner.title && (
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.7)', color: 'white', position: banner.imageUrl ? 'absolute' : 'relative', bottom: 0, left: 0, right: 0, wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', wordBreak: 'break-word' }}>{banner.title}</h3>
                      {banner.description && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', wordBreak: 'break-word' }}>{banner.description}</p>}
                      {banner.link && banner.linkText && (
                        <Link to={banner.link} style={{ display: 'inline-block', marginTop: '0.75rem', color: 'white', textDecoration: 'underline', fontWeight: 600, wordBreak: 'break-word' }}>
                          {banner.linkText} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Section - Subasta y Productos Destacados Juntos */}
      {(featuredAuction || featuredProducts.length > 0) && (
        <section className="featured-section">
          <div className="container">
            <div className="section-header">
              <h2>
                <Gavel size={28} />
                Destacados
              </h2>
              <p>Lo mejor de subastas y tienda</p>
            </div>
            <div className="featured-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
              {featuredAuction && (
                <div 
                  className="featured-auction-wrapper featured-section-auction"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    padding: '1.5rem 1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.75rem',
                    transition: 'all 0.3s ease',
                    border: '2px solid transparent',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%'
                  }}
                >
                  <div 
                    className="featured-badge featured-badge-auction"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.75rem',
                      width: 'fit-content',
                      position: 'relative',
                      zIndex: 1,
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Gavel size={18} />
                    Subasta Destacada
                  </div>
                  <div className="featured-card-content" style={{ flex: 1, display: 'flex', alignItems: 'stretch', position: 'relative', zIndex: 1, minHeight: 0 }}>
                    <AuctionCard auction={featuredAuction} />
                  </div>
                </div>
              )}
              {featuredProducts.length > 0 && (
                <div 
                  className="featured-products-wrapper featured-section-store"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    padding: '1.5rem 1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.75rem',
                    transition: 'all 0.3s ease',
                    border: '2px solid transparent',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%'
                  }}
                >
                  <div className="featured-products-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>
                    <div 
                      className="featured-badge featured-badge-store"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.875rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        width: 'fit-content',
                        position: 'relative',
                        zIndex: 1,
                        background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Store size={18} />
                      Productos Destacados
                    </div>
                    <Link to="/tienda" className="section-link-small" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', transition: 'color 0.2s ease' }}>
                      Ver todos →
                    </Link>
                  </div>
                  <div 
                    className="featured-products-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: (() => {
                        const count = Math.min(featuredProducts.length, 3);
                        if (count === 1) return '1fr';
                        if (count === 2) return 'repeat(2, 1fr)';
                        return 'repeat(3, 1fr)';
                      })(),
                      gap: '0.875rem',
                      flex: 1,
                      position: 'relative',
                      zIndex: 1,
                      minHeight: 0
                    }}
                  >
                    {featuredProducts.slice(0, 3).map((product: Product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Promociones Especiales */}
      {homeConfig.promotions.filter(p => p.active).length > 0 && (
        <section className="promotions" style={{ padding: '2rem 0' }}>
          <div className="container">
            <h2 className="section-title">Promociones Especiales</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {homeConfig.promotions.filter(p => p.active).map(promo => (
                <div key={promo.id} style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {promo.imageUrl && (
                    <img src={promo.imageUrl} alt={promo.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{promo.title}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{promo.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features - Compacto y Discreto con Efectos Neon */}
      <section className="features-compact">
        <div className="container">
          <h2 className="features-compact-title">¿Por qué elegirnos?</h2>
          <div className="features-compact-grid">
            <div className="feature-compact-card">
              <div className="feature-compact-icon">
                <Shield size={24} />
              </div>
              <h3>Seguro</h3>
              <p>Transacciones protegidas</p>
            </div>
            <div className="feature-compact-card">
              <div className="feature-compact-icon">
                <Clock size={24} />
              </div>
              <h3>Tiempo Real</h3>
              <p>Subastas en vivo</p>
            </div>
            <div className="feature-compact-card">
              <div className="feature-compact-icon">
                <TrendingUp size={24} />
              </div>
              <h3>Mejores Precios</h3>
              <p>Ofertas increíbles</p>
            </div>
            <div className="feature-compact-card">
              <div className="feature-compact-icon">
                <Award size={24} />
              </div>
              <h3>Verificado</h3>
              <p>Productos garantizados</p>
            </div>
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
          word-wrap: break-word;
          overflow-wrap: break-word;
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
          word-wrap: break-word;
          overflow-wrap: break-word;
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

        /* Featured Section - Compacto y Elegante como otras secciones */
        .featured-section {
          padding: 2.5rem 0;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          position: relative;
          overflow: hidden;
        }

        .featured-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 107, 0, 0.03) 0%, transparent 70%);
          animation: pulse-glow 4s ease-in-out infinite;
        }

        .section-header {
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: clamp(1.5rem, 3vw, 1.875rem);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .section-header p {
          font-size: clamp(0.875rem, 2vw, 1rem);
          color: var(--text-secondary);
        }

        .featured-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          align-items: stretch;
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .featured-auction-wrapper {
          display: flex !important;
          flex-direction: column !important;
          gap: 1rem !important;
          padding: 1.5rem 1rem !important;
          background: var(--bg-secondary) !important;
          border-radius: 0.75rem !important;
          transition: all 0.3s ease !important;
          border: 2px solid transparent !important;
          position: relative !important;
          overflow: hidden !important;
          height: 100% !important;
        }

        .featured-auction-wrapper::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 107, 0, 0.15) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 0;
        }

        .featured-auction-wrapper:hover {
          transform: translateY(-4px) !important;
          border-color: var(--primary) !important;
          box-shadow: 0 8px 24px rgba(255, 107, 0, 0.4),
                      0 0 40px rgba(255, 107, 0, 0.3) !important;
        }

        .featured-auction-wrapper:hover::before {
          opacity: 1 !important;
        }

        .featured-products-wrapper {
          display: flex !important;
          flex-direction: column !important;
          gap: 1rem !important;
          padding: 1.5rem 1rem !important;
          background: var(--bg-secondary) !important;
          border-radius: 0.75rem !important;
          transition: all 0.3s ease !important;
          border: 2px solid transparent !important;
          position: relative !important;
          overflow: hidden !important;
          height: 100% !important;
        }

        .featured-products-wrapper::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 0;
        }

        .featured-products-wrapper:hover {
          transform: translateY(-4px) !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4),
                      0 0 40px rgba(59, 130, 246, 0.3) !important;
        }

        .featured-products-wrapper:hover::before {
          opacity: 1 !important;
        }

        .featured-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          width: fit-content;
          position: relative;
          z-index: 1;
        }

        .featured-badge-auction {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
          transition: all 0.3s ease;
        }

        .featured-auction-wrapper:hover .featured-badge-auction {
          box-shadow: 0 6px 20px rgba(255, 107, 0, 0.6),
                      0 0 20px rgba(255, 107, 0, 0.4) !important;
          transform: scale(1.05) !important;
        }

        .featured-badge-store {
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
        }

        .featured-products-wrapper:hover .featured-badge-store {
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6),
                      0 0 20px rgba(59, 130, 246, 0.4) !important;
          transform: scale(1.05) !important;
        }

        .featured-card-content {
          flex: 1;
          display: flex;
          align-items: stretch;
          position: relative;
          z-index: 1;
          min-height: 0;
        }

        .featured-card-content > * {
          flex: 1;
          min-height: 0;
          width: 100%;
        }

        /* Forzar estilos de las cards dentro de featured */
        .featured-auction-wrapper .auction-card,
        .featured-auction-wrapper .auction-card * {
          border-radius: 0.5rem !important;
          box-shadow: none !important;
        }

        .featured-auction-wrapper .auction-card:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        .featured-products-wrapper .product-card,
        .featured-products-wrapper .product-card * {
          border-radius: 0.5rem !important;
          box-shadow: none !important;
        }

        .featured-products-wrapper .product-card:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        .featured-products-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .section-link-small {
          color: var(--primary);
          font-weight: 600;
          font-size: 0.875rem;
          transition: color 0.2s ease;
        }

        .section-link-small:hover {
          color: var(--secondary);
        }

        .featured-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.875rem;
          flex: 1;
          position: relative;
          z-index: 1;
          min-height: 0;
        }

        .featured-products-grid > * {
          min-height: 0;
          height: 100%;
          max-width: 100%;
        }

        .featured-products-grid .product-card {
          height: 100% !important;
          width: 100% !important;
        }

        .section-link {
          color: var(--primary);
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .section-link:hover {
          color: var(--secondary);
        }

        /* Features Compacto con Efectos Neon */
        .features-compact {
          padding: 2.5rem 0;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          position: relative;
          overflow: hidden;
        }

        .features-compact::before {
          content: '';
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 107, 0, 0.03) 0%, transparent 70%);
          animation: pulse-glow 4s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        .features-compact-title {
          text-align: center;
          font-size: clamp(1.5rem, 3vw, 1.875rem);
          margin-bottom: 2rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .features-compact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.25rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .feature-compact-card {
          text-align: center;
          padding: 1.5rem 1rem;
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .feature-compact-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 107, 0, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .feature-compact-card:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
          box-shadow: 0 8px 24px rgba(255, 107, 0, 0.2),
                      0 0 20px rgba(255, 107, 0, 0.1);
        }

        .feature-compact-card:hover::before {
          opacity: 1;
        }

        .feature-compact-icon {
          display: inline-flex;
          padding: 0.75rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 0.5rem;
          color: white;
          margin-bottom: 0.75rem;
          position: relative;
          z-index: 1;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
          transition: all 0.3s ease;
        }

        .feature-compact-card:hover .feature-compact-icon {
          box-shadow: 0 6px 20px rgba(255, 107, 0, 0.5),
                      0 0 15px rgba(255, 107, 0, 0.3);
          transform: scale(1.1);
        }

        .feature-compact-card h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
          position: relative;
          z-index: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .feature-compact-card p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
          position: relative;
          z-index: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .section-title {
          text-align: center;
          font-size: clamp(1.5rem, 3vw, 1.875rem);
          margin-bottom: 2rem;
          font-weight: 600;
          position: relative;
          z-index: 1;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .how-it-works {
          padding: 2.5rem 0;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          position: relative;
          overflow: hidden;
        }

        .how-it-works::before {
          content: '';
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 107, 0, 0.03) 0%, transparent 70%);
          animation: pulse-glow 4s ease-in-out infinite;
          pointer-events: none;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
          margin-top: 2rem;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 1;
        }

        .step {
          text-align: center;
          padding: 1.5rem 1rem;
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .step::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 107, 0, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 0;
        }

        .step:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
          box-shadow: 0 8px 24px rgba(255, 107, 0, 0.2),
                      0 0 20px rgba(255, 107, 0, 0.1);
        }

        .step:hover::before {
          opacity: 1;
        }

        .step-number {
          display: inline-flex;
          width: 50px;
          height: 50px;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          border-radius: 50%;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
          font-family: 'Poppins', sans-serif;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }

        .step:hover .step-number {
          box-shadow: 0 6px 20px rgba(255, 107, 0, 0.5),
                      0 0 15px rgba(255, 107, 0, 0.3);
          transform: scale(1.1);
        }

        .step h3 {
          font-size: clamp(1rem, 2vw, 1.125rem);
          margin-bottom: 0.5rem;
          position: relative;
          z-index: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .step p {
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: clamp(0.875rem, 1.5vw, 0.9375rem);
          position: relative;
          z-index: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        @media (max-width: 768px) {
          .hero {
            padding: 2rem 0;
            margin-bottom: 2rem;
          }

          .hero-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .hero-image {
            order: -1;
          }

          .hero-stats {
            gap: 1rem;
            flex-wrap: wrap;
            justify-content: center;
          }

          .stat-number {
            font-size: 1.75rem;
          }

          .stat-label {
            font-size: 0.75rem;
          }

          .hero-buttons {
            flex-direction: column;
          }

          .hero-buttons .btn {
            width: 100%;
          }

          .featured-content {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .featured-auction-wrapper,
          .featured-products-wrapper {
            padding: 1.25rem 0.875rem;
          }

          .featured-products-grid {
            grid-template-columns: 1fr;
            gap: 0.875rem;
          }

          .features-compact-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .feature-compact-card {
            padding: 1.25rem 0.75rem;
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .steps {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .step {
            padding: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.75rem !important;
          }

          .hero-subtitle {
            font-size: 1rem;
          }

          .hero-stats {
            gap: 0.75rem;
          }

          .stat-number {
            font-size: 1.5rem;
          }

          .features-compact-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .feature-compact-card {
            padding: 1rem 0.75rem;
          }

          .featured-content {
            gap: 1rem;
          }

          .featured-auction-wrapper,
          .featured-products-wrapper {
            padding: 1rem 0.75rem;
          }

          .featured-products-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .featured-badge {
            font-size: 0.8125rem;
            padding: 0.4375rem 0.75rem;
          }

          .step-number {
            width: 45px;
            height: 45px;
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
