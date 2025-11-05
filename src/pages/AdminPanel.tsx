// Firebase Realtime Database imports
import { ref, update, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Otras importaciones de Lucide, React, etc.
import React, { useState, useEffect } from 'react';
import { 
  Eye, Edit, Trash2, Users, Clock, AlertCircle, Activity, RefreshCw,
  Gavel, Package, Bot, DollarSign, Plus, XCircle,
  TrendingUp, ShoppingCart, Bell, AlertTriangle,
  Search, Filter, ShoppingBag, MapPin, BarChart3,
  MousePointerClick, Image as ImageIcon, Save, Store, Mail, Send,
  CheckCircle, Truck, FileText, Calendar, User, CreditCard,
  ArrowRight, ArrowDown, ArrowUp, Download, Trash
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import UserDetailsModal from '../components/UserDetailsModal';
import StatsCard from '../components/StatsCard';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';
import { Product, Auction, Order, OrderStatus } from '../types';
import ImageUploader from '../components/ImageUploader';
import { mockCategories } from '../utils/mockData';
import { availableStickers, getStickerLabel } from '../utils/stickers';
import { logAdminAction, logAuctionAction, logProductAction, logOrderAction, logUserAction } from '../utils/actionLogger';
import { HomeConfig, defaultHomeConfig } from '../types/homeConfig';
import { 
  getAllConversations, 
  getMessages, 
  saveMessage, 
  markMessagesAsRead, 
  getAdminUnreadCount,
  createMessage,
  createAutoMessage,
  deleteConversation,
  deleteAllConversations,
  deleteMessage
} from '../utils/messages';
import { Message, Conversation } from '../types';
import { useIsMobile } from '../hooks/useMediaQuery';
import { trackingSystem } from '../utils/tracking';
import { actionLogger } from '../utils/actionLogger';
import { runCleanup } from '../utils/dataCleaner';
import { 
  loadMessageTemplates, 
  saveMessageTemplates, 
  updateMessageTemplate,
  getVariablesForType,
  renderTemplate,
  type MessageTemplate 
} from '../utils/messageTemplates';

const AdminPanel = (): React.ReactElement => {
  const { 
    user, auctions, products, bots, orders,
    addBot, updateBot, deleteBot, setProducts, setAuctions, setBots, setOrders, updateOrderStatus 
  } = useStore();
  
  // Estados principales
  const [activeTab, setActiveTab] = useState('dashboard');
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-render sin recargar
  
  // Limpiar duplicados de pedidos al montar el componente
  useEffect(() => {
    const currentOrders = orders;
    const uniqueOrders = currentOrders.filter((order: Order, index: number, self: Order[]) => 
      index === self.findIndex((o: Order) => o.id === order.id)
    );
    
    if (uniqueOrders.length < currentOrders.length) {
      console.log(`🧹 AdminPanel: Eliminando ${currentOrders.length - uniqueOrders.length} pedidos duplicados`);
      setOrders(uniqueOrders);
    }
  }, []); // Solo al montar
  
  // Estado para configuración del inicio
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    try {
      const saved = localStorage.getItem('homeConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Asegurar que banners y promotions tengan las fechas correctas
        return {
          ...parsed,
          banners: parsed.banners?.map((b: any) => ({
            ...b,
            createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
            updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined
          })) || [],
          promotions: parsed.promotions?.map((p: any) => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            startDate: p.startDate ? new Date(p.startDate) : undefined,
            endDate: p.endDate ? new Date(p.endDate) : undefined
          })) || [],
          updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date()
        };
      }
      return defaultHomeConfig;
    } catch {
      return defaultHomeConfig;
    }
  });

  // Estados para templates de mensajes
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(() => loadMessageTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string>('');
  
  // Estados para mensajería
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Cargar conversaciones y contador
  useEffect(() => {
    let unsubscribeConversations: (() => void) | null = null;
    let unsubscribeUnread: (() => void) | null = null;

    // Configurar listeners en tiempo real
    unsubscribeConversations = getAllConversations((conversations) => {
      setConversations(conversations || []);
    });

    unsubscribeUnread = getAdminUnreadCount((count) => {
      setAdminUnreadCount(typeof count === 'number' ? count : 0);
    });

    // Cleanup al desmontar o cambiar de tab
    return () => {
      if (unsubscribeConversations) unsubscribeConversations();
      if (unsubscribeUnread) unsubscribeUnread();
    };
  }, [activeTab]);
  
  // Cargar mensajes de conversación seleccionada
  useEffect(() => {
    let unsubscribeMessages: (() => void) | null = null;
    let unsubscribeUnread: (() => void) | null = null;

    if (selectedConversation) {
      unsubscribeMessages = getMessages(selectedConversation, (messages) => {
        setConversationMessages(messages || []);
      });
      // Marcar como leídos cuando se abre la conversación
      markMessagesAsRead(selectedConversation, 'admin');
      unsubscribeUnread = getAdminUnreadCount((count) => {
        setAdminUnreadCount(typeof count === 'number' ? count : 0);
      });
    } else if (selectedUserForMessage) {
      // Si hay usuario seleccionado para mensaje nuevo, cargar sus mensajes
      const convId = `admin_${selectedUserForMessage}`;
      unsubscribeMessages = getMessages(convId, (messages) => {
        setConversationMessages(messages || []);
      });
      setSelectedConversation(convId);
    }

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeUnread) unsubscribeUnread();
    };
  }, [selectedConversation, selectedUserForMessage]);
  // ============================================
  // FUNCIONES PARA CREAR SUBASTA
  // ============================================
  
  // Función para validar el formulario de subasta
  const validateAuctionForm = (form: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validar título
    if (!form.title || form.title.trim().length < 5) {
      errors.push('El título debe tener al menos 5 caracteres');
    }
    if (form.title && form.title.length > 100) {
      errors.push('El título no puede superar los 100 caracteres');
    }

    // Validar descripción
    if (!form.description || form.description.trim().length < 20) {
      errors.push('La descripción debe tener al menos 20 caracteres');
    }
    if (form.description && form.description.length > 2000) {
      errors.push('La descripción no puede superar los 2000 caracteres');
    }

    // Validar precio inicial
if (!form.startingPrice || form.startingPrice <= 0) {  // ← CAMBIADO
  errors.push('El precio inicial debe ser mayor a $0');
}
if (form.startingPrice && form.startingPrice < 100) {  // ← CAMBIADO
  errors.push('El precio inicial mínimo es $100');
}

// Validar precio de Compra Ya (si está activado)
if (form.buyNowPrice && form.buyNowPrice > 0) {
  if (form.buyNowPrice <= form.startingPrice) {  // ← CAMBIADO
    errors.push('El precio de "Compra Ya" debe ser mayor al precio inicial');
  }
}

    // Validar imágenes
    if (!form.images || form.images.length === 0) {
      errors.push('Debes agregar al menos 1 imagen');
    }
    if (form.images && form.images.length > 3) {
      errors.push('Máximo 3 imágenes permitidas');
    }

    // Validar duración
    const totalMinutes = (form.durationDays * 24 * 60) + (form.durationHours * 60) + form.durationMinutes;
    if (totalMinutes < 5) {
      errors.push('La duración mínima es de 5 minutos');
    }
    if (totalMinutes > 10080) { // 7 días
      errors.push('La duración máxima es de 7 días');
    }

    // Validar fecha programada (si está activada)
    if (form.scheduled) {
      if (!form.scheduledDate || !form.scheduledTime) {
        errors.push('Debes seleccionar fecha y hora para programar la subasta');
      } else {
        const scheduledDateTime = new Date(`${form.scheduledDate}T${form.scheduledTime}`);
        if (scheduledDateTime <= new Date()) {
          errors.push('La fecha programada debe ser futura');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // Función para crear subasta en Firebase
  const handleCreateAuction = async () => {
    // Validar formulario
    const validation = validateAuctionForm(auctionForm);
    if (!validation.valid) {
      alert(`Errores en el formulario:\n\n${validation.errors.join('\n')}`);
      return;
    }

    if (!user || !user.id) {
      alert('Debes estar autenticado para crear subastas.');
      return;
    }
    try {
      // Calcular fecha de finalización
      const now = new Date();
      let startTime = now;

      // Si está programada, usar la fecha programada
      if (auctionForm.scheduled && auctionForm.scheduledDate && auctionForm.scheduledTime) {
        startTime = new Date(`${auctionForm.scheduledDate}T${auctionForm.scheduledTime}`);
      }

      // Calcular end time basado en duración
      const totalMinutes = (auctionForm.durationDays * 24 * 60) + (auctionForm.durationHours * 60) + auctionForm.durationMinutes;
      const endTime = new Date(startTime.getTime() + totalMinutes * 60000);

      // Sanitizar precio inicial, quitar ceros a izquierda
const sanitizedstartPriceStr = String(auctionForm.startingPrice ?? '').replace(/^0+/, '');  // ← CAMBIADO
if (!sanitizedstartPriceStr || isNaN(Number(sanitizedstartPriceStr)) || Number(sanitizedstartPriceStr) < 100) {
  alert('El precio inicial debe ser un número mayor o igual a $100 (sin ceros a la izquierda).');
  return;
}
const sanitizedstartPrice = Number(sanitizedstartPriceStr);

      // Verificar formato de otros campos claves
      if (!auctionForm.title || !auctionForm.description || !auctionForm.images?.length) {
        alert('Todos los campos requeridos deben estar completos y válidos.');
        return;
      }

      // Crear objeto de subasta
const newAuction: Auction = {
  id: `auction_${Date.now()}`,
  title: auctionForm.title.trim(),
  description: auctionForm.description.trim(),
        images: auctionForm.images,
        stickers: auctionForm.stickers || [],
        startingPrice: sanitizedstartPrice,  // ← CAMBIAR a startingPrice
        currentPrice: sanitizedstartPrice,
        buyNowPrice: auctionForm.buyNowPrice > 0 ? Number(auctionForm.buyNowPrice) : undefined,
  startTime: new Date(),  // ← AGREGAR startTime (requerido)
  endTime: endTime,
  status: auctionForm.scheduled ? 'scheduled' as any : 'active',
  categoryId: auctionForm.categoryId,
  bids: [],
  featured: auctionForm.featured || false,
  isFlash: totalMinutes <= 60, // Si dura 1 hora o menos, es flash
  condition: auctionForm.condition || 'new',
  createdBy: user.id,
  createdAt: new Date()  // ← AGREGAR createdAt
};

      // Guardar en Firebase
      try {
        console.log('🔥 Guardando subasta en Firebase...');
        await update(ref(realtimeDb, `auctions/${newAuction.id}`), newAuction);
        console.log('✅ Subasta guardada en Firebase correctamente');
      } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
        
        if (error instanceof Error) {
          alert('Error guardando en Firebase: ' + error.message);
        } else {
          alert('Error guardando en Firebase: Error desconocido');
        }
      }

      // Actualizar estado local
      setAuctions([...auctions, newAuction]);
      logAuctionAction('Subasta creada', newAuction.id, user?.id, user?.username, { title: auctionForm.title });

      // Mensaje de éxito
      const successMessage = auctionForm.scheduled 
        ? `✅ Subasta programada correctamente para ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()}`
        : '✅ Subasta creada correctamente';
      
      alert(successMessage);

      // Resetear formulario
setAuctionForm({
  title: '',
  description: '',
  startingPrice: 1000,     // ← CAMBIADO
  currentPrice: 1000,
  buyNowPrice: 0,
  categoryId: '1',
  images: [] as string[],
  stickers: [] as string[],
  durationDays: 0,
  durationHours: 0,
  durationMinutes: 30,
  condition: 'new' as 'new' | 'like-new' | 'excellent' | 'good' | 'fair',
  featured: false,
  allowExtension: true,
  scheduled: false,
  scheduledDate: '',
  scheduledTime: ''
});

      // Volver a la lista de subastas
      setActiveTab('auctions');

    } catch (error: any) {
      console.error('❌ Error creando subasta:', error);
      alert(`❌ Error al crear subasta: ${error.message}`);
    }
  };
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Estados para productos
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  categoryId: '1',
  images: [] as string[],
  badges: [] as string[],
  stickers: [] as string[],
  active: true,
  featured: false
});

  // Estados para subastas
const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
const [auctionForm, setAuctionForm] = useState({
  title: '',
  description: '',
  startingPrice: 0,  // ← CAMBIADO de startPrice a startingPrice
  currentPrice: 0,
  buyNowPrice: 0,
  categoryId: '1',
  images: [] as string[],
  stickers: [] as string[],
  durationDays: 0,
  durationHours: 0,
  durationMinutes: 30,
  condition: 'new' as 'new' | 'like-new' | 'excellent' | 'good' | 'fair',
  featured: false,
  allowExtension: true,
  scheduled: false,
  scheduledDate: '',
  scheduledTime: ''
});

  // Estados para bots
  const [botForm, setBotForm] = useState({
    name: '',
    balance: 10000,
    intervalMin: 5,
    intervalMax: 15,
    maxBidAmount: 5000,
    targetAuctions: [] as string[]
  });
  const [showBotForm, setShowBotForm] = useState(false);

  // Estados para inventario
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // Estados para pedidos
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all' | 'active' | 'inactive'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // ============================================
  // FUNCIONES PARA ESTADÍSTICAS DEL DASHBOARD
  // ============================================
  
  const getDashboardStats = () => {
    // Usuarios
    const totalUsers = realUsers.length;
    const activeUsers = realUsers.filter((u: { active: boolean; }) => u.active !== false).length;
    
    // Subastas
    const activeAuctions = auctions.filter((a: { status: string; }) => a.status === 'active').length;
    const endedAuctions = auctions.filter((a: { status: string; }) => a.status === 'ended').length;
    const totalBids = auctions.reduce((sum: any, a: { bids: string | any[]; }) => sum + (a.bids?.length || 0), 0);
    
    // Productos
    const totalProducts = products.length;
    const activeProducts = products.filter((p: Product) => p.active !== false && p.active !== undefined).length;
    const lowStockProducts = products.filter((p: { stock: number; }) => p.stock > 0 && p.stock < 5).length;
    const outOfStockProducts = products.filter((p: { stock: number; }) => p.stock === 0).length;
    
    // Pedidos
    const totalOrders = orders.length;
    const pendingPayment = orders.filter((o: { status: string; }) => o.status === 'pending_payment').length;
    const processing = orders.filter((o: { status: string; }) => o.status === 'processing').length;
    const inTransit = orders.filter((o: { status: string; }) => o.status === 'in_transit').length;
    const delivered = orders.filter((o: { status: string; }) => o.status === 'delivered').length;
    
    // Ingresos
    const totalRevenue = orders
      .filter((o: { status: string; }) => ['payment_confirmed', 'processing', 'in_transit', 'delivered'].includes(o.status))
      .reduce((sum: any, o: { amount: any; }) => sum + o.amount, 0);
    
    const monthRevenue = orders
      .filter((o: { createdAt: string | number | Date; status: string; }) => {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && 
               orderDate.getFullYear() === now.getFullYear() &&
               ['payment_confirmed', 'processing', 'in_transit', 'delivered'].includes(o.status);
      })
      .reduce((sum: any, o: { amount: any; }) => sum + o.amount, 0);
    
    // Bots
    const activeBots = bots.filter((b: { isActive: any; }) => b.isActive).length;
    const totalBotsBalance = bots.reduce((sum: any, b: { balance: any; }) => sum + b.balance, 0);
    
    return {
      users: { total: totalUsers, active: activeUsers },
      auctions: { active: activeAuctions, ended: endedAuctions, totalBids },
      products: { total: totalProducts, active: activeProducts, lowStock: lowStockProducts, outOfStock: outOfStockProducts },
      orders: { total: totalOrders, pendingPayment, processing, inTransit, delivered },
      revenue: { total: totalRevenue, month: monthRevenue },
      bots: { active: activeBots, total: bots.length, totalBalance: totalBotsBalance }
    };
  };
  
  const getRecentActivity = () => {
    const clearedTimestamp = localStorage.getItem('clearedActivityTimestamp');
    const clearedTime = clearedTimestamp ? parseInt(clearedTimestamp) : 0;
    const activities: any[] = [];
    
    // Últimas 5 órdenes
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    recentOrders.forEach(order => {
      const orderTime = new Date(order.createdAt).getTime();
      if (orderTime > clearedTime) {
        activities.push({
          type: 'order',
          message: `${order.userName} realizó un pedido de ${formatCurrency(order.amount)}`,
          time: order.createdAt,
          status: order.status
        });
      }
    });
    
    // Últimas 5 pujas
    const recentBids = auctions
      .flatMap((a: { bids: any[]; title: any; }) => a.bids?.map((b: any) => ({ ...b, auctionTitle: a.title })) || [])
      .sort((a: { createdAt: string | number | Date; }, b: { createdAt: string | number | Date; }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    recentBids.forEach((bid: { username: any; amount: number; auctionTitle: any; createdAt: any; }) => {
      const bidTime = new Date(bid.createdAt).getTime();
      if (bidTime > clearedTime) {
        activities.push({
          type: 'bid',
          message: `${bid.username} pujó ${formatCurrency(bid.amount)} en "${bid.auctionTitle}"`,
          time: bid.createdAt,
          status: 'bid'
        });
      }
    });
    
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);
  };
  
  const getAuctionsEndingSoon = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return auctions.filter((a: { endTime: string | number | Date; status: string; }) => {
      const endTime = new Date(a.endTime);
      return a.status === 'active' && endTime > now && endTime <= tomorrow;
    });
  };

  const stats = getDashboardStats();

  // Variables calculadas para filtros del inventario
  const lowStockProducts = products.filter((p: { stock: number; }) => p.stock > 0 && p.stock < 5);
  const outOfStockProducts = products.filter((p: { stock: number; }) => p.stock === 0);
  const totalInventoryValue = products.reduce((sum: number, p: { price: number; stock: number; }) => sum + (p.price * p.stock), 0);

  // Cargar usuarios reales de Firebase
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map((doc: { id: any; data: () => any; }) => ({
        id: doc.id,
        ...doc.data()
      }));
      setRealUsers(usersData);
      console.log('✅ Usuarios cargados:', usersData.length);
    } catch (error) {
      console.error('❌ Error al cargar usuarios:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // Protección de acceso - DEBE IR DESPUÉS DE TODOS LOS HOOKS
  if (!user?.isAdmin) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '3rem', borderRadius: '1.5rem', maxWidth: '500px' }}>
          <AlertCircle size={64} color="var(--error)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Acceso Denegado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Solo los administradores pueden acceder a este panel de control.
          </p>
          <button onClick={() => window.location.href = '/'} className="btn btn-primary">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }


  // Funciones para Productos
  const handleEditProduct = (product: Product) => {
  setEditingProduct(product);
  setProductForm({
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    categoryId: product.categoryId,
    images: product.images || [],
    badges: product.badges || [],
    stickers: product.stickers || [],
    active: product.active !== undefined ? product.active : true,
    featured: product.featured || false
  });
  setActiveTab('edit-product');
};
  const handleCreateProduct = () => {
  // Resetear formulario
  setProductForm({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    categoryId: '1',
    images: [] as string[],
    badges: [] as string[],
    stickers: [] as string[], // Agregar stickers inicializado
    active: true,
    featured: false
  });
  setEditingProduct(null);
  setActiveTab('create-product');
};
  const validateProductForm = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validar nombre
  if (!productForm.name || productForm.name.trim().length < 5) {
    errors.push('El nombre debe tener al menos 5 caracteres');
  }
  if (productForm.name && productForm.name.length > 100) {
    errors.push('El nombre no puede superar los 100 caracteres');
  }

  // Validar descripción
  if (!productForm.description || productForm.description.trim().length < 20) {
    errors.push('La descripción debe tener al menos 20 caracteres');
  }
  if (productForm.description && productForm.description.length > 2000) {
    errors.push('La descripción no puede superar los 2000 caracteres');
  }

  // Validar precio
  if (!productForm.price || productForm.price < 100) {
    errors.push('El precio mínimo es $100');
  }

  // Validar stock
  if (productForm.stock < 0) {
    errors.push('El stock no puede ser negativo');
  }

  // Validar imágenes
  if (productForm.images.length === 0) {
    errors.push('Debes agregar al menos 1 imagen del producto');
  }
  if (productForm.images.length > 5) {
    errors.push('Máximo 5 imágenes por producto');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

  const handleSaveProduct = async () => {
  // Validar formulario
  const validation = validateProductForm();
  if (!validation.valid) {
    alert(`❌ Errores en el formulario:\n\n${validation.errors.join('\n')}`);
    return;
  }

  try {
    if (editingProduct) {
      // EDITAR PRODUCTO EXISTENTE
      const updatedProduct: Product = {
        ...editingProduct,
        name: productForm.name,
        description: productForm.description,
        price: productForm.price,
        stock: productForm.stock,
        categoryId: productForm.categoryId,
        images: productForm.images || [],
        badges: productForm.badges || [],
        stickers: productForm.stickers || [],
        active: productForm.active,
        featured: productForm.featured,
        updatedAt: new Date().toISOString()
      };

      const updatedProducts: Product[] = products.map((p: Product) =>
        p.id === editingProduct.id ? updatedProduct : p
      );
      setProducts(updatedProducts);
      logProductAction('Producto actualizado', editingProduct.id, user?.id, user?.username, { name: productForm.name });
      alert('✅ Producto actualizado correctamente');
      setEditingProduct(null);
      setActiveTab('products');

    } else {
      // CREAR PRODUCTO NUEVO
      const newProduct = {
        ...productForm,
        id: `product_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ratings: [],
        averageRating: 0,
        stickers: productForm.stickers || []
      };

      setProducts([...products, newProduct as Product]);
      logProductAction('Producto creado', newProduct.id, user?.id, user?.username, { name: productForm.name });
      alert('✅ Producto creado correctamente');
      
      // Resetear formulario
      setProductForm({
        name: '',
        description: '',
        price: 0,
        stock: 0,
        categoryId: '1',
        images: [] as string[],
        badges: [] as string[],
        stickers: [] as string[],
        active: true,
        featured: false
      });

      setActiveTab('products');
    }
  } catch (error: any) {
    console.error('❌ Error guardando producto:', error);
    alert(`❌ Error al guardar producto: ${error.message}`);
  }
};

  const handleDeleteProduct = (productId: string) => {
    const product = products.find((p: { id: string; }) => p.id === productId);
    if (window.confirm(`¿Estás seguro de eliminar "${product?.name}"?\n\nEsta acción no se puede deshacer.`)) {
      const updatedProducts = products.filter((p: { id: string; }) => p.id !== productId);
      setProducts(updatedProducts);
      alert('🗑️ Producto eliminado correctamente');
    }
  };

  const handleEditAuction = (auction: Auction) => {
    setEditingAuction(auction);
    
    // Calcular duración restante desde el endTime
    const now = new Date();
    const endTime = new Date(auction.endTime);
    const remainingMs = endTime.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    
    const durationDays = Math.floor(remainingMinutes / (24 * 60));
    const durationHours = Math.floor((remainingMinutes % (24 * 60)) / 60);
    const durationMinutes = remainingMinutes % 60;
    
      setAuctionForm({
  title: auction.title,
  description: auction.description,
  startingPrice: auction.startingPrice,  // ← CAMBIADO
  currentPrice: auction.currentPrice,
  buyNowPrice: auction.buyNowPrice || 0,
  categoryId: auction.categoryId,
  images: auction.images || [],
  stickers: auction.stickers || [],
  durationDays: durationDays > 0 ? durationDays : 0,
  durationHours: durationHours > 0 ? durationHours : 0,
  durationMinutes: durationMinutes > 0 ? durationMinutes : 30,
  condition: auction.condition || 'new',
  featured: auction.featured || false,
  allowExtension: true,
  scheduled: false,
  scheduledDate: '',
  scheduledTime: ''
});
    setActiveTab('edit-auction');
  };

  const handleSaveAuction = () => {
    if (!editingAuction) return;

    // Validar formulario (reutilizamos la misma validación de crear)
    const validation = validateAuctionForm(auctionForm);
    if (!validation.valid) {
      alert(`Errores en el formulario:\n\n${validation.errors.join('\n')}`);
      return;
    }

    // Advertencia si se modifica precio inicial y ya hay ofertas
if (editingAuction.bids.length > 0 && auctionForm.startingPrice !== editingAuction.startingPrice) {  // ← CAMBIADO
  if (!window.confirm('⚠️ ADVERTENCIA: Esta subasta ya tiene ofertas.\n\n¿Estás seguro de cambiar el precio inicial?\n\nEsto puede afectar la validez de las ofertas existentes.')) {
    return;
  }
}

    // Calcular nueva fecha de finalización basada en duración
    const totalMinutes = (auctionForm.durationDays * 24 * 60) + (auctionForm.durationHours * 60) + auctionForm.durationMinutes;
    const now = new Date();
    const newEndTime = new Date(now.getTime() + totalMinutes * 60000);

    // Actualizar subasta
    const updatedAuctions: Auction[] = auctions.map((a: Auction) => {
      if (a.id === editingAuction.id) {
        return {
          ...a,
          title: auctionForm.title.trim(),
          description: auctionForm.description.trim(),
          startingPrice: Number(auctionForm.startingPrice),
          currentPrice: Math.max(Number(auctionForm.currentPrice), Number(auctionForm.startingPrice)),
          buyNowPrice: auctionForm.buyNowPrice > 0 ? Number(auctionForm.buyNowPrice) : undefined,
          categoryId: auctionForm.categoryId,
          images: auctionForm.images,
          stickers: auctionForm.stickers || [],
          condition: auctionForm.condition,
          featured: auctionForm.featured,
          endTime: newEndTime,
          isFlash: totalMinutes <= 60
        };
      }
      return a;
    });
    
    setAuctions(updatedAuctions);
    alert('✅ Subasta actualizada correctamente');
    setEditingAuction(null);
    setActiveTab('auctions');
  };
  const handleDeleteAuction = (auctionId: string) => {
    const auction = auctions.find((a: { id: string; }) => a.id === auctionId);
    if (window.confirm(`¿Estás seguro de eliminar "${auction?.title}"?\n\nSe perderán todas las ofertas asociadas.`)) {
      const updatedAuctions = auctions.filter((a: { id: string; }) => a.id !== auctionId);
      setAuctions(updatedAuctions);
      alert('🗑️ Subasta eliminada correctamente');
    }
  };

  // Función para republicar subasta
  const handleRepublishAuction = (auction: Auction) => {
    const option = window.confirm(
      `¿Cómo deseas republicar "${auction.title}"?\n\n` +
      `Aceptar = Editar antes de republicar\n` +
      `Cancelar = Republicar tal como está`
    );

    if (option) {
      // Editar antes de republicar
      handleEditAuction(auction);
    } else {
      // Republicar tal como está
      const now = new Date();
      const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días desde ahora
      
      const republishedAuction: Auction = {
        ...auction,
        id: `auction_${Date.now()}`, // Nuevo ID
        status: 'active',
        startTime: now,
        endTime: endTime,
        bids: [], // Limpiar ofertas
        winnerId: undefined,
        currentPrice: auction.startingPrice,
        createdAt: now
      };

      const updatedAuctions = [...auctions, republishedAuction];
      setAuctions(updatedAuctions);
      logAuctionAction('Subasta republicada', republishedAuction.id, user?.id, user?.username, { title: auction.title });
      alert('✅ Subasta republicada correctamente');
    }
  };

  // Funciones para Bots
  const handleAddBot = () => {
    if (!botForm.name || !botForm.name.trim()) {
      alert('⚠️ Por favor ingresa un nombre para el bot');
      return;
    }
    if (botForm.balance < 100) {
      alert('⚠️ El balance debe ser al menos $100');
      return;
    }
    if (botForm.maxBidAmount < 100) {
      alert('⚠️ La oferta máxima debe ser al menos $100');
      return;
    }
    if (botForm.intervalMin >= botForm.intervalMax) {
      alert('⚠️ El intervalo mínimo debe ser menor que el máximo');
      return;
    }
    if (botForm.intervalMin < 1 || botForm.intervalMax > 300) {
      alert('⚠️ Los intervalos deben estar entre 1 y 300 segundos');
      return;
    }
    
    try {
      const newBot = {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: botForm.name.trim(),
        balance: Number(botForm.balance),
        intervalMin: Number(botForm.intervalMin),
        intervalMax: Number(botForm.intervalMax),
        maxBidAmount: Number(botForm.maxBidAmount),
        isActive: true,
        targetAuctions: botForm.targetAuctions || []
      };
      
      addBot(newBot);
      logAdminAction(`Bot creado: ${newBot.name}`, user?.id, user?.username);
      
      setBotForm({
        name: '',
        balance: 10000,
        intervalMin: 5,
        intervalMax: 15,
        maxBidAmount: 5000,
        targetAuctions: []
      });
      
      alert(`✅ Bot "${newBot.name}" creado correctamente`);
    } catch (error) {
      console.error('Error creando bot:', error);
      alert('❌ Error al crear el bot. Por favor intenta nuevamente.');
    }
  };

  // Función de Reset mejorada - preserva usuarios y logs de ventas
  const handleResetData = async () => {
    if (!window.confirm('⚠️ ADVERTENCIA: Esto reiniciará todos los datos EXCEPTO usuarios registrados y logs de ventas.\n\n¿Estás seguro de continuar?')) {
      return;
    }
    
    if (!window.confirm('⚠️ ÚLTIMA CONFIRMACIÓN:\n\nSe resetearán:\n- Subastas (también de Firebase)\n- Productos\n- Bots\n- Notificaciones\n\nSe PRESERVARÁN:\n- ✅ Usuarios registrados\n- ✅ Logs de acciones\n- ✅ Historial de pedidos/ventas\n\n¿Proceder?')) {
      return;
    }

    try {
      // Guardar datos a preservar
      const usersBackup = localStorage.getItem('users') || '[]';
      const actionLogsBackup = localStorage.getItem('action_logs') || '[]';
      const ordersBackup = localStorage.getItem('orders') || '[]';
      
      // 🔥 ELIMINAR TODAS LAS SUBASTAS DE FIREBASE
      console.log('🔥 Eliminando todas las subastas de Firebase...');
      try {
        const auctionsRef = ref(realtimeDb, 'auctions');
        await remove(auctionsRef);
        console.log('✅ Todas las subastas eliminadas de Firebase');
      } catch (firebaseError) {
        console.error('❌ Error eliminando subastas de Firebase:', firebaseError);
        // Continuar aunque falle Firebase
      }
      
      // Limpiar todo de localStorage
      localStorage.removeItem('auctions');
      localStorage.removeItem('products');
      localStorage.removeItem('bots');
      localStorage.removeItem('notifications');
      localStorage.removeItem('cart');
      localStorage.removeItem('theme');
      
      // Restaurar datos preservados
      if (usersBackup !== '[]') {
        // Los usuarios están en Firebase, no necesitamos restaurar desde localStorage
        console.log('✅ Usuarios preservados (en Firebase)');
      }
      if (actionLogsBackup !== '[]') {
        localStorage.setItem('action_logs', actionLogsBackup);
        console.log('✅ Logs de acciones preservados');
      }
      if (ordersBackup !== '[]') {
        localStorage.setItem('orders', ordersBackup);
        console.log('✅ Logs de ventas/pedidos preservados');
      }
      
      // Limpiar estado de la app
      setAuctions([]);
      setProducts([]);
      setBots([]);
      
      // Registrar acción en log
      logAdminAction('Sistema reseteado (preservando usuarios y logs, eliminando subastas de Firebase)', user?.id, user?.username);
      
      alert('✅ Datos reiniciados correctamente.\n\n✅ Usuarios registrados preservados\n✅ Logs de acciones preservados\n✅ Historial de pedidos preservado\n✅ Subastas eliminadas de Firebase');
      
      // Recargar para aplicar cambios SIN perder sesión
      // NO hacer logout, solo recargar la página
      // El usuario ya está autenticado en Firebase, así que seguirá logueado
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error en reset:', error);
      alert('❌ Error al resetear datos');
    }
  };

  // Filtrar pedidos y eliminar duplicados
  const uniqueOrders = orders.filter((order: Order, index: number, self: Order[]) => 
    index === self.findIndex((o: Order) => o.id === order.id)
  );
  
  const filteredOrders = uniqueOrders.filter((order: Order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                         order.id.toLowerCase().includes(searchLower) ||
                         order.userId.toLowerCase().includes(searchLower) ||
                         (order.userName && order.userName.toLowerCase().includes(searchLower)) ||
                         formatCurrency(order.amount).toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a: Order, b: Order) => {
    // Ordenar por fecha más reciente primero
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const getStatusBadge = (status: OrderStatus) => {
  const badges = {
    pending_payment: { className: 'badge-warning', text: '⏳ Pago Pendiente' },
    payment_expired: { className: 'badge-error', text: '❌ Expirado' },
    payment_confirmed: { className: 'badge-success', text: '✅ Pago Confirmado' },
    processing: { className: 'badge-info', text: '🔄 Procesando' },
    preparing: { className: 'badge-info', text: '📦 Preparando' },
    shipped: { className: 'badge-primary', text: '🚢 Enviado' },
    in_transit: { className: 'badge-primary', text: '🚚 En Tránsito' },
    delivered: { className: 'badge-success', text: '✅ Entregado' },
    cancelled: { className: 'badge-secondary', text: '🚫 Cancelado' },
    expired: { className: 'badge-error', text: '⌛ Expirado' }
  };
  return badges[status] || { className: 'badge-secondary', text: '❓ Desconocido' };
};

  const getDeliveryMethodBadge = (method: string) => {
    const badges = {
      'shipping': { icon: '📦', text: 'Envío' },
      'pickup': { icon: '🏪', text: 'Retiro en Sucursal' },
      'email': { icon: '📧', text: 'Email/Digital' }
    };
    return badges[method as keyof typeof badges] || { icon: '📦', text: method };
  };

  const getTotalStats = () => {
    const stats = {
      pending: orders.filter((o: { status: string; }) => o.status === 'pending_payment').length,
      processing: orders.filter((o: { status: string; }) => o.status === 'processing').length,
      shipped: orders.filter((o: { status: string; }) => o.status === 'shipped').length,
      delivered: orders.filter((o: { status: string; }) => o.status === 'delivered').length,
      revenue: orders.filter((o: { status: string; }) => o.status === 'delivered').reduce((sum: any, o: { amount: any; }) => sum + o.amount, 0)
    };
    return stats;
  };

  // Helper para filtrar subastas con ganador (evita problemas de tipo)
  const getAuctionsWithWinner = (auctionsList: Auction[]): Auction[] => {
    return auctionsList.filter((a: Auction) => Boolean(a.winnerId));
  };

  // Estadísticas mejoradas: ingresos por subastas y tienda, más buscado, más cliqueado
  const getEnhancedStats = () => {
    // Ingresos por subastas (ventas ganadas)
    const auctionsWithWinner = getAuctionsWithWinner(auctions);
    const auctionRevenue = auctionsWithWinner.reduce((sum: number, a: Auction) => sum + (a.currentPrice || 0), 0);

    // Ingresos por tienda (pedidos entregados)
    const storeRevenue = orders
      .filter((o: { status: string; }) => o.status === 'delivered')
      .reduce((sum: number, o: { amount: number }) => sum + (o.amount || 0), 0);

    // Egresos (gastos) - por ahora 0, pero se puede expandir
    const expenses = 0;

    // Más buscado usando tracking system
    const mostSearched = trackingSystem.getMostSearched(10);

    // Más cliqueado usando tracking system
    const mostClicked = trackingSystem.getMostClicked(10);

    // Estadísticas de tracking
    const trackingStats = trackingSystem.getStats();

    // Logs recientes de acciones
    const recentLogs = actionLogger.getLogs().slice(0, 20);

    return {
      auctionRevenue,
      storeRevenue,
      expenses,
      totalRevenue: auctionRevenue + storeRevenue,
      netProfit: auctionRevenue + storeRevenue - expenses,
      mostSearched,
      mostClicked,
      trackingStats,
      recentLogs
    };
  };

  // Calcular estadísticas (después de definir las funciones)
  const enhancedStats = getEnhancedStats();
  const orderStats = getTotalStats();

  // Debug: verificar que las estadísticas se calculan
  useEffect(() => {
    if (activeTab === 'dashboard') {
      console.log('🎯 Dashboard activo - Estadísticas calculadas:', {
        auctionRevenue: enhancedStats.auctionRevenue,
        storeRevenue: enhancedStats.storeRevenue,
        netProfit: enhancedStats.netProfit,
        mostSearched: enhancedStats.mostSearched.length,
        mostClicked: enhancedStats.mostClicked.length
      });
    }
  }, [activeTab, enhancedStats]);

  // Función para enviar mensaje
  const handleSendMessage = () => {
    let userId: string;
    
    if (selectedUserForMessage) {
      // Nuevo mensaje a usuario seleccionado
      userId = selectedUserForMessage;
      const message = createMessage('admin', 'Administrador', userId, newMessageContent.trim());
      saveMessage(message);
      
      // Si no existe conversación, crearla seleccionándola
      if (!conversations.find(c => c.id === `admin_${userId}`)) {
        // El listener en tiempo real actualizará automáticamente las conversaciones
        setSelectedConversation(`admin_${userId}`);
      }
      setSelectedUserForMessage(null);
      setShowUserSelector(false);
    } else if (selectedConversation) {
      // Mensaje a conversación existente
      userId = selectedConversation.split('_')[1];
      const message = createMessage('admin', 'Administrador', userId, newMessageContent.trim());
      saveMessage(message);
    } else {
      return;
    }
    
    if (!newMessageContent.trim()) return;
    
    setNewMessageContent('');
    // Los listeners en tiempo real actualizarán automáticamente los mensajes y el contador
  };

  // Función para guardar configuración de home
  const handleSaveHomeConfig = () => {
    const updatedConfig = { ...homeConfig, updatedAt: new Date() };
    localStorage.setItem('homeConfig', JSON.stringify(updatedConfig));
    setHomeConfig(updatedConfig);
    logAdminAction('Configuración de home guardada', user?.id, user?.username);
    alert('✅ Configuración del inicio guardada correctamente');
  };

  // Funciones para gestión de banners
  const handleAddBanner = () => {
    const newBanner = {
      id: `banner-${Date.now()}`,
      title: 'Nuevo Banner',
      description: '',
      imageUrl: '',
      link: '',
      linkText: 'Ver más',
      active: true,
      order: homeConfig.banners.length,
      createdAt: new Date()
    };
    setHomeConfig({
      ...homeConfig,
      banners: [...homeConfig.banners, newBanner]
    });
  };

  const handleUpdateBanner = (bannerId: string, updates: any) => {
    setHomeConfig({
      ...homeConfig,
      banners: homeConfig.banners.map(b => 
        b.id === bannerId ? { ...b, ...updates, updatedAt: new Date() } : b
      )
    });
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (window.confirm('¿Eliminar este banner?')) {
      setHomeConfig({
        ...homeConfig,
        banners: homeConfig.banners.filter(b => b.id !== bannerId)
      });
    }
  };

  // Funciones para gestión de promociones
  const handleAddPromotion = () => {
    const newPromotion = {
      id: `promo-${Date.now()}`,
      title: 'Nueva Promoción',
      description: '',
      imageUrl: '',
      link: '',
      active: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días desde hoy
      order: homeConfig.promotions.length,
      createdAt: new Date()
    };
    setHomeConfig({
      ...homeConfig,
      promotions: [...homeConfig.promotions, newPromotion]
    });
  };

  const handleUpdatePromotion = (promoId: string, updates: any) => {
    setHomeConfig({
      ...homeConfig,
      promotions: homeConfig.promotions.map(p => 
        p.id === promoId ? { ...p, ...updates } : p
      )
    });
  };

  const handleDeletePromotion = (promoId: string) => {
    if (window.confirm('¿Eliminar esta promoción?')) {
      setHomeConfig({
        ...homeConfig,
        promotions: homeConfig.promotions.filter(p => p.id !== promoId)
      });
    }
  };

  // Funciones para manejo de imágenes (drag & drop y file input)
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Error al convertir archivo a base64'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>, setImageUrl: (url: string) => void) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ La imagen no puede superar los 5MB');
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      setImageUrl(base64);
    } catch (error) {
      console.error('Error convirtiendo imagen:', error);
      alert('❌ Error al procesar la imagen');
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, setImageUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Solo se permiten archivos de imagen');
      e.target.value = '';
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ La imagen no puede superar los 5MB');
      e.target.value = '';
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      setImageUrl(base64);
      e.target.value = '';
    } catch (error) {
      console.error('Error convirtiendo imagen:', error);
      alert('❌ Error al procesar la imagen');
    }
  };

  // Funciones para templates de mensajes
  const handleSaveTemplate = (templateId: string, template: Partial<MessageTemplate>) => {
    if (updateMessageTemplate(templateId, template)) {
      const updated = loadMessageTemplates();
      setMessageTemplates(updated);
      logAdminAction(`Template de mensaje actualizado: ${template.title || templateId}`, user?.id, user?.username);
      alert('✅ Template guardado correctamente');
    } else {
      alert('❌ Error al guardar el template');
    }
  };

  const handlePreviewTemplate = (template: MessageTemplate) => {
    // Variables de ejemplo para el preview
    const exampleVars: Record<string, string | number> = {
      username: 'Ejemplo Usuario',
      auctionTitle: 'Subasta de Ejemplo',
      productName: 'Producto de Ejemplo',
      amount: 50000,
      orderId: 'ORD-12345678',
      auctionId: 'AUC-123456',
      paymentDeadline: '48 horas',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR'),
      trackingNumber: 'TRACK-123456789',
      currentBid: 45000,
      minBid: 46000
    };
    const preview = renderTemplate(template, exampleVars);
    setTemplatePreview(preview);
  };

  // Recargar templates cuando cambia el tab
  useEffect(() => {
    if (activeTab === 'settings') {
      setMessageTemplates(loadMessageTemplates());
    }
  }, [activeTab]);

  // Función para limpieza manual de datos antiguos
  const handleManualCleanup = async () => {
    if (!user) return;
    
    if (!window.confirm('¿Limpiar datos antiguos ahora?\n\nEsto eliminará:\n- Notificaciones leídas de más de 1 día\n- Notificaciones no leídas de más de 2 días\n- Subastas finalizadas de más de 3 días\n- Pedidos completados de más de 7 días')) {
      return;
    }

    try {
      const result = runCleanup(user.id, auctions, orders);
      
      if (result) {
        // Actualizar subastas y pedidos si se limpiaron
        if (result.auctionsCleanup.cleaned > 0) {
          const cleanedAuctions = auctions.filter((auction: any) => {
            if (auction.status === 'active' || auction.status === 'scheduled') return true;
            if (auction.status === 'ended') {
              const now = Date.now();
              const cutoffDate = now - (3 * 24 * 60 * 60 * 1000);
              const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
              const createdAt = auction.createdAt ? new Date(auction.createdAt).getTime() : 0;
              const checkDate = endTime > 0 ? endTime : createdAt;
              return checkDate >= cutoffDate;
            }
            return true;
          });
          setAuctions(cleanedAuctions);
        }
        
        if (result.ordersCleanup.cleaned > 0) {
          const cleanedOrders = orders.filter((order: any) => {
            if (['pending_payment', 'payment_confirmed', 'in_transit'].includes(order.status)) return true;
            if (['delivered', 'canceled', 'payment_expired'].includes(order.status)) {
              const now = Date.now();
              const cutoffDate = now - (7 * 24 * 60 * 60 * 1000);
              const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
              return orderDate >= cutoffDate;
            }
            return true;
          });
          setOrders(cleanedOrders);
        }

        // Recargar notificaciones
        const { loadUserNotifications } = useStore.getState();
        if (loadUserNotifications) {
          setTimeout(() => {
            loadUserNotifications();
          }, 500);
        }

        const total = result.notificationsCleaned + result.auctionsCleanup.cleaned + result.ordersCleanup.cleaned;
        alert(`✅ Limpieza completada:\n- ${result.notificationsCleaned} notificaciones eliminadas\n- ${result.auctionsCleanup.cleaned} subastas eliminadas\n- ${result.ordersCleanup.cleaned} pedidos eliminados\n\nTotal: ${total} elementos eliminados`);
        logAdminAction('Limpieza manual de datos ejecutada', user.id, user.username, { total });
      }
    } catch (error) {
      console.error('Error en limpieza manual:', error);
      alert('❌ Error al ejecutar limpieza');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'auctions', label: 'Subastas', icon: Gavel },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'bots', label: 'Bots', icon: Bot },
    { id: 'messages', label: 'Mensajes', icon: Mail, badge: adminUnreadCount > 0 ? adminUnreadCount : undefined },
    { id: 'home-config', label: 'Editor Home', icon: ImageIcon },
    { id: 'settings', label: 'Configuración', icon: Activity }
  ];

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 80px)', 
      background: 'var(--bg-primary)', 
      padding: isMobile ? '1rem' : '2rem',
      paddingTop: '1rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? '1rem' : '2rem' }}>
        <h1 style={{ 
          fontSize: isMobile ? '1.5rem' : '2rem', 
          fontWeight: 700, 
          marginBottom: '0.5rem', 
          color: 'var(--text-primary)' 
        }}>
          Panel de Administración
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: isMobile ? '0.875rem' : '1rem' 
        }}>
          Gestioná subastas, productos, usuarios y más
        </p>
      </div>

      {/* Tabs Navigation - Optimizado para móvil */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '0.25rem' : '0.5rem',
        marginBottom: isMobile ? '1rem' : '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid var(--border)',
        scrollbarWidth: 'thin',
        WebkitOverflowScrolling: 'touch'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: isMobile ? '0.625rem 0.875rem' : '0.75rem 1.5rem',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8125rem' : '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.375rem' : '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                position: 'relative',
                flexShrink: 0
              }}
            >
              <Icon size={isMobile ? 16 : 18} />
              {isMobile ? (tab.label.length > 8 ? tab.label.substring(0, 8) + '...' : tab.label) : tab.label}
              {tab.badge && (
                <span style={{
                  background: 'var(--error)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginLeft: '0.25rem'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <StatsCard
              title="Usuarios Totales"
              value={stats.users.total}
              icon={Users}
              color="var(--primary)"
              subtitle={`${stats.users.active} activos`}
            />
            <StatsCard
              title="Subastas Activas"
              value={stats.auctions.active}
              icon={Gavel}
              color="var(--success)"
              subtitle={`${stats.auctions.ended} finalizadas`}
            />
            <StatsCard
              title="Productos"
              value={stats.products.total}
              icon={Package}
              color="var(--warning)"
              subtitle={`${stats.products.active} activos`}
            />
            <StatsCard
              title="Pedidos Totales"
              value={stats.orders.total}
              icon={ShoppingCart}
              color="var(--info)"
              subtitle={`${orderStats.delivered} entregados`}
            />
            <StatsCard
              title="Ingresos Totales"
              value={formatCurrency(enhancedStats.totalRevenue)}
              icon={DollarSign}
              color="var(--success)"
              subtitle={`${formatCurrency(stats.revenue.month)} este mes`}
            />
            <StatsCard
              title="Bots Activos"
              value={stats.bots.active}
              icon={Bot}
              color="var(--secondary)"
              subtitle={`${stats.bots.totalBalance.toLocaleString()} balance total`}
            />
          </div>

          {/* Alertas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {lowStockProducts.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--warning)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('products')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <AlertTriangle size={32} color="var(--warning)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Productos con Stock Bajo
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {lowStockProducts.length} productos con stock menor a 5 unidades
                    </p>
                  </div>
                </div>
              </div>
            )}

            {outOfStockProducts.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--error)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('products')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <XCircle size={32} color="var(--error)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Productos Sin Stock
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {outOfStockProducts.length} productos sin stock disponible
                    </p>
                  </div>
                </div>
              </div>
            )}

            {getAuctionsEndingSoon().length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--warning)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('auctions')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Clock size={32} color="var(--warning)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Subastas Finalizando
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {getAuctionsEndingSoon().length} subastas finalizan en las próximas 24 horas
                    </p>
                  </div>
                </div>
              </div>
            )}

            {orderStats.pending > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--info)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('orders')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <ShoppingCart size={32} color="var(--info)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Pedidos Pendientes
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {orderStats.pending} pedidos esperando pago
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estadísticas Financieras Detalladas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary), #d65a00)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Store size={24} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ingresos por Subastas</h3>
              </div>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(enhancedStats.auctionRevenue)}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                {getAuctionsWithWinner(auctions).length} subastas vendidas
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, var(--success), #10b981)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <ShoppingBag size={24} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ingresos por Tienda</h3>
              </div>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(enhancedStats.storeRevenue)}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                {orders.filter((o: { status: string; }) => o.status === 'delivered').length} pedidos entregados
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, var(--info), #0891b2)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <TrendingUp size={24} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ganancia Neta</h3>
              </div>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(enhancedStats.netProfit)}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                Total: {formatCurrency(enhancedStats.totalRevenue)}
              </p>
            </div>
          </div>

          {/* Más Buscado y Más Cliqueado */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Search size={20} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Más Buscado
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {enhancedStats.mostSearched.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    Aún no hay búsquedas registradas
                  </p>
                ) : (
                  enhancedStats.mostSearched.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      borderRadius: '0.5rem'
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          "{item.query}"
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.avgResults} resultados promedio
                        </p>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {item.count}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MousePointerClick size={20} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Más Cliqueado
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {enhancedStats.mostClicked.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    Aún no hay clicks registrados
                  </p>
                ) : (
                  enhancedStats.mostClicked.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      borderRadius: '0.5rem'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '0.875rem', 
                          fontWeight: 500, 
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.name}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.type === 'product' ? 'Producto' : 'Subasta'}
                        </p>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: item.type === 'product' ? 'var(--warning)' : 'var(--primary)',
                        color: 'white',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginLeft: '0.5rem'
                      }}>
                        {item.clicks}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Actividad Reciente con Botón de Limpiar */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                Actividad Reciente
              </h2>
              {getRecentActivity().length > 0 && (
                <button
                  onClick={() => {
                    localStorage.setItem('clearedActivityTimestamp', Date.now().toString());
                    setRefreshKey(prev => prev + 1);
                    logAdminAction('Actividad reciente limpiada', user?.id, user?.username);
                  }}
                  className="btn"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RefreshCw size={16} />
                  Limpiar
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {getRecentActivity().length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                  No hay actividad reciente
                </p>
              ) : (
                getRecentActivity().map((activity, idx) => (
                  <div key={idx} style={{
                    padding: '1rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {activity.message}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {formatTimeAgo(activity.time)}
                      </p>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      background: activity.type === 'order' ? 'var(--info)' : 'var(--primary)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {activity.type === 'order' ? 'Pedido' : 'Puja'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subastas Tab */}
      {activeTab === 'auctions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Gestión de Subastas</h2>
            <button
              onClick={() => {
                setAuctionForm({
                  title: '',
                  description: '',
                  startingPrice: 1000,
                  currentPrice: 1000,
                  buyNowPrice: 0,
                  categoryId: '1',
                  images: [],
                  stickers: [],
                  durationDays: 0,
                  durationHours: 0,
                  durationMinutes: 30,
                  condition: 'new',
                  featured: false,
                  allowExtension: true,
                  scheduled: false,
                  scheduledDate: '',
                  scheduledTime: ''
                });
                setEditingAuction(null);
                setActiveTab('create-auction');
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} />
              Nueva Subasta
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {auctions.map((auction: Auction) => (
              <div key={auction.id} style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  {auction.images && auction.images.length > 0 && (
                    <img
                      src={auction.images[0]}
                      alt={auction.title}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem'
                      }}
                    />
                  )}
                  <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {auction.title}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Precio actual: {formatCurrency(auction.currentPrice)}
                  </p>
                  <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Estado: <span style={{
                      color: auction.status === 'active' ? 'var(--success)' : 'var(--text-secondary)',
                      fontWeight: 600
                    }}>
                      {auction.status === 'active' ? 'Activa' : auction.status === 'ended' ? 'Finalizada' : 'Programada'}
                    </span>
                  </p>
                  <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Ofertas: {auction.bids?.length || 0}
                  </p>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <button
                    onClick={() => handleEditAuction(auction)}
                    className="btn btn-secondary"
                    style={{ 
                      flex: isMobile ? 'none' : 1, 
                      width: isMobile ? '100%' : 'auto',
                      minWidth: isMobile ? 'auto' : '100px',
                      padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                    }}
                  >
                    <Edit size={16} style={{ marginRight: '0.25rem' }} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteAuction(auction.id)}
                    className="btn btn-danger"
                    style={{ 
                      flex: isMobile ? 'none' : 1, 
                      width: isMobile ? '100%' : 'auto',
                      minWidth: isMobile ? 'auto' : '100px',
                      padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                    }}
                  >
                    <Trash2 size={16} style={{ marginRight: '0.25rem' }} />
                    Eliminar
                  </button>
                  {auction.status === 'ended' && (
                    <button
                      onClick={() => handleRepublishAuction(auction)}
                      className="btn btn-primary"
                      style={{ 
                        flex: isMobile ? 'none' : 1, 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? 'auto' : '100px',
                        padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                      }}
                    >
                      Republicar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Auction Tab */}
      {(activeTab === 'create-auction' || activeTab === 'edit-auction') && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('auctions')}
              className="btn btn-secondary"
              style={{ marginBottom: '1rem' }}
            >
              ← Volver a Subastas
            </button>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              {editingAuction ? 'Editar Subasta' : 'Crear Nueva Subasta'}
            </h2>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            maxWidth: '800px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={auctionForm.title}
                  onChange={(e) => setAuctionForm({ ...auctionForm, title: e.target.value })}
                  placeholder="Ej: iPhone 13 Pro Max 256GB"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Descripción *
                </label>
                <textarea
                  value={auctionForm.description}
                  onChange={(e) => setAuctionForm({ ...auctionForm, description: e.target.value })}
                  placeholder="Describe el producto detalladamente..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Precios */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Precio Inicial * (mín. $100)
                  </label>
                  <input
                    type="number"
                    value={auctionForm.startingPrice}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setAuctionForm({ ...auctionForm, startingPrice: value, currentPrice: value });
                    }}
                    min="100"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Precio "Compra Ya" (opcional)
                  </label>
                  <input
                    type="number"
                    value={auctionForm.buyNowPrice}
                    onChange={(e) => setAuctionForm({ ...auctionForm, buyNowPrice: Number(e.target.value) })}
                    min="0"
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              {/* Duración */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Duración *
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <input
                      type="number"
                      value={auctionForm.durationDays}
                      onChange={(e) => setAuctionForm({ ...auctionForm, durationDays: Number(e.target.value) })}
                      min="0"
                      placeholder="Días"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <input
                      type="number"
                      value={auctionForm.durationHours}
                      onChange={(e) => setAuctionForm({ ...auctionForm, durationHours: Number(e.target.value) })}
                      min="0"
                      max="23"
                      placeholder="Horas"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <input
                      type="number"
                      value={auctionForm.durationMinutes}
                      onChange={(e) => setAuctionForm({ ...auctionForm, durationMinutes: Number(e.target.value) })}
                      min="5"
                      placeholder="Minutos"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Categoría y Condición */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Categoría *
                  </label>
                  <select
                    value={auctionForm.categoryId}
                    onChange={(e) => setAuctionForm({ ...auctionForm, categoryId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  >
                    {mockCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Condición *
                  </label>
                  <select
                    value={auctionForm.condition}
                    onChange={(e) => setAuctionForm({ ...auctionForm, condition: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="new">Nuevo</option>
                    <option value="like-new">Como Nuevo</option>
                    <option value="excellent">Excelente</option>
                    <option value="good">Bueno</option>
                    <option value="fair">Regular</option>
                  </select>
                </div>
              </div>

              {/* Imágenes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Imágenes * (mín. 1, máx. 3)
                </label>
                <ImageUploader
                  images={auctionForm.images}
                  onChange={(images) => setAuctionForm({ ...auctionForm, images })}
                  maxImages={3}
                />
              </div>

              {/* Stickers */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Stickers (opcional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availableStickers.map(sticker => {
                    const stickerId = sticker.id;
                    return (
                      <label
                        key={stickerId}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: `2px solid ${auctionForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--border)'}`,
                          background: auctionForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--bg-primary)',
                          color: auctionForm.stickers.includes(stickerId) ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={auctionForm.stickers.includes(stickerId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAuctionForm({ ...auctionForm, stickers: [...auctionForm.stickers, stickerId] });
                            } else {
                              setAuctionForm({ ...auctionForm, stickers: auctionForm.stickers.filter(s => s !== stickerId) });
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {sticker.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opciones */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={auctionForm.featured}
                    onChange={(e) => setAuctionForm({ ...auctionForm, featured: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Destacada</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={auctionForm.scheduled}
                    onChange={(e) => setAuctionForm({ ...auctionForm, scheduled: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Programada</span>
                </label>
              </div>

              {/* Fecha programada */}
              {auctionForm.scheduled && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={auctionForm.scheduledDate}
                      onChange={(e) => setAuctionForm({ ...auctionForm, scheduledDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      value={auctionForm.scheduledTime}
                      onChange={(e) => setAuctionForm({ ...auctionForm, scheduledTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Botones */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <button
                  onClick={editingAuction ? handleSaveAuction : handleCreateAuction}
                  className="btn btn-primary"
                  style={{ 
                    flex: isMobile ? 'none' : 1,
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  <Save size={isMobile ? 18 : 20} style={{ marginRight: '0.5rem' }} />
                  {editingAuction ? 'Guardar Cambios' : 'Crear Subasta'}
                </button>
                <button
                  onClick={() => setActiveTab('auctions')}
                  className="btn btn-secondary"
                  style={{ 
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productos Tab */}
      {activeTab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Gestión de Productos</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <select
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="lowStock">Stock Bajo</option>
                <option value="outOfStock">Sin Stock</option>
                <option value="featured">Destacados</option>
              </select>
              <button
                onClick={handleCreateProduct}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={20} />
                Nuevo Producto
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {products
              .filter((p: Product) => {
                if (inventoryFilter === 'active') return p.active !== false;
                if (inventoryFilter === 'lowStock') return p.stock > 0 && p.stock < 5;
                if (inventoryFilter === 'outOfStock') return p.stock === 0;
                if (inventoryFilter === 'featured') return p.featured === true;
                return true;
              })
              .map((product: Product) => (
                <div key={product.id} style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    {product.images && product.images.length > 0 && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '0.5rem',
                          marginBottom: '1rem'
                        }}
                      />
                    )}
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      {product.name}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Precio: {formatCurrency(product.price)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Stock: <span style={{
                        color: product.stock === 0 ? 'var(--error)' : product.stock < 5 ? 'var(--warning)' : 'var(--success)',
                        fontWeight: 600
                      }}>
                        {product.stock} unidades
                      </span>
                    </p>
                    <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Estado: <span style={{
                        color: product.active !== false ? 'var(--success)' : 'var(--text-secondary)',
                        fontWeight: 600
                      }}>
                        {product.active !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="btn btn-secondary"
                      style={{ 
                        flex: isMobile ? 'none' : 1, 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? 'auto' : '100px',
                        padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                      }}
                    >
                      <Edit size={16} style={{ marginRight: '0.25rem' }} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn btn-danger"
                      style={{ 
                        flex: isMobile ? 'none' : 1, 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? 'auto' : '100px',
                        padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                      }}
                    >
                      <Trash2 size={16} style={{ marginRight: '0.25rem' }} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create/Edit Product Tab */}
      {(activeTab === 'create-product' || activeTab === 'edit-product') && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('products')}
              className="btn btn-secondary"
              style={{ marginBottom: '1rem' }}
            >
              ← Volver a Productos
            </button>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </h2>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            maxWidth: '800px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Nombre */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej: iPhone 13 Pro Max"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Descripción *
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Describe el producto..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Precio y Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Precio * (mín. $100)
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    min="100"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Stock *
                  </label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Categoría *
                </label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  {mockCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Imágenes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Imágenes * (mín. 1, máx. 5)
                </label>
                <ImageUploader
                  images={productForm.images}
                  onChange={(images) => setProductForm({ ...productForm, images })}
                  maxImages={5}
                />
              </div>

              {/* Stickers */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Stickers (opcional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availableStickers.map(sticker => {
                    const stickerId = sticker.id;
                    return (
                      <label
                        key={stickerId}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: `2px solid ${productForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--border)'}`,
                          background: productForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--bg-primary)',
                          color: productForm.stickers.includes(stickerId) ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={productForm.stickers.includes(stickerId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProductForm({ ...productForm, stickers: [...productForm.stickers, stickerId] });
                            } else {
                              setProductForm({ ...productForm, stickers: productForm.stickers.filter(s => s !== stickerId) });
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {sticker.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opciones */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Activo</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Destacado</span>
                </label>
              </div>

              {/* Botones */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <button
                  onClick={handleSaveProduct}
                  className="btn btn-primary"
                  style={{ 
                    flex: isMobile ? 'none' : 1,
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  <Save size={isMobile ? 18 : 20} style={{ marginRight: '0.5rem' }} />
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className="btn btn-secondary"
                  style={{ 
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usuarios Tab */}
      {activeTab === 'users' && (
        <div>
          <h2 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Gestión de Usuarios</h2>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={48} style={{ 
                color: 'var(--primary)',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Cargando usuarios...</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {realUsers.map((userItem: any) => (
                <div key={userItem.id} style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  cursor: 'pointer'
                }} onClick={() => setSelectedUser(userItem)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.25rem'
                    }}>
                      {userItem.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {userItem.username || 'Sin nombre'}
                      </h3>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {userItem.email || 'Sin email'}
                      </p>
                    </div>
                    {userItem.isAdmin && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        background: 'var(--warning)',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Admin
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    flexWrap: 'wrap',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(userItem);
                      }}
                      className="btn btn-secondary"
                      style={{ 
                        flex: isMobile ? 'none' : 1,
                        width: isMobile ? '100%' : 'auto',
                        padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                      }}
                    >
                      <Eye size={16} style={{ marginRight: '0.25rem' }} />
                      Ver Detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedUser && (
            <UserDetailsModal
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onUpdate={() => {
                loadUsers();
              }}
            />
          )}
        </div>
      )}

      {/* Pedidos Tab - Versión Mejorada y Profesional */}
      {activeTab === 'orders' && (
        <div>
          {/* Header con título y botón limpiar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: isMobile ? '1.5rem' : '2rem' }}>
                Gestión de Pedidos
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Administrá y seguí el estado de todos los pedidos
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('¿Eliminar pedidos finalizados (entregados/cancelados) de más de 30 días?\n\nEsta acción no se puede deshacer.')) {
                  const now = Date.now();
                  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
                  const cleanedOrders = orders.filter((o: Order) => {
                    if (['delivered', 'cancelled', 'expired'].includes(o.status)) {
                      const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                      return orderDate > thirtyDaysAgo;
                    }
                    return true;
                  });
                  setOrders(cleanedOrders);
                  logAdminAction(`Limpieza de pedidos: ${orders.length - cleanedOrders.length} eliminados`, user?.id, user?.username);
                  alert(`✅ ${orders.length - cleanedOrders.length} pedidos antiguos eliminados`);
                }
              }}
              className="btn btn-secondary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                fontSize: isMobile ? '0.875rem' : '0.9375rem'
              }}
            >
              <Trash size={18} />
              {!isMobile && 'Limpiar Antiguos'}
            </button>
          </div>

          {/* Estadísticas rápidas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Clock size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Pendientes</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {orders.filter((o: Order) => o.status === 'pending_payment').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Confirmados</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {orders.filter((o: Order) => o.status === 'payment_confirmed').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Truck size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>En Tránsito</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {orders.filter((o: Order) => ['in_transit', 'shipped'].includes(o.status)).length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <ShoppingBag size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Entregados</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {orders.filter((o: Order) => o.status === 'delivered').length}
              </div>
            </div>
          </div>

          {/* Filtros mejorados */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: isMobile ? '1rem' : '1.5rem', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={20} style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="text"
                  placeholder="Buscar por ID, cliente o monto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '16px' : '1rem',
                  cursor: 'pointer',
                  minWidth: isMobile ? '100%' : '200px'
                }}
              >
                <option value="all">📋 Todos los estados</option>
                <option value="pending_payment">⏳ Pago Pendiente</option>
                <option value="payment_confirmed">✅ Pago Confirmado</option>
                <option value="processing">🔄 Procesando</option>
                <option value="in_transit">🚚 En Tránsito</option>
                <option value="delivered">📦 Entregado</option>
                <option value="cancelled">❌ Cancelado</option>
              </select>
            </div>
          </div>

          {/* Lista de Pedidos - Tabla Profesional */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            overflow: isMobile ? 'auto' : 'hidden'
          }}>
            {filteredOrders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: 'var(--text-secondary)'
              }}>
                <ShoppingCart size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No se encontraron pedidos</h3>
                <p>Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      background: 'var(--bg-primary)', 
                      borderBottom: '2px solid var(--border)'
                    }}>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Pedido</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Cliente</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Monto</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Estado</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Fecha</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order: Order, index: number) => {
                      const statusBadge = getStatusBadge(order.status);
                      const deliveryBadge = getDeliveryMethodBadge(order.deliveryMethod || 'shipping');
                      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR', { 
                        day: '2-digit', 
                        month: 'short',
                        year: isMobile ? '2-digit' : 'numeric'
                      }) : 'N/A';
                      
                      // Determinar siguiente estado lógico
                      const getNextStatus = (current: OrderStatus): OrderStatus | null => {
                        const flow: Record<OrderStatus, OrderStatus | null> = {
                          pending_payment: 'payment_confirmed',
                          payment_confirmed: 'processing',
                          processing: 'in_transit',
                          in_transit: 'delivered',
                          delivered: null,
                          cancelled: null,
                          payment_expired: null,
                          expired: null,
                          preparing: 'shipped',
                          shipped: 'delivered'
                        };
                        return flow[current] || null;
                      };
                      
                      const nextStatus = getNextStatus(order.status);
                      
                      return (
                        <tr 
                          key={`order-${order.id}-${index}`}
                          style={{ 
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                              #{order.id.slice(-8).toUpperCase()}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <User size={16} style={{ color: 'var(--text-secondary)' }} />
                              <span style={{ color: 'var(--text-primary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                                {order.userName || 'Sin nombre'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '0.875rem' : '1rem'
                            }}>
                              {formatCurrency(order.amount)}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span 
                              className={statusBadge.className} 
                              style={{ 
                                padding: '0.5rem 0.75rem', 
                                borderRadius: '0.5rem', 
                                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                display: 'inline-block',
                                fontWeight: 600
                              }}
                            >
                              {statusBadge.text}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center', fontSize: isMobile ? '0.75rem' : '0.8125rem', color: 'var(--text-secondary)' }}>
                              <Calendar size={14} />
                              {orderDate}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div 
                              style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="btn btn-secondary"
                                style={{ 
                                  padding: '0.5rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                }}
                                title="Ver detalles"
                              >
                                <Eye size={14} />
                                {!isMobile && 'Ver'}
                              </button>
                              {nextStatus && (
                                <button
                                  onClick={() => {
                                    const statusLabels: Record<OrderStatus, string> = {
                                      pending_payment: 'Confirmar Pago',
                                      payment_confirmed: 'Iniciar Procesamiento',
                                      processing: 'Marcar como En Tránsito',
                                      in_transit: 'Marcar como Entregado',
                                      delivered: '',
                                      cancelled: '',
                                      payment_expired: '',
                                      expired: '',
                                      preparing: 'Marcar como Enviado',
                                      shipped: 'Marcar como Entregado'
                                    };
                                    
                                    const confirmMessage = `¿${statusLabels[nextStatus] || 'Actualizar estado'} del pedido #${order.id.slice(-8)}?\n\nEstado actual: ${statusBadge.text}\nNuevo estado: ${getStatusBadge(nextStatus).text}`;
                                    
                                    if (window.confirm(confirmMessage)) {
                                      updateOrderStatus(order.id, nextStatus);
                                      logOrderAction('Estado actualizado', order.id, user?.id, user?.username, { 
                                        oldStatus: order.status, 
                                        newStatus: nextStatus,
                                        actionType: 'manual'
                                      });
                                    }
                                  }}
                                  className="btn btn-primary"
                                  style={{ 
                                    padding: '0.5rem 0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={`Avanzar a: ${getStatusBadge(nextStatus).text}`}
                                >
                                  <ArrowRight size={14} />
                                  {!isMobile && 'Siguiente'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resumen de totales */}
          {filteredOrders.length > 0 && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Total de pedidos mostrados: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
                  {filteredOrders.length}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Valor total: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', marginLeft: '0.5rem', fontSize: '1.125rem' }}>
                  {formatCurrency(filteredOrders.reduce((sum, o: Order) => sum + o.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bots Tab - Versión Mejorada y Profesional */}
      {activeTab === 'bots' && (
        <div>
          {/* Header con título y acciones rápidas */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)', 
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Gestión de Bots
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Administrá y controlá los bots de subastas automáticos
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const activeBots = bots.filter((b: any) => b.isActive);
                  if (activeBots.length === 0) {
                    alert('⚠️ No hay bots activos para desactivar');
                    return;
                  }
                  if (window.confirm(`¿Desactivar todos los ${activeBots.length} bots activos?`)) {
                    activeBots.forEach((bot: any) => {
                      updateBot(bot.id, { isActive: false });
                    });
                    logAdminAction(`Desactivados todos los bots (${activeBots.length})`, user?.id, user?.username);
                  }
                }}
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <XCircle size={18} />
                {!isMobile && 'Desactivar Todos'}
              </button>
              <button
                onClick={() => {
                  setBotForm({
                    name: '',
                    balance: 10000,
                    intervalMin: 5,
                    intervalMax: 15,
                    maxBidAmount: 5000,
                    targetAuctions: []
                  });
                  setShowBotForm(true);
                }}
                className="btn btn-primary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Plus size={18} />
                {!isMobile && 'Nuevo Bot'}
              </button>
            </div>
          </div>

          {/* Estadísticas de Bots */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Bot size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Activos</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {bots.filter((b: any) => b.isActive).length}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                de {bots.length} total
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <DollarSign size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Balance Total</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(bots.reduce((sum: number, b: any) => sum + b.balance, 0))}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                Promedio: {formatCurrency(bots.length > 0 ? bots.reduce((sum: number, b: any) => sum + b.balance, 0) / bots.length : 0)}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ofertas Máx</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(bots.reduce((sum: number, b: any) => sum + b.maxBidAmount, 0))}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                Capacidad total
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Activity size={24} />
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>En Subastas</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {auctions.filter((a: any) => a.status === 'active').length}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                Subastas activas
              </div>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: isMobile ? '1rem' : '1.5rem', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={20} style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="text"
                  placeholder="Buscar bot por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '16px' : '1rem',
                  cursor: 'pointer',
                  minWidth: isMobile ? '100%' : '200px'
                }}
              >
                <option value="all">🤖 Todos los bots</option>
                <option value="active">✅ Activos</option>
                <option value="inactive">⏸️ Inactivos</option>
              </select>
            </div>
          </div>

          {/* Formulario de Bot - Colapsable */}
          {showBotForm && (
            <div style={{
              background: 'var(--bg-secondary)',
              padding: isMobile ? '1.5rem' : '2rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Crear Nuevo Bot</h3>
                <button
                  onClick={() => {
                    setShowBotForm(false);
                    setBotForm({
                      name: '',
                      balance: 10000,
                      intervalMin: 5,
                      intervalMax: 15,
                      maxBidAmount: 5000,
                      targetAuctions: []
                    });
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem' }}
                  title="Cerrar formulario"
                >
                  <XCircle size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Nombre del Bot *
                    </label>
                    <input
                      type="text"
                      value={botForm.name}
                      onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
                      placeholder="Ej: Bot Agresivo, Bot Conservador"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Balance Inicial *
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={botForm.balance}
                      onChange={(e) => setBotForm({ ...botForm, balance: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '1rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Oferta Máxima *
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={botForm.maxBidAmount}
                      onChange={(e) => setBotForm({ ...botForm, maxBidAmount: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '1rem'
                      }}
                    />
                  </div>
                  <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        Intervalo Mín (seg) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={botForm.intervalMin}
                        onChange={(e) => setBotForm({ ...botForm, intervalMin: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: isMobile ? '16px' : '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        Intervalo Máx (seg) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={botForm.intervalMax}
                        onChange={(e) => setBotForm({ ...botForm, intervalMax: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: isMobile ? '16px' : '1rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginTop: '0.5rem',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <button
                    onClick={() => {
                      if (!botForm.name.trim()) {
                        alert('⚠️ Por favor ingresa un nombre para el bot');
                        return;
                      }
                      if (botForm.balance < 100) {
                        alert('⚠️ El balance debe ser al menos $100');
                        return;
                      }
                      if (botForm.maxBidAmount < 100) {
                        alert('⚠️ La oferta máxima debe ser al menos $100');
                        return;
                      }
                      if (botForm.intervalMin >= botForm.intervalMax) {
                        alert('⚠️ El intervalo mínimo debe ser menor que el máximo');
                        return;
                      }
                      if (botForm.intervalMin < 1 || botForm.intervalMax > 300) {
                        alert('⚠️ Los intervalos deben estar entre 1 y 300 segundos');
                        return;
                      }
                      handleAddBot();
                      setShowBotForm(false);
                    }}
                    className="btn btn-primary"
                    style={{ 
                      flex: isMobile ? 'none' : 1,
                      width: isMobile ? '100%' : 'auto',
                      padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                    }}
                  >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    Crear Bot
                  </button>
                  <button
                    onClick={() => {
                      setShowBotForm(false);
                      setBotForm({
                        name: '',
                        balance: 10000,
                        intervalMin: 5,
                        intervalMax: 15,
                        maxBidAmount: 5000,
                        targetAuctions: []
                      });
                    }}
                    className="btn btn-secondary"
                    style={{ 
                      width: isMobile ? '100%' : 'auto',
                      padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Bots Profesional */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            overflow: isMobile ? 'auto' : 'hidden'
          }}>
            {(() => {
              const filteredBots = bots.filter((bot: any) => {
                const matchesSearch = !searchTerm || bot.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesFilter = filterStatus === 'all' || 
                  (filterStatus === 'active' && bot.isActive) ||
                  (filterStatus === 'inactive' && !bot.isActive);
                return matchesSearch && matchesFilter;
              });

              // Contar ofertas de cada bot
              const getBotBidCount = (botId: string) => {
                return auctions.reduce((count: number, auction: any) => {
                  if (auction.bids) {
                    return count + auction.bids.filter((bid: any) => bid.userId === botId && bid.isBot).length;
                  }
                  return count;
                }, 0);
              };

              return filteredBots.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: 'var(--text-secondary)'
                }}>
                  <Bot size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No se encontraron bots</h3>
                  <p>Crea tu primer bot o ajusta los filtros de búsqueda</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ 
                        background: 'var(--bg-primary)', 
                        borderBottom: '2px solid var(--border)'
                      }}>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'left', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Nombre</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Balance</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Oferta Máx</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Intervalo</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Estado</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Ofertas</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBots.map((bot: any) => {
                        const bidCount = getBotBidCount(bot.id);
                        return (
                          <tr 
                            key={bot.id}
                            style={{ 
                              borderBottom: '1px solid var(--border)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Bot size={20} style={{ color: bot.isActive ? 'var(--success)' : 'var(--text-secondary)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                                  {bot.name}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <span style={{ 
                                fontWeight: 700, 
                                color: 'var(--text-primary)',
                                fontSize: isMobile ? '0.875rem' : '1rem'
                              }}>
                                {formatCurrency(bot.balance)}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <span style={{ 
                                color: 'var(--text-secondary)',
                                fontSize: isMobile ? '0.875rem' : '0.9375rem'
                              }}>
                                {formatCurrency(bot.maxBidAmount)}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{ 
                                color: 'var(--text-secondary)',
                                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                fontFamily: 'monospace'
                              }}>
                                {bot.intervalMin}s-{bot.intervalMax}s
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.5rem',
                                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                fontWeight: 600,
                                display: 'inline-block',
                                background: bot.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                color: bot.isActive ? 'var(--success)' : 'var(--text-secondary)'
                              }}>
                                {bot.isActive ? '✅ Activo' : '⏸️ Inactivo'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ 
                                  color: 'var(--text-primary)',
                                  fontWeight: 600,
                                  fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                }}>
                                  {bidCount}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div 
                                style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}
                              >
                                <button
                                  onClick={() => {
                                    const newBalance = prompt(`Recargar balance para "${bot.name}"\n\nBalance actual: ${formatCurrency(bot.balance)}\n\nIngresá el nuevo balance:`, bot.balance.toString());
                                    if (newBalance && !isNaN(Number(newBalance)) && Number(newBalance) >= 0) {
                                      updateBot(bot.id, { balance: Number(newBalance) });
                                      logAdminAction(`Balance recargado: ${bot.name} - ${formatCurrency(bot.balance)} → ${formatCurrency(Number(newBalance))}`, user?.id, user?.username);
                                    }
                                  }}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title="Recargar balance"
                                >
                                  <DollarSign size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`¿${bot.isActive ? 'Desactivar' : 'Activar'} el bot "${bot.name}"?`)) {
                                      updateBot(bot.id, { isActive: !bot.isActive });
                                      logAdminAction(`Bot ${bot.isActive ? 'desactivado' : 'activado'}: ${bot.name}`, user?.id, user?.username);
                                    }
                                  }}
                                  className={bot.isActive ? "btn btn-secondary" : "btn btn-primary"}
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title={bot.isActive ? 'Desactivar' : 'Activar'}
                                >
                                  {bot.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                </button>
                                <button
                                  onClick={() => {
                                    const newMaxBid = prompt(`Cambiar oferta máxima para "${bot.name}"\n\nOferta máxima actual: ${formatCurrency(bot.maxBidAmount)}\n\nIngresá el nuevo monto máximo:`, bot.maxBidAmount.toString());
                                    if (newMaxBid && !isNaN(Number(newMaxBid)) && Number(newMaxBid) >= 100) {
                                      updateBot(bot.id, { maxBidAmount: Number(newMaxBid) });
                                      logAdminAction(`Oferta máxima actualizada: ${bot.name} - ${formatCurrency(bot.maxBidAmount)} → ${formatCurrency(Number(newMaxBid))}`, user?.id, user?.username);
                                    }
                                  }}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title="Editar oferta máxima"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`¿Eliminar bot "${bot.name}"?\n\nEsta acción no se puede deshacer.`)) {
                                      deleteBot(bot.id);
                                      logAdminAction(`Bot eliminado: ${bot.name}`, user?.id, user?.username);
                                    }
                                  }}
                                  className="btn btn-danger"
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title="Eliminar bot"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Resumen */}
          {bots.length > 0 && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Total de bots: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
                  {bots.length} ({bots.filter((b: any) => b.isActive).length} activos)
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Balance total: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', marginLeft: '0.5rem', fontSize: '1.125rem' }}>
                  {formatCurrency(bots.reduce((sum: number, b: any) => sum + b.balance, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensajería Tab - Mejorado */}
      {activeTab === 'messages' && (
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1rem', 
          height: isMobile ? 'auto' : 'calc(100vh - 300px)', 
          minHeight: isMobile ? 'auto' : '500px' 
        }}>
          {/* Lista de Conversaciones */}
          <div style={{
            width: isMobile ? '100%' : '300px',
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            padding: isMobile ? '0.75rem' : '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto',
            maxHeight: isMobile ? '300px' : 'none'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                Conversaciones {adminUnreadCount > 0 && (
                  <span style={{
                    background: 'var(--error)',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    marginLeft: '0.5rem'
                  }}>
                    {adminUnreadCount}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="btn btn-primary"
                style={{ 
                  padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                {isMobile ? 'Nuevo' : 'Nuevo Mensaje'}
              </button>
            </div>

            {/* Selector de Usuario para Nuevo Mensaje */}
            {showUserSelector && (
              <div style={{
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                marginBottom: '1rem'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}>
                  Seleccionar Usuario:
                </label>
                <select
                  value={selectedUserForMessage || ''}
                  onChange={(e) => setSelectedUserForMessage(e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    marginBottom: '0.5rem'
                  }}
                >
                  <option value="">-- Seleccionar usuario --</option>
                  {realUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.username || u.displayName || u.email?.split('@')[0] || `Usuario ${u.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                {selectedUserForMessage && (
                  <button
                    onClick={() => {
                      setShowUserSelector(false);
                      setSelectedConversation(`admin_${selectedUserForMessage}`);
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
                  >
                    <Send size={16} style={{ marginRight: '0.5rem' }} />
                    Abrir Conversación
                  </button>
                )}
              </div>
            )}

            {conversations.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                No hay conversaciones
              </p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv.id);
                    if (isMobile) {
                      // En móvil, mostrar mensajes debajo
                      setShowUserSelector(false);
                    }
                  }}
                  style={{
                    padding: isMobile ? '0.75rem' : '1rem',
                    background: selectedConversation === conv.id ? 'var(--primary)' : 'var(--bg-primary)',
                    color: selectedConversation === conv.id ? 'white' : 'var(--text-primary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: `1px solid ${selectedConversation === conv.id ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: isMobile ? '0.875rem' : '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.username}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '0.75rem' : '0.875rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.lastMessage?.content?.substring(0, isMobile ? 20 : 30) || 'Sin mensajes'}...
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        background: selectedConversation === conv.id ? 'white' : 'var(--error)',
                        color: selectedConversation === conv.id ? 'var(--primary)' : 'white',
                        borderRadius: '50%',
                        width: isMobile ? '20px' : '24px',
                        height: isMobile ? '20px' : '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel de Mensajes - Responsive */}
          <div style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: isMobile ? '400px' : 'auto'
          }}>
            {selectedConversation || selectedUserForMessage ? (
              <>
                <div style={{
                  padding: isMobile ? '0.75rem' : '1rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                    {selectedConversation 
                      ? conversations.find(c => c.id === selectedConversation)?.username || 'Usuario'
                      : realUsers.find((u: any) => u.id === selectedUserForMessage)?.username || 'Usuario'
                    }
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedConversation && (
                      <button
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta conversación completa?')) {
                            deleteConversation(selectedConversation);
                            setSelectedConversation(null);
                            // El listener en tiempo real actualizará automáticamente las conversaciones
                          }
                        }}
                        className="btn btn-danger"
                        style={{ 
                          padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
                          fontSize: isMobile ? '0.875rem' : '0.9375rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Eliminar conversación"
                      >
                        <Trash2 size={16} />
                        {!isMobile && 'Eliminar'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  padding: isMobile ? '0.75rem' : '1rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minHeight: '200px'
                }}>
                  {conversationMessages.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                      No hay mensajes en esta conversación
                    </p>
                  ) : (
                    conversationMessages.map(msg => {
                      const isAdmin = msg.fromUserId === 'admin';
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                            maxWidth: isMobile ? '85%' : '70%',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            padding: isMobile ? '0.625rem 0.875rem' : '0.75rem 1rem',
                            background: isAdmin ? 'var(--primary)' : 'var(--bg-primary)',
                            color: isAdmin ? 'white' : 'var(--text-primary)',
                            borderRadius: '1rem',
                            border: `1px solid ${isAdmin ? 'var(--primary)' : 'var(--border)'}`,
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: isMobile ? '0.8125rem' : '0.875rem', fontWeight: 600 }}>
                                  {isAdmin ? 'Administrador' : msg.fromUsername}
                                </p>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: isMobile ? '0.875rem' : '0.9375rem', wordBreak: 'break-word' }}>
                                  {msg.content}
                                </p>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: isMobile ? '0.7rem' : '0.75rem', opacity: 0.7 }}>
                                  {formatTimeAgo(msg.createdAt)}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  if (window.confirm('¿Eliminar este mensaje?')) {
                                    deleteMessage(msg.conversationId, msg.id);
                                    // Los listeners en tiempo real actualizarán automáticamente los mensajes y conversaciones
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isAdmin ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '0.25rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: 0.6,
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                title="Eliminar mensaje"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{
                  padding: isMobile ? '0.75rem' : '1rem',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: isMobile ? 'wrap' : 'nowrap'
                }}>
                  <input
                    type="text"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Escribí un mensaje..."
                    style={{
                      flex: 1,
                      padding: isMobile ? '0.75rem' : '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem', // 16px para evitar zoom en iOS
                      minWidth: 0
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="btn btn-primary"
                    disabled={!newMessageContent.trim() || (!selectedConversation && !selectedUserForMessage)}
                    style={{ 
                      padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                      fontSize: isMobile ? '0.875rem' : '0.9375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Send size={isMobile ? 18 : 20} />
                    {!isMobile && 'Enviar'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <div>
                  <Mail size={isMobile ? 48 : 64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: isMobile ? '0.875rem' : '1rem', margin: 0 }}>
                    {isMobile ? 'Tocá una conversación' : 'Seleccioná una conversación'} para ver los mensajes
                  </p>
                  {!showUserSelector && (
                    <button
                      onClick={() => setShowUserSelector(true)}
                      className="btn btn-primary"
                      style={{ 
                        marginTop: '1rem',
                        padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}
                    >
                      <Plus size={16} style={{ marginRight: '0.5rem' }} />
                      Nuevo Mensaje
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor de Home Tab */}
      {activeTab === 'home-config' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Editor de Página de Inicio
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Personalizá la sección principal, banners y promociones de tu sitio
              </p>
            </div>
            <button
              onClick={handleSaveHomeConfig}
              className="btn btn-primary"
              style={{ 
                padding: isMobile ? '0.75rem 1.25rem' : '0.875rem 1.5rem',
                fontSize: isMobile ? '0.875rem' : '0.9375rem'
              }}
            >
              <Save size={18} style={{ marginRight: '0.5rem' }} />
              Guardar Todo
            </button>
          </div>

          {/* Sección Hero */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ImageIcon size={24} />
              Sección Principal (Hero)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Título Principal *
                </label>
                <input
                  type="text"
                  value={homeConfig.heroTitle}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroTitle: e.target.value })}
                  placeholder="Ej: Bienvenido a Subasta Argenta"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Subtítulo *
                </label>
                <textarea
                  value={homeConfig.heroSubtitle}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroSubtitle: e.target.value })}
                  rows={4}
                  placeholder="Descripción breve de tu plataforma..."
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Imagen Principal
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(214, 90, 0, 0.05)';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                  onDrop={(e) => handleImageDrop(e, (url) => setHomeConfig({ ...homeConfig, heroImageUrl: url }))}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    background: 'var(--bg-primary)',
                    transition: 'all 0.2s',
                    marginBottom: '0.75rem'
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileSelect(e, (url) => setHomeConfig({ ...homeConfig, heroImageUrl: url }))}
                    style={{ display: 'none' }}
                    id="hero-image-input"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      📸 Arrastrá una imagen aquí o hacé clic para seleccionar
                    </div>
                    <label
                      htmlFor="hero-image-input"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.625rem 1.25rem',
                        fontSize: isMobile ? '0.875rem' : '0.9375rem',
                        cursor: 'pointer',
                        display: 'inline-block'
                      }}
                    >
                      Seleccionar Imagen
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      También podés pegar una URL abajo
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={homeConfig.heroImageUrl}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroImageUrl: e.target.value })}
                  placeholder="O ingresá una URL: https://ejemplo.com/imagen.jpg"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem',
                    marginBottom: '0.75rem'
                  }}
                />
                {homeConfig.heroImageUrl && (
                  <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img 
                      src={homeConfig.heroImageUrl} 
                      alt="Preview" 
                      style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sección Banners */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <ImageIcon size={24} />
                Banners ({homeConfig.banners.length})
              </h3>
              <button
                onClick={handleAddBanner}
                className="btn btn-primary"
                style={{ 
                  padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Plus size={18} style={{ marginRight: '0.5rem' }} />
                Agregar Banner
              </button>
            </div>
            
            {homeConfig.banners.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                border: '1px dashed var(--border)'
              }}>
                <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No hay banners creados. Agregá uno para comenzar.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {homeConfig.banners.map((banner, index) => (
                  <div 
                    key={banner.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={banner.title}
                          onChange={(e) => handleUpdateBanner(banner.id, { title: e.target.value })}
                          placeholder="Título del banner"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '1rem',
                            marginBottom: '0.75rem',
                            fontWeight: 600
                          }}
                        />
                        <textarea
                          value={banner.description || ''}
                          onChange={(e) => handleUpdateBanner(banner.id, { description: e.target.value })}
                          placeholder="Descripción (opcional)"
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '0.9375rem',
                            marginBottom: '0.75rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                            Imagen del Banner
                          </label>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.background = 'rgba(214, 90, 0, 0.05)';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.background = 'var(--bg-primary)';
                            }}
                            onDrop={(e) => handleImageDrop(e, (url) => handleUpdateBanner(banner.id, { imageUrl: url }))}
                            style={{
                              border: '2px dashed var(--border)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              background: 'var(--bg-primary)',
                              transition: 'all 0.2s',
                              marginBottom: '0.5rem'
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileSelect(e, (url) => handleUpdateBanner(banner.id, { imageUrl: url }))}
                              style={{ display: 'none' }}
                              id={`banner-image-input-${banner.id}`}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                📸 Arrastrá imagen o seleccioná
                              </div>
                              <label
                                htmlFor={`banner-image-input-${banner.id}`}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                                  cursor: 'pointer',
                                  display: 'inline-block'
                                }}
                              >
                                Seleccionar
                              </label>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={banner.imageUrl}
                            onChange={(e) => handleUpdateBanner(banner.id, { imageUrl: e.target.value })}
                            placeholder="O ingresá una URL de imagen"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <input
                            type="text"
                            value={banner.link || ''}
                            onChange={(e) => handleUpdateBanner(banner.id, { link: e.target.value })}
                            placeholder="Link (opcional)"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                          <input
                            type="text"
                            value={banner.linkText || 'Ver más'}
                            onChange={(e) => handleUpdateBanner(banner.id, { linkText: e.target.value })}
                            placeholder="Texto del botón"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <input
                              type="checkbox"
                              checked={banner.active}
                              onChange={(e) => handleUpdateBanner(banner.id, { active: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>Activo</span>
                          </label>
                          <input
                            type="number"
                            value={banner.order}
                            onChange={(e) => handleUpdateBanner(banner.id, { order: Number(e.target.value) })}
                            placeholder="Orden"
                            min="0"
                            style={{
                              width: '100px',
                              padding: '0.5rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Orden de visualización</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="btn btn-danger"
                        style={{ 
                          padding: '0.5rem',
                          alignSelf: 'flex-start'
                        }}
                        title="Eliminar banner"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {banner.imageUrl && (
                      <div style={{ marginTop: '1rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img 
                          src={banner.imageUrl} 
                          alt={banner.title}
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección Promociones */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <TrendingUp size={24} />
                Promociones ({homeConfig.promotions.length})
              </h3>
              <button
                onClick={handleAddPromotion}
                className="btn btn-primary"
                style={{ 
                  padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Plus size={18} style={{ marginRight: '0.5rem' }} />
                Agregar Promoción
              </button>
            </div>
            
            {homeConfig.promotions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                border: '1px dashed var(--border)'
              }}>
                <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No hay promociones creadas. Agregá una para comenzar.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {homeConfig.promotions.map((promo) => (
                  <div 
                    key={promo.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={promo.title}
                          onChange={(e) => handleUpdatePromotion(promo.id, { title: e.target.value })}
                          placeholder="Título de la promoción"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '1rem',
                            marginBottom: '0.75rem',
                            fontWeight: 600
                          }}
                        />
                        <textarea
                          value={promo.description}
                          onChange={(e) => handleUpdatePromotion(promo.id, { description: e.target.value })}
                          placeholder="Descripción de la promoción"
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '0.9375rem',
                            marginBottom: '0.75rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                            Imagen de la Promoción
                          </label>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.background = 'rgba(214, 90, 0, 0.05)';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.background = 'var(--bg-primary)';
                            }}
                            onDrop={(e) => handleImageDrop(e, (url) => handleUpdatePromotion(promo.id, { imageUrl: url }))}
                            style={{
                              border: '2px dashed var(--border)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              background: 'var(--bg-primary)',
                              transition: 'all 0.2s',
                              marginBottom: '0.5rem'
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileSelect(e, (url) => handleUpdatePromotion(promo.id, { imageUrl: url }))}
                              style={{ display: 'none' }}
                              id={`promo-image-input-${promo.id}`}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                📸 Arrastrá imagen o seleccioná
                              </div>
                              <label
                                htmlFor={`promo-image-input-${promo.id}`}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                                  cursor: 'pointer',
                                  display: 'inline-block'
                                }}
                              >
                                Seleccionar
                              </label>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={promo.imageUrl}
                            onChange={(e) => handleUpdatePromotion(promo.id, { imageUrl: e.target.value })}
                            placeholder="O ingresá una URL de imagen"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <input
                            type="text"
                            value={promo.link || ''}
                            onChange={(e) => handleUpdatePromotion(promo.id, { link: e.target.value })}
                            placeholder="Link (opcional)"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              Fecha de inicio
                            </label>
                            <input
                              type="date"
                              value={promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleUpdatePromotion(promo.id, { startDate: e.target.value ? new Date(e.target.value) : undefined })}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: isMobile ? '16px' : '0.9375rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              Fecha de fin
                            </label>
                            <input
                              type="date"
                              value={promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleUpdatePromotion(promo.id, { endDate: e.target.value ? new Date(e.target.value) : undefined })}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: isMobile ? '16px' : '0.9375rem'
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <input
                              type="checkbox"
                              checked={promo.active}
                              onChange={(e) => handleUpdatePromotion(promo.id, { active: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>Activa</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePromotion(promo.id)}
                        className="btn btn-danger"
                        style={{ 
                          padding: '0.5rem',
                          alignSelf: 'flex-start'
                        }}
                        title="Eliminar promoción"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {promo.imageUrl && (
                      <div style={{ marginTop: '1rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img 
                          src={promo.imageUrl} 
                          alt={promo.title}
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuración Tab */}
      {activeTab === 'settings' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Configuración del Sistema
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Gestioná templates de mensajes, estadísticas y configuraciones avanzadas
              </p>
            </div>
          </div>

          {/* Templates de Mensajes Automáticos */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Mail size={24} />
              Templates de Mensajes Automáticos
            </h3>
            <p style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
              Personalizá los mensajes que se envían automáticamente a los usuarios. Usá variables como {'{username}'}, {'{amount}'}, {'{orderId}'}, etc.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messageTemplates.map((template) => {
                const isSelected = selectedTemplate === template.id;
                const variables = getVariablesForType(template.type);
                
                return (
                  <div 
                    key={template.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                            {template.title}
                          </h4>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: template.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                            color: template.active ? 'var(--success)' : 'var(--text-secondary)'
                          }}>
                            {template.active ? '✅ Activo' : '⏸️ Inactivo'}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                          Tipo: <strong>{template.type.replace('_', ' ')}</strong>
                        </p>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
                            Variables disponibles:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {variables.map((varName, idx) => (
                              <code 
                                key={idx}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'var(--bg-secondary)',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.8125rem',
                                  color: 'var(--primary)',
                                  fontFamily: 'monospace'
                                }}
                                title="Clic para copiar"
                                onClick={() => {
                                  navigator.clipboard.writeText(varName);
                                  alert(`✅ Variable ${varName} copiada`);
                                }}
                              >
                                {varName}
                              </code>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTemplate(null);
                              setTemplatePreview('');
                            } else {
                              setSelectedTemplate(template.id);
                              handlePreviewTemplate(template);
                            }
                          }}
                          className={isSelected ? "btn btn-secondary" : "btn btn-primary"}
                          style={{ 
                            padding: '0.625rem 1rem',
                            fontSize: isMobile ? '0.8125rem' : '0.875rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isSelected ? 'Cerrar' : 'Editar'}
                        </button>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: 'pointer',
                          padding: '0.625rem 1rem',
                          background: template.active ? 'var(--success)' : 'var(--bg-secondary)',
                          color: template.active ? 'white' : 'var(--text-primary)',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          fontSize: isMobile ? '0.8125rem' : '0.875rem'
                        }}>
                          <input
                            type="checkbox"
                            checked={template.active}
                            onChange={(e) => {
                              handleSaveTemplate(template.id, { active: e.target.checked });
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span>{template.active ? 'Activo' : 'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)'
                      }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            Título del Template
                          </label>
                          <input
                            type="text"
                            value={template.title}
                            onChange={(e) => {
                              const updated = { ...template, title: e.target.value };
                              setMessageTemplates(messageTemplates.map(t => t.id === template.id ? updated : t));
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '1rem'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            Contenido del Mensaje
                          </label>
                          <textarea
                            value={template.template}
                            onChange={(e) => {
                              const updated = { ...template, template: e.target.value };
                              setMessageTemplates(messageTemplates.map(t => t.id === template.id ? updated : t));
                              handlePreviewTemplate(updated);
                            }}
                            rows={8}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem',
                              fontFamily: 'monospace',
                              resize: 'vertical',
                              lineHeight: '1.6'
                            }}
                            placeholder="Ejemplo: ¡Felicitaciones {username}! Has ganado la subasta..."
                          />
                          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            💡 Tip: Usá las variables disponibles arriba para personalizar el mensaje
                          </p>
                        </div>
                        
                        {templatePreview && (
                          <div style={{
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)'
                          }}>
                            <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
                              👁️ Vista Previa:
                            </p>
                            <div style={{
                              padding: '1rem',
                              background: 'var(--bg-primary)',
                              borderRadius: '0.375rem',
                              whiteSpace: 'pre-wrap',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '0.875rem' : '0.9375rem',
                              lineHeight: '1.6',
                              border: '1px solid var(--border)'
                            }}>
                              {templatePreview}
                            </div>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              handleSaveTemplate(template.id, {
                                title: template.title,
                                template: template.template
                              });
                              setSelectedTemplate(null);
                              setTemplatePreview('');
                            }}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.75rem 1.5rem',
                              fontSize: isMobile ? '0.875rem' : '0.9375rem'
                            }}
                          >
                            <Save size={18} style={{ marginRight: '0.5rem' }} />
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTemplate(null);
                              setTemplatePreview('');
                              setMessageTemplates(loadMessageTemplates());
                            }}
                            className="btn btn-secondary"
                            style={{ 
                              padding: '0.75rem 1.5rem',
                              fontSize: isMobile ? '0.875rem' : '0.9375rem'
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estadísticas y Configuración Avanzada */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <BarChart3 size={24} />
              Estadísticas del Sistema
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '0.75rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Gavel size={20} />
                  <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ingresos Subastas</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                  {formatCurrency(enhancedStats.auctionRevenue)}
                </div>
              </div>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '0.75rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Store size={20} />
                  <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ingresos Tienda</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                  {formatCurrency(enhancedStats.storeRevenue)}
                </div>
              </div>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '0.75rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <TrendingUp size={20} />
                  <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ganancia Neta</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                  {formatCurrency(enhancedStats.netProfit)}
                </div>
              </div>
            </div>
          </div>  

          {/* Limpieza y Mantenimiento */}
          <div style={{
            display: isMobile ? 'block' : 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>
                🧹 Limpieza de Datos
              </h3>
              <p style={{ margin: 0, marginBottom: '1rem', fontSize: '0.875rem', opacity: 0.9 }}>
                Elimina datos antiguos según las reglas:
                <br />• Notificaciones leídas: 2 días
                <br />• Notificaciones no leídas: 7 días
                <br />• Subastas finalizadas: 3 días
                <br />• Pedidos completados: 7 días
              </p>
              <button
                onClick={handleManualCleanup}
                className="btn"
                style={{
                  background: 'white',
                  color: '#f59e0b',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <RefreshCw size={18} style={{ marginRight: '0.5rem' }} />
                Ejecutar Limpieza
              </button>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>
                ⚠️ Zona Peligrosa
              </h3>
              <p style={{ margin: 0, marginBottom: '1rem', fontSize: '0.875rem', opacity: 0.9 }}>
                El reseteo eliminará todos los datos excepto usuarios registrados y logs de ventas.
              </p>
              <button
                onClick={handleResetData}
                className="btn"
                style={{
                  background: 'white',
                  color: '#ef4444',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <AlertTriangle size={18} style={{ marginRight: '0.5rem' }} />
                Resetear Sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;





























