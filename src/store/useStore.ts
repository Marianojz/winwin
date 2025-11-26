import { ref, update, set as firebaseSet, get as firebaseGet, onValue, off, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { create } from 'zustand';
import { User, Auction, Product, CartItem, Notification, Theme, Bot, Order, OrderStatus } from '../types';
import { loadUserPreferences, updateUserPreference, migratePreferencesFromLocalStorage } from '../utils/userPreferences';

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
  addAuction: (auction: Auction) => Promise<void>;
  updateAuction: (auctionId: string, updates: Partial<Auction>) => Promise<void>;
  deleteAuction: (auctionId: string) => Promise<void>;
  addBid: (auctionId: string, amount: number, userId: string, username: string) => Promise<void>;

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

export const useStore = create<AppState>((set, get) => ({
  // Theme - TODO desde Firebase
  theme: 'light' as Theme, // Valor por defecto, se carga desde Firebase cuando el usuario se autentica
  toggleTheme: async () => {
    const currentTheme = get().theme;
    const user = get().user;
    let newTheme: Theme;
    if (currentTheme === 'light') {
      newTheme = 'dark';
    } else if (currentTheme === 'dark') {
      newTheme = 'experimental';
    } else {
      newTheme = 'light';
    }
    
    // Actualizar estado local inmediatamente
    set({ theme: newTheme });
    
    // Guardar en Firebase si hay usuario autenticado
    if (user) {
      try {
        await updateUserPreference(user.id, 'theme', newTheme);
      } catch (error) {
        console.error('❌ Error guardando theme en Firebase:', error);
      }
    }
  },

  // User - SIEMPRE desde Firebase, NO localStorage
  user: null,
  setUser: async (user) => {
    if (!user) {
      // Limpiar notificaciones cuando el usuario se desloguea
      set({ notifications: [], unreadCount: 0 });
      // Resetear theme al valor por defecto
      set({ theme: 'light' });
    } else {
      // Cargar preferencias del usuario desde Firebase
      try {
        // Migrar preferencias desde localStorage si es necesario (solo una vez)
        await migratePreferencesFromLocalStorage(user.id);
        
        // Cargar preferencias
        const preferences = await loadUserPreferences(user.id);
        
        // Aplicar theme si existe
        if (preferences.theme) {
          set({ theme: preferences.theme });
        }
      } catch (error) {
        console.error('❌ Error cargando preferencias de usuario:', error);
      }
    }
    // NO guardar en localStorage - siempre usar Firebase como fuente de verdad
    set({ user, isAuthenticated: !!user });
  },
  isAuthenticated: false,

  // Auctions - TODO desde Firebase, no localStorage
  auctions: [],
  setAuctions: (auctions) => {
    // NO guardar en localStorage - TODO debe venir de Firebase
    set({ auctions });
  },
  addAuction: async (auction) => {
    try {
      // Preparar datos para Firebase (convertir fechas a ISO string)
      const auctionData: any = {
        ...auction,
        startTime: auction.startTime instanceof Date ? auction.startTime.toISOString() : auction.startTime,
        endTime: auction.endTime instanceof Date ? auction.endTime.toISOString() : auction.endTime,
        createdAt: auction.createdAt instanceof Date ? auction.createdAt.toISOString() : auction.createdAt,
        bids: {} // Convertir array de bids a objeto para Firebase
      };
      
      // Convertir bids array a objeto si existe
      if (auction.bids && Array.isArray(auction.bids)) {
        auction.bids.forEach((bid: any) => {
          auctionData.bids[bid.id] = {
            ...bid,
            createdAt: bid.createdAt instanceof Date ? bid.createdAt.toISOString() : bid.createdAt
          };
        });
      }
      
      // Eliminar campos undefined
      Object.keys(auctionData).forEach(key => {
        if (auctionData[key] === undefined) {
          delete auctionData[key];
        }
      });
      
      // Guardar en Firebase
      const auctionRef = ref(realtimeDb, `auctions/${auction.id}`);
      await firebaseSet(auctionRef, auctionData);
      
      // Actualización optimista local
      const newAuctions = [...get().auctions, auction];
      set({ auctions: newAuctions });
      
      console.log(`✅ Subasta guardada en Firebase: ${auction.id}`);
    } catch (error) {
      console.error('❌ Error guardando subasta en Firebase:', error);
      throw error; // Lanzar error para que el llamador sepa que falló
    }
  },
  updateAuction: async (auctionId, updates) => {
    try {
      const auctionRef = ref(realtimeDb, `auctions/${auctionId}`);
      const updatesToSave: any = { ...updates };
      
      // Convertir fechas a ISO string si existen
      if (updates.startTime) {
        updatesToSave.startTime = updates.startTime instanceof Date ? updates.startTime.toISOString() : updates.startTime;
      }
      if (updates.endTime) {
        updatesToSave.endTime = updates.endTime instanceof Date ? updates.endTime.toISOString() : updates.endTime;
      }
      if (updates.createdAt) {
        updatesToSave.createdAt = updates.createdAt instanceof Date ? updates.createdAt.toISOString() : updates.createdAt;
      }
      
      // Manejar bids si se actualizan
      if (updates.bids && Array.isArray(updates.bids)) {
        const bidsObj: any = {};
        updates.bids.forEach((bid: any) => {
          bidsObj[bid.id] = {
            ...bid,
            createdAt: bid.createdAt instanceof Date ? bid.createdAt.toISOString() : bid.createdAt
          };
        });
        updatesToSave.bids = bidsObj;
      }
      
      // Eliminar campos undefined
      Object.keys(updatesToSave).forEach(key => {
        if (updatesToSave[key] === undefined) {
          delete updatesToSave[key];
        }
      });
      
      await update(auctionRef, updatesToSave);
      
      // Actualización optimista local
      const newAuctions = get().auctions.map(a => 
        a.id === auctionId ? { ...a, ...updates } : a
      );
      set({ auctions: newAuctions });
      
      console.log(`✅ Subasta actualizada en Firebase: ${auctionId}`);
    } catch (error) {
      console.error('❌ Error actualizando subasta en Firebase:', error);
      throw error;
    }
  },
  deleteAuction: async (auctionId) => {
    try {
      // Eliminar de Firebase
      const auctionRef = ref(realtimeDb, `auctions/${auctionId}`);
      await remove(auctionRef);
      
      // Actualización optimista local
      const newAuctions = get().auctions.filter(a => a.id !== auctionId);
      set({ auctions: newAuctions });
      
      console.log(`✅ Subasta eliminada de Firebase: ${auctionId}`);
    } catch (error) {
      console.error('❌ Error eliminando subasta de Firebase:', error);
      throw error;
    }
  },
  addBid: async (auctionId, amount, userId, username) => {
  try {
    const isBot = userId.startsWith('bot-');
    
    // Solo mostrar logs para usuarios, no para bots (funcionalidad oculta del admin)
    if (!isBot) {
      console.log(`🔥 👤 USUARIO intentando guardar oferta en Firebase...`, {
        auctionId,
        amount,
        userId,
        username
      });
    }
    
    // VERIFICAR SI ES UN BOT (los bots tienen IDs que empiezan con "bot-")
    
    // VERIFICAR QUE EL USUARIO NO SEA EL CREADOR DE LA SUBASTA
    const state = get();
    const auction = state.auctions.find(a => a.id === auctionId);
    
    if (auction && auction.createdBy === userId) {
      if (!isBot) {
        console.error(`❌ USUARIO no puede hacer ofertas en su propia subasta`, {
          auctionId,
          createdBy: auction.createdBy,
          userId
        });
        alert('No puedes hacer ofertas en tu propia subasta');
      }
      return; // Detener la función aquí
    }
    
    // VALIDACIONES DE MÍNIMO Y MÚLTIPLO
    if (!auction) {
      if (!isBot) {
        console.error(`❌ USUARIO: Subasta no encontrada`, { auctionId });
        alert('Subasta no encontrada');
      }
      return;
    }
    const currentPrice = auction.currentPrice || auction.startingPrice || 0;
    if (amount <= currentPrice) {
      if (!isBot) {
        console.error(`❌ USUARIO: Oferta debe ser mayor al precio actual`, {
          amount,
          currentPrice,
          auctionId
        });
        alert(`Tu oferta debe ser mayor a ${currentPrice.toLocaleString()}`);
      }
      return;
    }
    if (amount % 500 !== 0) {
      if (!isBot) {
        console.error(`❌ USUARIO: Oferta debe ser múltiplo de $500`, {
          amount,
          auctionId
        });
        alert('La oferta debe ser múltiplo de $500');
      }
      return;
    }

    // LÓGICA ANTI-SNIPING: si faltan pocos segundos, extender el endTime
    let extendedEndTime: string | undefined;
    if (auction.endTime) {
      const endTime =
        auction.endTime instanceof Date
          ? auction.endTime
          : new Date(auction.endTime as any);
      const now = new Date();
      const timeRemainingMs = endTime.getTime() - now.getTime();
      // Si faltan 30s o menos pero todavía no terminó, extendemos 30s
      if (timeRemainingMs > 0 && timeRemainingMs <= 30000) {
        const newEndTime = new Date(now.getTime() + 30000);
        extendedEndTime = newEndTime.toISOString();
        console.log(
          `⏱️ Anti-sniping: extendiendo endTime de subasta ${auctionId} en 30s`,
          {
            before: endTime.toISOString(),
            after: extendedEndTime
          }
        );
      }
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

    // Solo mostrar logs para usuarios
    if (!isBot) {
      console.log('🔗 URL de Firebase:', `auctions/${auctionId}`);
    }
    
    const updatesPayload: any = {
      currentPrice: amount,
      lastBidAt: new Date().toISOString(),
      [`bids/${bid.id}`]: bid
    };

    // Si se activó anti-sniping, actualizar también el endTime
    if (extendedEndTime) {
      updatesPayload.endTime = extendedEndTime;
    }

    await update(ref(realtimeDb, `auctions/${auctionId}`), updatesPayload);

    if (!isBot) {
      console.log('✅ OFERTA GUARDADA EN FIREBASE EXITOSAMENTE');
    }
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
          
          // Construir objeto del producto sin valores undefined
          const productData: any = {
            ...product,
            createdAt: typeof createdAt === 'string' ? createdAt : (createdAt && typeof createdAt === 'object' && 'toISOString' in createdAt ? (createdAt as Date).toISOString() : createdAt || new Date().toISOString()),
            updatedAt: typeof updatedAt === 'string' ? updatedAt : (updatedAt && typeof updatedAt === 'object' && 'toISOString' in updatedAt ? (updatedAt as Date).toISOString() : updatedAt || new Date().toISOString())
          };
          
          // Filtrar propiedades undefined (Firebase no las acepta)
          Object.keys(productData).forEach(key => {
            if (productData[key] === undefined) {
              delete productData[key];
            }
          });
          
          updates[product.id] = productData;
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
    // Normalizar read a boolean estricto - verificar múltiples formatos
    let readValue = false;
    
    // Si tiene readAt, definitivamente está leída
    if (n.readAt) {
      readValue = true;
    } else if (n.read === true || n.read === 'true' || String(n.read) === 'true' || n.read === 1 || n.read === '1') {
      readValue = true;
    } else if (n.read === false || n.read === 'false' || String(n.read) === 'false' || n.read === 0 || n.read === '0' || n.read === null || n.read === undefined) {
      readValue = false;
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

    // Verificar si se acaba de hacer un reset del sistema
    const resetTimestamp = localStorage.getItem('_systemResetTimestamp');
    const resetTime = resetTimestamp ? parseInt(resetTimestamp, 10) : 0;
    const timeSinceReset = Date.now() - resetTime;
    const wasRecentReset = resetTime > 0 && timeSinceReset < 15000; // Menos de 15 segundos desde el reset
    
    if (wasRecentReset) {
      console.log('⏸️ Reset reciente detectado, esperando antes de cargar notificaciones...');
      // Limpiar estado y no cargar nada todavía
      set({ notifications: [], unreadCount: 0 });
      // Programar verificación después de un delay
      setTimeout(() => {
        const currentResetTime = localStorage.getItem('_systemResetTimestamp');
        const currentTime = Date.now();
        const resetTime = currentResetTime ? parseInt(currentResetTime, 10) : 0;
        // Solo verificar si ya pasó suficiente tiempo desde el reset (más de 10 segundos)
        if (!currentResetTime || (currentTime - resetTime) > 10000) {
          console.log('✅ Tiempo suficiente transcurrido después del reset, verificando notificaciones...');
          // Limpiar el flag
          localStorage.removeItem('_systemResetTimestamp');
          // Verificar si realmente hay notificaciones antes de crear el listener
          const currentUser = get().user;
          if (currentUser) {
            const checkRef = ref(realtimeDb, `notifications/${currentUser.id}`);
            firebaseGet(checkRef).then((snapshot) => {
              if (!snapshot.exists() || !snapshot.val()) {
                console.log('✅ Confirmado: No hay notificaciones después del reset');
                set({ notifications: [], unreadCount: 0 });
              } else {
                // Si hay datos (no debería pasar después de un reset), cargar normalmente
                console.log('⚠️ Se encontraron notificaciones después del reset, cargando...');
                // Continuar con la carga normal llamando a loadUserNotifications de nuevo
                // pero sin el flag de reset
                get().loadUserNotifications();
              }
            }).catch((error) => {
              console.warn('⚠️ Error verificando notificaciones después del reset:', error);
              set({ notifications: [], unreadCount: 0 });
            });
          }
        } else {
          console.log('⏸️ Aún muy pronto después del reset, esperando más...');
        }
      }, 5000);
      return;
    }

    try {
      // Desconectar listener anterior si existe para evitar múltiples listeners
      const existingUnsubscribe = (get() as any)._notificationUnsubscribe;
      if (existingUnsubscribe) {
        const notificationsRef = ref(realtimeDb, `notifications/${user.id}`);
        off(notificationsRef);
        console.log('🔌 Listener anterior desconectado');
      }

      const notificationsRef = ref(realtimeDb, `notifications/${user.id}`);
      
      // Usar flag compartido para evitar loops infinitos (guardado en el store)
      const state = get();
      if (!(state as any)._notificationProcessing) {
        (state as any)._notificationProcessing = false;
      }
      
      // Escuchar cambios en tiempo real
      const unsubscribe = onValue(notificationsRef, (snapshot) => {
        const currentState = get();
        // Evitar procesamiento simultáneo o durante batch updates
        if ((currentState as any)._notificationProcessing) {
          console.log('⏸️ Listener de notificaciones: procesamiento en curso, omitiendo actualización');
          return; // Salir silenciosamente si ya se está procesando
        }
        
        // Marcar como procesando inmediatamente para evitar múltiples ejecuciones
        (currentState as any)._notificationProcessing = true;
        const data = snapshot.val();
        const normalizeFn = get()._normalizeNotification;
        
        if (!data) {
          set({ notifications: [], unreadCount: 0 });
          const state = get();
          (state as any)._notificationProcessing = false;
          return;
        }
        
        // Convertir objeto Firebase a array y normalizar read correctamente
        const notificationsArray = Object.values(data).map((n: any) => {
          // Verificar read desde el valor original antes de normalizar
          const isRead = n.read === true || 
                        n.read === 'true' || 
                        String(n.read) === 'true' ||
                        n.read === 1 ||
                        n.read === '1' ||
                        n.readAt !== undefined;
          const normalized = normalizeFn(n);
          return {
            ...normalized,
            read: Boolean(isRead) // Forzar boolean estricto basado en el valor original
          };
        });
        
        // Filtrar notificaciones leídas antiguas (más de 1 día desde que fueron leídas)
        // Y notificaciones no leídas muy antiguas (más de 3 días desde creación)
        const now = Date.now();
        const readCutoffDate = now - (1 * 24 * 60 * 60 * 1000); // 1 día para leídas
        const unreadCutoffDate = now - (3 * 24 * 60 * 60 * 1000); // 3 días para no leídas
        
        const notificationsToDelete: string[] = [];
        const filtered = notificationsArray.filter((n: any) => {
          const isRead = n.read === true || n.read === 'true' || String(n.read) === 'true';
          
          if (isRead && n.readAt) {
            const readTime = new Date(n.readAt).getTime();
            if (readTime < readCutoffDate) {
              notificationsToDelete.push(n.id);
              return false; // Eliminar leídas hace más de 1 día
            }
            return true;
          }
          
          if (!isRead) {
            const createdAt = new Date(n.createdAt).getTime();
            if (createdAt < unreadCutoffDate) {
              notificationsToDelete.push(n.id);
              return false; // Eliminar no leídas hace más de 3 días
            }
            return true;
          }
          
          return true;
        });
        
        // Eliminar notificaciones antiguas de Firebase en segundo plano
        // PERO solo si no estamos en un loop (evitar disparar múltiples veces)
        if (notificationsToDelete.length > 0 && notificationsToDelete.length < 50) {
          // Usar setTimeout para evitar loops - eliminar en batch después de un delay
          setTimeout(() => {
            Promise.all(notificationsToDelete.map(async (id) => {
              try {
                const notificationRef = ref(realtimeDb, `notifications/${user.id}/${id}`);
                await remove(notificationRef);
              } catch (error) {
                console.error(`Error eliminando notificación ${id}:`, error);
              }
            })).then(() => {
              console.log(`✅ ${notificationsToDelete.length} notificaciones antiguas eliminadas`);
            }).finally(() => {
              const state = get();
              (state as any)._notificationProcessing = false;
            });
          }, 1000); // Delay de 1 segundo para evitar loops
        } else {
          const state = get();
          (state as any)._notificationProcessing = false;
        }
        
        // Ordenar por fecha (más recientes primero) y limitar a 200
        const sorted = filtered.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Más recientes primero
        });
        
        // Limitar a las últimas 200 notificaciones
        const limited = sorted.slice(0, 200);
        
        // Convertir a objetos Date para el estado y normalizar read
        // Asegurar que read se respete correctamente desde Firebase
        const notifications = limited.map((n: any) => {
          // Verificar read desde el valor original antes de normalizar
          const isRead = n.read === true || 
                        n.read === 'true' || 
                        String(n.read) === 'true' ||
                        n.read === 1 ||
                        n.read === '1' ||
                        n.readAt !== undefined;
          const normalized = normalizeFn(n);
          return {
            ...normalized,
            createdAt: new Date(normalized.createdAt),
            read: Boolean(isRead), // Forzar boolean estricto basado en el valor original
            readAt: normalized.readAt ? new Date(normalized.readAt) : undefined
          };
        });
        
        // Contar no leídas: solo las que están cargadas (máximo 200)
        const unreadCount = notifications.filter((n: any) => !n.read).length;
        
        // Si hay más de 200 notificaciones, el conteo puede ser mayor
        // Contar todas las no leídas en el array filtrado completo para un conteo más preciso
        const totalUnreadInFiltered = filtered.filter((n: any) => {
          const isRead = n.read === true || n.read === 'true' || String(n.read) === 'true';
          return !isRead;
        }).length;
        
        // Usar el conteo de las cargadas para la UI, pero mostrar advertencia si hay más
        const finalUnreadCount = Math.min(unreadCount, totalUnreadInFiltered);
        
        set({ notifications, unreadCount: finalUnreadCount });
        
        // Solo loggear ocasionalmente para evitar spam (solo la primera vez o si cambió el conteo)
        const lastCount = (get() as any)._lastNotificationCount || 0;
        if (finalUnreadCount !== lastCount || !(get() as any)._notificationLogged) {
          if (filtered.length > 200) {
            console.log(`✅ Cargadas ${notifications.length} notificaciones (de ${filtered.length} totales) para ${user.username} (${finalUnreadCount} no leídas mostradas)`);
          } else {
            console.log(`✅ Cargadas ${notifications.length} notificaciones desde Firebase para ${user.username} (${finalUnreadCount} no leídas)`);
          }
          (get() as any)._lastNotificationCount = finalUnreadCount;
          (get() as any)._notificationLogged = true;
        }
        
        // Resetear flag después de un delay
        setTimeout(() => {
          const state = get();
          (state as any)._notificationProcessing = false;
        }, 500);
      }, (error) => {
        console.error('Error cargando notificaciones desde Firebase:', error);
        set({ notifications: [], unreadCount: 0 });
        const state = get();
        (state as any)._notificationProcessing = false;
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
    
    // Desconectar listener de Firebase (usar tanto unsubscribe como off para asegurar desconexión)
    const unsubscribe = (get() as any)._notificationUnsubscribe;
    if (unsubscribe) {
      try {
        // Llamar a la función unsubscribe si existe
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
        // También desconectar usando off por si acaso
        if (user) {
          const notificationsRef = ref(realtimeDb, `notifications/${user.id}`);
          off(notificationsRef);
        }
        console.log('🔌 Listener de notificaciones desconectado');
      } catch (error) {
        console.warn('⚠️ Error al desconectar listener de notificaciones:', error);
      }
      delete (get() as any)._notificationUnsubscribe;
    }
    
    // Limpiar estado
    set({ notifications: [], unreadCount: 0 });
    (get() as any)._notificationProcessing = false;
    (get() as any)._lastNotificationCount = 0;
    (get() as any)._notificationLogged = false;
  },
  
  addNotification: async (notification) => {
    const user = get().user;
    if (!user) return;
    
    // Determinar el userId destino
    let targetUserId: string;
    if (notification.userId === 'admin') {
      // Si se quiere notificar al admin y el usuario actual es admin, usar su ID
      // Si no es admin, usar 'admin' como identificador especial
      targetUserId = user.isAdmin ? user.id : 'admin';
    } else if (notification.userId === 'current') {
      // Si se especifica 'current', usar el usuario actual
      targetUserId = user.id;
    } else {
      // Usar notification.userId si está especificado, sino usar el usuario actual
      targetUserId = notification.userId || user.id;
    }
    
    // Verificar si ya existe una notificación similar (mismo tipo, mismo mensaje, mismo usuario)
    // Esto evita notificaciones duplicadas cuando el AuctionManager procesa la misma subasta múltiples veces
    
    // Primero verificar en el estado local
    const existingNotifications = get().notifications;
    const isDuplicateLocal = existingNotifications.some(n => 
      n.type === notification.type &&
      n.message === notification.message &&
      n.userId === targetUserId &&
      // Verificar que no sea muy antigua (menos de 10 minutos) para evitar falsos positivos
      n.createdAt && (Date.now() - n.createdAt.getTime()) < 10 * 60 * 1000
    );
    
    if (isDuplicateLocal) {
      console.log(`⏭️ Notificación duplicada detectada localmente, omitiendo: ${notification.type} - ${notification.message?.substring(0, 50)}...`);
      return; // No crear notificación duplicada
    }
    
    // También verificar en Firebase para asegurarnos de que no existe
    try {
      const notificationsRef = ref(realtimeDb, `notifications/${targetUserId}`);
      const snapshot = await firebaseGet(notificationsRef);
      
      if (snapshot.exists()) {
        const firebaseNotifications = snapshot.val();
        const isDuplicateFirebase = Object.values(firebaseNotifications).some((n: any) => {
          const createdAt = n.createdAt ? new Date(n.createdAt).getTime() : 0;
          const timeDiff = Date.now() - createdAt;
          return (
            n.type === notification.type &&
            n.message === notification.message &&
            n.userId === targetUserId &&
            timeDiff < 10 * 60 * 1000 // Menos de 10 minutos
          );
        });
        
        if (isDuplicateFirebase) {
          console.log(`⏭️ Notificación duplicada detectada en Firebase, omitiendo: ${notification.type} - ${notification.message?.substring(0, 50)}...`);
          return; // No crear notificación duplicada
        }
      }
    } catch (error) {
      console.warn('⚠️ Error verificando duplicados en Firebase, continuando con creación:', error);
      // Continuar con la creación si hay un error al verificar
    }
    
    const newNotification = {
      ...notification,
      userId: targetUserId, // Asegurar que userId esté en la notificación
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    try {
      // Guardar en Firebase Realtime Database usando el targetUserId
      const notificationRef = ref(realtimeDb, `notifications/${targetUserId}/${newNotification.id}`);
      await firebaseSet(notificationRef, newNotification);
      
      // Actualización optimista local solo si la notificación es para el usuario actual
      if (targetUserId === user.id) {
        set(state => ({
          notifications: [{
            ...newNotification,
            createdAt: new Date(newNotification.createdAt)
          }, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
      }
      
      console.log(`✅ Notificación guardada en Firebase para usuario ${targetUserId}: ${newNotification.id}`);
    } catch (error) {
      console.error('❌ Error guardando notificación en Firebase:', error);
      // Fallback: actualizar solo localmente si falla Firebase y es para el usuario actual
      if (targetUserId === user.id) {
        set(state => ({
          notifications: [{
            ...newNotification,
            createdAt: new Date(newNotification.createdAt)
          }, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
      }
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
      // Eliminar de Firebase PRIMERO
      const notificationRef = ref(realtimeDb, `notifications/${user.id}/${notificationId}`);
      await remove(notificationRef);
      
      // IMPORTANTE: Esperar un momento para que Firebase procese antes de actualizar estado local
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Actualización del estado local DESPUÉS de confirmar eliminación en Firebase
      set({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      });
      
      console.log(`✅ Notificación eliminada permanentemente de Firebase: ${notificationId}`);
    } catch (error) {
      console.error('❌ Error eliminando notificación de Firebase:', error);
      // NO actualizar estado local si falla Firebase - el listener de tiempo real cargará el estado correcto
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
    
    // Marcar que estamos procesando esta notificación para evitar que el listener la sobrescriba
    const markingKey = `_marking_${notificationId}`;
    (state as any)[markingKey] = true;
    
    try {
      // Obtener la notificación completa de Firebase para actualizarla completamente
      const notificationRef = ref(realtimeDb, `notifications/${user.id}/${notificationId}`);
      const snapshot = await firebaseGet(notificationRef);
      
      if (!snapshot.exists()) {
        console.warn(`⚠️ Notificación ${notificationId} no existe en Firebase`);
        delete (state as any)[markingKey];
        return;
      }
      
      const currentNotification = snapshot.val();
      
      // Verificar que no esté ya marcada como leída en Firebase
      const isReadInFirebase = currentNotification.read === true || 
                              currentNotification.read === 'true' || 
                              String(currentNotification.read) === 'true' ||
                              currentNotification.readAt !== undefined;
      
      if (isReadInFirebase) {
        console.log(`ℹ️ Notificación ${notificationId} ya está marcada como leída en Firebase`);
        delete (state as any)[markingKey];
        return;
      }
      
      // Actualizar estado local INMEDIATAMENTE para feedback instantáneo
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
      
      // Marcar flag de procesamiento para evitar que el listener sobrescriba
      (get() as any)._notificationProcessing = true;
      
      // Actualizar en Firebase con set() para garantizar guardado completo
      await firebaseSet(notificationRef, {
        ...currentNotification,
        read: true,
        readAt: readAt
      });
      
      console.log(`✅ Notificación ${notificationId} marcada como leída en Firebase. No leídas restantes: ${newUnreadCount}`);
      
      // Limpiar flags después de un delay para permitir que el listener procese los cambios
      setTimeout(() => {
        const state = get();
        delete (state as any)[markingKey];
        (state as any)._notificationProcessing = false;
      }, 2000); // Aumentado a 2 segundos para dar más tiempo
    } catch (error) {
      console.error('❌ Error marcando notificación como leída en Firebase:', error);
      delete (state as any)[markingKey];
      // NO actualizar estado local si falla Firebase - el listener de tiempo real cargará el estado correcto
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
      // Actualizar estado local INMEDIATAMENTE para feedback instantáneo
      const updatedNotifications = state.notifications.map(n => {
        const isUnread = unreadNotifications.find(un => un.id === n.id);
        if (isUnread) {
          return { ...n, read: true, readAt: new Date(readAt) };
        }
        return n;
      });
      
      const newUnreadCount = 0; // Todas están leídas ahora
      
      set({
        notifications: updatedNotifications,
        unreadCount: newUnreadCount
      });
      
      // Marcar flag para evitar que el listener procese durante el batch update
      (get() as any)._notificationProcessing = true;
      
      // Preparar todas las actualizaciones en un solo objeto para batch update
      const updates: { [key: string]: any } = {};
      
      // Obtener todas las notificaciones actuales de Firebase primero
      const notificationsRef = ref(realtimeDb, `notifications/${user.id}`);
      const snapshot = await firebaseGet(notificationsRef);
      
      if (snapshot.exists()) {
        const allNotifications = snapshot.val();
        
        // Preparar actualizaciones solo para las no leídas
        unreadNotifications.forEach((n) => {
          const notificationKey = `notifications/${user.id}/${n.id}`;
          if (allNotifications[n.id]) {
            updates[notificationKey] = {
              ...allNotifications[n.id],
              read: true,
              readAt: readAt
            };
          }
        });
        
        // Ejecutar todas las actualizaciones en un solo batch usando update()
        if (Object.keys(updates).length > 0) {
          await update(ref(realtimeDb, '/'), updates);
          console.log(`✅ ${Object.keys(updates).length} notificaciones marcadas como leídas en Firebase. Total: ${state.notifications.length}`);
        }
      }
      
      // Resetear flag después de un delay para permitir que el listener procese los cambios
      setTimeout(() => {
        (get() as any)._notificationProcessing = false;
      }, 2000); // Aumentado a 2 segundos para dar más tiempo
    } catch (error) {
      console.error('❌ Error marcando todas las notificaciones como leídas en Firebase:', error);
      // Resetear flag incluso si hay error
      setTimeout(() => {
        (get() as any)._notificationProcessing = false;
      }, 500);
      // NO actualizar estado local si falla Firebase - el listener de tiempo real cargará el estado correcto
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
        
        // Eliminar duplicados por ID (por si acaso)
        const uniqueBots = Array.from(
          new Map(botsArray.map(bot => [bot.id, bot])).values()
        );
        
        set({ bots: uniqueBots });
        // Log silencioso - funcionalidad oculta del admin
      }, (error) => {
        // Error silencioso - funcionalidad oculta del admin
        set({ bots: [] });
      });
      
      // Guardar referencia para poder desconectar después
      (get() as any)._botsUnsubscribe = unsubscribe;
    } catch (error) {
      // Error silencioso - funcionalidad oculta del admin
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
      // Log silencioso - funcionalidad oculta del admin
    } catch (error) {
      // Error silencioso - funcionalidad oculta del admin
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
      // Log silencioso - funcionalidad oculta del admin
    } catch (error) {
      // Error silencioso - funcionalidad oculta del admin
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
      // Log silencioso - funcionalidad oculta del admin
    } catch (error) {
      // Error silencioso - funcionalidad oculta del admin
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
      // Log silencioso - funcionalidad oculta del admin
    } catch (error) {
      // Error silencioso - funcionalidad oculta del admin
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
    
    // Para órdenes de subastas, verificar duplicados por productId + userId
    if (order.type === 'auction' && order.productId) {
      const duplicateOrder = currentOrders.find((o: Order) => 
        o.type === 'auction' &&
        o.productId === order.productId &&
        o.userId === order.userId
      );
      if (duplicateOrder) {
        console.warn(`⚠️ Ya existe una orden para esta subasta (productId: ${order.productId}) y usuario (${order.userId}). Orden existente: ${duplicateOrder.id}`);
        return;
      }
    }

    // Guardar en Firebase Realtime Database
    try {
      const user = get().user;
      console.log('🔥 Guardando pedido en Firebase...', { orderId: order.id, userId: order.userId, currentUser: user?.id, isAdmin: user?.isAdmin });
      
      // Verificar que el usuario esté autenticado
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      // Verificar en Firebase si ya existe una orden duplicada (para órdenes de subastas)
      if (order.type === 'auction' && order.productId) {
        try {
          const ordersRef = ref(realtimeDb, 'orders');
          const ordersSnapshot = await firebaseGet(ordersRef);
          const existingOrders = ordersSnapshot.val() || {};
          
          // Buscar si ya existe una orden para esta subasta y este usuario
          const existingOrder = Object.values(existingOrders).find((o: any) => 
            o.type === 'auction' &&
            o.productId === order.productId &&
            o.userId === order.userId
          ) as any;
          
          if (existingOrder) {
            console.warn(`⚠️ Ya existe una orden en Firebase para esta subasta (productId: ${order.productId}) y usuario (${order.userId}). Orden existente: ${existingOrder.id}`);
            return; // No crear orden duplicada
          }
        } catch (checkError) {
          console.warn('⚠️ Error verificando órdenes duplicadas en Firebase, continuando con creación:', checkError);
          // Continuar con la creación si hay error en la verificación
        }
      }
      
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
      
      // Agregar orderNumber si existe
      if (order.orderNumber) {
        firebaseOrder.orderNumber = order.orderNumber;
      }
      
      // Agregar cantidad y unidades/bultos si existen
      if (order.quantity !== undefined) {
        firebaseOrder.quantity = order.quantity;
      }
      if (order.unitsPerBundle !== undefined) {
        firebaseOrder.unitsPerBundle = order.unitsPerBundle;
      }
      if (order.bundles !== undefined) {
        firebaseOrder.bundles = order.bundles;
      }
      
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
      
      // Usar set() para crear nuevas órdenes (mejor compatibilidad con reglas de seguridad)
      await firebaseSet(ref(realtimeDb, `orders/${order.id}`), firebaseOrder);
      console.log('✅ Pedido guardado en Firebase correctamente');
    } catch (error: any) {
      console.error('❌ Error guardando pedido en Firebase:', error);
      
      // Si es un error de permisos, dar información más útil
      if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('permission')) {
        const user = get().user;
        console.error('🔒 Error de permisos. Verifica:', {
          userId: user?.id,
          isAdmin: user?.isAdmin,
          orderUserId: order.userId,
          message: 'El usuario debe ser admin O el pedido debe ser para el mismo usuario. Verifica que isAdmin esté sincronizado en Realtime Database.'
        });
      }
      
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
        
        // Agregar orderNumber si existe
        if (updatedOrder.orderNumber) {
          firebaseOrder.orderNumber = updatedOrder.orderNumber;
        }
        
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
        
        // Usar set() en lugar de update() para garantizar guardado completo
        await firebaseSet(ref(realtimeDb, `orders/${orderId}`), firebaseOrder);
        console.log('✅ Pedido actualizado en Firebase correctamente:', orderId, 'Estado:', status);
        
        // IMPORTANTE: Solo actualizar estado local DESPUÉS de confirmar guardado en Firebase
        // Esto evita que el listener de tiempo real sobrescriba con datos antiguos
        set({ orders: uniqueOrders });
      } catch (error) {
        console.error('❌ Error actualizando pedido en Firebase:', error);
        // NO actualizar estado local si falla Firebase
        throw error; // Lanzar error para que el llamador sepa que falló
      }
    } else {
      console.warn('⚠️ No se encontró el pedido para actualizar:', orderId);
    }
  }
}));
