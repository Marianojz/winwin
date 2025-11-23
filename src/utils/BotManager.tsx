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
    const activeBots = bots.filter(bot => {
      const isValid = bot.isActive && 
                      bot.balance > 0 && 
                      bot.maxBidAmount > 0 &&
                      bot.intervalMin > 0 &&
                      bot.intervalMax >= bot.intervalMin;
      // Logs de bots ocultos
      // if (!isValid && bot.isActive) {
      //   console.warn(`🤖 Bot "${bot.name}" está activo pero tiene configuración inválida:`, {
      //     isActive: bot.isActive,
      //     balance: bot.balance,
      //     maxBidAmount: bot.maxBidAmount,
      //     intervalMin: bot.intervalMin,
      //     intervalMax: bot.intervalMax
      //   });
      // }
      return isValid;
    });
    
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
        // console.log('🤖 No hay bots activos con configuración válida');
        return;
      }

      // console.log(`🤖 Iniciando ${activeBots.length} bot(s) activo(s):`, activeBots.map(b => b.name));
      
      // Programar cada bot individualmente
      activeBots.forEach(bot => {
        scheduleBotExecution(bot);
      });
    }

    // Función para programar la ejecución de un bot
    function scheduleBotExecution(bot: typeof bots[0]) {
      // Validar que el bot siga siendo válido
      if (!bot.isActive || bot.balance <= 0 || bot.maxBidAmount <= 0 || 
          bot.intervalMin <= 0 || bot.intervalMax < bot.intervalMin) {
        // console.warn(`🤖 Bot "${bot.name}" ya no es válido, deteniendo ejecución`);
        botTimersRef.current.delete(bot.id);
        return;
      }
      
      // Calcular intervalo aleatorio entre intervalMin e intervalMax (en segundos)
      const randomInterval = Math.floor(
        Math.random() * (bot.intervalMax - bot.intervalMin + 1) + bot.intervalMin
      );

      // console.log(`🤖 Bot "${bot.name}" programado para ejecutarse en ${randomInterval} segundos`);

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
        // Validar que el bot siga siendo válido
        if (!bot.isActive || bot.balance <= 0 || bot.maxBidAmount <= 0) {
          // console.warn(`🤖 Bot "${bot.name}" ya no es válido, cancelando ejecución`);
          return;
        }
        
        // Obtener subastas actuales del store (se actualizan en tiempo real)
        const currentAuctions = useStore.getState().auctions;
        
        // console.log(`🤖 Bot "${bot.name}" evaluando ${currentAuctions.length} subasta(s) disponible(s)`);
        
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
          // console.log(`🤖 Bot "${bot.name}": No hay subastas objetivo disponibles`);
          return;
        }
        
        // console.log(`🤖 Bot "${bot.name}": ${targetAuctions.length} subasta(s) objetivo(s) encontrada(s)`);

        // Obtener incremento mínimo configurado (por defecto 500)
        const minIncrement = bot.minIncrement || 500;
        
        // Filtrar subastas donde el bot puede ofertar
        // El bot puede ofertar si puede hacer al menos un incremento mínimo hasta su maxBidAmount
        const affordableAuctions = targetAuctions.filter(auction => {
          const currentPrice = auction.currentPrice || auction.startingPrice || 0;
          const minBid = currentPrice + minIncrement;
          const maxBid = Math.min(bot.maxBidAmount, bot.balance);
          
          // Puede ofertar si: el precio actual + incremento mínimo <= maxBidAmount y tiene balance suficiente
          const canAfford = minBid <= maxBid && bot.balance >= minBid;
          
          // Excluir si el bot es el creador
          if (auction.createdBy === bot.id) {
            // console.log(`🤖 Bot "${bot.name}": Omitiendo "${auction.title}" (bot es el creador)`);
            return false;
          }
          
          // Excluir si el bot ya es el mejor postor
          const lastBid = auction.bids && auction.bids.length > 0
            ? auction.bids[auction.bids.length - 1]
            : null;
          if (lastBid && lastBid.userId === bot.id) {
            // console.log(`🤖 Bot "${bot.name}": Omitiendo "${auction.title}" (ya es el mejor postor)`);
            return false;
          }
          
          // Log detallado si no puede ofertar (oculto)
          // if (!canAfford) {
          //   if (minBid > bot.maxBidAmount) {
          //     console.log(`🤖 Bot "${bot.name}": Omitiendo "${auction.title}" (precio $${currentPrice.toLocaleString()} + incremento $${minIncrement.toLocaleString()} = $${minBid.toLocaleString()} > maxBid $${bot.maxBidAmount.toLocaleString()})`);
          //   } else if (bot.balance < minBid) {
          //     console.log(`🤖 Bot "${bot.name}": Omitiendo "${auction.title}" (balance $${bot.balance.toLocaleString()} < requerido $${minBid.toLocaleString()})`);
          //   }
          // }
          
          return canAfford;
        });
        
        // Si no hay subastas asequibles, salir con información detallada
        if (affordableAuctions.length === 0) {
          // const pricesInfo = targetAuctions.map(a => {
          //   const price = a.currentPrice || a.startingPrice || 0;
          //   return `"${a.title}": $${price.toLocaleString()}`;
          // }).join(', ');
          // console.log(`🤖 Bot "${bot.name}": No hay subastas asequibles`);
          // console.log(`   Balance: $${bot.balance.toLocaleString()}, MaxBid: $${bot.maxBidAmount.toLocaleString()}`);
          // console.log(`   Precios de subastas objetivo: ${pricesInfo}`);
          return;
        }
        
        // console.log(`🤖 Bot "${bot.name}": ${affordableAuctions.length} subasta(s) asequible(s)`);

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
        const minBid = currentPrice + minIncrement;
        const maxBid = Math.min(bot.maxBidAmount, bot.balance);

        // Estas validaciones ya se hicieron en el filtro, pero las mantenemos por seguridad
        if (bot.balance < minBid) {
          return;
        }

        if (minBid > bot.maxBidAmount) {
          return;
        }

        // Verificar si el bot ya es el mejor postor
        const lastBid = randomAuction.bids && randomAuction.bids.length > 0
          ? randomAuction.bids[randomAuction.bids.length - 1]
          : null;

        if (lastBid && lastBid.userId === bot.id) {
          return;
        }

        // Calcular la nueva oferta (mínimo: currentPrice + minIncrement, máximo: maxBidAmount)
        // Si el mínimo ya es mayor al máximo, no puede ofertar
        if (minBid > maxBid) {
          return;
        }
        
        // Calcular un incremento conservador: entre minIncrement y máximo $10,000 adicionales
        // Esto evita que el bot haga ofertas demasiado altas de una vez
        const maxIncrement = Math.min(10000, maxBid - minBid); // Máximo $10,000 adicionales o lo que quede disponible
        
        // Si no hay espacio para incrementar, usar solo el mínimo
        if (maxIncrement < minIncrement) {
          // Redondear al múltiplo de minIncrement más cercano hacia abajo
          const bidAmountRounded = Math.floor(minBid / minIncrement) * minIncrement;
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
        
        const incrementMultiples = Math.floor(maxIncrement / minIncrement); // Número de múltiplos de minIncrement disponibles
        const randomMultiple = Math.floor(Math.random() * incrementMultiples) + 1; // Entre 1 y incrementMultiples
        const increment = randomMultiple * minIncrement; // Incremento en múltiplos de minIncrement
        
        const bidAmount = minBid + increment;
        
        // Asegurar que no exceda el máximo permitido
        const finalBidAmount = Math.min(bidAmount, maxBid);
        
        // Redondear al múltiplo de minIncrement más cercano hacia abajo
        const bidAmountRounded = Math.floor(finalBidAmount / minIncrement) * minIncrement;

        // Verificar que la oferta sea válida
        if (bidAmountRounded <= currentPrice) {
          return;
        }

        // Hacer la oferta usando addBid del store
        try {
          // console.log(`🤖 Bot "${bot.name}" haciendo oferta de $${bidAmountRounded.toLocaleString()} en "${randomAuction.title}"`);
          await addBid(randomAuction.id, bidAmountRounded, bot.id, bot.name);
          // console.log(`✅ Bot "${bot.name}" ofertó exitosamente $${bidAmountRounded.toLocaleString()}`);
        } catch (error) {
          // console.error(`❌ Error en bot "${bot.name}" al hacer oferta:`, error);
          throw error;
        }

      } catch (error) {
        // console.error(`❌ Error ejecutando bot "${bot.name}":`, error);
      }
    }

  }, [bots]); // Solo dependencia de bots - las subastas se actualizan en tiempo real dentro de executeBotBid

  return null;
};

export default BotManager;

