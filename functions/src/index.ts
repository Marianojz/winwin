import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.database();

interface Bot {
  id: string;
  name: string;
  isActive: boolean;
  balance: number;
  maxBidAmount: number;
  minIncrement?: number; // Incremento mínimo por oferta (por defecto 500)
  intervalMin: number;
  intervalMax: number;
  targetAuctions?: string[];
}

interface Auction {
  id: string;
  title: string;
  status: string;
  currentPrice: number;
  startingPrice: number;
  createdBy: string;
  bids?: Array<{
    userId: string;
    amount: number;
  }>;
}

/**
 * Cloud Function que ejecuta bots automáticamente cada minuto
 * Esta función se ejecuta en el servidor de Firebase, no depende de clientes
 */
export const executeBots = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    console.log('🤖 Iniciando ejecución automática de bots...');
    
    try {
      // Obtener todos los bots activos
      const botsSnapshot = await db.ref('bots').once('value');
      const botsData = botsSnapshot.val();
      
      if (!botsData) {
        console.log('📭 No hay bots configurados');
        return null;
      }
      
      // Filtrar bots activos con configuración válida
      const bots: Bot[] = Object.values(botsData).filter((bot: any) => {
        const isValid = bot.isActive === true &&
                        bot.balance > 0 &&
                        bot.maxBidAmount > 0 &&
                        bot.intervalMin > 0 &&
                        bot.intervalMax >= bot.intervalMin;
        if (!isValid && bot.isActive) {
          console.warn(`🤖 Bot "${bot.name}" está activo pero tiene configuración inválida:`, {
            isActive: bot.isActive,
            balance: bot.balance,
            maxBidAmount: bot.maxBidAmount,
            intervalMin: bot.intervalMin,
            intervalMax: bot.intervalMax
          });
        }
        return isValid;
      }) as Bot[];
      
      if (bots.length === 0) {
        console.log('📭 No hay bots activos con configuración válida');
        return null;
      }
      
      console.log(`🤖 Procesando ${bots.length} bot(s) activo(s) con configuración válida`);
      
      // Obtener todas las subastas activas
      const auctionsSnapshot = await db.ref('auctions').once('value');
      const auctionsData = auctionsSnapshot.val();
      
      if (!auctionsData) {
        console.log('📭 No hay subastas disponibles');
        return null;
      }
      
      const auctions: Auction[] = Object.entries(auctionsData)
        .map(([id, auction]: [string, any]) => ({
          id,
          ...auction,
          status: auction.status || 'active',
          currentPrice: auction.currentPrice || auction.startingPrice || 0,
          startingPrice: auction.startingPrice || 0,
          bids: auction.bids ? Object.values(auction.bids) : []
        }))
        .filter((auction: Auction) => auction.status === 'active') as Auction[];
      
      if (auctions.length === 0) {
        console.log('📭 No hay subastas activas');
        return null;
      }
      
      // Ejecutar cada bot
      const promises = bots.map(bot => executeBotBid(bot, auctions));
      await Promise.all(promises);
      
      console.log('✅ Ejecución de bots completada');
      return null;
    } catch (error) {
      console.error('❌ Error ejecutando bots:', error);
      return null;
    }
  });

/**
 * Ejecuta una oferta para un bot específico
 */
async function executeBotBid(bot: Bot, auctions: Auction[]): Promise<void> {
  try {
    // Validar que el bot siga siendo válido
    if (!bot.isActive || bot.balance <= 0 || bot.maxBidAmount <= 0) {
      console.warn(`🤖 Bot "${bot.name}" ya no es válido, omitiendo`);
      return;
    }
    
    // Obtener incremento mínimo configurado (por defecto 500)
    const minIncrement = bot.minIncrement || 500;
    
    // Filtrar subastas objetivo si el bot las tiene configuradas
    let targetAuctions = auctions;
    if (bot.targetAuctions && bot.targetAuctions.length > 0) {
      targetAuctions = auctions.filter(a => bot.targetAuctions!.includes(a.id));
    }
    
    if (targetAuctions.length === 0) {
      console.log(`🤖 Bot "${bot.name}": No hay subastas objetivo disponibles`);
      return;
    }
    
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
        return false;
      }
      
      // Excluir si el bot ya es el mejor postor
      const lastBid = auction.bids && auction.bids.length > 0
        ? auction.bids[auction.bids.length - 1]
        : null;
      if (lastBid && lastBid.userId === bot.id) {
        return false;
      }
      
      return canAfford;
    });
    
    if (affordableAuctions.length === 0) {
      console.log(`🤖 Bot "${bot.name}": No hay subastas asequibles (balance: $${bot.balance.toLocaleString()}, maxBid: $${bot.maxBidAmount.toLocaleString()})`);
      return;
    }
    
    console.log(`🤖 Bot "${bot.name}": ${affordableAuctions.length} subasta(s) asequible(s)`);
    
    // Seleccionar una subasta aleatoria
    const randomAuction = affordableAuctions[
      Math.floor(Math.random() * affordableAuctions.length)
    ];
    
    const currentPrice = randomAuction.currentPrice || randomAuction.startingPrice || 0;
    
    // Verificaciones finales (ya se hicieron en el filtro, pero las mantenemos por seguridad)
    if (randomAuction.createdBy === bot.id) {
      console.log(`🤖 Bot "${bot.name}": Omitiendo subasta "${randomAuction.title}" (bot es el creador)`);
      return;
    }
    
    if (bot.balance < currentPrice + 500 || currentPrice >= bot.maxBidAmount) {
      console.log(`🤖 Bot "${bot.name}": No puede ofertar en "${randomAuction.title}" (balance insuficiente o precio muy alto)`);
      return;
    }
    
    const lastBid = randomAuction.bids && randomAuction.bids.length > 0
      ? randomAuction.bids[randomAuction.bids.length - 1]
      : null;
    
    if (lastBid && lastBid.userId === bot.id) {
      console.log(`🤖 Bot "${bot.name}": Ya es el mejor postor en "${randomAuction.title}"`);
      return;
    }
    
    // Obtener incremento mínimo configurado (por defecto 500)
    const minIncrement = bot.minIncrement || 500;
    
    // Calcular la oferta
    const minBid = currentPrice + minIncrement;
    const maxBid = Math.min(bot.maxBidAmount, bot.balance);
    
    if (minBid > maxBid) {
      return;
    }
    
    const minMultiples = Math.ceil(minBid / minIncrement);
    const maxMultiples = Math.floor(maxBid / minIncrement);
    
    if (minMultiples > maxMultiples) {
      return;
    }
    
    const randomMultiple = Math.floor(
      Math.random() * (maxMultiples - minMultiples + 1) + minMultiples
    );
    
    const bidAmount = randomMultiple * minIncrement;
    
    if (bidAmount <= currentPrice) {
      return;
    }
    
    // Crear la oferta
    const bid = {
      id: Date.now().toString(),
      auctionId: randomAuction.id,
      userId: bot.id,
      username: bot.name,
      amount: bidAmount,
      createdAt: new Date().toISOString(),
      isBot: true
    };
    
    // Guardar en Firebase
    const updates: any = {};
    updates[`auctions/${randomAuction.id}/currentPrice`] = bidAmount;
    updates[`auctions/${randomAuction.id}/lastBidAt`] = new Date().toISOString();
    updates[`auctions/${randomAuction.id}/bids/${bid.id}`] = bid;
    
    console.log(`🤖 Bot "${bot.name}" haciendo oferta de $${bidAmount.toLocaleString()} en "${randomAuction.title}"`);
    
    await db.ref().update(updates);
    
    console.log(`✅ Bot "${bot.name}" ofertó exitosamente $${bidAmount.toLocaleString()} en "${randomAuction.title}"`);
  } catch (error) {
    console.error(`❌ Error ejecutando bot "${bot.name}":`, error);
  }
}

