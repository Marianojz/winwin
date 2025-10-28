import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Gestor automático de órdenes
 * Revisa cada minuto si hay órdenes que expiraron
 */
const OrderManager = () => {
  const { orders, auctions, products, updateOrderStatus, setAuctions, setProducts, addNotification } = useStore();

  useEffect(() => {
    const checkExpiredOrders = () => {
      const now = new Date();
      let hasChanges = false;

      orders.forEach(order => {
        // Solo revisar órdenes pendientes de pago
        if (order.status === 'pending_payment' && order.expiresAt) {
          const expiresAt = new Date(order.expiresAt);
          
          // Si expiró el plazo de pago
          if (expiresAt <= now) {
            console.log(`⌛ Orden ${order.id} expiró - Devolviendo al stock`);
            hasChanges = true;

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

            // Si es un producto, volver a aumentar el stock
            if (order.productType === 'store') {
              const product = products.find(p => p.id === order.productId);
              if (product) {
                const updatedProducts = products.map(p =>
                  p.id === order.productId
                    ? { ...p, stock: p.stock + 1 }
                    : p
                );
                setProducts(updatedProducts);
                console.log(`♻️ Producto ${product.name} devuelto al stock`);
              }
            }

            // Notificar al usuario que perdió la oportunidad
            addNotification({
              userId: order.userId,
              type: 'payment_reminder',
              title: '⌛ Orden Expirada',
              message: `Tu orden de "${order.productName}" expiró por falta de pago. El producto volvió a estar disponible.`,
              read: false
            });

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
  }, [orders, auctions, products, updateOrderStatus, setAuctions, setProducts, addNotification]);

  return null;
};

export default OrderManager;
