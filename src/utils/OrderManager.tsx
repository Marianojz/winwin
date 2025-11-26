import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { triggerRuleBasedNotification } from './notificationRules';
import { restoreStockForOrder } from './stockReservations';

/**
 * Gestor automático de órdenes
 * Revisa cada minuto si hay órdenes que expiraron
 */
const OrderManager = () => {
  const { orders, auctions, products, updateOrderStatus, setAuctions, addNotification } = useStore();

  useEffect(() => {
    const checkExpiredOrders = () => {
      const now = new Date();

      orders.forEach(order => {
        // Solo revisar órdenes pendientes de pago
        if (order.status === 'pending_payment' && order.expiresAt) {
          const expiresAt = new Date(order.expiresAt);
          
          // Si expiró el plazo de pago
          if (expiresAt <= now) {
            console.log(`⌛ Orden ${order.id} expiró - Devolviendo al stock`);

            // Cambiar estado de la orden
            updateOrderStatus(order.id, 'payment_expired');

            // Si es una subasta, volver al stock
            if (order.productType === 'auction') {
              const auction = auctions.find(a => a.id === order.productId);
              if (auction) {
                // Volver a estado activo
                const updatedAuctions = auctions.map(a =>
                  a.id === order.productId
                    ? { ...a, status: 'active' as const, winnerId: undefined }
                    : a
                );
                setAuctions(updatedAuctions);
                console.log(`♻️ Subasta ${auction.title} volvió al stock`);
              }
            }

            // Si es un producto de tienda, devolver stock utilizando el módulo de reservas
            if (order.productType === 'store' && order.quantity && order.quantity > 0) {
              restoreStockForOrder(order.productId, order.quantity);
            }

            // Notificar al usuario que perdió la oportunidad usando reglas
            triggerRuleBasedNotification(
              'order_expired',
              order.userId,
              addNotification,
              {
                orderId: order.id,
                amount: order.amount,
                productName: order.productName
              }
            );

            // Notificar al admin
            addNotification({
              userId: 'admin',
              type: 'purchase',
              title: '♻️ Orden Expirada',
              message: `La orden #${order.id.slice(0, 8)} de ${order.userName} expiró. Producto devuelto al stock.`,
              read: false
            });
          }
        }
      });
    };

    // Ejecutar inmediatamente
    checkExpiredOrders();

    // Ejecutar cada 60 segundos
    const interval = setInterval(checkExpiredOrders, 60000);

    return () => clearInterval(interval);
  }, [orders, auctions, products, updateOrderStatus, setAuctions, addNotification]);

  return null;
};

export default OrderManager;
