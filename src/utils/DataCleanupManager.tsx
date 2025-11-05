import { useEffect, useRef } from 'react';
import { ref, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';
import { runCleanup } from './dataCleaner';

/**
 * Gestor automático de limpieza de datos antiguos
 * Se ejecuta al iniciar la app y luego cada 24 horas
 */
const DataCleanupManager = () => {
  const { user, auctions, orders, setAuctions, setOrders } = useStore();
  const cleanupExecutedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!user) {
      console.log('🧹 DataCleanupManager: Esperando usuario...');
      return;
    }

    console.log('🧹 DataCleanupManager: Usuario detectado, preparando limpieza...');

    const performCleanup = async () => {
      // Verificar si el componente aún está montado
      if (!isMountedRef.current) return;
      try {
        console.log('🧹 DataCleanupManager: Ejecutando limpieza...');
        // Obtener datos actuales del store
        const currentAuctions = useStore.getState().auctions;
        const currentOrders = useStore.getState().orders;
        
        console.log(`🧹 Datos actuales: ${currentAuctions.length} subastas, ${currentOrders.length} pedidos`);
        
        const result = runCleanup(user.id, currentAuctions, currentOrders);
        
        if (!result) {
          console.log('⚠️ DataCleanupManager: runCleanup retornó null/undefined');
          return;
        }
        
        // Actualizar subastas si se limpiaron algunas
        if (result.auctionsCleanup.cleaned > 0) {
          console.log(`🧹 Limpiando ${result.auctionsCleanup.cleaned} subastas antiguas...`);
          const cleanedAuctions = currentAuctions.filter((auction: any) => {
            if (auction.status === 'active' || auction.status === 'scheduled') {
              return true;
            }
            if (auction.status === 'ended') {
              const now = Date.now();
              const cutoffDate = now - (3 * 24 * 60 * 60 * 1000); // 3 días (más agresivo)
              const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
              const createdAt = auction.createdAt ? new Date(auction.createdAt).getTime() : 0;
              const checkDate = endTime > 0 ? endTime : createdAt;
              return checkDate >= cutoffDate;
            }
            return true;
          });
          
          // Eliminar subastas antiguas de Firebase también
          const auctionsToRemove = currentAuctions.filter((auction: any) => {
            if (auction.status === 'active' || auction.status === 'scheduled') {
              return false; // No eliminar activas
            }
            if (auction.status === 'ended') {
              const now = Date.now();
              const cutoffDate = now - (3 * 24 * 60 * 60 * 1000);
              const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
              const createdAt = auction.createdAt ? new Date(auction.createdAt).getTime() : 0;
              const checkDate = endTime > 0 ? endTime : createdAt;
              return checkDate < cutoffDate; // Eliminar si es antigua
            }
            return false;
          });
          
          // Eliminar de Firebase
          for (const auction of auctionsToRemove) {
            try {
              await remove(ref(realtimeDb, `auctions/${auction.id}`));
              console.log(`🗑️ Subasta ${auction.id} eliminada de Firebase`);
            } catch (error) {
              console.error(`❌ Error eliminando subasta ${auction.id} de Firebase:`, error);
            }
          }
          
          if (isMountedRef.current) {
            setAuctions(cleanedAuctions);
            console.log(`✅ Subastas actualizadas: ${cleanedAuctions.length} restantes`);
          }
        }
        
        // Actualizar pedidos si se limpiaron algunos
        if (result.ordersCleanup.cleaned > 0) {
          console.log(`🧹 Limpiando ${result.ordersCleanup.cleaned} pedidos antiguos...`);
          const cleanedOrders = currentOrders.filter((order: any) => {
            // Mantener pedidos activos siempre
            if (['pending_payment', 'payment_confirmed', 'in_transit'].includes(order.status)) {
              return true;
            }
            // Para pedidos finalizados, verificar antigüedad
            if (['delivered', 'canceled', 'payment_expired'].includes(order.status)) {
              const now = Date.now();
              const cutoffDate = now - (7 * 24 * 60 * 60 * 1000); // 7 días (más agresivo)
              const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
              return orderDate >= cutoffDate;
            }
            return true;
          });
          
          // Eliminar pedidos antiguos de Firebase también
          const ordersToRemove = currentOrders.filter((order: any) => {
            // Mantener pedidos activos siempre
            if (['pending_payment', 'payment_confirmed', 'in_transit'].includes(order.status)) {
              return false; // No eliminar activos
            }
            // Para pedidos finalizados, verificar antigüedad
            if (['delivered', 'canceled', 'payment_expired'].includes(order.status)) {
              const now = Date.now();
              const cutoffDate = now - (7 * 24 * 60 * 60 * 1000);
              const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
              return orderDate < cutoffDate; // Eliminar si es antiguo
            }
            return false;
          });
          
          // Eliminar de Firebase
          for (const order of ordersToRemove) {
            try {
              await remove(ref(realtimeDb, `orders/${order.id}`));
              console.log(`🗑️ Pedido ${order.id} eliminado de Firebase`);
            } catch (error) {
              console.error(`❌ Error eliminando pedido ${order.id} de Firebase:`, error);
            }
          }
          
          if (isMountedRef.current) {
            setOrders(cleanedOrders);
            console.log(`✅ Pedidos actualizados: ${cleanedOrders.length} restantes`);
          }
        }
        
        // Recargar notificaciones para reflejar cambios
        const { loadUserNotifications } = useStore.getState();
        if (loadUserNotifications && result.notificationsCleaned > 0) {
          setTimeout(() => {
            loadUserNotifications();
          }, 500);
        }
      } catch (error) {
        console.error('❌ Error en performCleanup:', error);
      }
    };

    // Resetear flag cuando cambia el usuario
    cleanupExecutedRef.current = false;
    
    // Ejecutar limpieza inmediatamente al iniciar (con delay para que el store esté listo)
    const initialTimer = setTimeout(() => {
      if (!cleanupExecutedRef.current) {
        cleanupExecutedRef.current = true;
        performCleanup();
      }
    }, 3000); // Aumentado a 3 segundos para asegurar que todo esté cargado
    
    // Ejecutar limpieza cada 6 horas (más frecuente para mantenimiento)
    const interval = setInterval(() => {
      performCleanup();
    }, 6 * 60 * 60 * 1000); // Cada 6 horas

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      cleanupExecutedRef.current = false;
    };
  }, [user?.id]); // Re-ejecutar si cambia el usuario

  return null;
};

export default DataCleanupManager;

