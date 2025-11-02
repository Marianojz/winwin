import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/helpers';
import { useStore } from '../store/useStore';
import { trackProductClick } from '../utils/tracking';

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
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 12px var(--shadow);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .product-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px var(--shadow-lg);
        }

        .product-card-image {
          position: relative;
          width: 100%;
          padding-top: 75%;
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
          font-size: 0.8125rem;
        }

        .product-card-content {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }

        .product-card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-card-description {
          font-size: 0.875rem;
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
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-left: 0.25rem;
        }

        .product-card-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border);
        }

        .product-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Poppins', sans-serif;
        }

        .product-stock {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .product-card-actions {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.5rem;
        }

        .product-card-actions .btn {
          padding: 0.625rem 1rem;
        }
      `}</style>
    </Link>
  );
};

export default ProductCard;
