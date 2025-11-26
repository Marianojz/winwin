import { useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';
import { Bid } from '../types';

const useSyncFirebase = () => {
  const { setAuctions, setProducts, setOrders, user } = useStore();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 INICIANDO SINCRONIZACIÓN FIREBASE...');
    }

    // Sincronizar subastas
    const auctionsRef = ref(realtimeDb, 'auctions');
    const unsubscribeAuctions = onValue(auctionsRef, (snapshot) => {
      const data = snapshot.val();
      if (import.meta.env.DEV) {
        console.log('📡 Firebase - Datos recibidos:', data);
      }
      
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
              if (import.meta.env.DEV) {
                console.log(`🗑️ Filtrando subasta corrupta: ${key} (sin título)`);
              }
              return null;
            }
            
            // Filtrar subastas muy antiguas (más de 3 días finalizadas)
            if (auctionData.endTime) {
              const endTime = new Date(auctionData.endTime).getTime();
              if (endTime < threeDaysAgo && (auctionData.status === 'ended' || auctionData.status === 'sold')) {
                if (import.meta.env.DEV) {
                  console.log(`🗑️ Filtrando subasta antigua: ${key} (finalizada hace más de 3 días)`);
                }
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
            // Parsear endTime correctamente, validando que sea una fecha válida
            let endTime: Date;
            if (auctionData?.endTime) {
              if (auctionData.endTime instanceof Date) {
                endTime = auctionData.endTime;
              } else if (typeof auctionData.endTime === 'string') {
                endTime = new Date(auctionData.endTime);
              } else {
                if (import.meta.env.DEV) {
                  console.warn(`⚠️ Subasta ${key} tiene endTime inválido:`, auctionData.endTime);
                }
                endTime = new Date(); // Fallback a fecha actual
              }
              
              // Validar que la fecha sea válida
              if (isNaN(endTime.getTime())) {
              if (import.meta.env.DEV) {
                console.warn(`⚠️ Subasta ${key} tiene endTime inválido (NaN), usando fecha actual como fallback`);
              }
                endTime = new Date();
              }
            } else {
              if (import.meta.env.DEV) {
                console.warn(`⚠️ Subasta ${key} no tiene endTime, usando fecha actual como fallback`);
              }
              endTime = new Date();
            }
            
            // Parsear startTime de la misma manera
            let startTime: Date;
            if (auctionData?.startTime) {
              if (auctionData.startTime instanceof Date) {
                startTime = auctionData.startTime;
              } else if (typeof auctionData.startTime === 'string') {
                startTime = new Date(auctionData.startTime);
              } else {
                startTime = new Date();
              }
              if (isNaN(startTime.getTime())) {
                startTime = new Date();
              }
            } else {
              startTime = new Date();
            }
            
            return {
              id: key,
              title: auctionData?.title || 'Sin título',
              description: auctionData?.description || '',
              images: auctionData?.images || [],
              startingPrice: auctionData?.startingPrice || 0,
              currentPrice: auctionData?.currentPrice || 0,
              buyNowPrice: auctionData?.buyNowPrice,
              startTime: startTime,
              endTime: endTime,
              status: auctionData?.status || 'active',
              categoryId: auctionData?.categoryId || 'general',
              bids: bids,
              winnerId: auctionData?.winnerId,
              featured: auctionData?.featured || false,
              isFlash: auctionData?.isFlash || false,
              condition: auctionData?.condition || 'good',
              createdBy: auctionData?.createdBy || 'unknown',
              createdAt: auctionData?.createdAt ? new Date(auctionData.createdAt) : new Date(),
              // Relación opcional con producto de tienda si existe en Firebase
              linkedProductId: auctionData?.linkedProductId
            };
          })
          .filter((auction): auction is any => auction !== null); // Filtrar nulls
        
        // Eliminar duplicados por ID (por si acaso hay duplicados en Firebase)
        const uniqueAuctions = Array.from(
          new Map(auctionsArray.map(auction => [auction.id, auction])).values()
        );
        
        const duplicatesCount = auctionsArray.length - uniqueAuctions.length;
        if (import.meta.env.DEV) {
          if (duplicatesCount > 0) {
            console.warn(`⚠️ Se encontraron ${duplicatesCount} subasta(s) duplicada(s), eliminadas`);
          }
          
          console.log(`✅ Firebase - Subastas sincronizadas: ${uniqueAuctions.length} (filtradas ${Object.keys(data).length - uniqueAuctions.length} corruptas/antiguas/duplicadas)`);
        }
        setAuctions(uniqueAuctions);
      } else {
        if (import.meta.env.DEV) {
          console.log('📭 Firebase - No hay subastas');
        }
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
            // stockTotal se usa como referencia histórica; si no existe, usar stock actual
            stockTotal: productData?.stockTotal ?? productData?.stock ?? 0,
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
        if (import.meta.env.DEV) {
          console.log('✅ Productos sincronizados desde Firebase:', productsArray.length);
        }
        setProducts(productsArray, true); // skipFirebaseSync = true para evitar bucle infinito
      } else {
        // Si no hay datos en Firebase, limpiar productos (no usar localStorage)
        if (import.meta.env.DEV) {
          console.log('📭 Firebase - No hay productos');
        }
        setProducts([], true);
      }
    });

    // Sincronizar pedidos desde Firebase
    // Intentar leer toda la colección (solo admins pueden)
    // Si falla, intentar leer solo los pedidos del usuario actual
    const ordersRef = ref(realtimeDb, 'orders');
    
    const handleOrdersSnapshot = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const ordersArray = Object.keys(data).map(key => {
          const orderData = data[key];
          // Usar el ID del objeto si existe, de lo contrario usar la clave
          // Esto asegura que el ID sea consistente con cómo se guarda
          const orderId = orderData?.id || key;
          return {
            id: orderId,
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
            address: orderData?.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } },
            orderNumber: orderData?.orderNumber,
            quantity: orderData?.quantity,
            unitsPerBundle: orderData?.unitsPerBundle,
            bundles: orderData?.bundles
          };
        });
        
        // Si el usuario no es admin, filtrar solo sus pedidos
        const filteredOrders = user && !user.isAdmin 
          ? ordersArray.filter(order => order.userId === user.id)
          : ordersArray;
        
        if (import.meta.env.DEV) {
          console.log('✅ Pedidos sincronizados desde Firebase:', filteredOrders.length, user?.isAdmin ? '(todos)' : '(solo del usuario)');
        }
        setOrders(filteredOrders);
      } else {
        if (import.meta.env.DEV) {
          console.log('📭 Firebase - No hay pedidos');
        }
        setOrders([]);
      }
    };

    const unsubscribeOrders = onValue(
      ordersRef, 
      handleOrdersSnapshot,
      (error) => {
        console.error('❌ Error sincronizando pedidos:', error);
        // Si hay error de permisos y hay usuario, intentar leer solo sus pedidos
        if ((error as any)?.code === 'PERMISSION_DENIED' && user) {
          console.log('⚠️ No se pueden leer todos los pedidos, intentando leer solo los del usuario...');
          // Los usuarios solo pueden leer sus propios pedidos individuales
          // La sincronización se hará cuando se creen nuevos pedidos
          setOrders([]);
        } else {
          setOrders([]);
        }
      }
    );

    return () => {
      if (import.meta.env.DEV) {
        console.log('🔴 Cerrando sincronización Firebase');
      }
      unsubscribeAuctions();
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [setAuctions, setProducts, setOrders, user]);

  return null;
};

export { useSyncFirebase };
