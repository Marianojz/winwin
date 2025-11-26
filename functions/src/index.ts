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
  buyNowPrice?: number;
  endTime?: string;
  images?: string[];
  bids?: Array<{
    id?: string;
    userId: string;
    username?: string;
    amount: number;
    createdAt?: string;
    isBot?: boolean;
  }>;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  productName: string;
  productImage: string;
  productType: 'auction' | 'store';
  type: 'auction' | 'store';
  amount: number;
  status: string;
  deliveryMethod: 'shipping' | 'pickup' | 'email';
  createdAt: string;
  expiresAt?: string;
  address: {
    street: string;
    locality: string;
    province: string;
    location: { lat: number; lng: number };
  };
  orderNumber?: string;
  quantity?: number;
  unitsPerBundle?: number;
  bundles?: number;
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
 * Cloud Function programada que finaliza subastas vencidas en el servidor,
 * asigna ganador y crea una orden básica si aún no existe.
 * Esto actúa como red de seguridad adicional al AuctionManager del cliente.
 */
export const finalizeExpiredAuctions = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async () => {
    console.log('⏱️ Iniciando verificación de subastas vencidas...');

    try {
      const now = Date.now();

      // Leer todas las subastas
      const snapshot = await db.ref('auctions').once('value');
      const auctionsData = snapshot.val();

      if (!auctionsData) {
        console.log('📭 No hay subastas en la base de datos');
        return null;
      }

      const auctions: Auction[] = Object.entries(auctionsData).map(
        ([id, auction]: [string, any]) => ({
          id,
          ...auction,
          status: auction.status || 'active',
          currentPrice: auction.currentPrice || auction.startingPrice || 0,
          startingPrice: auction.startingPrice || 0,
          endTime: auction.endTime,
          buyNowPrice: auction.buyNowPrice,
          images: auction.images || [],
          bids: auction.bids ? Object.values(auction.bids) : []
        })
      ) as Auction[];

      // Filtrar candidatas: activas y con endTime pasado
      const candidates = auctions.filter((auction) => {
        if (auction.status !== 'active') return false;
        if (!auction.endTime) return false;
        const endTimeMs = new Date(auction.endTime).getTime();
        return !isNaN(endTimeMs) && endTimeMs <= now;
      });

      if (candidates.length === 0) {
        console.log('✅ No hay subastas vencidas para procesar');
        return null;
      }

      console.log(`📌 Subastas candidatas a finalizar: ${candidates.length}`);

      for (const auction of candidates) {
        const auctionRef = db.ref(`auctions/${auction.id}`);

        // Usar transaction para evitar condiciones de carrera
        await auctionRef.transaction((current) => {
          if (!current) return current;

          const currentStatus = current.status || 'active';
          const endTimeMs = current.endTime
            ? new Date(current.endTime).getTime()
            : NaN;

          if (
            currentStatus !== 'active' ||
            !current.endTime ||
            isNaN(endTimeMs) ||
            endTimeMs > now
          ) {
            // Ya no es candidata o aún no venció
            return current;
          }

          // Marcar como finalizada; el ganador y orden se manejarán después
          return {
            ...current,
            status: 'ended'
          };
        });

        // Volver a leer el estado final de la subasta
        const finalSnap = await auctionRef.once('value');
        const finalAuction: any = finalSnap.val();

        if (!finalAuction) continue;

        // Si ya tiene winnerId, asumimos que otra lógica (cliente u otra función) ya la procesó
        if (finalAuction.winnerId) {
          console.log(
            `⏭️ Subasta ${auction.id} ya tiene winnerId (${finalAuction.winnerId}), no se crea nueva orden`
          );
          continue;
        }

        const bids: any[] = finalAuction.bids
          ? Object.values(finalAuction.bids)
          : [];

        if (!bids.length) {
          console.log(
            `ℹ️ Subasta ${auction.id} finalizada sin ofertas, solo se marca status=ended`
          );
          continue;
        }

        // Elegir oferta ganadora (mayor amount)
        const winningBid = bids.reduce((highest, current) =>
          current.amount > highest.amount ? current : highest
        );

        const winnerId: string = winningBid.userId;
        const winnerName: string = winningBid.username || 'Ganador';
        const finalPrice: number = winningBid.amount;

        // Ignorar bots para orden real (mantener la lógica de frontend)
        if (winnerId.startsWith('bot-')) {
          console.log(
            `🤖 Subasta ${auction.id} ganada por bot (${winnerName}), no se crea orden real`
          );

          await auctionRef.update({
            winnerId: winnerId
          });

          continue;
        }

        // Verificar si ya existe una orden para esta subasta y este ganador
        const ordersSnap = await db.ref('orders').once('value');
        const ordersData = ordersSnap.val() || {};
        const existingOrder = Object.values(ordersData).find((o: any) => {
          return (
            o.type === 'auction' &&
            o.productId === auction.id &&
            o.userId === winnerId
          );
        }) as any;

        if (existingOrder) {
          console.log(
            `⏭️ Ya existe una orden para subasta ${auction.id} y usuario ${winnerId}, no se crea duplicado`
          );

          // Asegurar que la subasta tenga winnerId en caso de que falte
          if (!finalAuction.winnerId) {
            await auctionRef.update({
              winnerId: winnerId
            });
          }

          continue;
        }

        // Crear orden básica para el ganador
        const nowDate = new Date();
        const expiresAt = new Date(nowDate.getTime() + 48 * 60 * 60 * 1000);
        const orderId = `ORD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const order: Order = {
          id: orderId,
          userId: winnerId,
          userName: winnerName,
          productId: auction.id,
          productName: auction.title,
          productImage:
            (auction.images && auction.images[0]) ||
            (finalAuction.images && finalAuction.images[0]) ||
            '',
          productType: 'auction',
          type: 'auction',
          amount: finalPrice,
          status: 'pending_payment',
          deliveryMethod: 'shipping',
          createdAt: nowDate.toISOString(),
          expiresAt: expiresAt.toISOString(),
          address: {
            street: '',
            locality: '',
            province: '',
            location: { lat: 0, lng: 0 }
          },
          quantity: 1,
          unitsPerBundle: finalAuction.unitsPerBundle,
          bundles: finalAuction.bundles
        };

        // Guardar orden
        await db.ref(`orders/${orderId}`).set(order);

        // Marcar ganador en la subasta
        await auctionRef.update({
          winnerId: winnerId
        });

        console.log(
          `📝 Orden ${orderId} creada para ganador ${winnerName} en subasta ${auction.id} por $${finalPrice.toLocaleString()}`
        );

        // Crear notificación simple para el ganador
        const notificationId = `NOTIF-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const notificationRef = db.ref(
          `notifications/${winnerId}/${notificationId}`
        );

        await notificationRef.set({
          id: notificationId,
          userId: winnerId,
          type: 'auction_won',
          title: '🎉 ¡Ganaste la subasta!',
          message: `Ganaste "${auction.title}" por $${finalPrice.toLocaleString(
            'es-AR'
          )}. Tenés 48hs para pagar.`,
          read: false,
          createdAt: nowDate.toISOString(),
          link: '/notificaciones'
        });

        console.log(
          `🔔 Notificación de victoria creada para usuario ${winnerId} (subasta ${auction.id})`
        );
      }

      console.log('✅ Proceso de finalización de subastas completado');
      return null;
    } catch (error) {
      console.error('❌ Error finalizando subastas:', error);
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

