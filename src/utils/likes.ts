/**
 * Sistema de Likes y Recomendaciones Personalizadas
 * Guarda los likes de los usuarios en Firebase Realtime Database
 * y proporciona recomendaciones basadas en sus preferencias
 */

import { ref, set, get, push, remove, query, orderByChild, equalTo, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Product } from '../types';

export interface UserLike {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  productCategory: string;
  timestamp: Date;
}

export interface LikeStats {
  productId: string;
  productName: string;
  category: string;
  likeCount: number;
  userLiked: boolean;
}

/**
 * Guardar un like de un usuario
 */
export async function likeProduct(
  userId: string,
  product: Product
): Promise<void> {
  try {
    if (!userId || !product) {
      throw new Error('Usuario o producto no válido');
    }

    const likeRef = ref(realtimeDb, `user_likes/${userId}/${product.id}`);
    const likeData = {
      productId: product.id,
      productName: product.name,
      productCategory: product.categoryId || 'general',
      timestamp: new Date().toISOString()
    };

    await set(likeRef, likeData);

    // Actualizar contador de likes del producto
    const productLikesRef = ref(realtimeDb, `product_likes/${product.id}/${userId}`);
    await set(productLikesRef, {
      userId,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Like guardado:', { userId, productId: product.id });
  } catch (error) {
    console.error('❌ Error guardando like:', error);
    throw error;
  }
}

/**
 * Quitar un like de un usuario
 */
export async function unlikeProduct(
  userId: string,
  productId: string
): Promise<void> {
  try {
    if (!userId || !productId) {
      throw new Error('Usuario o producto no válido');
    }

    const likeRef = ref(realtimeDb, `user_likes/${userId}/${productId}`);
    await remove(likeRef);

    // Actualizar contador de likes del producto
    const productLikesRef = ref(realtimeDb, `product_likes/${productId}/${userId}`);
    await remove(productLikesRef);

    console.log('✅ Like eliminado:', { userId, productId });
  } catch (error) {
    console.error('❌ Error eliminando like:', error);
    throw error;
  }
}

/**
 * Verificar si un usuario le dio like a un producto
 */
export async function isProductLiked(
  userId: string,
  productId: string
): Promise<boolean> {
  try {
    if (!userId || !productId) {
      return false;
    }

    const likeRef = ref(realtimeDb, `user_likes/${userId}/${productId}`);
    const snapshot = await get(likeRef);
    return snapshot.exists();
  } catch (error: any) {
    // Si es un error de permisos y el path no existe aún, es normal (no hay likes)
    if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('Permission denied')) {
      // Esto puede ocurrir si las reglas no están desplegadas o si el path no existe
      // En este caso, asumimos que no hay like (comportamiento seguro)
      console.warn('⚠️ No se pudo verificar like (puede ser normal si no hay likes aún):', error.message);
      return false;
    }
    console.error('❌ Error verificando like:', error);
    return false;
  }
}

/**
 * Obtener todos los likes de un usuario
 */
export async function getUserLikes(userId: string): Promise<UserLike[]> {
  try {
    if (!userId) {
      return [];
    }

    const likesRef = ref(realtimeDb, `user_likes/${userId}`);
    const snapshot = await get(likesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const likesData = snapshot.val();
    const likes: UserLike[] = [];

    for (const [productId, likeData] of Object.entries(likesData)) {
      const like = likeData as any;
      likes.push({
        id: productId,
        userId,
        productId,
        productName: like.productName || '',
        productCategory: like.productCategory || 'general',
        timestamp: new Date(like.timestamp)
      });
    }

    // Ordenar por fecha más reciente
    likes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return likes;
  } catch (error) {
    console.error('❌ Error obteniendo likes:', error);
    return [];
  }
}

/**
 * Suscribirse a los likes de un usuario en tiempo real
 */
export function subscribeToUserLikes(
  userId: string,
  callback: (likes: UserLike[]) => void
): () => void {
  if (!userId) {
    return () => {};
  }

  const likesRef = ref(realtimeDb, `user_likes/${userId}`);
  
  const unsubscribe = onValue(likesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const likesData = snapshot.val();
    const likes: UserLike[] = [];

    for (const [productId, likeData] of Object.entries(likesData)) {
      const like = likeData as any;
      likes.push({
        id: productId,
        userId,
        productId,
        productName: like.productName || '',
        productCategory: like.productCategory || 'general',
        timestamp: new Date(like.timestamp)
      });
    }

    // Ordenar por fecha más reciente
    likes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    callback(likes);
  }, (error) => {
    console.error('❌ Error en listener de likes:', error);
    callback([]);
  });

  return () => {
    off(likesRef);
  };
}

/**
 * Obtener estadísticas de likes de un producto
 */
export async function getProductLikeStats(
  productId: string,
  userId?: string
): Promise<LikeStats> {
  try {
    const productLikesRef = ref(realtimeDb, `product_likes/${productId}`);
    const snapshot = await get(productLikesRef);

    let likeCount = 0;
    let userLiked = false;

    if (snapshot.exists()) {
      const likesData = snapshot.val();
      likeCount = Object.keys(likesData).length;
      
      if (userId && likesData[userId]) {
        userLiked = true;
      }
    }

    // Obtener información del producto desde los likes del usuario
    let productName = '';
    let category = 'general';

    if (userId) {
      const userLikeRef = ref(realtimeDb, `user_likes/${userId}/${productId}`);
      const userLikeSnapshot = await get(userLikeRef);
      if (userLikeSnapshot.exists()) {
        const likeData = userLikeSnapshot.val();
        productName = likeData.productName || '';
        category = likeData.productCategory || 'general';
      }
    }

    return {
      productId,
      productName,
      category,
      likeCount,
      userLiked
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de likes:', error);
    return {
      productId,
      productName: '',
      category: 'general',
      likeCount: 0,
      userLiked: false
    };
  }
}

/**
 * Obtener productos más populares (más likes)
 */
export async function getPopularProducts(limit: number = 10): Promise<string[]> {
  try {
    const productLikesRef = ref(realtimeDb, 'product_likes');
    const snapshot = await get(productLikesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const productsData = snapshot.val();
    const productStats: { productId: string; likeCount: number }[] = [];

    for (const [productId, likesData] of Object.entries(productsData)) {
      const likes = likesData as any;
      const likeCount = Object.keys(likes).length;
      productStats.push({ productId, likeCount });
    }

    // Ordenar por cantidad de likes (descendente)
    productStats.sort((a, b) => b.likeCount - a.likeCount);

    // Retornar los IDs de los productos más populares
    return productStats.slice(0, limit).map(stat => stat.productId);
  } catch (error) {
    console.error('❌ Error obteniendo productos populares:', error);
    return [];
  }
}

