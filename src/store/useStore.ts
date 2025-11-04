import { ref, update, set as firebaseSet, get as firebaseGet, onValue, off, remove } from 'firebase/database';
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
  setProducts: (products: Product[], skipFirebaseSync?: boolean) => Promise<void>;

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
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => void;
  deleteNotification: (notificationId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  _normalizeNotification: (n: any) => Notification;

  // Bots (Admin only)
  bots: Bot[];
  setBots: (bots: Bot[]) => Promise<void>;
  loadBots: () => void;
  addBot: (bot: Bot) => Promise<void>;
  updateBot: (botId: string, updates: Partial<Bot>) => Promise<void>;
  deleteBot: (botId: string) => Promise<void>;

  // Orders (Admin)
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, updates?: Partial<Order>) => Promise<void>;
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
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Asegurar que las fechas se parseen correctamente
    if (parsed.createdAt) {
      parsed.createdAt = new Date(parsed.createdAt);
    }
    // Asegurar que isAdmin sea boolean
    if (parsed.isAdmin !== undefined) {
      parsed.isAdmin = Boolean(parsed.isAdmin);
    }
    return parsed;
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

  // Auctions - TODO desde Firebase, no localStorage
  auctions: [],
  setAuctions: (auctions) => {
    // NO guardar en localStorage - TODO debe venir de Firebase
    set({ auctions });
  },
  addBid: async (auctionId, amount, userId, username) => {
  try {
    console.log('🔥 Intentando guardar oferta en Firebase...');
    
    // VERIFICAR SI ES UN BOT (los bots tienen IDs que empiezan con "bot-")
    const isBot = userId.startsWith('bot-');
    
    // VERIFICAR QUE EL USUARIO NO SEA EL CREADOR DE LA SUBASTA
    const state = get();
    const auction = state.auctions.find(a => a.id === auctionId);
    
    if (auction && auction.createdBy === userId) {
      console.error('❌ ERROR: No puedes hacer ofertas en tu propia subasta');
      if (!isBot) {
        alert('No puedes hacer ofertas en tu propia subasta');
      }
      return; // Detener la función aquí
    }
    
    // VALIDACIONES DE MÍNIMO Y MÚLTIPLO
    if (!auction) {
      if (!isBot) {
        alert('Subasta no encontrada');
      }
      return;
    }
    const currentPrice = auction.currentPrice || 0;
    if (amount <= currentPrice) {
      if (!isBot) {
        alert(`Tu oferta debe ser mayor a ${currentPrice.toLocaleString()}`);
      }
      return;
    }
    if (amount % 500 !== 0) {
      if (!isBot) {
        alert('La oferta debe ser múltiplo de $500');
      }
      return;
    }

    const bid = {
      id: Date.now().toString(),
      auctionId,
      userId,
      username,
      amount,
      createdAt: new Date().toISOString(),
      isBot: isBot // Marcar si es una oferta de bot
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

  // Products - TODO desde Firebase, no localStorage
  products: [],
  setProducts: async (products, skipFirebaseSync = false) => {
    // NO guardar en localStorage - TODO debe venir de Firebase
    set({ products });
    
    // Sincronizar productos actualizados en Firebase solo si no viene de la sincronización
    // Esto evita bucles infinitos cuando Firebase notifica cambios
    if (!skipFirebaseSync) {
      try {
        const updates: any = {};
        products.forEach(product => {
          const createdAt = product.createdAt;
          const updatedAt = product.updatedAt;
          updates[product.id] = {
            ...product,
            createdAt: typeof createdAt === 'string' ? createdAt : (createdAt && typeof createdAt === 'object' && 'toISOString' in createdAt ? (createdAt as Date).toISOString() : createdAt || new Date().toISOString()),
            updatedAt: typeof updatedAt === 'string' ? updatedAt : (updatedAt && typeof updatedAt === 'object' && 'toISOString' in updatedAt ? (updatedAt as Date).toISOString() : updatedAt || new Date().toISOString())
          };
        });
        
        // Solo actualizar si hay productos (no hacer update completo si está vacío)
        if (products.length > 0) {
          await update(ref(realtimeDb, 'products'), updates);
          console.log('✅ Productos sincronizados en Firebase (stock actualizado)');
        }
      } catch (error) {
        console.error('❌ Error sincronizando productos en Firebase:', error);
        throw error; // Lanzar error para que el llamador sepa que falló
      }
    }
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
  
  // Función auxiliar para normalizar notificaciones
  _normalizeNotification: (n: any) => {
    // Normalizar read a boolean estricto
    let readValue = false;
    if (n.read === true || n.read === 'true' || String(n.read) === 'true' || n.read === 1) {
      readValue = true;
    } else if (n.readAt) {
      // Si tiene readAt pero read no está definido correctamente, asumir que está leída
      readValue = true;
    }
    
    return {
      ...n,
      read: Boolean(readValue), // Siempre boolean estricto
      readAt: n.readAt ? (typeof n.readAt === 'string' ? n.readAt : new Date(n.readAt).toISOString()) : undefined
    };
  },
  
  // Función para cargar notificaciones del usuario actual desde Firebase
  loadUserNotifications: () => {
    const user = get().user;
    if (!user) {
      set({ notifications: [], unreadCount: 0 });
      return;
    }

    try {
      const notificationsRef = ref(realtimeDb, `notifications/${user.id}`);
      
      // Escuchar cambios en tiempo real
      const unsubscribe = onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        const now = Date.now();
        const normalizeFn = get()._normalizeNotification;
        
        if (!data) {
          set({ notifications: [], unreadCount: 0 });
          return;
        }
        
        // Convertir objeto Firebase a array
        const notificationsArray = Object.values(data).map((n: any) => normalizeFn(n));
        
        // Filtrar notificaciones leídas antiguas (más de 2 días desde que fueron leídas)
        // Y notificaciones no leídas muy antiguas (más de 7 días desde creación)
        const filtered = notificationsArray.filter((n: any) => {
          const isRead = n.read === true || n.read === 'true' || String(n.read) === 'true';
          
          if (isRead && n.readAt) {
            const readTime = new Date(n.readAt).getTime();
            const daysSinceRead = (now - readTime) / (24 * 60 * 60 * 1000);
            if (daysSinceRead > 2) {
              return false;
            }
            return true;
          }
          
          if (!isRead) {
            const createdAt = new Date(n.createdAt).getTime();
            const daysSinceCreation = (now - createdAt) / (24 * 60 * 60 * 1000);
            if (daysSinceCreation > 7) {
              return false;
            }
            return true;
          }
          
          return true;
        });
        
        // Convertir a objetos Date para el estado
        const notifications = filtered.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          read: Boolean(n.read === true || n.read === 'true' || String(n.read) === 'true' || n.readAt),
          readAt: n.readAt ? new Date(n.readAt) : undefined
        }));
        
        const unreadCount = notifications.filter((n: any) => !n.read).length;
        
        set({ notifications, unreadCount });
        console.log(`✅ Cargadas ${notifications.length} notificaciones desde Firebase para ${user.username} (${unreadCount} no leídas)`);
      }, (error) => {
        console.error('Error cargando notificaciones desde Firebase:', error);
        set({ notifications: [], unreadCount: 0 });
      });
      
      // Guardar referencia para poder desconectar después
      (get() as any)._notificationUnsubscribe = unsubscribe;
    } catch (error) {
      console.error('Error configurando listener de notificaciones:', error);
      set({ notifications: [], unreadCount: 0 });
    }
  },
  
  clearNotifications: () => {
    const user = get().user;
    if (user) {
      // Desconectar listener de Firebase
      const unsubscribe = (get() as any)._notificationUnsubscribe;
      if (unsubscribe) {
        const notificationsRef = ref(realtimeDb, `notifications/${user.id}`);
        off(notificationsRef);
        delete (get() as any)._notificationUnsubscribe;
      }
    }
    set({ notifications: [], unreadCount: 0 });
  },
  
  addNotification: async (notification) => {
    const user = get().user;
    if (!user) return;
    
    const newNotification = {
      ...notification,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    try {
      // Guardar en Firebase Realtime Database
      const notificationRef = ref(realtimeDb, `notifications/${user.id}/${newNotification.id}`);
      await firebaseSet(notificationRef, newNotification);
      
      // Actualización optimista local
      set(state => ({
        notifications: [{
          ...newNotification,
          createdAt: new Date(newNotification.createdAt)
        }, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }));
      
      console.log(`✅ Notificación guardada en Firebase: ${newNotification.id}`);
    } catch (error) {
      console.error('❌ Error guardando notificación en Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      set(state => ({
        notifications: [{
          ...newNotification,
          createdAt: new Date(newNotification.createdAt)
        }, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }));
    }
  },
  
  markNotificationAsRead: (notificationId) => {
    // Delegar a markAsRead para mantener consistencia
    get().markAsRead(notificationId);
  },
  
  deleteNotification: async (notificationId) => {
    const user = get().user;
    if (!user) return;
    
    const state = get();
    const notificationToDelete = state.notifications.find(n => n.id === notificationId);
    const wasUnread = notificationToDelete && notificationToDelete.read === false;
    
    try {
      // Eliminar de Firebase
      const notificationRef = ref(realtimeDb, `notifications/${user.id}/${notificationId}`);
      await remove(notificationRef);
      
      // Actualización optimista local
      set({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      });
      
      console.log(`✅ Notificación eliminada de Firebase: ${notificationId}`);
    } catch (error) {
      console.error('❌ Error eliminando notificación de Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      set({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      });
    }
  },
  
  markAsRead: async (notificationId) => {
    const user = get().user;
    if (!user) return;
    
    const state = get();
    const notification = state.notifications.find(n => n.id === notificationId);
    
    // Verificar si ya está leída (múltiples verificaciones)
    const isAlreadyRead = notification && (
      notification.read === true || 
      (typeof notification.read === 'string' && (notification.read === 'true' || String(notification.read) === 'true')) ||
      notification.readAt !== undefined
    );
    
    // Si no existe o ya está leída, no hacer nada
    if (!notification || isAlreadyRead) {
      if (isAlreadyRead) {
        console.log(`ℹ️ Notificación ${notificationId} ya está marcada como leída`);
      }
      return;
    }
    
    const readAt = new Date().toISOString();
    
    try {
      // Actualizar en Firebase
      const notificationRef = ref(realtimeDb, `notifications/${user.id}/${notificationId}`);
      await update(notificationRef, {
        read: true,
        readAt: readAt
      });
      
      // Actualización optimista local
      const updatedNotifications = state.notifications.map(n => 
        n.id === notificationId 
          ? { ...n, read: true, readAt: new Date(readAt) }
          : { ...n, read: n.read === true || (typeof n.read === 'string' && (n.read === 'true' || String(n.read) === 'true')) || n.readAt ? true : false }
      );
      
      const newUnreadCount = updatedNotifications.filter(n => !n.read).length;
      
      set({
        notifications: updatedNotifications,
        unreadCount: newUnreadCount
      });
      
      console.log(`✅ Notificación ${notificationId} marcada como leída en Firebase. No leídas restantes: ${newUnreadCount}`);
    } catch (error) {
      console.error('❌ Error marcando notificación como leída en Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      const updatedNotifications = state.notifications.map(n => 
        n.id === notificationId 
          ? { ...n, read: true, readAt: new Date(readAt) }
          : n
      );
      
      const newUnreadCount = updatedNotifications.filter(n => !n.read).length;
      
      set({
        notifications: updatedNotifications,
        unreadCount: newUnreadCount
      });
    }
  },
  
  markAllAsRead: async () => {
    const user = get().user;
    if (!user) return;
    
    const state = get();
    // Filtrar notificaciones que realmente no están leídas (múltiples verificaciones)
    const unreadNotifications = state.notifications.filter(n => {
      const isRead = n.read === true || (typeof n.read === 'string' && (n.read === 'true' || String(n.read) === 'true'));
      return !isRead;
    });
    
    if (unreadNotifications.length === 0) {
      console.log('✅ Todas las notificaciones ya están leídas');
      return;
    }
    
    const readAt = new Date().toISOString();
    
    try {
      // Actualizar todas las notificaciones no leídas en Firebase
      const updates: any = {};
      unreadNotifications.forEach(n => {
        updates[`notifications/${user.id}/${n.id}/read`] = true;
        updates[`notifications/${user.id}/${n.id}/readAt`] = readAt;
      });
      
      await update(ref(realtimeDb), updates);
      
      // Actualización optimista local
      const updatedNotifications = state.notifications.map(n => ({
        ...n,
        read: true, // Forzar a true
        readAt: n.readAt || new Date(readAt)
      }));
      
      set({
        notifications: updatedNotifications,
        unreadCount: 0
      });
      
      console.log(`✅ ${unreadNotifications.length} notificaciones marcadas como leídas en Firebase. Total: ${updatedNotifications.length}`);
    } catch (error) {
      console.error('❌ Error marcando todas las notificaciones como leídas en Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      const updatedNotifications = state.notifications.map(n => ({
        ...n,
        read: true,
        readAt: n.readAt || new Date(readAt)
      }));
      
      set({
        notifications: updatedNotifications,
        unreadCount: 0
      });
    }
  },

  // Bots
  bots: [],
  loadBots: () => {
    try {
      const botsRef = ref(realtimeDb, 'bots');
      
      // Escuchar cambios en tiempo real
      const unsubscribe = onValue(botsRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          set({ bots: [] });
          return;
        }
        
        // Convertir objeto Firebase a array y parsear fechas
        const botsArray = Object.values(data).map((bot: any) => ({
          ...bot,
          createdAt: bot.createdAt ? new Date(bot.createdAt) : undefined,
          updatedAt: bot.updatedAt ? new Date(bot.updatedAt) : undefined
        })) as Bot[];
        
        set({ bots: botsArray });
        console.log(`✅ Cargados ${botsArray.length} bots desde Firebase`);
      }, (error) => {
        console.error('Error cargando bots desde Firebase:', error);
        set({ bots: [] });
      });
      
      // Guardar referencia para poder desconectar después
      (get() as any)._botsUnsubscribe = unsubscribe;
    } catch (error) {
      console.error('Error configurando listener de bots:', error);
      set({ bots: [] });
    }
  },
  setBots: async (bots) => {
    try {
      // Guardar en Firebase Realtime Database
      const updates: any = {};
      bots.forEach(bot => {
        const botData: any = { ...bot };
        // Manejar createdAt si existe
        if (bot.createdAt) {
          botData.createdAt = bot.createdAt instanceof Date ? bot.createdAt.toISOString() : bot.createdAt;
        }
        // Manejar updatedAt si existe
        if (bot.updatedAt) {
          botData.updatedAt = bot.updatedAt instanceof Date ? bot.updatedAt.toISOString() : bot.updatedAt;
        }
        updates[bot.id] = botData;
      });
      
      await update(ref(realtimeDb, 'bots'), updates);
      
      // Actualización optimista local
      set({ bots });
      
      console.log(`✅ ${bots.length} bots guardados en Firebase`);
    } catch (error) {
      console.error('❌ Error guardando bots en Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      set({ bots });
    }
  },
  addBot: async (bot) => {
    try {
      // Crear bot con fechas si no existen
      const now = new Date().toISOString();
      const botData: any = {
        ...bot,
        createdAt: bot.createdAt ? (bot.createdAt instanceof Date ? bot.createdAt.toISOString() : bot.createdAt) : now,
        updatedAt: bot.updatedAt ? (bot.updatedAt instanceof Date ? bot.updatedAt.toISOString() : bot.updatedAt) : now
      };
      
      // Guardar en Firebase
      const botRef = ref(realtimeDb, `bots/${bot.id}`);
      await firebaseSet(botRef, botData);
      
      // Actualización optimista local (crear bot con fechas como Date)
      const botWithDates = {
        ...bot,
        createdAt: new Date(botData.createdAt),
        updatedAt: new Date(botData.updatedAt)
      };
      const newBots = [...get().bots, botWithDates];
      set({ bots: newBots });
      
      console.log(`✅ Bot agregado en Firebase: ${bot.id}`);
    } catch (error) {
      console.error('❌ Error agregando bot en Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      const botWithDates = {
        ...bot,
        createdAt: bot.createdAt || new Date(),
        updatedAt: bot.updatedAt || new Date()
      };
      const newBots = [...get().bots, botWithDates];
      set({ bots: newBots });
    }
  },
  updateBot: async (botId, updates) => {
    try {
      // Actualizar en Firebase
      const botRef = ref(realtimeDb, `bots/${botId}`);
      const updatesToSave: any = { ...updates };
      
      // Manejar updatedAt - siempre actualizar
      if (updates.updatedAt) {
        updatesToSave.updatedAt = updates.updatedAt instanceof Date ? updates.updatedAt.toISOString() : updates.updatedAt;
      } else {
        updatesToSave.updatedAt = new Date().toISOString();
      }
      
      // Manejar createdAt si viene en updates
      if (updates.createdAt) {
        updatesToSave.createdAt = updates.createdAt instanceof Date ? updates.createdAt.toISOString() : updates.createdAt;
      }
      
      await update(botRef, updatesToSave);
      
      // Actualización optimista local
      const newBots = get().bots.map(b => {
        if (b.id === botId) {
          const updatedBot = {
            ...b,
            ...updates,
            updatedAt: new Date(updatesToSave.updatedAt)
          };
          // Mantener createdAt si no se actualiza
          if (updates.createdAt) {
            updatedBot.createdAt = updates.createdAt instanceof Date ? updates.createdAt : new Date(updates.createdAt);
          }
          return updatedBot;
        }
        return b;
      });
      set({ bots: newBots });
      
      console.log(`✅ Bot actualizado en Firebase: ${botId}`);
    } catch (error) {
      console.error('❌ Error actualizando bot en Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      const newBots = get().bots.map(b => b.id === botId ? { ...b, ...updates } : b);
      set({ bots: newBots });
    }
  },
  deleteBot: async (botId) => {
    try {
      // Eliminar de Firebase
      const botRef = ref(realtimeDb, `bots/${botId}`);
      await remove(botRef);
      
      // Actualización optimista local
      const newBots = get().bots.filter(b => b.id !== botId);
      set({ bots: newBots });
      
      console.log(`✅ Bot eliminado de Firebase: ${botId}`);
    } catch (error) {
      console.error('❌ Error eliminando bot de Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase
      const newBots = get().bots.filter(b => b.id !== botId);
      set({ bots: newBots });
    }
  },

  // Orders - TODO desde Firebase, no localStorage
  orders: [],
  setOrders: (orders) => {
    // NO guardar en localStorage - TODO debe venir de Firebase
    // Eliminar duplicados antes de actualizar
    const uniqueOrders = orders.filter((order: Order, index: number, self: Order[]) => 
      index === self.findIndex((o: Order) => o.id === order.id)
    );
    
    if (uniqueOrders.length < orders.length) {
      console.log(`🧹 Eliminados ${orders.length - uniqueOrders.length} pedidos duplicados del store`);
    }
    
    set({ orders: uniqueOrders });
  },
  addOrder: async (order) => {
    const currentOrders = get().orders;
    // Verificar si ya existe un pedido con el mismo ID
    if (currentOrders.some((o: Order) => o.id === order.id)) {
      console.warn(`⚠️ Pedido con ID ${order.id} ya existe, no se agregará duplicado`);
      return;
    }

    // Guardar en Firebase Realtime Database
    try {
      console.log('🔥 Guardando pedido en Firebase...');
      
      // Construir objeto sin valores undefined (Firebase no los acepta)
      const firebaseOrder: any = {
        id: order.id,
        userId: order.userId,
        userName: order.userName,
        productId: order.productId,
        productName: order.productName,
        productImage: order.productImage || '',
        productType: order.productType,
        type: order.type,
        amount: order.amount,
        status: order.status,
        deliveryMethod: order.deliveryMethod,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : (order.createdAt || new Date().toISOString()),
        address: order.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } }
      };
      
      // Solo agregar propiedades opcionales si tienen valor
      if (order.expiresAt) {
        firebaseOrder.expiresAt = order.expiresAt instanceof Date ? order.expiresAt.toISOString() : order.expiresAt;
      }
      if (order.paidAt) {
        firebaseOrder.paidAt = order.paidAt instanceof Date ? order.paidAt.toISOString() : order.paidAt;
      }
      if (order.shippedAt) {
        firebaseOrder.shippedAt = order.shippedAt instanceof Date ? order.shippedAt.toISOString() : order.shippedAt;
      }
      if (order.deliveredAt) {
        firebaseOrder.deliveredAt = order.deliveredAt instanceof Date ? order.deliveredAt.toISOString() : order.deliveredAt;
      }
      
      await update(ref(realtimeDb, `orders/${order.id}`), firebaseOrder);
      console.log('✅ Pedido guardado en Firebase correctamente');
    } catch (error) {
      console.error('❌ Error guardando pedido en Firebase:', error);
      throw error; // Lanzar error - NO guardar localmente si falla Firebase
    }

    const newOrders = [...currentOrders, order];
    // Eliminar duplicados antes de actualizar
    const uniqueOrders = newOrders.filter((o: Order, index: number, self: Order[]) => 
      index === self.findIndex((orderItem: Order) => orderItem.id === o.id)
    );
    // NO guardar en localStorage - TODO debe venir de Firebase
    set({ orders: uniqueOrders });
  },
  updateOrderStatus: async (orderId, status, updates = {}) => {
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
    
    // Eliminar duplicados antes de guardar
    const uniqueOrders = newOrders.filter((o: Order, index: number, self: Order[]) => 
      index === self.findIndex((orderItem: Order) => orderItem.id === o.id)
    );

    // Guardar cambios en Firebase Realtime Database
    const updatedOrder = uniqueOrders.find(o => o.id === orderId);
    if (updatedOrder) {
      try {
        console.log('🔥 Actualizando pedido en Firebase...');
        
        // Construir objeto sin valores undefined (Firebase no los acepta)
        const firebaseOrder: any = {
          id: updatedOrder.id,
          userId: updatedOrder.userId,
          userName: updatedOrder.userName,
          productId: updatedOrder.productId,
          productName: updatedOrder.productName,
          productImage: updatedOrder.productImage || '',
          productType: updatedOrder.productType,
          type: updatedOrder.type,
          amount: updatedOrder.amount,
          status: updatedOrder.status,
          deliveryMethod: updatedOrder.deliveryMethod,
          createdAt: updatedOrder.createdAt instanceof Date ? updatedOrder.createdAt.toISOString() : (updatedOrder.createdAt || new Date().toISOString()),
          address: updatedOrder.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } }
        };
        
        // Solo agregar propiedades opcionales si tienen valor
        if (updatedOrder.expiresAt) {
          firebaseOrder.expiresAt = updatedOrder.expiresAt instanceof Date ? updatedOrder.expiresAt.toISOString() : updatedOrder.expiresAt;
        }
        if (updatedOrder.paidAt) {
          firebaseOrder.paidAt = updatedOrder.paidAt instanceof Date ? updatedOrder.paidAt.toISOString() : updatedOrder.paidAt;
        }
        if (updatedOrder.shippedAt) {
          firebaseOrder.shippedAt = updatedOrder.shippedAt instanceof Date ? updatedOrder.shippedAt.toISOString() : updatedOrder.shippedAt;
        }
        if (updatedOrder.deliveredAt) {
          firebaseOrder.deliveredAt = updatedOrder.deliveredAt instanceof Date ? updatedOrder.deliveredAt.toISOString() : updatedOrder.deliveredAt;
        }
        
        await update(ref(realtimeDb, `orders/${orderId}`), firebaseOrder);
        console.log('✅ Pedido actualizado en Firebase correctamente');
      } catch (error) {
        console.error('❌ Error actualizando pedido en Firebase:', error);
        throw error; // Lanzar error para que el llamador sepa que falló
      }
    }
    
    // NO guardar en localStorage - TODO debe venir de Firebase
    set({ orders: uniqueOrders });
  }
}));
