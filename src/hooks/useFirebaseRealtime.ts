import { useState, useEffect } from 'react';
import { ref, onValue, set, push, update } from 'firebase/database';
import { realtimeDb } from '../firebase'; // Ajusta la ruta si es necesario
import { Auction } from '../types';

// Hook para subastas en tiempo real
export const useAuctionsRealtime = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);

  useEffect(() => {
    const auctionsRef = ref(realtimeDb, 'auctions');
    
    const unsubscribe = onValue(auctionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const auctionsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          endTime: new Date(data[key].endTime),
          bids: data[key].bids ? Object.values(data[key].bids) : []
        }));
        setAuctions(auctionsArray);
      } else {
        setAuctions([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const addBid = async (auctionId: string, amount: number, userId: string, username: string) => {
    const bid = {
      id: Date.now().toString(),
      auctionId,
      userId,
      username,
      amount,
      createdAt: new Date().toISOString()
    };

    const bidRef = push(ref(realtimeDb, `auctions/${auctionId}/bids`));
    await set(bidRef, bid);

    // Actualizar precio actual
    await update(ref(realtimeDb, `auctions/${auctionId}`), {
      currentPrice: amount,
      lastBidAt: new Date().toISOString()
    });

    return bid;
  };

  return { auctions, addBid };
};
