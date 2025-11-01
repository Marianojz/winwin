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
        ...productForm,
        stickers: productForm.stickers || [],
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
    const updatedAuctions: Auction[] = auctions.map((a: Auction) => 
      a.id === editingAuction.id 
        ? { 
            ...a, 
            title: auctionForm.title.trim(),
            description: auctionForm.description.trim(),
            startingPrice: Number(auctionForm.startingPrice),  // ← CAMBIADO
            currentPrice: Math.max(Number(auctionForm.currentPrice), Number(auctionForm.startingPrice)),
            buyNowPrice: auctionForm.buyNowPrice > 0 ? Number(auctionForm.buyNowPrice) : undefined,
            categoryId: auctionForm.categoryId,
            images: auctionForm.images,
            stickers: auctionForm.stickers || [],
            condition: auctionForm.condition,
            featured: auctionForm.featured,
            endTime: newEndTime,
            isFlash: totalMinutes <= 60
          } as Auction
        : a
    );
    
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

  // Estadísticas mejoradas: ingresos por subastas y tienda, más buscado, más cliqueado
  const getEnhancedStats = () => {
    // Ingresos por subastas (ventas ganadas)
    const auctionRevenue = auctions
      .filter((a: Auction) => a.winnerId !== undefined && a.winnerId !== null)
      .reduce((sum: number, a: Auction) => sum + (a.currentPrice || 0), 0);

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

  // TODO: Agregar el JSX principal del componente aquí
  return (
    <div>
      {/* Componente AdminPanel - JSX pendiente de implementación */}
    </div>
  );
};

export default AdminPanel;





































