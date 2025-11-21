/**
 * Página de Mis Favoritos
 * Muestra todos los productos que el usuario le dio like
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getUserLikes, UserLike } from '../utils/likes';
import ProductCard from '../components/ProductCard';
import { useSEO } from '../hooks/useSEO';
import './MisFavoritos.css';

const MisFavoritos = () => {
  const { user, products } = useStore();
  const navigate = useNavigate();
  const [likes, setLikes] = useState<UserLike[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: 'Mis Favoritos | Clikio',
    description: 'Productos que te gustaron y guardaste en tus favoritos',
    url: 'https://www.clickio.com.ar/mis-favoritos',
    type: 'website'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadLikes = async () => {
      setLoading(true);
      try {
        const userLikes = await getUserLikes(user.id);
        setLikes(userLikes);
      } catch (error) {
        console.error('Error cargando favoritos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLikes();
  }, [user, navigate]);

  // Obtener productos que están liked
  const likedProducts = products.filter(p => 
    likes.some(like => like.productId === p.id)
  );

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="mis-favoritos-page">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando tus favoritos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-favoritos-page">
      <div className="container">
        <div className="page-header">
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="header-content">
            <div className="header-icon">
              <Heart size={32} fill="currentColor" />
            </div>
            <div>
              <h1>Mis Favoritos</h1>
              <p className="subtitle">
                {likedProducts.length === 0 
                  ? 'Aún no tenés productos favoritos'
                  : `${likedProducts.length} producto${likedProducts.length !== 1 ? 's' : ''} que te gustan`
                }
              </p>
            </div>
          </div>
        </div>

        {likedProducts.length === 0 ? (
          <div className="empty-state">
            <Heart size={64} />
            <h2>No tenés favoritos aún</h2>
            <p>Dale like a los productos que te gusten y aparecerán aquí</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/tienda')}
            >
              <ShoppingBag size={20} />
              Explorar Productos
            </button>
          </div>
        ) : (
          <div className="favorites-grid">
            {likedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisFavoritos;

