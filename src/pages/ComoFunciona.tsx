import { Link } from 'react-router-dom';
import { Play, CheckCircle, ShoppingCart, Gavel, CreditCard, Truck, Shield, Users, ArrowRight } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useIsMobile } from '../hooks/useMediaQuery';

const ComoFunciona = () => {
  const isMobile = useIsMobile();

  useSEO({
    title: 'Cómo Funciona Clikio - Guía Completa de Subastas y Tienda Online',
    description: 'Aprende cómo funciona Clikio: plataforma de subastas y tienda online. Descubre cómo comprar, vender y participar en subastas de forma segura y fácil.',
    url: 'https://www.clickio.com.ar/como-funciona',
    type: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Cómo Funciona Clikio',
      description: 'Guía completa para usar la plataforma Clikio',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Registro',
          text: 'Crea tu cuenta gratuita en Clikio'
        },
        {
          '@type': 'HowToStep',
          name: 'Explorar',
          text: 'Navega por subastas y productos'
        },
        {
          '@type': 'HowToStep',
          name: 'Comprar',
          text: 'Realiza tu compra de forma segura'
        }
      ]
    }
  });

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: isMobile ? '1.5rem 0' : '3rem 0' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ 
            fontSize: isMobile ? '2rem' : '3.5rem', 
            fontWeight: 700, 
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            ¿Cómo Funciona Clikio?
          </h1>
          <p style={{ 
            fontSize: isMobile ? '1rem' : '1.25rem', 
            color: 'var(--text-secondary)', 
            maxWidth: '700px', 
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Tu plataforma de confianza para comprar, vender y participar en subastas online de forma segura y sencilla.
          </p>
        </div>

        {/* Video Explicativo */}
        <div style={{ 
          marginBottom: '4rem',
          background: 'var(--bg-secondary)',
          borderRadius: '1rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            aspectRatio: '16/9',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden'
          }}>
            <Play 
              size={80} 
              style={{ 
                color: 'white', 
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                zIndex: 2
              }} 
            />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              zIndex: 1
            }} />
            <p style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '1.125rem',
              zIndex: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Ver Video Explicativo
            </p>
          </div>
          <p style={{ 
            marginTop: '1.5rem', 
            color: 'var(--text-secondary)',
            fontSize: '0.9375rem'
          }}>
            Haz clic para ver nuestro video tutorial completo sobre cómo usar Clikio
          </p>
        </div>

        {/* Pasos para Comprar */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ 
            fontSize: isMobile ? '1.75rem' : '2.5rem', 
            fontWeight: 700, 
            marginBottom: '2rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <ShoppingCart size={32} style={{ color: 'var(--primary)' }} />
            Cómo Comprar
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '2rem'
          }}>
            {[
              {
                step: '1',
                title: 'Explora Productos',
                description: 'Navega por nuestra tienda o subastas. Usa filtros para encontrar exactamente lo que buscas.',
                icon: ShoppingCart
              },
              {
                step: '2',
                title: 'Selecciona y Puja/Compra',
                description: 'En subastas, haz tu puja. En la tienda, agrega al carrito y compra directamente.',
                icon: Gavel
              },
              {
                step: '3',
                title: 'Paga de Forma Segura',
                description: 'Usa MercadoPago para pagos seguros. Tu información está protegida.',
                icon: CreditCard
              },
              {
                step: '4',
                title: 'Recibe tu Producto',
                description: 'Te enviamos tu compra con seguimiento en tiempo real. Rápido y seguro.',
                icon: Truck
              }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index}
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '2rem',
                    borderRadius: '1rem',
                    textAlign: 'center',
                    transition: 'transform 0.2s',
                    border: '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}>
                    {item.step}
                  </div>
                  <Icon size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pasos para Vender */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ 
            fontSize: isMobile ? '1.75rem' : '2.5rem', 
            fontWeight: 700, 
            marginBottom: '2rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <Users size={32} style={{ color: 'var(--primary)' }} />
            Cómo Vender
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '2rem'
          }}>
            {[
              {
                title: 'Crea tu Cuenta',
                description: 'Regístrate gratis en Clikio. El proceso es rápido y sencillo.',
                icon: Users
              },
              {
                title: 'Publica tu Producto',
                description: 'Sube fotos, describe tu producto y establece precio o precio inicial para subastas.',
                icon: ShoppingCart
              },
              {
                title: 'Gestiona Ventas',
                description: 'Recibe notificaciones de pujas o compras. Responde preguntas de compradores.',
                icon: CheckCircle
              },
              {
                title: 'Recibe el Pago',
                description: 'Una vez completada la venta, recibes el pago de forma segura a través de MercadoPago.',
                icon: CreditCard
              }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index}
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '2rem',
                    borderRadius: '1rem',
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{
                    minWidth: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      {item.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Características de Seguridad */}
        <section style={{ 
          marginBottom: '4rem',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          padding: '3rem 2rem',
          borderRadius: '1rem',
          color: 'white'
        }}>
          <h2 style={{ 
            fontSize: isMobile ? '1.75rem' : '2.5rem', 
            fontWeight: 700, 
            marginBottom: '2rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <Shield size={32} />
            Tu Seguridad es Nuestra Prioridad
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            {[
              'Pagos 100% seguros con MercadoPago',
              'Protección de datos personales',
              'Sistema de calificaciones y reseñas',
              'Garantía de satisfacción',
              'Soporte al cliente 24/7',
              'Política de devoluciones clara'
            ].map((feature, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={24} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '1.0625rem' }}>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: 'var(--bg-secondary)',
          borderRadius: '1rem'
        }}>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: 700, marginBottom: '1rem' }}>
            ¿Listo para Empezar?
          </h2>
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: '2rem',
            fontSize: '1.125rem'
          }}>
            Únete a miles de usuarios que ya confían en Clikio
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/registro" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Crear Cuenta Gratis
              <ArrowRight size={20} />
            </Link>
            <Link to="/tienda" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Ver Productos
              <ShoppingCart size={20} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComoFunciona;

