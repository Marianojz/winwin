import { useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';

const useSyncFirebase = () => {
  const { setAuctions, setProducts } = useStore();

  useEffect(() => {
    console.log('🔄 INICIANDO SINCRONIZACIÓN FIREBASE...');

    // Sincronizar subastas
    const auctionsRef = ref(realtimeDb, 'auctions');
    const unsubscribeAuctions = onValue(auctionsRef, (snapshot) => {
      const data = snapshot.val();
      console.log('📡 Firebase - Datos recibidos:', data);
      
      if (data) {
        const auctionsArray = Object.keys(data).map(key => {
          const auctionData = data[key];
          
          // ✅ CORRECCIÓN: Manejar datos que pueden faltar o ser undefined
          return {
            id: key,
            title: auctionData?.title || 'Sin título',
            description: auctionData?.description || '',
            images: auctionData?.images || [],
            startPrice: auctionData?.startPrice || 0,
            currentPrice: auctionData?.currentPrice || 0,
            buyNowPrice: auctionData?.buyNowPrice,
            endTime: new Date(auctionData?.endTime || new Date()),
            status: auctionData?.status || 'active',
            categoryId: auctionData?.categoryId || 'general',
            bids: auctionData?.bids ? Object.values(auctionData.bids) : [],
            winnerId: auctionData?.winnerId,
            featured: auctionData?.featured || false,
            isFlash: auctionData?.isFlash || false,
            condition: auctionData?.condition || 'good'
          };
        });
        
        console.log('✅ Firebase - Subastas sincronizadas:', auctionsArray.length);
        setAuctions(auctionsArray);
      } else {
        console.log('📭 Firebase - No hay subastas');
        setAuctions([]);
      }
    });

    // Sincronizar productos (opcional)
    const productsRef = ref(realtimeDb, 'products');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        console.log('✅ Productos sincronizados:', productsArray.length);
        setProducts(productsArray);
      }
    });

    return () => {
      console.log('🔴 Cerrando sincronización Firebase');
      unsubscribeAuctions();
      unsubscribeProducts();
    };
  }, [setAuctions, setProducts]);

  return null;
};

export { useSyncFirebase };
