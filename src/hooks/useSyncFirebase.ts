import { useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';
import { Bid } from '../types';

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
  startTime: new Date(auctionData?.startTime || new Date()), // ← AGREGAR ESTA LÍNEA
  endTime: new Date(auctionData?.endTime || new Date()),
  status: auctionData?.status || 'active',
  categoryId: auctionData?.categoryId || 'general',
  bids: bids,
  winnerId: auctionData?.winnerId,
  featured: auctionData?.featured || false,
  isFlash: auctionData?.isFlash || false,
  condition: auctionData?.condition || 'good',
  createdBy: auctionData?.createdBy || 'unknown'
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
