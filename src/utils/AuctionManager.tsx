import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Componente que actualiza el estado de las subastas automáticamente
 * Se ejecuta cada 60 segundos y verifica si alguna subasta finalizó
 */
const AuctionManager = () => {
  const { auctions, setAuctions } = useStore();

  useEffect(() => {
    // Función que actualiza el estado de las subastas
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
            
            // Si hay ofertas, marcar como "ended", sino como "unsold"
            return {
              ...auction,
              status: auction.bids.length > 0 ? 'ended' as const : 'ended' as const
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
  }, [auctions, setAuctions]);

  return null; // Este componente no renderiza nada visual
};

export default AuctionManager;
