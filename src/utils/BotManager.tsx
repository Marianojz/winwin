import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ref, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

/**
 * BotManager - Ejecuta bots automáticamente para hacer ofertas en subastas
 * Similar a AuctionManager, pero para la ejecución de bots
 */
const BotManager = () => {
  const { auctions, bots, addBid } = useStore();
  const botTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    // Limpiar todos los timers al desmontar
    return () => {
      botTimersRef.current.forEach(timer => clearTimeout(timer));
      botTimersRef.current.clear();
    };
  }, []);

  // Usar un ref para rastrear los IDs de bots activos y evitar reinicios innecesarios
  const activeBotsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Solo ejecutar si hay bots activos
    const activeBots = bots.filter(bot => bot.isActive && bot.balance > 0);
    
    // Crear un set con los IDs de bots activos actuales
    const currentActiveBotIds = new Set(activeBots.map(bot => bot.id));
    
    // Verificar si los bots activos cambiaron (se agregaron, eliminados o cambiaron su estado)
    const botsChanged = 
      activeBotsRef.current.size !== currentActiveBotIds.size ||
      Array.from(currentActiveBotIds).some(id => !activeBotsRef.current.has(id)) ||
      Array.from(activeBotsRef.current).some(id => !currentActiveBotIds.has(id));
    
    // Solo reiniciar si los bots cambiaron
    if (botsChanged) {
      // Limpiar timers anteriores
      botTimersRef.current.forEach(timer => clearTimeout(timer));
      botTimersRef.current.clear();
      
      // Actualizar referencia
      activeBotsRef.current = currentActiveBotIds;
      
      if (activeBots.length === 0) {
        return;
      }

      // Programar cada bot individualmente
      activeBots.forEach(bot => {
        scheduleBotExecution(bot);
      });
    }

    // Función para programar la ejecución de un bot
    function scheduleBotExecution(bot: typeof bots[0]) {
      // Calcular intervalo aleatorio entre intervalMin e intervalMax (en segundos)
      const randomInterval = Math.floor(
        Math.random() * (bot.intervalMax - bot.intervalMin + 1) + bot.intervalMin
      );

      const timer = setTimeout(() => {
        executeBotBid(bot);
        // Programar la próxima ejecución
        scheduleBotExecution(bot);
      }, randomInterval * 1000); // Convertir a milisegundos

      botTimersRef.current.set(bot.id, timer);
    }

    // Función para ejecutar una oferta del bot
    async function executeBotBid(bot: typeof bots[0]) {
      try {
        // Obtener subastas actuales del store (se actualizan en tiempo real)
        const currentAuctions = useStore.getState().auctions;
        
        // Si el bot tiene subastas objetivo, solo actuar en esas
        // Si no tiene subastas objetivo, actuar en todas las subastas activas
        // Nota: Las subastas pueden no tener status explícito, considerar activas si no tienen status o status es 'active'
        const targetAuctions = bot.targetAuctions && bot.targetAuctions.length > 0
          ? currentAuctions.filter(a => {
              const isTarget = bot.targetAuctions!.includes(a.id);
              const isActive = !a.status || a.status === 'active';
              return isTarget && isActive;
            })
          : currentAuctions.filter(a => !a.status || a.status === 'active');

        if (targetAuctions.length === 0) {
          return;
        }

        // Filtrar subastas donde el bot puede ofertar (precio actual < maxBidAmount y balance suficiente)
        const affordableAuctions = targetAuctions.filter(auction => {
          const currentPrice = auction.currentPrice || auction.startingPrice || 0;
          const minRequired = currentPrice + 500;
          const canAfford = currentPrice < bot.maxBidAmount && bot.balance >= minRequired;
          return canAfford;
        });
        
        // Si no hay subastas asequibles, salir
        if (affordableAuctions.length === 0) {
          return;
        }

        // Seleccionar una subasta aleatoria de las disponibles y asequibles
        const randomAuction = affordableAuctions[Math.floor(Math.random() * affordableAuctions.length)];

        // Verificar que la subasta esté activa (puede no tener status o ser 'active')
        if (randomAuction.status && randomAuction.status !== 'active') {
          return;
        }

        // Verificar que el bot no sea el creador de la subasta
        if (randomAuction.createdBy === bot.id) {
          return;
        }

        // Obtener el precio actual de la subasta
        const currentPrice = randomAuction.currentPrice || randomAuction.startingPrice || 0;

        // Estas validaciones ya se hicieron en el filtro, pero las mantenemos por seguridad
        if (bot.balance < currentPrice + 500) {
          return;
        }

        if (currentPrice >= bot.maxBidAmount) {
          return;
        }

        // Verificar si el bot ya es el mejor postor
        const lastBid = randomAuction.bids && randomAuction.bids.length > 0
          ? randomAuction.bids[randomAuction.bids.length - 1]
          : null;

        if (lastBid && lastBid.userId === bot.id) {
          return;
        }

        // Calcular la nueva oferta (mínimo: currentPrice + 500, máximo: maxBidAmount)
        const minBid = currentPrice + 500;
        const maxBid = Math.min(bot.maxBidAmount, bot.balance);
        
        // Si el mínimo ya es mayor al máximo, no puede ofertar
        if (minBid > maxBid) {
          return;
        }
        
        // Calcular un incremento conservador: entre $500 y máximo $10,000 adicionales
        // Esto evita que el bot haga ofertas demasiado altas de una vez
        const maxIncrement = Math.min(10000, maxBid - minBid); // Máximo $10,000 adicionales o lo que quede disponible
        
        // Si no hay espacio para incrementar, usar solo el mínimo
        if (maxIncrement < 500) {
          const bidAmountRounded = Math.floor(minBid / 500) * 500;
          if (bidAmountRounded <= currentPrice) {
            return;
          }
          try {
            await addBid(randomAuction.id, bidAmountRounded, bot.id, bot.name);
          } catch (error) {
            // Error silencioso - funcionalidad oculta del admin
            throw error;
          }
          return;
        }
        
        const incrementMultiples = Math.floor(maxIncrement / 500); // Número de múltiplos de 500 disponibles
        const randomMultiple = Math.floor(Math.random() * incrementMultiples) + 1; // Entre 1 y incrementMultiples
        const increment = randomMultiple * 500; // Incremento en múltiplos de 500
        
        const bidAmount = minBid + increment;
        
        // Asegurar que no exceda el máximo permitido
        const finalBidAmount = Math.min(bidAmount, maxBid);
        
        // Redondear al múltiplo de 500 más cercano hacia abajo
        const bidAmountRounded = Math.floor(finalBidAmount / 500) * 500;

        // Verificar que la oferta sea válida
        if (bidAmountRounded <= currentPrice) {
          return;
        }

        // Hacer la oferta usando addBid del store
        try {
          await addBid(randomAuction.id, bidAmountRounded, bot.id, bot.name);
        } catch (error) {
          // Error silencioso - funcionalidad oculta del admin
          throw error;
        }

      } catch (error) {
        // Error silencioso - funcionalidad oculta del admin
      }
    }

  }, [bots]); // Solo dependencia de bots - las subastas se actualizan en tiempo real dentro de executeBotBid

  return null;
};

export default BotManager;

