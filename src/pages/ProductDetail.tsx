import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Package, ChevronLeft, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, addNotification, isAuthenticated } = useStore();
  
  const product = products.find(p => p.id === id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={64} color="var(--error)" style={{ marginBottom: '1rem' }} />
          <h2>Producto no encontrado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>El producto que buscas no existe o fue eliminado.</p>
          <button onClick={() => navigate('/tienda')} className="btn btn-primary">
            Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (quantity > product.stock) {
      alert(`Solo hay ${product.stock} unidades disponibles`);
      return;
    }

    addToCart(product, quantity);
    addNotification({
      userId: 'current',
      type: 'purchase',
      title: 'Agregado al carrito',
      message: `${product.name} (x${quantity}) agregado al carrito`,
      read: false
    });
    alert('¡Producto agregado al carrito! 🛒');
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (quantity > product.stock) {
      alert(`Solo hay ${product.stock} unidades disponibles`);
      return;
    }

    const confirm = window.confirm(
      `¿Confirmas la compra de ${quantity} unidad(es) por ${formatCurrency(product.price * quantity)}?\n\nSerás redirigido a MercadoPago para completar el pago.`
    );
    
    if (confirm) {
      addNotification({
        userId: 'current',
        type: 'purchase',
        title: 'Compra realizada',
        message: `Compraste ${product.name} (x${quantity}) por ${formatCurrency(product.price * quantity)}`,
        read: false
      });
      alert('Redirigiendo a MercadoPago...');
      // Aquí iría la integración real con MercadoPago
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '1rem 0' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        <button 
          onClick={() => navigate('/tienda')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: 'transparent',
            color: 'var(--text-secondary)',
            padding: '0.5rem 0',
            marginBottom: '1rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          <ChevronLeft size={18} />
          Volver a la Tienda
        </button>

        <div className="product-detail-grid">
          {/* Galería de Imágenes */}
          <div className="product-images">
            <div className="main-image">
              <img 
                src={product.images[selectedImage]} 
                alt={product.name}
              />
            </div>
            {product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={selectedImage === idx ? 'thumbnail active' : 'thumbnail'}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del Producto */}
          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>

            {/* Rating */}
            {product.averageRating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      fill={i < product.averageRating ? 'var(--warning)' : 'none'}
                      color={i < product.averageRating ? 'var(--warning)' : 'var(--text-tertiary)'}
                    />
                  ))}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                  ({product.ratings.length} {product.ratings.length === 1 ? 'reseña' : 'reseñas'})
                </span>
              </div>
            )}

            {/* Stock */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {product.stock > 0 ? (
                <>
                  <span className="badge badge-success">
                    <Package size={14} />
                    En Stock
                  </span>
                  {product.stock < 5 && (
                    <span className="badge badge-warning">
                      ¡Solo {product.stock} disponibles!
                    </span>
                  )}
                </>
              ) : (
                <span className="badge badge-error">Sin Stock</span>
              )}
            </div>

            {/* Precio */}
            <div className="price-box">
              <div className="price-label">Precio</div>
              <div className="price-amount">
                {formatCurrency(product.price)}
              </div>
              {quantity > 1 && (
                <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
                  Total: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(product.price * quantity)}</strong>
                </div>
              )}
            </div>

            {/* Cantidad y Compra */}
            {product.stock > 0 && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={24} />
                  Comprar Producto
                </h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Cantidad
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="btn btn-outline"
                      style={{ padding: '0.75rem 1.25rem', fontSize: '1.25rem' }}
                    >
                      −
                    </button>
                    <input 
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                      min="1"
                      max={product.stock}
                      style={{ width: '80px', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', fontSize: '1.125rem', fontWeight: 600 }}
                    />
                    <button 
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="btn btn-outline"
                      style={{ padding: '0.75rem 1.25rem', fontSize: '1.25rem' }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Disponibles: {product.stock} unidades
                  </div>
                </div>

                <button onClick={handleAddToCart} className="btn btn-outline" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', marginBottom: '0.75rem' }}>
                  <ShoppingCart size={20} />
                  Agregar al Carrito
                </button>

                <button onClick={handleBuyNow} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
                  <CreditCard size={20} />
                  Comprar Ahora
                </button>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
                  El carrito no asegura el stock
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="product-description">
          <h2 style={{ marginBottom: '1rem' }}>Descripción del Producto</h2>
          <p style={{ fontSize: '1.0625rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
            {product.description}
          </p>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Información de Compra</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Stock en tiempo real</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Pago seguro con MercadoPago</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>El carrito no asegura el stock hasta completar la compra</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Precio: {formatCurrency(product.price)} por unidad</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Reseñas */}
        {product.ratings.length > 0 && (
          <div style={{ marginTop: '2rem', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Reseñas de Clientes ({product.ratings.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {product.ratings.map((rating, index) => (
                <div key={index} style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{rating.username}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {formatTimeAgo(rating.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.125rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          fill={i < rating.rating ? 'var(--warning)' : 'none'}
                          color={i < rating.rating ? 'var(--warning)' : 'var(--text-tertiary)'}
                        />
                      ))}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{rating.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .product-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: start;
        }

        .product-images {
          position: sticky;
          top: 1rem;
        }

        .main-image {
          background: var(--bg-secondary);
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 1rem;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-thumbnails {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 0.75rem;
        }

        .thumbnail {
          background: var(--bg-secondary);
          border: 2px solid transparent;
          border-radius: 0.75rem;
          overflow: hidden;
          aspect-ratio: 1;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
        }

        .thumbnail.active {
          border-color: var(--primary);
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-title {
          margin-bottom: 1rem;
          font-size: 1.75rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .price-box {
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: 1rem;
          margin-bottom: 1.5rem;
        }

        .price-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .price-amount {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Poppins', sans-serif;
        }

        .product-description {
          margin-top: 2rem;
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: 1rem;
        }

        @media (max-width: 768px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .product-images {
            position: relative;
            top: 0;
          }

          .main-image {
            margin-bottom: 0.75rem;
          }

          .image-thumbnails {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }

          .product-title {
            font-size: 1.5rem;
            margin-bottom: 0.75rem;
          }

          .price-box {
            padding: 1.25rem;
            margin-bottom: 1.25rem;
          }

          .price-amount {
            font-size: 1.75rem;
          }

          .product-description {
            margin-top: 1.5rem;
            padding: 1.25rem;
          }

          .product-description h2 {
            font-size: 1.25rem;
          }

          .product-description p {
            font-size: 0.9375rem;
            line-height: 1.6;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
        }

        @media (max-width: 480px) {
          .product-title {
            font-size: 1.25rem;
          }

          .price-amount {
            font-size: 1.5rem;
          }

          .image-thumbnails {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;
