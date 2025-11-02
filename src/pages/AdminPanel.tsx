// Firebase Realtime Database imports
import { ref, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Otras importaciones de Lucide, React, etc.
import React, { useState, useEffect } from 'react';
import { 
  Eye, Edit, Trash2, Users, Clock, AlertCircle, Activity, RefreshCw,
  Gavel, Package, Bot, DollarSign, Plus, XCircle,
  TrendingUp, ShoppingCart, Bell, AlertTriangle,
  Search, Filter, ShoppingBag, MapPin, BarChart3,
  MousePointerClick, Image as ImageIcon, Save, Store, Mail, Send
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
  deleteAllConversations
} from '../utils/messages';
import { Message, Conversation } from '../types';
import { useIsMobile } from '../hooks/useMediaQuery';

const AdminPanel = (): React.ReactElement => {
  const { 
    user, auctions, products, bots, orders,
    addBot, updateBot, deleteBot, setProducts, setAuctions, setBots, updateOrderStatus 
  } = useStore();
  
  // Estados principales
  const [activeTab, setActiveTab] = useState('dashboard');
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-render sin recargar
  
  // Estado para configuración del inicio
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => {
    try {
      const saved = localStorage.getItem('homeConfig');
      return saved ? JSON.parse(saved) : defaultHomeConfig;
    } catch {
      return defaultHomeConfig;
    }
  });
  
  // Estados para mensajería
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const isMobile = useIsMobile();
  
  // Cargar conversaciones y contador
  useEffect(() => {
    const loadConversations = () => {
      setConversations(getAllConversations());
      setAdminUnreadCount(getAdminUnreadCount());
    };
    
    loadConversations();
    const interval = setInterval(loadConversations, 5000); // Actualizar cada 5 segundos
    return () => clearInterval(interval);
  }, [activeTab]);
  
  // Cargar mensajes de conversación seleccionada
  useEffect(() => {
    if (selectedConversation) {
      setConversationMessages(getMessages(selectedConversation));
      // Marcar como leídos cuando se abre la conversación
      markMessagesAsRead(selectedConversation, 'admin');
      setAdminUnreadCount(getAdminUnreadCount());
    }
  }, [selectedConversation]);
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

  // Estados para inventario
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // Estados para pedidos
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
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

  // Protección de acceso
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
    if (!botForm.name) {
      alert('⚠️ Por favor ingresa un nombre para el bot');
      return;
    }
    addBot({
      id: Date.now().toString(),
      ...botForm,
      isActive: true
    });
    setBotForm({
      name: '',
      balance: 10000,
      intervalMin: 5,
      intervalMax: 15,
      maxBidAmount: 5000,
      targetAuctions: []
    });
    alert('✅ Bot creado correctamente');
  };

  // Función de Reset mejorada - preserva usuarios y logs de ventas
  const handleResetData = () => {
    if (!window.confirm('⚠️ ADVERTENCIA: Esto reiniciará todos los datos EXCEPTO usuarios registrados y logs de ventas.\n\n¿Estás seguro de continuar?')) {
      return;
    }
    
    if (!window.confirm('⚠️ ÚLTIMA CONFIRMACIÓN:\n\nSe resetearán:\n- Subastas\n- Productos\n- Bots\n- Notificaciones\n\nSe PRESERVARÁN:\n- ✅ Usuarios registrados\n- ✅ Logs de acciones\n- ✅ Historial de pedidos/ventas\n\n¿Proceder?')) {
      return;
    }

    try {
      // Guardar datos a preservar
      const usersBackup = localStorage.getItem('users') || '[]';
      const actionLogsBackup = localStorage.getItem('action_logs') || '[]';
      const ordersBackup = localStorage.getItem('orders') || '[]';
      
      // Limpiar todo
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
      logAdminAction('Sistema reseteado (preservando usuarios y logs)', user?.id, user?.username);
      
      alert('✅ Datos reiniciados correctamente.\n\n✅ Usuarios registrados preservados\n✅ Logs de acciones preservados\n✅ Historial de pedidos preservado');
      
      // Recargar para aplicar cambios
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error en reset:', error);
      alert('❌ Error al resetear datos');
    }
  };

  // Filtrar pedidos
  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.userId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
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

    // Más buscado (simulado por título más común en subastas y productos)
    const allTitles = [
      ...auctions.map((a: { title: string }) => a.title),
      ...products.map((p: { name: string }) => p.name)
    ];
    const titleCounts: Record<string, number> = {};
    allTitles.forEach(title => {
      const words = title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          titleCounts[word] = (titleCounts[word] || 0) + 1;
        }
      });
    });
    const mostSearched = Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    // Más cliqueado (simulado por productos/subastas con más vistas)
    const mostClicked = [
      ...products
        .map((p: { id: string; name: string; views?: number }) => ({
          id: p.id,
          name: p.name,
          type: 'product' as const,
          clicks: p.views || 0
        })),
      ...auctions
        .map((a: { id: string; title: string; bids?: any[] }) => ({
          id: a.id,
          name: a.title,
          type: 'auction' as const,
          clicks: a.bids?.length || 0
        }))
    ]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    return {
      auctionRevenue,
      storeRevenue,
      totalRevenue: auctionRevenue + storeRevenue,
      mostSearched,
      mostClicked
    };
  };

  const enhancedStats = getEnhancedStats();
  const orderStats = getTotalStats();

  // Función para enviar mensaje
  const handleSendMessage = () => {
    if (!selectedConversation || !newMessageContent.trim()) return;
    
    const userId = selectedConversation.split('_')[1];
    createMessage('admin', 'Administrador', userId, newMessageContent.trim());
    setNewMessageContent('');
    setConversationMessages(getMessages(selectedConversation));
    setAdminUnreadCount(getAdminUnreadCount());
  };

  // Función para guardar configuración de home
  const handleSaveHomeConfig = () => {
    const updatedConfig = { ...homeConfig, updatedAt: new Date() };
    localStorage.setItem('homeConfig', JSON.stringify(updatedConfig));
    setHomeConfig(updatedConfig);
    alert('✅ Configuración del inicio guardada correctamente');
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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Panel de Administración
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Gestioná subastas, productos, usuarios y más
        </p>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid var(--border)'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.5rem',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              <Icon size={18} />
              {tab.label}
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

          {/* Actividad Reciente */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)'
          }}>
            <h2 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              Actividad Reciente
            </h2>
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
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEditAuction(auction)}
                    className="btn btn-secondary"
                    style={{ flex: 1, minWidth: '100px' }}
                  >
                    <Edit size={16} style={{ marginRight: '0.25rem' }} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteAuction(auction.id)}
                    className="btn btn-danger"
                    style={{ flex: 1, minWidth: '100px' }}
                  >
                    <Trash2 size={16} style={{ marginRight: '0.25rem' }} />
                    Eliminar
                  </button>
                  {auction.status === 'ended' && (
                    <button
                      onClick={() => handleRepublishAuction(auction)}
                      className="btn btn-primary"
                      style={{ flex: 1, minWidth: '100px' }}
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
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={editingAuction ? handleSaveAuction : handleCreateAuction}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Save size={20} style={{ marginRight: '0.5rem' }} />
                  {editingAuction ? 'Guardar Cambios' : 'Crear Subasta'}
                </button>
                <button
                  onClick={() => setActiveTab('auctions')}
                  className="btn btn-secondary"
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
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="btn btn-secondary"
                      style={{ flex: 1, minWidth: '100px' }}
                    >
                      <Edit size={16} style={{ marginRight: '0.25rem' }} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn btn-danger"
                      style={{ flex: 1, minWidth: '100px' }}
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
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={handleSaveProduct}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Save size={20} style={{ marginRight: '0.5rem' }} />
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className="btn btn-secondary"
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
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(userItem);
                      }}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
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

      {/* Pedidos Tab */}
      {activeTab === 'orders' && (
        <div>
          <h2 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Gestión de Pedidos</h2>
          
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar por ID o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
              style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="pending_payment">Pago Pendiente</option>
              <option value="payment_confirmed">Pago Confirmado</option>
              <option value="processing">Procesando</option>
              <option value="in_transit">En Tránsito</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Lista de Pedidos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredOrders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                border: '1px solid var(--border)'
              }}>
                <ShoppingCart size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>No se encontraron pedidos</p>
              </div>
            ) : (
              filteredOrders.map((order: Order) => {
                const statusBadge = getStatusBadge(order.status);
                const deliveryBadge = getDeliveryMethodBadge(order.deliveryMethod || 'shipping');
                return (
                  <div key={order.id} style={{
                    background: 'var(--bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                          Pedido #{order.id.slice(-8)}
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          Cliente: {order.userName}
                        </p>
                        <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          Monto: {formatCurrency(order.amount)}
                        </p>
                        <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {deliveryBadge.icon} {deliveryBadge.text}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <span className={statusBadge.className} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                          {statusBadge.text}
                        </span>
                        <select
                          value={order.status}
                          onChange={(e) => {
                            updateOrderStatus(order.id, e.target.value as OrderStatus);
                            logOrderAction('Estado actualizado', order.id, user?.id, user?.username, { 
                              oldStatus: order.status, 
                              newStatus: e.target.value 
                            });
                          }}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem'
                          }}
                        >
                          <option value="pending_payment">Pago Pendiente</option>
                          <option value="payment_confirmed">Pago Confirmado</option>
                          <option value="processing">Procesando</option>
                          <option value="in_transit">En Tránsito</option>
                          <option value="delivered">Entregado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        <Eye size={16} style={{ marginRight: '0.25rem' }} />
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Bots Tab */}
      {activeTab === 'bots' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Gestión de Bots</h2>
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
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} />
              Nuevo Bot
            </button>
          </div>

          {/* Formulario de Bot */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem',
            maxWidth: '600px'
          }}>
            <h3 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Crear Nuevo Bot</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Nombre del Bot
                </label>
                <input
                  type="text"
                  value={botForm.name}
                  onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
                  placeholder="Ej: Bot Agresivo"
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Balance Inicial
                  </label>
                  <input
                    type="number"
                    value={botForm.balance}
                    onChange={(e) => setBotForm({ ...botForm, balance: Number(e.target.value) })}
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
                    Oferta Máxima
                  </label>
                  <input
                    type="number"
                    value={botForm.maxBidAmount}
                    onChange={(e) => setBotForm({ ...botForm, maxBidAmount: Number(e.target.value) })}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Intervalo Mín (seg)
                  </label>
                  <input
                    type="number"
                    value={botForm.intervalMin}
                    onChange={(e) => setBotForm({ ...botForm, intervalMin: Number(e.target.value) })}
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
                    Intervalo Máx (seg)
                  </label>
                  <input
                    type="number"
                    value={botForm.intervalMax}
                    onChange={(e) => setBotForm({ ...botForm, intervalMax: Number(e.target.value) })}
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
              <button
                onClick={handleAddBot}
                className="btn btn-primary"
              >
                <Plus size={20} style={{ marginRight: '0.5rem' }} />
                Crear Bot
              </button>
            </div>
          </div>

          {/* Lista de Bots */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {bots.map((bot: any) => (
              <div key={bot.id} style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {bot.name}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Balance: {formatCurrency(bot.balance)}
                  </p>
                  <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Estado: <span style={{
                      color: bot.isActive ? 'var(--success)' : 'var(--text-secondary)',
                      fontWeight: 600
                    }}>
                      {bot.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </p>
                  <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Intervalo: {bot.intervalMin}s - {bot.intervalMax}s
                  </p>
                  <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Oferta Máx: {formatCurrency(bot.maxBidAmount)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => updateBot(bot.id, { isActive: !bot.isActive })}
                    className={bot.isActive ? "btn btn-secondary" : "btn btn-primary"}
                    style={{ flex: 1 }}
                  >
                    {bot.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar bot "${bot.name}"?`)) {
                        deleteBot(bot.id);
                        alert('✅ Bot eliminado');
                      }
                    }}
                    className="btn btn-danger"
                    style={{ flex: 1 }}
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

      {/* Mensajería Tab */}
      {activeTab === 'messages' && (
        <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 300px)', minHeight: '500px' }}>
          {/* Lista de Conversaciones */}
          <div style={{
            width: isMobile ? '100%' : '300px',
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>
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
            {conversations.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                No hay conversaciones
              </p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  style={{
                    padding: '1rem',
                    background: selectedConversation === conv.id ? 'var(--primary)' : 'var(--bg-primary)',
                    color: selectedConversation === conv.id ? 'white' : 'var(--text-primary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: `1px solid ${selectedConversation === conv.id ? 'var(--primary)' : 'var(--border)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        {conv.username}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
                        {conv.lastMessage?.content?.substring(0, 30) || 'Sin mensajes'}...
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        background: selectedConversation === conv.id ? 'white' : 'var(--error)',
                        color: selectedConversation === conv.id ? 'var(--primary)' : 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel de Mensajes */}
          {!isMobile && (
            <div style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {selectedConversation ? (
                <>
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      {conversations.find(c => c.id === selectedConversation)?.username || 'Usuario'}
                    </h3>
                    <button
                      onClick={() => {
                        if (window.confirm('¿Eliminar esta conversación?')) {
                          deleteConversation(selectedConversation);
                          setSelectedConversation(null);
                          setConversations(getAllConversations());
                        }
                      }}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '1rem',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {conversationMessages.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
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
                              maxWidth: '70%'
                            }}
                          >
                            <div style={{
                              padding: '0.75rem 1rem',
                              background: isAdmin ? 'var(--primary)' : 'var(--bg-primary)',
                              color: isAdmin ? 'white' : 'var(--text-primary)',
                              borderRadius: '1rem',
                              border: `1px solid ${isAdmin ? 'var(--primary)' : 'var(--border)'}`
                            }}>
                              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
                                {isAdmin ? 'Administrador' : msg.fromUsername}
                              </p>
                              <p style={{ margin: '0.5rem 0 0 0' }}>
                                {msg.content}
                              </p>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', opacity: 0.7 }}>
                                {formatTimeAgo(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="text"
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                      placeholder="Escribí un mensaje..."
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="btn btn-primary"
                      disabled={!newMessageContent.trim()}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Mail size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Seleccioná una conversación para ver los mensajes</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Editor de Home Tab */}
      {activeTab === 'home-config' && (
        <div>
          <h2 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Editor de Página de Inicio</h2>
          
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            maxWidth: '800px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Título Principal
                </label>
                <input
                  type="text"
                  value={homeConfig.heroTitle}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroTitle: e.target.value })}
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
                  Subtítulo
                </label>
                <textarea
                  value={homeConfig.heroSubtitle}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroSubtitle: e.target.value })}
                  rows={3}
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  URL de Imagen Principal
                </label>
                <input
                  type="text"
                  value={homeConfig.heroImageUrl}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroImageUrl: e.target.value })}
                  placeholder="https://..."
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
              <button
                onClick={handleSaveHomeConfig}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                <Save size={20} style={{ marginRight: '0.5rem' }} />
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuración Tab */}
      {activeTab === 'settings' && (
        <div>
          <h2 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Configuración del Sistema</h2>
          
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            maxWidth: '600px'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Estadísticas Avanzadas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-primary)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Ingresos por Subastas
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: 'var(--primary)' }}>
                    {formatCurrency(enhancedStats.auctionRevenue)}
                  </p>
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-primary)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Ingresos por Tienda
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: 'var(--success)' }}>
                    {formatCurrency(enhancedStats.storeRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--error)',
              borderRadius: '0.5rem',
              border: '1px solid var(--error)'
            }}>
              <h3 style={{ margin: 0, marginBottom: '1rem', color: 'white' }}>
                ⚠️ Zona Peligrosa
              </h3>
              <p style={{ margin: 0, marginBottom: '1rem', color: 'white', fontSize: '0.875rem' }}>
                El reseteo eliminará todos los datos excepto usuarios registrados y logs de ventas.
              </p>
              <button
                onClick={handleResetData}
                className="btn"
                style={{
                  background: 'white',
                  color: 'var(--error)',
                  border: 'none'
                }}
              >
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





























