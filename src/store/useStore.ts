import { create } from 'zustand';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  onSnapshot, 
  collection,
  setDoc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Auction, Product, CartItem, Notification, Theme, Bot, Order, OrderStatus } from '../types';

interface AppState {
  // Theme
  theme: Theme;
  toggleTheme: () => void;

  // User
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;

  // Auctions
  auctions: Auction[];
  setAuctions: (auctions: Auction[]) => void;
  addBid: (auctionId: string, amount: number, userId: string, username: string) => void;

  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (notificationId: string) => void;
  unreadCount: number;

  // Bots (Admin only)
  bots: Bot[];
  setBots: (bots: Bot[]) => void;
  addBot: (bot: Bot) => void;
  updateBot: (botId: string, updates: Partial<Bot>) => void;
  deleteBot: (botId: string) => void;

  // Orders (Admin)
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, updates?: Partial<Order>) => void;

  // Firebase sync
  initFirebaseSync: () => void;
}

// Función auxiliar para guardar en localStorage de forma segura
const safeLocalStorageSet = (key: string, value: any) => {
  try {
    const stringValue = JSON.stringify(value);
    
    // Si es muy grande (>4MB), no guardar imágenes
    if (stringValue.length > 4 * 1024 * 1024) {
      console.warn(`⚠️ Datos de "${key}" muy grandes, limpiando imágenes...`);
      
      if (key === 'auctions') {
        const cleanedAuctions = value.map((auction: any) => ({
          ...auction,
          images: [] // Remover imágenes para ahorrar espacio
        }));
        localStorage.setItem(key, JSON.stringify(cleanedAuctions));
      } else {
        localStorage.setItem(key, stringValue);
      }
    } else {
      localStorage.setItem(key, stringValue);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('❌ localStorage lleno, limpiando datos antiguos...');
      
      // Limpiar auctions y products viejos
      localStorage.removeItem('auctions');
      localStorage.removeItem('products');
      
      // Intentar guardar versión limpia sin imágenes
      if (key === 'auctions') {
        const cleanedAuctions = value.map((auction: any) => ({
          ...auction,
          images: [] // Sin imágenes
        }));
        try {
          localStorage.setItem(key, JSON.stringify(cleanedAuctions));
        } catch (e) {
          console.error('❌ No se pudo guardar ni siquiera sin imágenes');
        }
      }
    } else {
      console.error('❌ Error guardando en localStorage:', error);
    }
  }
};

// Función auxiliar para sincronizar subastas con Firebase
const syncAuctionsWithFirebase = (set: any) => {
  const auctionsRef = collection(db, 'auctions');
  
  // Escuchar cambios en tiempo real
  const unsubscribe = onSnapshot(auctionsRef, (snapshot) => {
    const auctionsFromFirebase: Auction[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      auctionsFromFirebase.push({
        id: doc.id,
        ...data,
        endTime: data.endTime?.toDate() || new Date(data.endTime),
        bids: data.bids?.map((b: any) => ({
          ...b,
          createdAt: b.createdAt?.toDate() || new Date(b.createdAt)
        })) || []
      } as Auction);
    });

    // Actualizar estado local con datos de Firebase
    set({ auctions: auctionsFromFirebase });
  }, (error) => {
    console.error('Error sincronizando subastas:', error);
  });

  return unsubscribe;
};

export const useStore = create<AppState>((set, get) => ({
  // Theme
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
  },

  

  // User
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  isAuthenticated: false,

  // Auctions
  auctions: (() => {
    try {
      const saved = localStorage.getItem('auctions');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((a: any) => ({
        ...a,
        endTime: new Date(a.endTime),
        bids: a.bids?.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt)
        })) || []

        // Inicializar sincronización con Firebase
  initFirebaseSync: () => {
    const unsubscribe = syncAuctionsWithFirebase(set);
    
    // Guardar función de desuscripción
    if (typeof window !== 'undefined') {
      (window as any).__unsubscribeFirebase = unsubscribe;
    }
    
    console.log('🔥 Firebase sincronización iniciada');
  }
      }));
    } catch (error) {
      console.error('Error cargando subastas:', error);
      return [];
    }
  })(),
  setAuctions: (auctions) => {
    safeLocalStorageSet('auctions', auctions);
    set({ auctions });
  },
  addBid: async (auctionId, amount, userId, username) => {
    const newBid = {
      id: Date.now().toString(),
      auctionId,
      userId,
      username,
      amount,
      createdAt: new Date()
    };

    try {
      // Actualizar en Firebase - esto sincroniza automáticamente a todos
      const auctionRef = doc(db, 'auctions', auctionId);
      const auctionSnap = await getDoc(auctionRef);
      
      if (auctionSnap.exists()) {
        await updateDoc(auctionRef, {
          currentPrice: amount,
          bids: arrayUnion(newBid)
        });
        
        console.log('✅ Oferta sincronizada en Firebase');
      } else {
        console.error('❌ Subasta no existe en Firebase');
      }
    } catch (error) {
      console.error('❌ Error sincronizando oferta:', error);
      
      // Fallback: actualizar solo localmente si Firebase falla
      const auctions = get().auctions.map(auction => {
        if (auction.id === auctionId) {
          return {
            ...auction,
            currentPrice: amount,
            bids: [...auction.bids, newBid]
          };
        }
        return auction;
      });
      get().setAuctions(auctions);
    }
  },

  // Products
  products: (() => {
    try {
      return JSON.parse(localStorage.getItem('products') || '[]');
    } catch (error) {
      console.error('Error cargando productos:', error);
      return [];
    }
  })(),
  setProducts: (products) => {
    safeLocalStorageSet('products', products);
    set({ products });
  },

  // Cart
  cart: [],
  addToCart: (product, quantity) => {
    const cart = get().cart;
    const existingItem = cart.find(item => item.productId === product.id);
    
    let newCart;
    if (existingItem) {
      newCart = cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newCart = [...cart, { productId: product.id, product, quantity }];
    }
    
    const newTotal = newCart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    set({ cart: newCart, cartTotal: newTotal });
  },
  removeFromCart: (productId) => {
    const newCart = get().cart.filter(item => item.productId !== productId);
    const newTotal = newCart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    set({ cart: newCart, cartTotal: newTotal });
  },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
    } else {
      const newCart = get().cart.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
      const newTotal = newCart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      set({ cart: newCart, cartTotal: newTotal });
    }
  },
  clearCart: () => set({ cart: [], cartTotal: 0 }),
  cartTotal: 0,

  // Notifications
  notifications: [],
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      read: false
    };
    set(state => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },
  markAsRead: (notificationId) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  },
  unreadCount: 0,

  // Bots
  bots: JSON.parse(localStorage.getItem('bots') || '[]'),
  setBots: (bots) => {
    localStorage.setItem('bots', JSON.stringify(bots));
    set({ bots });
  },
  addBot: (bot) => {
    const newBots = [...get().bots, bot];
    get().setBots(newBots);
  },
  updateBot: (botId, updates) => {
    const newBots = get().bots.map(b => b.id === botId ? { ...b, ...updates } : b);
    get().setBots(newBots);
  },
  deleteBot: (botId) => {
    const newBots = get().bots.filter(b => b.id !== botId);
    get().setBots(newBots);
  },

  // Orders
  orders: JSON.parse(localStorage.getItem('orders') || '[]').map((o: any) => ({
    ...o,
    createdAt: new Date(o.createdAt),
    expiresAt: o.expiresAt ? new Date(o.expiresAt) : undefined,
    paidAt: o.paidAt ? new Date(o.paidAt) : undefined,
    shippedAt: o.shippedAt ? new Date(o.shippedAt) : undefined,
    deliveredAt: o.deliveredAt ? new Date(o.deliveredAt) : undefined
  })),
  addOrder: (order) => {
    const newOrders = [...get().orders, order];
    localStorage.setItem('orders', JSON.stringify(newOrders));
    set({ orders: newOrders });
  },
  updateOrderStatus: (orderId, status, updates = {}) => {
    const now = new Date();
    const newOrders = get().orders.map(order => {
      if (order.id === orderId) {
        const updatedOrder = {
          ...order,
          status,
          ...updates
        };

        if (status === 'payment_confirmed' && !order.paidAt) {
          updatedOrder.paidAt = now;
        }
        if (status === 'in_transit' && !order.shippedAt) {
          updatedOrder.shippedAt = now;
        }
        if (status === 'delivered' && !order.deliveredAt) {
          updatedOrder.deliveredAt = now;
        }

        return updatedOrder;
      }
      return order;
    });
    
    localStorage.setItem('orders', JSON.stringify(newOrders));
    set({ orders: newOrders });
  }
}));
