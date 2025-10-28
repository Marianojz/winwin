import { useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';

export const useSyncFirebase = () => {
  const { setAuctions, setProducts } = useStore();

  useEffect(() => {
    console.log('🔄 Iniciando sincronización con Firebase...');

    // Sincronizar subastas
    const auctionsRef = ref(realtimeDb, 'auctions');
    const unsubscribeAuctions = onValue(auctionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const auctionsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          endTime: new Date(data[key].endTime),
          bids: data[key].bids ? Object.values(data[key].bids) : []
        }));
        console.log('✅ Subastas sincronizadas:', auctionsArray.length);
        setAuctions(auctionsArray);
      } else {
        console.log('📭 No hay subastas en Firebase');
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

    // Limpiar suscripciones
    return () => {
      unsubscribeAuctions();
      unsubscribeProducts();
    };
  }, [setAuctions, setProducts]);

  return null;
};
