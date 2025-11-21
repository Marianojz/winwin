/**
 * Componente de Recomendaciones Personalizadas
 * Muestra productos recomendados basados en los likes del usuario
 */

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../store/useStore';
import { getPersonalizedRecommendations, getCategoryRecommendations, Recommendation } from '../utils/recommendations';
import ProductCard from './ProductCard';
import './PersonalizedRecommendations.css';

interface PersonalizedRecommendationsProps {
  limit?: number;
  showCategories?: boolean;
}

const PersonalizedRecommendations = ({ 
  limit = 10, 
  showCategories = true 
}: PersonalizedRecommendationsProps) => {
  const { user, products } = useStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [categoryRecommendations, setCategoryRecommendations] = useState<{ category: string; products: Product[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || products.length === 0) {
      setLoading(false);
      return;
    }

    const loadRecommendations = async () => {
      setLoading(true);
      try {
        // Obtener recomendaciones personalizadas
        const personalized = await getPersonalizedRecommendations(user.id, products, limit);
        setRecommendations(personalized);

        // Obtener recomendaciones por categoría
        if (showCategories) {
          const categoryRecs = await getCategoryRecommendations(user.id, products, 5);
          setCategoryRecommendations(categoryRecs);
        }
      } catch (error) {
        console.error('Error cargando recomendaciones:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [user?.id, products, limit, showCategories]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="recommendations-loading">
        <div className="loading-spinner"></div>
        <p>Cargando recomendaciones para ti...</p>
      </div>
    );
  }

  if (recommendations.length === 0 && categoryRecommendations.length === 0) {
    return (
      <div className="recommendations-empty">
        <Sparkles size={48} />
        <h3>¡Comienza a dar likes!</h3>
        <p>Dale like a los productos que te gusten y te mostraremos recomendaciones personalizadas</p>
      </div>
    );
  }

  return (
    <div className="personalized-recommendations">
      {/* Recomendaciones Personalizadas Generales */}
      {recommendations.length > 0 && (
        <section className="recommendations-section">
          <div className="recommendations-header">
            <div className="recommendations-title">
              <Sparkles size={24} />
              <h2>Recomendado para ti</h2>
            </div>
            <p className="recommendations-subtitle">
              Basado en tus gustos y preferencias
            </p>
          </div>
          
          <div className="recommendations-grid">
            {recommendations.map((rec) => (
              <div key={rec.product.id} className="recommendation-item">
                <ProductCard product={rec.product} />
                <div className="recommendation-reason">
                  <TrendingUp size={14} />
                  <span>{rec.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recomendaciones por Categoría */}
      {showCategories && categoryRecommendations.length > 0 && (
        <>
          {categoryRecommendations.map((categoryRec) => (
            <section key={categoryRec.category} className="recommendations-section category-section">
              <div className="recommendations-header">
                <div className="recommendations-title">
                  <h3>Más de {categoryRec.category}</h3>
                </div>
                <p className="recommendations-subtitle">
                  Porque te gustan productos de esta categoría
                </p>
              </div>
              
              <div className="recommendations-grid">
                {categoryRec.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
};

export default PersonalizedRecommendations;

