import { ref, get, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Product, Rating, ProductReview } from '../types';
import { calculateAverageRating, generateId } from './helpers';

export const submitProductReview = async (
  orderId: string,
  productId: string,
  productName: string,
  productImage: string | undefined,
  userId: string,
  username: string,
  rating: number,
  comment: string
): Promise<ProductReview> => {
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('La calificación debe estar entre 1 y 5 estrellas.');
  }

  const productRef = ref(realtimeDb, `products/${productId}`);
  const snapshot = await get(productRef);
  if (!snapshot.exists()) {
    throw new Error('Producto no encontrado para reseñar.');
  }

  const productData = snapshot.val() as Product & { ratings?: Rating[] };
  const existingRatings: Rating[] = (productData.ratings || []).map((r: any) => ({
    userId: r.userId,
    username: r.username,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
  }));

  const now = new Date();
  const newRating: Rating = {
    userId,
    username,
    rating,
    comment,
    createdAt: now
  };

  const updatedRatings = [...existingRatings, newRating];
  const averageRating = calculateAverageRating(updatedRatings);

  await update(productRef, {
    ratings: updatedRatings.map(r => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt
    })),
    averageRating
  });

  // Guardar una copia resumida de la reseña por orden/usuario para consultas rápidas
  const reviewId = generateId();
  const review: ProductReview = {
    id: reviewId,
    orderId,
    productId,
    productName,
    productImage,
    userId,
    username,
    rating,
    comment,
    createdAt: now
  };

  const reviewRef = ref(realtimeDb, `reviews/${userId}/${orderId}/${reviewId}`);
  await update(reviewRef, {
    ...review,
    createdAt: now.toISOString()
  });

  return review;
};


