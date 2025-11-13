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
    console.log(`🤖 BotManager: Total de bots en store: ${bots.length}`);
    console.log(`🤖 BotManager: Bots detallados:`, bots.map(b => ({
      id: b.id,
      name: b.name,
      isActive: b.isActive,
      balance: b.balance,
      maxBidAmount: b.maxBidAmount,
      intervalMin: b.intervalMin,
      intervalMax: b.intervalMax
    })));
    
    // Solo ejecutar si hay bots activos
    const activeBots = bots.filter(bot => bot.isActive && bot.balance > 0);
    
    console.log(`🤖 BotManager: Bots activos con balance: ${activeBots.length}`);
    
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
        console.log('🤖 No hay bots activos con balance suficiente');
        return;
      }

      console.log(`🤖 Iniciando ${activeBots.length} bot(s) activo(s) (funcionando sin usuario logueado)`);

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
        
        console.log(`🤖 Bot "${bot.name}": Revisando ${currentAuctions.length} subastas disponibles`);
        
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

        console.log(`🤖 Bot "${bot.name}": ${targetAuctions.length} subastas objetivo encontradas`);

        if (targetAuctions.length === 0) {
          console.log(`🤖 Bot "${bot.name}": No hay subastas objetivo disponibles`);
          return;
        }

        // Filtrar subastas donde el bot puede ofertar (precio actual < maxBidAmount y balance suficiente)
        const affordableAuctions = targetAuctions.filter(auction => {
          const currentPrice = auction.currentPrice || auction.startingPrice || 0;
          const minRequired = currentPrice + 500;
          return currentPrice < bot.maxBidAmount && bot.balance >= minRequired;
        });

        if (affordableAuctions.length === 0) {
          // No loguear si no puede ofertar - es normal
          return;
        }

        // Seleccionar una subasta aleatoria de las disponibles y asequibles
        const randomAuction = affordableAuctions[Math.floor(Math.random() * affordableAuctions.length)];

        // Verificar que la subasta esté activa (puede no tener status o ser 'active')
        if (randomAuction.status && randomAuction.status !== 'active') {
          console.log(`🤖 Bot "${bot.name}": Subasta "${randomAuction.title}" no está activa (status: ${randomAuction.status})`);
          return;
        }

        // Verificar que el bot no sea el creador de la subasta
        if (randomAuction.createdBy === bot.id) {
          console.log(`🤖 Bot "${bot.name}": No puede hacer ofertas en su propia subasta`);
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
          console.log(`🤖 Bot "${bot.name}": Ya es el mejor postor en "${randomAuction.title}"`);
          return;
        }

        // Calcular la nueva oferta (mínimo: currentPrice + 500, máximo: maxBidAmount)
        const minBid = currentPrice + 500;
        const maxBid = Math.min(bot.maxBidAmount, bot.balance);
        
        // Si el mínimo ya es mayor al máximo, no puede ofertar
        if (minBid > maxBid) {
          console.log(`🤖 Bot "${bot.name}": No puede ofertar (mínimo ${minBid} > máximo ${maxBid})`);
          return;
        }
        
        // Ofrecer entre minBid y maxBid, pero siempre múltiplo de 500
        const minMultiples = Math.ceil(minBid / 500);
        const maxMultiples = Math.floor(maxBid / 500);
        
        if (minMultiples > maxMultiples) {
          console.log(`🤖 Bot "${bot.name}": No puede ofertar (múltiplos no válidos)`);
          return;
        }
        
        // Generar un múltiplo aleatorio entre minMultiples y maxMultiples
        const randomMultiple = Math.floor(
          Math.random() * (maxMultiples - minMultiples + 1) + minMultiples
        );
        
        const bidAmount = randomMultiple * 500;

        // Verificar que la oferta sea válida
        if (bidAmount <= currentPrice) {
          console.log(`🤖 Bot "${bot.name}": Oferta calculada (${bidAmount}) no es mayor al precio actual (${currentPrice})`);
          return;
        }

        // Hacer la oferta usando addBid del store
        console.log(`🤖 Bot "${bot.name}" intentando ofertar $${bidAmount.toLocaleString()} en "${randomAuction.title}" (precio actual: $${currentPrice.toLocaleString()})`);
        
        try {
          await addBid(randomAuction.id, bidAmount, bot.id, bot.name);
          console.log(`✅ Bot "${bot.name}" realizó oferta exitosamente de $${bidAmount.toLocaleString()}`);
        } catch (error) {
          console.error(`❌ Bot "${bot.name}" error al hacer oferta:`, error);
          throw error; // Re-lanzar para que se capture en el catch externo
        }

      } catch (error) {
        console.error(`❌ Error ejecutando bot "${bot.name}":`, error);
      }
    }

  }, [bots]); // Solo dependencia de bots - las subastas se actualizan en tiempo real dentro de executeBotBid

  return null;
};

export default BotManager;

