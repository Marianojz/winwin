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
}

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
  auctions: JSON.parse(localStorage.getItem('auctions') || '[]'),
  setAuctions: (auctions) => {
    localStorage.setItem('auctions', JSON.stringify(auctions));
    set({ auctions });
  },
  addBid: (auctionId, amount, userId, username) => {
    const auctions = get().auctions.map(auction => {
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
    set({ auctions });
  },

  // Products
  products: JSON.parse(localStorage.getItem('products') || '[]'),
  setProducts: (products) => {
    localStorage.setItem('products', JSON.stringify(products));
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
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      read: false
    };
    set({ notifications: [newNotification, ...get().notifications] });
  },
  markAsRead: (notificationId) => {
    set({
      notifications: get().notifications.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    });
  },
  get unreadCount() {
    return get().notifications.filter(n => !n.read).length;
  },

  // Bots
  bots: [],
  setBots: (bots) => set({ bots }),
  addBot: (bot) => set({ bots: [...get().bots, bot] }),
  updateBot: (botId, updates) => {
    set({
      bots: get().bots.map(bot =>
        bot.id === botId ? { ...bot, ...updates } : bot
      )
    });
  },
  deleteBot: (botId) => {
    set({ bots: get().bots.filter(bot => bot.id !== botId) });
  },

  // Orders
  orders: [],
  addOrder: (order) => set({ orders: [...get().orders, order] }),
  updateOrderStatus: (orderId, status, updates = {}) => {
    set({
      orders: get().orders.map(order =>
        order.id === orderId
          ? {
              ...order,
              status,
              ...(status === 'payment_confirmed' && !order.paidAt && { paidAt: new Date() }),
              ...(status === 'in_transit' && !order.shippedAt && { shippedAt: new Date() }),
              ...(status === 'delivered' && !order.deliveredAt && { deliveredAt: new Date() }),
              ...updates
            }
          : order
      )
    });
  }
}));
