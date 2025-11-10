import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/helpers';
import { useStore } from '../store/useStore';
import { trackProductClick } from '../utils/tracking';
import { getStickerById } from '../utils/stickers';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart, addNotification, user } = useStore();

  const handleClick = () => {
    // Registrar click en el tracking system
    trackProductClick(product.id, product.name, user?.id, user?.username);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product, 1);
    addNotification({
      userId: 'current',
      type: 'purchase',
      title: 'Agregado al carrito',
      message: `${product.name} fue agregado al carrito`,
      read: false
    });
  };

  return (
    <Link 
      to={`/producto/${product.id}`} 
      className="product-card hover-lift fade-in"
      onClick={handleClick}
    >
      <div className="product-card-image">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        
        {/* Stickers/Emojis */}
        {product.stickers && product.stickers.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            zIndex: 10
          }}>
            {product.stickers.map((stickerId) => {
              const sticker = getStickerById(stickerId);
              if (!sticker) return null;
              return (
                <div
                  key={stickerId}
                  style={{
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    padding: '0.375rem 0.625rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{sticker.icon}</span>
                  <span>{sticker.label.split(' ')[1] || sticker.label}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {product.stock < 5 && product.stock > 0 && (
          <div className="product-badge badge-warning">
            ¡Últimas unidades!
          </div>
        )}
        {product.stock === 0 && (
          <div className="product-badge badge-error">
            Sin stock
          </div>
        )}
      </div>

      <div className="product-card-content">
        <h3 className="product-card-title">{product.name}</h3>
        <p className="product-card-description">{product.description}</p>

        {product.averageRating > 0 && (
          <div className="product-rating">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                fill={i < product.averageRating ? 'var(--warning)' : 'none'}
                color={i < product.averageRating ? 'var(--warning)' : 'var(--text-tertiary)'}
              />
            ))}
            <span className="rating-count">({product.ratings.length})</span>
          </div>
        )}

        <div className="product-card-price">
          <span className="product-price">{formatCurrency(product.price)}</span>
          <span className="product-stock">{product.stock} disponibles</span>
        </div>

        <div className="product-card-actions">
          <button
            onClick={handleAddToCart}
            className="btn btn-outline"
            disabled={product.stock === 0}
          >
            <ShoppingCart size={18} />
            Agregar
          </button>
          <button className="btn btn-primary">
            Ver Detalles
          </button>
        </div>
      </div>

            <style>{`
        .product-card {
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 2px 8px var(--shadow);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid var(--border);
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px var(--shadow-lg);
          border-color: var(--primary);
        }

        .product-card-image {
          position: relative;
          width: 100%;
          padding-top: 66.67%;
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .product-card-image img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-card-image img {
          transform: scale(1.05);
        }

        .product-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-weight: 600;
        }

        .badge-warning {
          background: rgba(245, 158, 11, 0.9);
          color: white;
        }

        .badge-error {
          background: rgba(239, 68, 68, 0.9);
          color: white;
        }

        .product-card-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .product-card-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.3em;
        }

        .product-card-description {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .rating-count {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-left: 0.25rem;
        }

        .product-card-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
        }

        .product-price {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Poppins', sans-serif;
        }

        .product-stock {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .product-card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .product-card-actions .btn {
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
        }

        @media (max-width: 768px) {
          .product-card-content {
            padding: 0.75rem;
            gap: 0.375rem;
          }
          
          .product-card-title {
            font-size: 0.8125rem;
          }
          
          .product-price {
            font-size: 1rem;
          }
          
          .product-card-actions .btn {
            padding: 0.4375rem 0.625rem;
            font-size: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .product-card-content {
            padding: 0.5rem;
          }
          
          .product-card-actions {
            gap: 0.375rem;
          }
        }
      `}</style>
    </Link>
  );
};

export default ProductCard;
