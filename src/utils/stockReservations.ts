import { ref, runTransaction, set } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

export interface StockReservationResult {
  success: boolean;
  code?: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND' | 'INVALID_REQUEST' | 'ERROR';
  message?: string;
  reservationId?: string;
}

interface ReserveOptions {
  userId?: string;
  orderId?: string;
}

/**
 * Reserva stock de un producto de forma atómica en Realtime Database.
 * - Decrementa stock (y bundles si aplica) en /products/{productId}
 * - Crea un registro en /stockReservations/{productId}/{reservationId}
 *
 * IMPORTANTE: Este módulo solo se usa para productos de tienda (no subastas).
 */
export const reserveStock = async (
  productId: string,
  quantity: number,
  options: ReserveOptions = {}
): Promise<StockReservationResult> => {
  try {
    if (!productId || quantity <= 0) {
      return {
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Solicitud de reserva inválida'
      };
    }

    const productRef = ref(realtimeDb, `products/${productId}`);

    // Transacción atómica sobre el nodo del producto
    const txResult = await runTransaction(productRef, (current: any) => {
      if (!current) {
        return current;
      }

      const currentStock = typeof current.stock === 'number' ? current.stock : 0;

      if (quantity > currentStock) {
        // No hay stock suficiente: cancelar transacción
        return;
      }

      const updated: any = {
        ...current,
        stock: currentStock - quantity
      };

      // Si el producto se maneja por bultos, recalcular bundles
      if (current.unitsPerBundle && current.unitsPerBundle > 0 && current.bundles != null) {
        const unitsPerBundle = current.unitsPerBundle as number;
        const currentBundles = current.bundles as number;
        const unitsVendidas = quantity;
        const bundlesVendidos = Math.ceil(unitsVendidas / unitsPerBundle);
        const newBundles = Math.max(0, currentBundles - bundlesVendidos);
        updated.bundles = newBundles;
        // Recalcular stock en base a bultos restantes si el negocio lo requiere
        // updated.stock = newBundles * unitsPerBundle;
      }

      // Actualizar stockTotal si no existe
      if (updated.stockTotal == null) {
        updated.stockTotal = currentStock;
      }

      return updated;
    });

    if (!txResult.committed || !txResult.snapshot.exists()) {
      const val: any = txResult.snapshot?.val();
      const currentStock = val && typeof val.stock === 'number' ? val.stock : 0;

      if (currentStock < quantity) {
        return {
          success: false,
          code: 'INSUFFICIENT_STOCK',
          message: 'No hay stock suficiente para completar la reserva'
        };
      }

      return {
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado o no disponible'
      };
    }

    // Crear registro de reserva (no transaccional, pero aceptable como log)
    const reservationId = `RSV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const expiresAt = now + 30 * 60 * 1000; // 30 minutos

    const reservationRef = ref(
      realtimeDb,
      `stockReservations/${productId}/${reservationId}`
    );

    await set(reservationRef, {
      id: reservationId,
      productId,
      quantity,
      userId: options.userId || null,
      orderId: options.orderId || null,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      released: false
    });

    return {
      success: true,
      reservationId
    };
  } catch (error) {
    console.error('❌ Error reservando stock:', error);
    return {
      success: false,
      code: 'ERROR',
      message: 'Error inesperado reservando stock'
    };
  }
};

/**
 * Restaura stock para un pedido cancelado/expirado.
 * No depende de reservationId: simplemente suma la cantidad al stock del producto
 * y ajusta bundles si corresponde.
 */
export const restoreStockForOrder = async (
  productId: string,
  quantity: number
): Promise<void> => {
  try {
    if (!productId || quantity <= 0) return;

    const productRef = ref(realtimeDb, `products/${productId}`);

    await runTransaction(productRef, (current: any) => {
      if (!current) return current;

      const currentStock = typeof current.stock === 'number' ? current.stock : 0;
      const updated: any = {
        ...current,
        stock: currentStock + quantity
      };

      if (current.unitsPerBundle && current.unitsPerBundle > 0 && current.bundles != null) {
        const unitsPerBundle = current.unitsPerBundle as number;
        const currentBundles = current.bundles as number;
        const bundlesToAdd = Math.ceil(quantity / unitsPerBundle);
        updated.bundles = currentBundles + bundlesToAdd;
      }

      return updated;
    });
  } catch (error) {
    console.error('❌ Error restaurando stock para pedido:', error);
  }
};


