import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { mockAuctions } from './mockData';

export const seedAuctionsToFirebase = async () => {
  try {
    console.log('📤 Subiendo subastas a Firebase...');
    
    for (const auction of mockAuctions) {
      const auctionRef = doc(db, 'auctions', auction.id);
      await setDoc(auctionRef, {
        ...auction,
        endTime: auction.endTime,
        bids: auction.bids
      });
    }
    
    console.log('✅ Subastas subidas a Firebase correctamente');
  } catch (error) {
    console.error('❌ Error subiendo subastas:', error);
  }
};
