/**
 * Utilidades para cancelar pedidos
 * Maneja la restauración de stock y actualización de estado
 */

import { Order, OrderStatus } from '../types';
import { restoreStockForOrder } from './stockReservations';
import { logOrderStatusChange } from './orderTransactions';
import { logOrderAction } from './actionLogger';
import { ref, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

/**
 * Estados en los que se puede cancelar un pedido
 */
const CANCELLABLE_STATUSES: OrderStatus[] = [
  'pending_payment',
  'payment_confirmed',
  'processing',
  'preparing'
];

/**
 * Verifica si un pedido puede ser cancelado
 */
export const canCancelOrder = (order: Order): boolean => {
  return CANCELLABLE_STATUSES.includes(order.status);
};

/**
 * Cancela un pedido:
 * 1. Valida que se pueda cancelar
 * 2. Restaura el stock si es producto de tienda
 * 3. Actualiza el estado a 'cancelled'
 * 4. Registra la acción en el log
 */
export const cancelOrder = async (
  order: Order,
  options: {
    userId?: string;
    userName?: string;
    reason?: string;
  } = {}
): Promise<{ success: boolean; message: string }> => {
  try {
    // Validar que se puede cancelar
    if (!canCancelOrder(order)) {
      return {
        success: false,
        message: `No se puede cancelar un pedido con estado "${order.status}". Solo se pueden cancelar pedidos pendientes de pago, con pago confirmado, en procesamiento o en preparación.`
      };
    }

    // Restaurar stock si es producto de tienda
    if (order.productType === 'store' && order.quantity && order.quantity > 0) {
      try {
        await restoreStockForOrder(order.productId, order.quantity);
        console.log(`✅ Stock restaurado para pedido ${order.id}: ${order.quantity} unidades`);
      } catch (error) {
        console.error('❌ Error restaurando stock:', error);
        // Continuar con la cancelación aunque falle la restauración de stock
      }
    }

    // Actualizar estado en Firebase
    // El listener de Firebase sincronizará automáticamente el store
    const orderRef = ref(realtimeDb, `orders/${order.id}`);
    await update(orderRef, {
      status: 'cancelled'
    });

    // Registrar en el log de transacciones
    if (order.orderNumber) {
      try {
        await logOrderStatusChange(
          order.id,
          order.orderNumber,
          order.userId,
          order.userName,
          'cancelled',
          order.amount,
          order.status,
          'cancelled',
          options.userId,
          options.userName
        );
      } catch (error) {
        console.error('Error registrando cambio de estado:', error);
      }
    }

    // Registrar acción en el log de acciones
    try {
      await logOrderAction(
        'Pedido cancelado',
        order.id,
        options.userId || order.userId,
        options.userName || order.userName,
        {
          previousStatus: order.status,
          newStatus: 'cancelled',
          reason: options.reason || 'Cancelado por el usuario',
          productName: order.productName,
          amount: order.amount
        }
      );
    } catch (error) {
      console.error('Error registrando acción:', error);
    }

    return {
      success: true,
      message: 'Pedido cancelado correctamente'
    };
  } catch (error: any) {
    console.error('❌ Error cancelando pedido:', error);
    return {
      success: false,
      message: error.message || 'Error desconocido al cancelar el pedido'
    };
  }
};

