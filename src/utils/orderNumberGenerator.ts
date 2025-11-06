/**
 * Generador de números únicos de pedido (tipo factura/remito)
 * Formato: ORD-YYYYMMDD-XXXX (ej: ORD-20241215-0001)
 */

import { ref, get as firebaseGet, set as firebaseSet } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

/**
 * Obtiene el siguiente número secuencial para el día actual
 */
async function getNextSequenceNumber(): Promise<number> {
  const today = new Date();
  const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const sequenceRef = ref(realtimeDb, `orderSequences/${dateKey}`);
  
  try {
    const snapshot = await firebaseGet(sequenceRef);
    const currentSequence = snapshot.exists() ? snapshot.val() : 0;
    const nextSequence = currentSequence + 1;
    
    // Guardar el nuevo número de secuencia
    await firebaseSet(sequenceRef, nextSequence);
    
    return nextSequence;
  } catch (error) {
    console.error('Error obteniendo número de secuencia:', error);
    // Fallback: usar timestamp como secuencia
    return Date.now() % 10000;
  }
}

/**
 * Genera un número único de pedido
 * Formato: ORD-YYYYMMDD-XXXX (ej: ORD-20241215-0001)
 */
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  
  const sequence = await getNextSequenceNumber();
  const sequencePart = String(sequence).padStart(4, '0');
  
  return `ORD-${datePart}-${sequencePart}`;
}

/**
 * Formatea un número de pedido para mostrar
 */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber;
}

