import { useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';
import { Bid } from '../types';

const useSyncFirebase = () => {
  const { setAuctions, setProducts, setOrders } = useStore();

  useEffect(() => {
    console.log('🔄 INICIANDO SINCRONIZACIÓN FIREBASE...');

    // Sincronizar subastas
    const auctionsRef = ref(realtimeDb, 'auctions');
    const unsubscribeAuctions = onValue(auctionsRef, (snapshot) => {
      const data = snapshot.val();
      console.log('📡 Firebase - Datos recibidos:', data);
      
      if (data) {
        const now = Date.now();
        const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000); // 3 días
        
        const auctionsArray = Object.keys(data)
          .map(key => {
            const auctionData = data[key];
            
            // Filtrar subastas corruptas o sin título
            if (!auctionData?.title || 
                auctionData.title === 'Sin título' || 
                auctionData.title.trim() === '') {
              console.log(`🗑️ Filtrando subasta corrupta: ${key} (sin título)`);
              return null;
            }
            
            // Filtrar subastas muy antiguas (más de 3 días finalizadas)
            if (auctionData.endTime) {
              const endTime = new Date(auctionData.endTime).getTime();
              if (endTime < threeDaysAgo && (auctionData.status === 'ended' || auctionData.status === 'sold')) {
                console.log(`🗑️ Filtrando subasta antigua: ${key} (finalizada hace más de 3 días)`);
                return null;
              }
            }
            
            // Convertir bids de unknown[] a Bid[]
            const bids: Bid[] = auctionData?.bids ? Object.values(auctionData.bids).map((bid: any) => ({
              id: bid.id || '',
              auctionId: bid.auctionId || '',
              userId: bid.userId || '',
              username: bid.username || '',
              amount: bid.amount || 0,
              createdAt: new Date(bid.createdAt || new Date()),
              isBot: bid.isBot || false
            })) : [];
            
            // ✅ CORRECCIÓN: Estructura tipada correctamente
            return {
              id: key,
              title: auctionData?.title || 'Sin título',
              description: auctionData?.description || '',
              images: auctionData?.images || [],
              startingPrice: auctionData?.startingPrice || 0,
              currentPrice: auctionData?.currentPrice || 0,
              buyNowPrice: auctionData?.buyNowPrice,
              startTime: new Date(auctionData?.startTime || new Date()),
              endTime: new Date(auctionData?.endTime || new Date()),
              status: auctionData?.status || 'active',
              categoryId: auctionData?.categoryId || 'general',
              bids: bids,
              winnerId: auctionData?.winnerId,
              featured: auctionData?.featured || false,
              isFlash: auctionData?.isFlash || false,
              condition: auctionData?.condition || 'good',
              createdBy: auctionData?.createdBy || 'unknown',
              createdAt: auctionData?.createdAt ? new Date(auctionData.createdAt) : new Date()
            };
          })
          .filter((auction): auction is any => auction !== null); // Filtrar nulls
        
        console.log(`✅ Firebase - Subastas sincronizadas: ${auctionsArray.length} (filtradas ${Object.keys(data).length - auctionsArray.length} corruptas/antiguas)`);
        setAuctions(auctionsArray);
      } else {
        console.log('📭 Firebase - No hay subastas');
        setAuctions([]);
      }
    });

    // Sincronizar productos desde Firebase
    const productsRef = ref(realtimeDb, 'products');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsArray = Object.keys(data).map(key => {
          const productData = data[key];
          return {
            id: key,
            name: productData?.name || '',
            description: productData?.description || '',
            images: productData?.images || [],
            price: productData?.price || 0,
            stock: productData?.stock || 0,
            categoryId: productData?.categoryId || '1',
            ratings: productData?.ratings || [],
            averageRating: productData?.averageRating || 0,
            badges: productData?.badges || [],
            stickers: productData?.stickers || [],
            active: productData?.active !== undefined ? productData.active : true,
            featured: productData?.featured || false,
            createdAt: productData?.createdAt || new Date().toISOString(),
            updatedAt: productData?.updatedAt || productData?.createdAt || new Date().toISOString()
          };
        });
        console.log('✅ Productos sincronizados desde Firebase:', productsArray.length);
        setProducts(productsArray, true); // skipFirebaseSync = true para evitar bucle infinito
      } else {
        // Si no hay datos en Firebase, limpiar productos (no usar localStorage)
        console.log('📭 Firebase - No hay productos');
        setProducts([], true);
      }
    });

    // Sincronizar pedidos desde Firebase
    const ordersRef = ref(realtimeDb, 'orders');
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ordersArray = Object.keys(data).map(key => {
          const orderData = data[key];
          return {
            id: key,
            userId: orderData?.userId || '',
            userName: orderData?.userName || '',
            productId: orderData?.productId || '',
            productName: orderData?.productName || '',
            productImage: orderData?.productImage || '',
            productType: orderData?.productType || 'store',
            type: orderData?.type || 'store',
            amount: orderData?.amount || 0,
            status: orderData?.status || 'pending_payment',
            deliveryMethod: orderData?.deliveryMethod || 'shipping',
            createdAt: orderData?.createdAt ? new Date(orderData.createdAt) : new Date(),
            expiresAt: orderData?.expiresAt ? new Date(orderData.expiresAt) : undefined,
            paidAt: orderData?.paidAt ? new Date(orderData.paidAt) : undefined,
            shippedAt: orderData?.shippedAt ? new Date(orderData.shippedAt) : undefined,
            deliveredAt: orderData?.deliveredAt ? new Date(orderData.deliveredAt) : undefined,
            address: orderData?.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } }
          };
        });
        console.log('✅ Pedidos sincronizados desde Firebase:', ordersArray.length);
        setOrders(ordersArray);
      } else {
        console.log('📭 Firebase - No hay pedidos');
        setOrders([]);
      }
    });

    return () => {
      console.log('🔴 Cerrando sincronización Firebase');
      unsubscribeAuctions();
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [setAuctions, setProducts, setOrders]);

  return null;
};

export { useSyncFirebase };
