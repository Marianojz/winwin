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
  notificationsDaysOld: 2, // Eliminar notificaciones después de 2 días (más agresivo)
  auctionsDaysOld: 3, // Eliminar subastas finalizadas después de 3 días (más agresivo para testing)
  ordersDaysOld: 7 // Mantener pedidos completados por 7 días (más agresivo)
};

/**
 * Limpia notificaciones antiguas
 * NOTA: Las notificaciones ahora se guardan en Firebase Realtime Database, no en localStorage.
 * Esta función está obsoleta pero se mantiene por compatibilidad.
 * La limpieza de notificaciones se maneja directamente en Firebase desde useStore.ts
 * 
 * @deprecated Las notificaciones ya no se guardan en localStorage
 */
export const cleanOldNotifications = (userId: string, config: CleanupConfig = DEFAULT_CONFIG): number => {
  // Las notificaciones ahora están en Firebase, no en localStorage
  // Limpiar cualquier dato obsoleto que pueda quedar en localStorage
  try {
    const storageKey = `notifications_${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      // Eliminar datos obsoletos de localStorage
      localStorage.removeItem(storageKey);
      console.log(`🧹 Eliminados datos obsoletos de notificaciones de localStorage para usuario ${userId}`);
      return 1;
    }
    
    return 0;
  } catch (error) {
    console.error('Error limpiando notificaciones obsoletas de localStorage:', error);
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
    console.log(`📅 Fecha actual: ${new Date().toLocaleString()}, Días de retención: ${config.auctionsDaysOld}`);
    
    let activeCount = 0;
    let endedCount = 0;
    let toRemove = 0;
    
    const filtered = auctions.filter((auction: any) => {
      // Mantener subastas activas o programadas siempre
      if (auction.status === 'active' || auction.status === 'scheduled') {
        activeCount++;
        return true;
      }
      
      // Para subastas finalizadas, verificar fecha
      if (auction.status === 'ended' || auction.status === 'sold' || auction.status === 'completed') {
        endedCount++;
        const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
        const createdAt = auction.createdAt ? new Date(auction.createdAt).getTime() : 0;
        
        // Usar endTime si existe, sino usar createdAt
        const checkDate = endTime > 0 ? endTime : createdAt;
        
        if (checkDate === 0) {
          // Si no tiene fecha válida, mantener por seguridad pero advertir
          console.warn(`⚠️ Subasta sin fecha válida: "${auction.title || 'Sin título'}" (ID: ${auction.id}, Status: ${auction.status})`);
          return true;
        }
        
        const daysOld = Math.round((now - checkDate) / (24 * 60 * 60 * 1000));
        
        // Eliminar si es muy antigua (más de X días)
        if (checkDate < cutoffDate) {
          toRemove++;
          console.log(`🗑️ Eliminando subasta antigua: "${auction.title || 'Sin título'}" (Finalizó: ${new Date(checkDate).toLocaleString()}, ${daysOld} días atrás, Status: ${auction.status})`);
          return false;
        }
        
        return true;
      }
      
      // Para subastas con otros estados, usar createdAt
      if (auction.createdAt) {
        const createdAt = new Date(auction.createdAt).getTime();
        if (createdAt > 0) {
          const daysOld = Math.round((now - createdAt) / (24 * 60 * 60 * 1000));
          if (createdAt < cutoffDate) {
            toRemove++;
            console.log(`🗑️ Eliminando subasta antigua: "${auction.title || 'Sin título'}" (Creada: ${new Date(createdAt).toLocaleString()}, ${daysOld} días atrás, Status: ${auction.status})`);
            return false;
          }
        }
      }
      
      return true;
    });
    
    console.log(`📊 Subastas: ${activeCount} activas, ${endedCount} finalizadas, ${toRemove} eliminadas`);
    
    if (filtered.length < auctions.length) {
      const removed = auctions.length - filtered.length;
      console.log(`🧹 Limpieza: ${removed} subastas finalizadas antiguas eliminadas (${filtered.length} restantes)`);
      return { cleaned: removed, remaining: filtered.length };
    }
    
    console.log(`✅ Todas las ${auctions.length} subastas son recientes o activas`);
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
    console.log(`📅 Fecha actual: ${new Date().toLocaleString()}`);
    
    // Primero eliminar duplicados por ID
    const uniqueOrders = orders.filter((order: any, index: number, self: any[]) => 
      index === self.findIndex((o: any) => o.id === order.id)
    );
    
    if (uniqueOrders.length < orders.length) {
      console.log(`🧹 Eliminados ${orders.length - uniqueOrders.length} pedidos duplicados`);
    }
    
    let activeOrders = 0;
    let oldOrders = 0;
    
    const filtered = uniqueOrders.filter((order: any) => {
      // Mantener pedidos activos/pendientes siempre
      if (['pending_payment', 'payment_confirmed', 'in_transit', 'processing', 'preparing', 'shipped'].includes(order.status)) {
        activeOrders++;
        return true;
      }
      
      // Para pedidos finalizados (delivered, canceled, payment_expired), verificar fecha
      if (['delivered', 'canceled', 'payment_expired', 'expired'].includes(order.status)) {
        const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
        
        if (orderDate === 0) {
          // Si no tiene fecha, mantenerlo por seguridad
          return true;
        }
        
        const daysOld = Math.round((now - orderDate) / (24 * 60 * 60 * 1000));
        
        // Eliminar si es muy antiguo (más de X días)
        if (orderDate < cutoffDate) {
          oldOrders++;
          console.log(`🗑️ Eliminando pedido antiguo: #${order.id?.slice(0, 8)} (${order.status}, Creado: ${new Date(orderDate).toLocaleString()}, ${daysOld} días atrás)`);
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
  
  // Limpiar notificaciones obsoletas de localStorage (si existen)
  // NOTA: Las notificaciones ahora están en Firebase, esta función solo limpia datos antiguos
  const notificationsCleaned = cleanOldNotifications(userId, config);
  
  // Limpiar subastas (retorna información para actualizar el store)
  const auctionsCleanup = cleanOldAuctions(auctions, config);
  
  // Limpiar pedidos (retorna información para actualizar el store)
  const ordersCleanup = cleanOldOrders(orders, config);
  
  const total = notificationsCleaned + auctionsCleanup.cleaned + ordersCleanup.cleaned;
  
  if (total > 0) {
    console.log(`✅ Limpieza completada: ${total} elementos eliminados`);
    console.log(`   - Notificaciones obsoletas de localStorage: ${notificationsCleaned}`);
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

