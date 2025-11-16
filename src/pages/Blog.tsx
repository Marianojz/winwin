import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Share2, Heart, BookOpen, Gift, Sparkles, Clock } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { blogArticles } from '../data/blogArticles';
import { useSEO } from '../hooks/useSEO';
import './Blog.css';

const Blog = () => {
  const isMobile = useIsMobile();

  useSEO({
    title: 'Blog Clikio - Consejos, Guías y Tendencias',
    description: 'Descubre consejos útiles, guías completas y las últimas tendencias en compras online, ventas y más en el blog de Clikio.',
    url: 'https://www.clickio.com.ar/blog',
    type: 'website'
  });

  return (
    <div className="blog-page">
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem' }}>
        {/* Botón de volver */}
        <Link 
          to="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            marginBottom: '2rem',
            fontSize: isMobile ? '0.875rem' : '1rem',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={isMobile ? 16 : 20} />
          Volver al inicio
        </Link>

        {/* Header del Blog */}
        <div className="blog-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            padding: '0.75rem 1.5rem',
            borderRadius: '2rem',
            boxShadow: '0 4px 16px rgba(255, 107, 0, 0.3)',
            marginBottom: '1rem'
          }}>
            <BookOpen size={24} style={{ color: 'white' }} />
            <h1 style={{ 
              margin: 0, 
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: 700,
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              Blog Clikio
            </h1>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: isMobile ? '0.9375rem' : '1.125rem',
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            Ideas, consejos y tendencias para tus compras
          </p>
        </div>

        {/* Lista de Artículos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {blogArticles.map(article => (
            <Link
              key={article.id}
              to={`/blog/${article.slug}`}
              style={{
                display: 'block',
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                overflow: 'hidden',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '1px solid var(--border)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ padding: '1.5rem' }}>
                <div style={{
                  display: 'inline-block',
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '1rem'
                }}>
                  {article.category}
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.3
                }}>
                  {article.title}
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  marginBottom: '1rem'
                }}>
                  {article.excerpt}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={14} />
                    <span>{article.author}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} />
                    <span>{new Date(article.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={14} />
                    <span>{article.readTime} min</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Artículo Principal - Mantener el contenido existente si es necesario */}
        <article className="blog-article" style={{ display: 'none' }}>
          {/* Header del Artículo */}
          <header className="article-header">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)'
              }}>
                <Gift size={16} />
                <span>Regalería</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)'
              }}>
                <Calendar size={16} />
                <span>Diciembre 2024</span>
              </div>
            </div>
            
            <h1 className="article-title" style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: 700,
              lineHeight: '1.2',
              marginBottom: '1rem',
              color: 'var(--text-primary)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ¿Qué regalar esta Navidad? Guía completa de regalería en Argentina
            </h1>

            <p className="article-excerpt" style={{
              fontSize: isMobile ? '1rem' : '1.25rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: '2rem',
              fontWeight: 400
            }}>
              La Navidad se acerca y con ella la oportunidad de sorprender a tus seres queridos. 
              Te traemos las mejores ideas de regalos para esta temporada, con opciones para todos los gustos y presupuestos.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              marginBottom: '2rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Equipo Clikio</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>20 de Diciembre, 2024</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                <button style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}>
                  <Share2 size={18} style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}>
                  <Heart size={18} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>
          </header>

          {/* Imagen Principal */}
          <div className="article-featured-image" style={{
            width: '100%',
            height: isMobile ? '250px' : '400px',
            borderRadius: '1rem',
            overflow: 'hidden',
            marginBottom: '3rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=1200&q=80" 
              alt="Regalos de Navidad"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Contenido del Artículo */}
          <div className="article-content" style={{
            fontSize: isMobile ? '1rem' : '1.125rem',
            lineHeight: '1.8',
            color: 'var(--text-primary)'
          }}>
            {/* Introducción */}
            <section style={{ marginBottom: '3rem' }}>
              <p style={{ marginBottom: '1.5rem' }}>
                La Navidad en Argentina es una época especial llena de tradiciones, encuentros familiares y, por supuesto, 
                la búsqueda del regalo perfecto. Este año, las tendencias en regalería combinan lo tradicional con lo moderno, 
                ofreciendo opciones para todos los gustos y presupuestos.
              </p>
              <p style={{ marginBottom: '1.5rem' }}>
                Desde productos gourmet típicos argentinos hasta tecnología de última generación, pasando por experiencias 
                únicas y regalos personalizados, hay un mundo de posibilidades esperándote. En esta guía completa, te ayudamos 
                a encontrar el regalo ideal para cada persona especial en tu vida.
              </p>
            </section>

            {/* Regalos Tradicionales Argentinos */}
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Sparkles size={28} style={{ color: 'var(--primary)' }} />
                Regalos Tradicionales Argentinos
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <img 
                    src="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80" 
                    alt="Pan Dulce"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '0.75rem',
                      marginBottom: '1rem'
                    }}
                  />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pan Dulce Artesanal</h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Este clásico de la mesa navideña es un pan esponjoso relleno de frutas secas y confitadas. 
                    Un regalo que nunca pasa de moda y que todos disfrutan. Podés encontrar versiones artesanales 
                    con ingredientes premium en panaderías especializadas.
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <img 
                    src="https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600&q=80" 
                    alt="Alfajores"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '0.75rem',
                      marginBottom: '1rem'
                    }}
                  />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Alfajores Artesanales</h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Los alfajores rellenos de dulce de leche y bañados en chocolate son una delicia que representa 
                    la dulzura de la Navidad argentina. Marcas artesanales ofrecen versiones gourmet con ingredientes 
                    de primera calidad.
                  </p>
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.1), rgba(255, 159, 64, 0.1))',
                borderRadius: '1rem',
                border: '1px solid var(--primary)',
                marginTop: '1.5rem'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary)' }}>
                  Vinos Argentinos Premium
                </h3>
                <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                  Una botella de Malbec o Torrontés de alguna bodega reconocida es un obsequio elegante y apreciado 
                  por los amantes del buen vino. Las bodegas de Mendoza, San Juan y Salta ofrecen opciones excepcionales 
                  que van desde los $5.000 hasta ediciones limitadas premium.
                </p>
                <img 
                  src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80" 
                  alt="Vinos Argentinos"
                  style={{
                    width: '100%',
                    height: '250px',
                    objectFit: 'cover',
                    borderRadius: '0.75rem'
                  }}
                />
              </div>
            </section>

            {/* Regalos Tecnológicos */}
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Gift size={28} style={{ color: 'var(--primary)' }} />
                Regalos Tecnológicos
              </h2>
              
              <p style={{ marginBottom: '1.5rem' }}>
                La tecnología sigue siendo una de las categorías más populares en la lista de deseos navideños. 
                Según estudios recientes, estos son los regalos tecnológicos más buscados en Argentina:
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <Gift size={40} style={{ color: 'white' }} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Parlantes Portátiles</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Ideales para quienes disfrutan de la música en cualquier lugar. Precios desde $15.000.
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <Gift size={40} style={{ color: 'white' }} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Auriculares Inalámbricos</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Perfectos para los que buscan comodidad y calidad de sonido. Desde $8.000.
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <Gift size={40} style={{ color: 'white' }} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Smartwatches</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Para aquellos interesados en tecnología y seguimiento de actividad física. Desde $25.000.
                  </p>
                </div>
              </div>
            </section>

            {/* Regalos Personalizados */}
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                color: 'var(--text-primary)'
              }}>
                Regalos Personalizados y Artesanales
              </h2>
              
              <p style={{ marginBottom: '1.5rem' }}>
                Un regalo hecho a mano o personalizado demuestra dedicación y cariño. Estas son algunas ideas que 
                podés encontrar en emprendimientos argentinos:
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '1.5rem'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <img 
                    src="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80" 
                    alt="Tazas Personalizadas"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '0.75rem',
                      marginBottom: '1rem'
                    }}
                  />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tazas Personalizadas</h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Con mensajes o imágenes que tengan un significado especial para la persona que lo recibe. 
                    Podés personalizarlas con fotos, frases o diseños únicos.
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <img 
                    src="https://images.unsplash.com/photo-1512820790803-83ca750daaf4?w=600&q=80" 
                    alt="Velas Aromáticas"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '0.75rem',
                      marginBottom: '1rem'
                    }}
                  />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Velas Aromáticas Artesanales</h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Con fragancias que evocan recuerdos o sensaciones agradables. Emprendimientos locales ofrecen 
                    opciones con cera de soja y esencias naturales.
                  </p>
                </div>
              </div>
            </section>

            {/* Experiencias como Regalo */}
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                color: 'var(--text-primary)'
              }}>
                Experiencias como Regalo
              </h2>
              
              <p style={{ marginBottom: '1.5rem' }}>
                Regalar experiencias se ha convertido en una tendencia creciente. Algunas opciones que podés considerar:
              </p>

              <div style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.05), rgba(255, 159, 64, 0.05))',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                marginBottom: '1.5rem'
              }}>
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  margin: 0,
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '1rem'
                }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>✓</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Cenas en Restaurantes Temáticos</strong>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Ofrece una noche especial en un lugar único
                      </span>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>✓</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Clases de Cocina o Arte</strong>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Para quienes disfrutan aprendiendo nuevas habilidades
                      </span>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>✓</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Entradas para Espectáculos</strong>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Conciertos, obras de teatro o eventos deportivos
                      </span>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>✓</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Días de Spa y Bienestar</strong>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Sesiones de masajes, tratamientos faciales o relajación
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* Regalos Sostenibles */}
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                color: 'var(--text-primary)'
              }}>
                Regalos Sostenibles
              </h2>
              
              <p style={{ marginBottom: '1.5rem' }}>
                Para aquellos comprometidos con el medio ambiente, los regalos sostenibles son una excelente opción. 
                Emprendimientos argentinos ofrecen productos ecológicos y responsables:
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '1.5rem'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Bolsas de Tela Reutilizables</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Para reducir el uso de plásticos. Diseños únicos de emprendedores locales.
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Productos de Higiene Ecológicos</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Como jabones artesanales o champús sólidos, libres de químicos dañinos.
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Libros sobre Sostenibilidad</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Para fomentar prácticas más amigables con el planeta.
                  </p>
                </div>
              </div>
            </section>

            {/* Consejos Finales */}
            <section style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderRadius: '1rem',
              color: 'white',
              marginBottom: '3rem'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                color: 'white'
              }}>
                Consejos para Elegir el Regalo Perfecto
              </h2>
              
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💡</span>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Conocé los Gustos del Destinatario</strong>
                    <span style={{ fontSize: '0.9375rem', opacity: 0.9 }}>
                      Observá sus intereses y necesidades para elegir un regalo que realmente aprecie.
                    </span>
                  </div>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>⭐</span>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Optá por la Calidad</strong>
                    <span style={{ fontSize: '0.9375rem', opacity: 0.9 }}>
                      Un regalo bien hecho y duradero siempre será valorado.
                    </span>
                  </div>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎁</span>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Considerá Experiencias</strong>
                    <span style={{ fontSize: '0.9375rem', opacity: 0.9 }}>
                      A veces, un momento especial compartido es más significativo que un objeto material.
                    </span>
                  </div>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🇦🇷</span>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Apoyá lo Local</strong>
                    <span style={{ fontSize: '0.9375rem', opacity: 0.9 }}>
                      Elegí productos de emprendedores y artesanos argentinos para fomentar la economía local.
                    </span>
                  </div>
                </li>
              </ul>
            </section>

            {/* Cierre */}
            <div style={{
              padding: '2rem',
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              textAlign: 'center',
              marginBottom: '3rem'
            }}>
              <p style={{
                fontSize: isMobile ? '1.125rem' : '1.25rem',
                lineHeight: '1.8',
                marginBottom: '1rem',
                fontWeight: 500
              }}>
                Recordá que lo más importante es el gesto y el cariño con el que se entrega el regalo. 
                ¡Que esta Navidad sea una oportunidad para compartir y celebrar con tus seres queridos!
              </p>
              <p style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}>
                Desde Clikio, te deseamos una Feliz Navidad llena de alegría, amor y buenos momentos. 🎄✨
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.1), rgba(255, 159, 64, 0.1))',
            borderRadius: '1rem',
            border: '2px solid var(--primary)',
            textAlign: 'center',
            marginTop: '3rem'
          }}>
            <h3 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: 'var(--text-primary)'
            }}>
              ¿Buscás el regalo perfecto?
            </h3>
            <p style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem'
            }}>
              Explorá nuestras subastas y tienda para encontrar productos únicos y especiales.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link 
                to="/subastas"
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'var(--primary)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--secondary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Ver Subastas
              </Link>
              <Link 
                to="/tienda"
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'transparent',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  border: '2px solid var(--primary)',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Ir a la Tienda
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default Blog;

