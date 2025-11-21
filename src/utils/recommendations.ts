/**
 * Sistema de Recomendaciones Personalizadas
 * Basado en los likes del usuario y análisis de categorías
 */

import { Product } from '../types';
import { getUserLikes, UserLike } from './likes';

export interface Recommendation {
  product: Product;
  reason: string;
  score: number;
}

/**
 * Analizar las categorías favoritas del usuario basado en sus likes
 */
function analyzeUserPreferences(likes: UserLike[]): {
  categories: { [category: string]: number };
  totalLikes: number;
} {
  const categories: { [category: string]: number } = {};
  let totalLikes = likes.length;

  likes.forEach(like => {
    const category = like.productCategory || 'general';
    categories[category] = (categories[category] || 0) + 1;
  });

  return { categories, totalLikes };
}

/**
 * Calcular similitud entre productos basado en categoría y características
 */
function calculateProductSimilarity(
  likedProduct: UserLike,
  candidateProduct: Product
): number {
  let score = 0;

  // Misma categoría = alta similitud
  const likedCategory = likedProduct.productCategory || 'general';
  const candidateCategory = candidateProduct.categoryId || 'general';
  
  if (likedCategory === candidateCategory) {
    score += 50;
  }

  // Similitud en el nombre (palabras clave comunes)
  const likedWords = likedProduct.productName.toLowerCase().split(/\s+/);
  const candidateWords = candidateProduct.name.toLowerCase().split(/\s+/);
  
  const commonWords = likedWords.filter(word => 
    word.length > 3 && candidateWords.includes(word)
  );
  
  if (commonWords.length > 0) {
    score += commonWords.length * 10;
  }

  // Similitud en precio (rango similar)
  if (likedProduct.productId !== candidateProduct.id) {
    // Si el producto candidato está en un rango de precio similar, agregar puntos
    // (esto se puede mejorar con más datos)
    score += 5;
  }

  return score;
}

/**
 * Generar recomendaciones personalizadas para un usuario
 */
export async function getPersonalizedRecommendations(
  userId: string,
  allProducts: Product[],
  limit: number = 10
): Promise<Recommendation[]> {
  try {
    if (!userId) {
      return [];
    }

    // Obtener likes del usuario
    const userLikes = await getUserLikes(userId);

    if (userLikes.length === 0) {
      // Si no tiene likes, retornar productos populares o aleatorios
      return [];
    }

    // Analizar preferencias del usuario
    const { categories, totalLikes } = analyzeUserPreferences(userLikes);
    
    // Obtener IDs de productos que ya le gustaron
    const likedProductIds = new Set(userLikes.map(like => like.productId));

    // Calcular score para cada producto candidato
    const recommendations: Recommendation[] = [];

    for (const product of allProducts) {
      // Saltar productos que ya le gustaron
      if (likedProductIds.has(product.id)) {
        continue;
      }

      let totalScore = 0;
      const reasons: string[] = [];

      // Score basado en categoría favorita
      const productCategory = product.categoryId || 'general';
      if (categories[productCategory]) {
        const categoryWeight = (categories[productCategory] / totalLikes) * 100;
        totalScore += categoryWeight;
        reasons.push(`Te gustan productos de ${productCategory}`);
      }

      // Score basado en similitud con productos que le gustaron
      let maxSimilarity = 0;
      for (const likedProduct of userLikes) {
        const similarity = calculateProductSimilarity(likedProduct, product);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }
      totalScore += maxSimilarity;

      if (maxSimilarity > 30) {
        reasons.push('Similar a productos que te gustaron');
      }

      // Bonus por ser producto nuevo o popular
      if (product.featured) {
        totalScore += 10;
        reasons.push('Producto destacado');
      }

      if (totalScore > 0) {
        recommendations.push({
          product,
          reason: reasons.length > 0 ? reasons[0] : 'Recomendado para ti',
          score: totalScore
        });
      }
    }

    // Ordenar por score (descendente)
    recommendations.sort((a, b) => b.score - a.score);

    // Retornar los mejores
    return recommendations.slice(0, limit);
  } catch (error) {
    console.error('❌ Error generando recomendaciones:', error);
    return [];
  }
}

/**
 * Obtener recomendaciones por categoría favorita
 */
export async function getCategoryRecommendations(
  userId: string,
  allProducts: Product[],
  limit: number = 5
): Promise<{ category: string; products: Product[] }[]> {
  try {
    if (!userId) {
      return [];
    }

    const userLikes = await getUserLikes(userId);
    if (userLikes.length === 0) {
      return [];
    }

    const { categories } = analyzeUserPreferences(userLikes);
    const likedProductIds = new Set(userLikes.map(like => like.productId));

    // Ordenar categorías por frecuencia
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3 categorías

    const recommendations: { category: string; products: Product[] }[] = [];

    for (const [category, count] of sortedCategories) {
      const categoryProducts = allProducts
        .filter(p => (p.categoryId || 'general') === category)
        .filter(p => !likedProductIds.has(p.id))
        .slice(0, limit);

      if (categoryProducts.length > 0) {
        recommendations.push({
          category,
          products: categoryProducts
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error('❌ Error obteniendo recomendaciones por categoría:', error);
    return [];
  }
}

/**
 * Obtener productos similares a uno específico
 */
export function getSimilarProducts(
  product: Product,
  allProducts: Product[],
  limit: number = 5
): Product[] {
  const similarProducts: { product: Product; score: number }[] = [];

  for (const candidate of allProducts) {
    if (candidate.id === product.id) {
      continue;
    }

    let score = 0;

    // Misma categoría
    if ((candidate.categoryId || 'general') === (product.categoryId || 'general')) {
      score += 50;
    }

    // Palabras clave similares en el nombre
    const productWords = product.name.toLowerCase().split(/\s+/);
    const candidateWords = candidate.name.toLowerCase().split(/\s+/);
    
    const commonWords = productWords.filter(word => 
      word.length > 3 && candidateWords.includes(word)
    );
    
    score += commonWords.length * 15;

    // Precio similar (rango)
    const priceDiff = Math.abs((candidate.price || 0) - (product.price || 0));
    const maxPrice = Math.max(product.price || 0, candidate.price || 0);
    if (maxPrice > 0) {
      const priceSimilarity = 1 - (priceDiff / maxPrice);
      score += priceSimilarity * 20;
    }

    if (score > 20) {
      similarProducts.push({ product: candidate, score });
    }
  }

  // Ordenar por score
  similarProducts.sort((a, b) => b.score - a.score);

  return similarProducts.slice(0, limit).map(item => item.product);
}

