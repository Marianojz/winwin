import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Order } from '../types';

/**
 * Gestor de subastas que actualiza estados y crea órdenes automáticamente
 */
const AuctionManager = () => {
  const { auctions, setAuctions, addNotification, addOrder } = useStore();

  useEffect(() => {
    const updateAuctionStatuses = () => {
      const now = new Date();
      let hasChanges = false;

      const updatedAuctions = auctions.map(auction => {
        // Solo revisar subastas activas
        if (auction.status === 'active') {
          const endTime = new Date(auction.endTime);
          
          // Si el tiempo de finalización ya pasó
          if (endTime <= now) {
            console.log(`🔄 Subasta "${auction.title}" finalizó automáticamente`);
            hasChanges = true;
            
            // Verificar si hay ganador (última oferta)
            if (auction.bids.length > 0) {
              const winningBid = auction.bids[auction.bids.length - 1];
              const winnerId = winningBid.userId;
              const winnerName = winningBid.username;
              const finalPrice = winningBid.amount;

              // Crear orden de pago para el ganador
              const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas
              
              const order: Order = {
                id: `ORD-${Date.now()}`,
                userId: winnerId,
                userName: winnerName,
                productId: auction.id,
                productName: auction.title,
                productImage: auction.images[0] || '',
                productType: 'auction',
                type: 'auction',
                amount: finalPrice,
                status: 'pending_payment',
                deliveryMethod: 'shipping',
                createdAt: now,
                expiresAt: expiresAt,
                address: { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } }
              };

              addOrder(order);
              console.log(`📝 Orden creada para ${winnerName}: ${finalPrice}`);

              // Notificar al ganador
              addNotification({
                userId: winnerId,
                type: 'auction_won',
                title: '🎉 ¡Ganaste la subasta!',
                message: `Ganaste "${auction.title}" por $${finalPrice.toLocaleString()}. Tenés 48hs para pagar.`,
                read: false,
                link: '/notificaciones'
              });

              // Notificar al admin
              addNotification({
                userId: 'admin',
                type: 'auction_won',
                title: '🎯 Subasta Finalizada',
                message: `${winnerName} ganó "${auction.title}" por $${finalPrice.toLocaleString()}. Esperando pago.`,
                read: false
              });

              return {
                ...auction,
                status: 'ended' as const,
                winnerId: winnerId
              };
            }
            
            // Si no hay ofertas, marcar como finalizada sin ganador
            return {
              ...auction,
              status: 'ended' as const
            };
          }
        }
        return auction;
      });

      // Solo actualizar si hubo cambios
      if (hasChanges) {
        console.log('✅ Actualizando estado de subastas...');
        setAuctions(updatedAuctions);
      }
    };

    // Ejecutar inmediatamente al cargar
    updateAuctionStatuses();

    // Ejecutar cada 60 segundos (1 minuto)
    const interval = setInterval(updateAuctionStatuses, 60000);

    // Limpiar el intervalo al desmontar el componente
    return () => clearInterval(interval);
  }, [auctions, setAuctions, addNotification, addOrder]);

  return null;
};

export default AuctionManager;
