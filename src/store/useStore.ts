import { ref, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { create } from 'zustand';
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
  unreadCount: number;
  loadUserNotifications: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  deleteNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;

  // Bots (Admin only)
  bots: Bot[];
  setBots: (bots: Bot[]) => void;
  addBot: (bot: Bot) => void;
  updateBot: (botId: string, updates: Partial<Bot>) => void;
  deleteBot: (botId: string) => void;

  // Orders (Admin)
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, updates?: Partial<Order>) => void;
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

export const useStore = create<AppState>((set, get) => ({
  // Theme
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
  },

  // User
user: (() => {
  try {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})(),
setUser: (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    // Limpiar notificaciones cuando el usuario se desloguea
    set({ notifications: [], unreadCount: 0 });
    localStorage.removeItem('user');
  }
  set({ user, isAuthenticated: !!user });
},
isAuthenticated: (() => {
  try {
    return !!localStorage.getItem('user');
  } catch {
    return false;
  }
})(),

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
  try {
    console.log('🔥 Intentando guardar oferta en Firebase...');
    
    // VERIFICAR QUE EL USUARIO NO SEA EL CREADOR DE LA SUBASTA
    const state = get();
    const auction = state.auctions.find(a => a.id === auctionId);
    
    if (auction && auction.createdBy === userId) {
      console.error('❌ ERROR: No puedes hacer ofertas en tu propia subasta');
      alert('No puedes hacer ofertas en tu propia subasta');
      return; // Detener la función aquí
    }
    
    // VALIDACIONES DE MÍNIMO Y MÚLTIPLO
    if (!auction) {
      alert('Subasta no encontrada');
      return;
    }
    const currentPrice = auction.currentPrice || 0;
    if (amount <= currentPrice) {
      alert(`Tu oferta debe ser mayor a ${currentPrice.toLocaleString()}`);
      return;
    }
    if (amount % 500 !== 0) {
      alert('La oferta debe ser múltiplo de $500');
      return;
    }

    const bid = {
      id: Date.now().toString(),
      auctionId,
      userId,
      username,
      amount,
      createdAt: new Date().toISOString()
    };

    // AGREGÁ ESTE LOG PARA VER LA URL
    console.log('🔗 URL de Firebase:', `auctions/${auctionId}`);
    
    await update(ref(realtimeDb, `auctions/${auctionId}`), {
      currentPrice: amount,
      lastBidAt: new Date().toISOString(),
      [`bids/${bid.id}`]: bid
    });

    console.log('✅ OFERTA GUARDADA EN FIREBASE EXITOSAMENTE');
    // Actualización optimista local para que el usuario vea el cambio al instante
    const updatedAuctions = state.auctions.map(a =>
      a.id === auctionId
        ? { ...a, currentPrice: amount, bids: [...a.bids, { ...bid, createdAt: new Date(bid.createdAt) as any }] }
        : a
    );
    state.setAuctions(updatedAuctions);
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO Firebase:', error);
    console.error('❌ VERIFICAR: 1) Realtime Database activado 2) Reglas en test mode');
    
    // Fallback a localStorage
    const state = get();
    const auctions = state.auctions.map(auction => {
      if (auction.id === auctionId) {
        const newBid = {
          id: Date.now().toString(),
          auctionId,
          userId,
          username,
          amount,
          createdAt: new Date()
        };
        return {
          ...auction,
          currentPrice: amount,
          bids: [...auction.bids, newBid]
        };
      }
      return auction;
    });
    state.setAuctions(auctions);
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
  unreadCount: 0,
  
  // Función para cargar notificaciones del usuario actual
  loadUserNotifications: () => {
    const user = get().user;
    if (!user) {
      set({ notifications: [], unreadCount: 0 });
      return;
    }

    try {
      const storageKey = `notifications_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      
      if (!saved) {
        set({ notifications: [], unreadCount: 0 });
        return;
      }
      
      const parsed = JSON.parse(saved);
      const now = Date.now();
      // Filtrar notificaciones leídas que tienen más de 7 días
      const filtered = parsed.filter((n: any) => {
        if (!n.read) return true;
        if (n.readAt) {
          const readTime = new Date(n.readAt).getTime();
          return (now - readTime) < (7 * 24 * 60 * 60 * 1000); // 7 días
        }
        return true;
      });
      
      // Actualizar localStorage si se filtraron notificaciones
      if (filtered.length !== parsed.length) {
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
      
      const notifications = filtered.map((n: any) => {
        // Normalizar read a boolean estricto - verificar múltiples formatos
        let readValue = false;
        if (n.read === true) {
          readValue = true;
        } else if (n.read === 'true') {
          readValue = true;
        } else if (n.read === 1) {
          readValue = true;
        } else if (String(n.read).toLowerCase() === 'true') {
          readValue = true;
        }
        
        return {
          ...n,
          createdAt: new Date(n.createdAt),
          read: Boolean(readValue), // Forzar boolean estricto
          readAt: n.readAt ? new Date(n.readAt) : undefined
        };
      });
      
      const unreadCount = notifications.filter((n: any) => !n.read).length;
      
      set({ notifications, unreadCount });
      console.log(`✅ Cargadas ${notifications.length} notificaciones para ${user.username} (${unreadCount} no leídas)`);
      console.log('📋 Detalle de notificaciones:', notifications.map(n => ({ id: n.id, read: n.read, readAt: n.readAt })));
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      set({ notifications: [], unreadCount: 0 });
    }
  },
  
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
  
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único
      createdAt: new Date(),
      read: false
    };
    const user = get().user;
    if (user) {
      const storageKey = `notifications_${user.id}`;
      const currentNotifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
      currentNotifications.push(newNotification);
      localStorage.setItem(storageKey, JSON.stringify(currentNotifications));
    }
    set(state => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },
  markNotificationAsRead: (notificationId) => {
    const user = get().user;
    const state = get();
    const updatedNotifications = state.notifications.map(n => {
      if (n.id === notificationId) {
        const updated = { ...n, read: true, readAt: new Date() };
        // Programar eliminación después de 7 días
        // La eliminación automática se hace en loadUserNotifications
        return updated;
      }
      return n;
    });
    
    if (user) {
      const storageKey = `notifications_${user.id}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = saved.map((n: any) => 
        n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
    
    set({
      notifications: updatedNotifications,
      unreadCount: Math.max(0, state.unreadCount - 1)
    });
  },
  deleteNotification: (notificationId) => {
    set(state => {
      const notificationToDelete = state.notifications.find(n => n.id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.read;
      
      return {
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      };
    });
  },
  markAsRead: (notificationId) => {
    const user = get().user;
    const state = get();
    
    if (!user) return;
    
    // Buscar la notificación para verificar si ya estaba leída
    const notification = state.notifications.find(n => n.id === notificationId);
    const wasAlreadyRead = notification?.read === true || notification?.read === 'true';
    
    // Si ya estaba leída, no hacer nada
    if (wasAlreadyRead) {
      console.log(`⚠️ Notificación ${notificationId} ya estaba leída`);
      return;
    }
    
    // Actualizar en localStorage PRIMERO
    const storageKey = `notifications_${user.id}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updated = saved.map((n: any) => {
      // Normalizar read para asegurar que sea boolean
      const isRead = n.read === true || n.read === 'true';
      if (n.id === notificationId && !isRead) {
        return { ...n, read: true, readAt: new Date().toISOString() };
      }
      return n;
    });
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    // Recargar desde localStorage para garantizar sincronización
    const reloaded = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const now = Date.now();
    const filtered = reloaded.filter((n: any) => {
      if (!n.read) return true;
      if (n.readAt) {
        const readTime = new Date(n.readAt).getTime();
        return (now - readTime) < (7 * 24 * 60 * 60 * 1000); // 7 días
      }
      return true;
    });
    
    const notifications = filtered.map((n: any) => {
      // Normalizar read a boolean estricto
      let readValue = false;
      if (n.read === true) {
        readValue = true;
      } else if (n.read === 'true') {
        readValue = true;
      } else if (n.read === 1) {
        readValue = true;
      }
      
      return {
        ...n,
        createdAt: new Date(n.createdAt),
        read: Boolean(readValue), // Forzar boolean estricto
        readAt: n.readAt ? new Date(n.readAt) : undefined
      };
    });
    
    const newUnreadCount = notifications.filter((n: any) => !n.read).length;
    
    set({
      notifications,
      unreadCount: newUnreadCount
    });
    
    console.log(`✅ Notificación ${notificationId} marcada como leída. No leídas restantes: ${newUnreadCount}`);
  },
  
  markAllAsRead: () => {
    const user = get().user;
    const state = get();
    
    if (!user) return;
    
    const unreadNotifications = state.notifications.filter(n => !n.read);
    
    if (unreadNotifications.length === 0) {
      console.log('⚠️ No hay notificaciones sin leer');
      return;
    }
    
    // Actualizar en localStorage
    const storageKey = `notifications_${user.id}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updated = saved.map((n: any) => {
      const isRead = n.read === true || n.read === 'true';
      if (!isRead) {
        // Asegurar que read se guarde como boolean true, no string
        return { ...n, read: true, readAt: new Date().toISOString() };
      }
      // Asegurar que read se guarde como boolean, no string
      return { ...n, read: n.read === true || n.read === 'true' ? true : false };
    });
    // Guardar con read como boolean estricto
    localStorage.setItem(storageKey, JSON.stringify(updated));
    console.log('💾 Guardadas notificaciones en localStorage:', updated.length, 'notificaciones');
    
    // Recargar desde localStorage para garantizar sincronización
    const reloaded = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const now = Date.now();
    const filtered = reloaded.filter((n: any) => {
      if (!n.read) return true;
      if (n.readAt) {
        const readTime = new Date(n.readAt).getTime();
        return (now - readTime) < (7 * 24 * 60 * 60 * 1000); // 7 días
      }
      return true;
    });
    
    const notifications = filtered.map((n: any) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      read: n.read === true || n.read === 'true',
      readAt: n.readAt ? new Date(n.readAt) : undefined
    }));
    
    set({
      notifications,
      unreadCount: 0
    });
    
    console.log(`✅ ${unreadNotifications.length} notificaciones marcadas como leídas`);
  },

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
  setOrders: (orders) => {
    localStorage.setItem('orders', JSON.stringify(orders));
    set({ orders });
  },
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
