import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Order } from '../types';
import { soundManager } from '../utils/sounds';
import { launchConfettiFromTop } from '../utils/celebrations';

/**
 * Gestor de subastas que actualiza estados, crea órdenes y detecta ofertas superadas
 */
const AuctionManager = () => {
  const { auctions, setAuctions, addNotification, addOrder, user } = useStore();
  const previousBidsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Inicializar el mapa de ofertas anteriores
    auctions.forEach(auction => {
      const key = `${auction.id}_${user?.id || 'anonymous'}`;
      if (auction.bids.length > 0 && user) {
        // Guardar la última oferta del usuario actual por subasta
        const userLastBid = auction.bids
          .filter(bid => bid.userId === user.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
        if (userLastBid) {
          previousBidsRef.current.set(key, userLastBid.amount);
        }
      }
    });
  }, [auctions, user]);

  useEffect(() => {
    // ✅ NUEVO: LIMPIAR SUBASTAS CORRUPTAS
    const cleanCorruptedAuctions = () => {
      const corruptedAuctions = auctions.filter(auction => 
        !auction.title || auction.title === 'Sin título' || auction.title.trim() === ''
      );
      
      if (corruptedAuctions.length > 0) {
        console.log(`🗑️ Eliminando ${corruptedAuctions.length} subastas corruptas:`);
        corruptedAuctions.forEach(auction => {
          console.log(`   - "${auction.title}" (ID: ${auction.id})`);
        });
        
        // Filtrar solo subastas válidas
        const validAuctions = auctions.filter(auction => 
          auction.title && auction.title !== 'Sin título' && auction.title.trim() !== ''
        );
        
        setAuctions(validAuctions);
        return true; // Hubo limpieza
      }
      return false; // No hubo limpieza
    };

    const checkForOutbids = () => {
      if (!user) return;

      auctions.forEach(auction => {
        if (auction.status === 'active' && auction.bids.length > 0) {
          const key = `${auction.id}_${user.id}`;
          const userLastBidAmount = previousBidsRef.current.get(key);
          const currentWinningBid = auction.bids[auction.bids.length - 1];
          
          // Si el usuario tenía una oferta y ahora no es la ganadora
          if (userLastBidAmount && currentWinningBid.userId !== user.id) {
            // Verificar si superaron su oferta
            if (currentWinningBid.amount > userLastBidAmount) {
              console.log(`🚨 Usuario ${user.username} fue superado en subasta ${auction.title}`);
              
              // Notificar al usuario
              addNotification({
                userId: user.id,
                type: 'auction_outbid',
                title: '💔 Superaron tu oferta',
                message: `Alguien ofertó $${currentWinningBid.amount.toLocaleString()} en "${auction.title}". ¡Podés mejorar tu oferta!`,
                read: false,
                link: `/subastas/${auction.id}`
              });

              // Reproducir sonido
              soundManager.playOutbid();
              
              // Actualizar el registro para no notificar múltiples veces
              previousBidsRef.current.delete(key);
            }
          }

          // Actualizar el registro de ofertas actuales del usuario
          const userCurrentBid = auction.bids
            .filter(bid => bid.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          
          if (userCurrentBid) {
            previousBidsRef.current.set(key, userCurrentBid.amount);
          }
        }
      });
    };

    const updateAuctionStatuses = () => {
      const now = new Date();
      let needsUpdate = false;

      console.log('🕐 Chequeando subastas - Hora actual:', now.toISOString());

      const updatedAuctions = auctions.map(auction => {
        // Solo revisar subastas activas
        if (auction.status === 'active') {
          const endTime = new Date(auction.endTime);
          
          console.log(`📊 Subasta "${auction.title}":`, {
            endTime: endTime.toISOString(),
            now: now.toISOString(),
            shouldEnd: endTime <= now,
            timeRemaining: endTime.getTime() - now.getTime()
          });
          
          // Si el tiempo de finalización ya pasó
          if (endTime <= now) {
            console.log(`🔄 Subasta "${auction.title}" finalizó automáticamente`);
            needsUpdate = true;
            
            // Verificar si hay ganador (última oferta)
            if (auction.bids.length > 0) {
              const winningBid = auction.bids[auction.bids.length - 1];
              const winnerId = winningBid.userId;
              const winnerName = winningBid.username;
              const finalPrice = winningBid.amount;

              // Crear orden de pago para el ganador
              const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
              
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

              // Reproducir sonido de victoria
              soundManager.playWon();
              // Efecto visual: papel picado para el usuario ganador
              if (user && user.id === winnerId) {
                launchConfettiFromTop(3500);
              }

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
      if (needsUpdate) {
        console.log('✅ Actualizando estado de subastas...');
        setAuctions(updatedAuctions);
      }
    };

    // ✅ PRIMERO: Limpiar subastas corruptas
    const hadCleanup = cleanCorruptedAuctions();
    
    // Si hubo limpieza, salir y esperar próximo ciclo
    if (hadCleanup) {
      console.log('🔄 Limpieza completada, esperando próximo ciclo...');
      return;
    }

    // Ejecutar chequeos normales
    checkForOutbids();
    updateAuctionStatuses();

    // Ejecutar cada 30 segundos para chequeos más frecuentes
    const interval = setInterval(() => {
      checkForOutbids();
      updateAuctionStatuses();
    }, 30000);

    return () => clearInterval(interval);
  }, [auctions, setAuctions, addNotification, addOrder, user]);

  return null;
};

export default AuctionManager;
