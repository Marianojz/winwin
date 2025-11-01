/**
 * Sistema de limpieza automática de datos antiguos
 * Elimina notificaciones, subastas y pedidos antiguos para mantener la base de datos limpia
 */

interface CleanupConfig {
  notificationsDaysOld?: number; // Notificaciones no leídas más antiguas que X días
  auctionsDaysOld?: number; // Subastas finalizadas más antiguas que X días
  ordersDaysOld?: number; // Pedidos completados/cancelados más antiguos que X días
}

const DEFAULT_CONFIG: CleanupConfig = {
  notificationsDaysOld: 7, // Eliminar notificaciones después de 7 días (más agresivo)
  auctionsDaysOld: 7, // Eliminar subastas finalizadas después de 7 días (para testing, luego ajustar a 30-60)
  ordersDaysOld: 30 // Mantener pedidos completados por 30 días (reducido de 180)
};

/**
 * Limpia notificaciones antiguas
 */
export const cleanOldNotifications = (userId: string, config: CleanupConfig = DEFAULT_CONFIG): number => {
  try {
    const storageKey = `notifications_${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (!saved) return 0;
    
    const parsed = JSON.parse(saved);
    const now = Date.now();
    const cutoffDate = now - (config.notificationsDaysOld! * 24 * 60 * 60 * 1000);
    
    // Filtrar notificaciones que son muy antiguas
    const filtered = parsed.filter((n: any) => {
      const createdAt = new Date(n.createdAt).getTime();
      
      // Eliminar todas las notificaciones (leídas o no) que tengan más de X días
      if (createdAt < cutoffDate) {
        return false; // Eliminar notificación antigua
      }
      
      // Mantener notificaciones recientes
      return true;
    });
    
    if (filtered.length < parsed.length) {
      localStorage.setItem(storageKey, JSON.stringify(filtered));
      const removed = parsed.length - filtered.length;
      console.log(`🧹 Limpieza: ${removed} notificaciones antiguas eliminadas para usuario ${userId}`);
      return removed;
    }
    
    return 0;
  } catch (error) {
    console.error('Error limpiando notificaciones:', error);
    return 0;
  }
};

/**
 * Limpia subastas finalizadas antiguas
 */
export const cleanOldAuctions = (auctions: any[], config: CleanupConfig = DEFAULT_CONFIG): { cleaned: number; remaining: number } => {
  try {
    const now = Date.now();
    const cutoffDate = now - (config.auctionsDaysOld! * 24 * 60 * 60 * 1000);
    
    console.log(`🔍 Revisando ${auctions.length} subastas. Fecha de corte: ${new Date(cutoffDate).toLocaleString()}`);
    
    const filtered = auctions.filter((auction: any) => {
      // Mantener subastas activas o programadas siempre
      if (auction.status === 'active' || auction.status === 'scheduled') {
        return true;
      }
      
      // Para subastas finalizadas, verificar fecha
      if (auction.status === 'ended') {
        const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
        const createdAt = auction.createdAt ? new Date(auction.createdAt).getTime() : 0;
        
        // Usar endTime si existe, sino usar createdAt
        const checkDate = endTime > 0 ? endTime : createdAt;
        
        // Eliminar si es muy antigua (más de X días)
        if (checkDate < cutoffDate) {
          console.log(`🗑️ Eliminando subasta antigua: "${auction.title || 'Sin título'}" (Finalizó: ${new Date(checkDate).toLocaleString()})`);
          return false;
        }
        
        return true;
      }
      
      // Para subastas con otros estados, usar createdAt
      if (auction.createdAt) {
        const createdAt = new Date(auction.createdAt).getTime();
        if (createdAt < cutoffDate) {
          console.log(`🗑️ Eliminando subasta antigua: "${auction.title || 'Sin título'}" (Creada: ${new Date(createdAt).toLocaleString()})`);
          return false;
        }
      }
      
      return true;
    });
    
    if (filtered.length < auctions.length) {
      const removed = auctions.length - filtered.length;
      console.log(`🧹 Limpieza: ${removed} subastas finalizadas antiguas eliminadas (${filtered.length} restantes)`);
      return { cleaned: removed, remaining: filtered.length };
    }
    
    console.log(`✅ Todas las ${auctions.length} subastas son recientes`);
    return { cleaned: 0, remaining: auctions.length };
  } catch (error) {
    console.error('Error limpiando subastas:', error);
    return { cleaned: 0, remaining: auctions.length };
  }
};

/**
 * Limpia pedidos antiguos (completados o cancelados)
 */
export const cleanOldOrders = (orders: any[], config: CleanupConfig = DEFAULT_CONFIG): { cleaned: number; remaining: number } => {
  try {
    const now = Date.now();
    const cutoffDate = now - (config.ordersDaysOld! * 24 * 60 * 60 * 1000);
    
    console.log(`🔍 Revisando ${orders.length} pedidos. Fecha de corte: ${new Date(cutoffDate).toLocaleString()}`);
    
    let activeOrders = 0;
    let oldOrders = 0;
    
    const filtered = orders.filter((order: any) => {
      // Mantener pedidos activos/pendientes siempre
      if (['pending_payment', 'payment_confirmed', 'in_transit'].includes(order.status)) {
        activeOrders++;
        return true;
      }
      
      // Para pedidos finalizados (delivered, canceled, payment_expired), verificar fecha
      if (['delivered', 'canceled', 'payment_expired'].includes(order.status)) {
        const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
        
        if (orderDate === 0) {
          // Si no tiene fecha, mantenerlo por seguridad
          return true;
        }
        
        // Eliminar si es muy antiguo (más de X días)
        if (orderDate < cutoffDate) {
          oldOrders++;
          console.log(`🗑️ Eliminando pedido antiguo: #${order.id?.slice(0, 8)} (${order.status}, Creado: ${new Date(orderDate).toLocaleString()})`);
          return false;
        }
        
        return true;
      }
      
      return true;
    });
    
    if (filtered.length < orders.length) {
      const removed = orders.length - filtered.length;
      console.log(`🧹 Limpieza: ${removed} pedidos antiguos eliminados (${activeOrders} activos mantenidos, ${filtered.length} total restantes)`);
      return { cleaned: removed, remaining: filtered.length };
    }
    
    console.log(`✅ Todos los pedidos son recientes o están activos (${activeOrders} activos)`);
    return { cleaned: 0, remaining: orders.length };
  } catch (error) {
    console.error('Error limpiando pedidos:', error);
    return { cleaned: 0, remaining: orders.length };
  }
};

/**
 * Ejecuta limpieza completa para un usuario
 */
export const runCleanup = (userId: string | null, auctions: any[], orders: any[], config: CleanupConfig = DEFAULT_CONFIG) => {
  if (!userId) {
    console.log('⚠️ No se puede ejecutar limpieza: usuario no autenticado');
    return;
  }
  
  console.log('🧹 Iniciando limpieza automática de datos antiguos...');
  
  // Limpiar notificaciones
  const notificationsCleaned = cleanOldNotifications(userId, config);
  
  // Limpiar subastas (retorna información para actualizar el store)
  const auctionsCleanup = cleanOldAuctions(auctions, config);
  
  // Limpiar pedidos (retorna información para actualizar el store)
  const ordersCleanup = cleanOldOrders(orders, config);
  
  const total = notificationsCleaned + auctionsCleanup.cleaned + ordersCleanup.cleaned;
  
  if (total > 0) {
    console.log(`✅ Limpieza completada: ${total} elementos eliminados`);
    console.log(`   - Notificaciones: ${notificationsCleaned}`);
    console.log(`   - Subastas: ${auctionsCleanup.cleaned}`);
    console.log(`   - Pedidos: ${ordersCleanup.cleaned}`);
  } else {
    console.log('✅ No se encontraron datos antiguos para limpiar');
  }
  
  return {
    notificationsCleaned,
    auctionsCleanup,
    ordersCleanup
  };
};

