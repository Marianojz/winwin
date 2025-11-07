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
      
      const bots: Bot[] = Object.values(botsData).filter(
        (bot: any) => bot.isActive === true
      ) as Bot[];
      
      if (bots.length === 0) {
        console.log('📭 No hay bots activos');
        return null;
      }
      
      console.log(`🤖 Procesando ${bots.length} bot(s) activo(s)`);
      
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
    // Filtrar subastas objetivo si el bot las tiene configuradas
    let targetAuctions = auctions;
    if (bot.targetAuctions && bot.targetAuctions.length > 0) {
      targetAuctions = auctions.filter(a => bot.targetAuctions!.includes(a.id));
    }
    
    if (targetAuctions.length === 0) {
      return;
    }
    
    // Filtrar subastas donde el bot puede ofertar
    const affordableAuctions = targetAuctions.filter(auction => {
      const currentPrice = auction.currentPrice || auction.startingPrice || 0;
      const minRequired = currentPrice + 500;
      return currentPrice < bot.maxBidAmount && bot.balance >= minRequired;
    });
    
    if (affordableAuctions.length === 0) {
      return;
    }
    
    // Seleccionar una subasta aleatoria
    const randomAuction = affordableAuctions[
      Math.floor(Math.random() * affordableAuctions.length)
    ];
    
    // Verificar que el bot no sea el creador
    if (randomAuction.createdBy === bot.id) {
      return;
    }
    
    const currentPrice = randomAuction.currentPrice || randomAuction.startingPrice || 0;
    
    // Verificar balance y límites
    if (bot.balance < currentPrice + 500 || currentPrice >= bot.maxBidAmount) {
      return;
    }
    
    // Verificar si el bot ya es el mejor postor
    const lastBid = randomAuction.bids && randomAuction.bids.length > 0
      ? randomAuction.bids[randomAuction.bids.length - 1]
      : null;
    
    if (lastBid && lastBid.userId === bot.id) {
      return;
    }
    
    // Calcular la oferta
    const minBid = currentPrice + 500;
    const maxBid = Math.min(bot.maxBidAmount, bot.balance);
    
    if (minBid > maxBid) {
      return;
    }
    
    const minMultiples = Math.ceil(minBid / 500);
    const maxMultiples = Math.floor(maxBid / 500);
    
    if (minMultiples > maxMultiples) {
      return;
    }
    
    const randomMultiple = Math.floor(
      Math.random() * (maxMultiples - minMultiples + 1) + minMultiples
    );
    
    const bidAmount = randomMultiple * 500;
    
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
    
    await db.ref().update(updates);
    
    console.log(`✅ Bot "${bot.name}" ofertó $${bidAmount.toLocaleString()} en "${randomAuction.title}"`);
  } catch (error) {
    console.error(`❌ Error ejecutando bot "${bot.name}":`, error);
  }
}

