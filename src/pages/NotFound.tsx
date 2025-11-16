import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, AlertCircle } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useIsMobile } from '../hooks/useMediaQuery';

const NotFound = () => {
  const isMobile = useIsMobile();

  // SEO para página 404
  useSEO({
    title: 'Página no encontrada - Error 404',
    description: 'La página que buscas no existe o ha sido movida. Explora nuestra tienda, subastas y blog.',
    url: 'https://www.clickio.com.ar/404',
    type: 'website'
  });

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '2rem 1rem' : '4rem 2rem',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%'
      }}>
        {/* Icono de error */}
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: isMobile ? '120px' : '160px',
            height: isMobile ? '120px' : '160px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--error), rgba(239, 68, 68, 0.3))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)'
          }}>
            <AlertCircle 
              size={isMobile ? 60 : 80} 
              color="white"
              strokeWidth={2}
            />
          </div>
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: isMobile ? '2rem' : '3rem',
          fontWeight: 700,
          marginBottom: '1rem',
          color: 'var(--text-primary)',
          lineHeight: 1.2
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          fontWeight: 600,
          marginBottom: '1rem',
          color: 'var(--text-primary)'
        }}>
          Página no encontrada
        </h2>

        <p style={{
          fontSize: isMobile ? '0.9375rem' : '1.125rem',
          color: 'var(--text-secondary)',
          marginBottom: '2.5rem',
          lineHeight: 1.6
        }}>
          Lo sentimos, la página que buscas no existe o ha sido movida. 
          Puede que la URL sea incorrecta o que el contenido haya sido eliminado.
        </p>

        {/* Botones de acción */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1rem',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Link
            to="/"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.875rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '0.9375rem' : '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              borderRadius: '0.75rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Home size={20} />
            Ir al Inicio
          </Link>

          <Link
            to="/tienda"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.875rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '0.9375rem' : '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              borderRadius: '0.75rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Search size={20} />
            Explorar Tienda
          </Link>
        </div>

        {/* Enlaces rápidos */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--bg-secondary)',
          borderRadius: '1rem',
          border: '1px solid var(--border)'
        }}>
          <p style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Enlaces Útiles
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'center'
          }}>
            <Link
              to="/subastas"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
            >
              Subastas
            </Link>
            <span style={{ color: 'var(--text-tertiary)' }}>•</span>
            <Link
              to="/blog"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
            >
              Blog
            </Link>
            <span style={{ color: 'var(--text-tertiary)' }}>•</span>
            <Link
              to="/como-funciona"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
            >
              Cómo Funciona
            </Link>
            <span style={{ color: 'var(--text-tertiary)' }}>•</span>
            <Link
              to="/ayuda"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
            >
              Ayuda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

