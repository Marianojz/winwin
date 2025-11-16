import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Share2, Clock, Tag } from 'lucide-react';
import { getArticleBySlug, getRelatedArticles } from '../data/blogArticles';
import { useSEO } from '../hooks/useSEO';
import { useIsMobile } from '../hooks/useMediaQuery';
import './Blog.css';

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const isMobile = useIsMobile();
  const article = slug ? getArticleBySlug(slug) : null;
  const relatedArticles = article ? getRelatedArticles(article.id) : [];

  if (!article) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Artículo no encontrado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>El artículo que buscas no existe.</p>
          <Link to="/blog" className="btn btn-primary">Volver al Blog</Link>
        </div>
      </div>
    );
  }

  // SEO
  useSEO({
    title: `${article.title} | Blog Clikio`,
    description: article.excerpt,
    url: `https://www.clickio.com.ar/blog/${article.slug}`,
    type: 'article',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.excerpt,
      author: {
        '@type': 'Organization',
        name: article.author
      },
      datePublished: article.date,
      dateModified: article.date
    }
  });

  return (
    <div className="blog-page">
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem' }}>
        {/* Botón de volver */}
        <Link 
          to="/blog" 
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
          Volver al Blog
        </Link>

        {/* Header del Artículo */}
        <header className="article-header">
          <div style={{
            display: 'inline-block',
            background: 'var(--bg-secondary)',
            padding: '0.5rem 1rem',
            borderRadius: '2rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--primary)'
          }}>
            {article.category}
          </div>
          
          <h1 className="article-title">{article.title}</h1>
          
          <p className="article-excerpt">{article.excerpt}</p>

          {/* Meta información */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <User size={16} />
              <span style={{ fontSize: '0.875rem' }}>{article.author}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Calendar size={16} />
              <span style={{ fontSize: '0.875rem' }}>
                {new Date(article.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Clock size={16} />
              <span style={{ fontSize: '0.875rem' }}>{article.readTime} min de lectura</span>
            </div>
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
              {article.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '1rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Contenido del artículo */}
        <article className="article-content">
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {article.content.split('\n').map((line, index) => {
              // Procesar markdown básico
              if (line.startsWith('# ')) {
                return <h2 key={index} style={{ fontSize: '2rem', fontWeight: 700, marginTop: '2rem', marginBottom: '1rem' }}>{line.substring(2)}</h2>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={index} style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>{line.substring(3)}</h3>;
              }
              if (line.startsWith('### ')) {
                return <h4 key={index} style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>{line.substring(4)}</h4>;
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>{line.substring(2)}</li>;
              }
              if (line.trim() === '') {
                return <br key={index} />;
              }
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={index} style={{ fontWeight: 700, marginBottom: '1rem' }}>{line.substring(2, line.length - 2)}</p>;
              }
              return <p key={index} style={{ marginBottom: '1.5rem', lineHeight: 1.8 }}>{line}</p>;
            })}
          </div>
        </article>

        {/* Compartir */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--bg-secondary)',
          borderRadius: '1rem',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>¿Te gustó este artículo?</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Compártelo con tus amigos y familiares
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: article.title,
                    text: article.excerpt,
                    url: window.location.href
                  });
                }
              }}
            >
              <Share2 size={18} />
              Compartir
            </button>
          </div>
        </div>

        {/* Artículos relacionados */}
        {relatedArticles.length > 0 && (
          <section style={{ marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>
              Artículos Relacionados
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '2rem'
            }}>
              {relatedArticles.map(related => (
                <Link
                  key={related.id}
                  to={`/blog/${related.slug}`}
                  style={{
                    display: 'block',
                    padding: '1.5rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '1rem',
                    textDecoration: 'none',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    display: 'inline-block',
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem'
                  }}>
                    {related.category}
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: 'var(--text-primary)'
                  }}>
                    {related.title}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6
                  }}>
                    {related.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BlogArticle;

