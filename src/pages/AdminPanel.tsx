import { useState, useEffect } from 'react';
import { 
  Eye, Edit, Trash2, Users, Award, Clock, AlertCircle, Activity, RefreshCw,
  Gavel, Package, Bot, DollarSign, Plus, XCircle, 
  Search, Filter, ShoppingBag, Timer, 
  AlertTriangle, MapPin, BarChart3
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import UserDetailsModal from '../components/UserDetailsModal';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Product, Auction, Order, OrderStatus } from '../types';
import ImageUploader from '../components/ImageUploader';

const AdminPanel = () => {
  const { 
    user, auctions, products, bots, orders,
    addBot, updateBot, deleteBot, setProducts, setAuctions, updateOrderStatus 
  } = useStore();
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
    if (!form.startPrice || form.startPrice <= 0) {
      errors.push('El precio inicial debe ser mayor a $0');
    }
    if (form.startPrice && form.startPrice < 100) {
      errors.push('El precio inicial mínimo es $100');
    }

    // Validar precio de Compra Ya (si está activado)
    if (form.buyNowPrice && form.buyNowPrice > 0) {
      if (form.buyNowPrice <= form.startPrice) {
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

      // Crear objeto de subasta
      const newAuction = {
        title: auctionForm.title.trim(),
        description: auctionForm.description.trim(),
        images: auctionForm.images,
        startPrice: Number(auctionForm.startPrice),
        currentPrice: Number(auctionForm.startPrice),
        buyNowPrice: auctionForm.buyNowPrice > 0 ? Number(auctionForm.buyNowPrice) : undefined,
        endTime: endTime,
        status: auctionForm.scheduled ? 'scheduled' as any : 'active',
        categoryId: auctionForm.categoryId,
        bids: [],
        featured: auctionForm.featured || false,
        isFlash: totalMinutes <= 60, // Si dura 1 hora o menos, es flash
        condition: auctionForm.condition || 'new',
        id: `auction_${Date.now()}` // ID temporal
      };

      // Actualizar estado local
      setAuctions([...auctions, newAuction]);

      // Mensaje de éxito
      const successMessage = auctionForm.scheduled 
        ? `✅ Subasta programada correctamente para ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()}`
        : '✅ Subasta creada correctamente';
      
      alert(successMessage);

      // Resetear formulario
      setAuctionForm({
        title: '',
        description: '',
        startPrice: 1000,
        currentPrice: 0,
        buyNowPrice: 0,
        categoryId: '1',
        images: [] as string[],
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
  active: true,
  featured: false
});

  // Estados para subastas
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [auctionForm, setAuctionForm] = useState({
    title: '',
    description: '',
    startPrice: 0,
    currentPrice: 0,
    buyNowPrice: 0,
    categoryId: '1',
    images: [] as string[],
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

  // Cargar usuarios reales de Firebase
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
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

  // Estadísticas calculadas
  const totalBids = auctions.reduce((sum, a) => sum + a.bids.length, 0);
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.amount, 0);
  const activeUsers = realUsers.length || 150;
  const totalOrders = orders.length;
  const activeAuctions = auctions.filter(a => a.status === 'active').length;
  const endedAuctions = auctions.filter(a => a.status === 'ended').length;
  const lowStockProducts = products.filter(p => p.stock < 5 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const avgBidsPerAuction = auctions.length > 0 ? (totalBids / auctions.length).toFixed(1) : 0;
  const conversionRate = totalOrders > 0 ? ((totalOrders / activeUsers) * 100).toFixed(1) : 0;

  const pendingPayments = orders.filter(o => o.status === 'pending_payment').length;
  const expiringSoon = orders.filter(o => {
    if (o.status === 'pending_payment' && o.expiresAt) {
      const hoursLeft = (new Date(o.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursLeft < 24 && hoursLeft > 0;
    }
    return false;
  }).length;

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
    active: true,
    featured: false
  });
  setEditingProduct(null);
  setActiveTab('create-product');
};

  const handleSaveProduct = () => {
    if (editingProduct) {
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...productForm }
          : p
      );
      setProducts(updatedProducts);
      alert('✅ Producto actualizado correctamente');
      setEditingProduct(null);
      setActiveTab('products');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (window.confirm(`¿Estás seguro de eliminar "${product?.name}"?\n\nEsta acción no se puede deshacer.`)) {
      const updatedProducts = products.filter(p => p.id !== productId);
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
      startPrice: auction.startPrice,
      currentPrice: auction.currentPrice,
      buyNowPrice: auction.buyNowPrice || 0,
      categoryId: auction.categoryId,
      images: auction.images || [],
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
    if (editingAuction.bids.length > 0 && auctionForm.startPrice !== editingAuction.startPrice) {
      if (!window.confirm('⚠️ ADVERTENCIA: Esta subasta ya tiene ofertas.\n\n¿Estás seguro de cambiar el precio inicial?\n\nEsto puede afectar la validez de las ofertas existentes.')) {
        return;
      }
    }

    // Calcular nueva fecha de finalización basada en duración
    const totalMinutes = (auctionForm.durationDays * 24 * 60) + (auctionForm.durationHours * 60) + auctionForm.durationMinutes;
    const now = new Date();
    const newEndTime = new Date(now.getTime() + totalMinutes * 60000);

    // Actualizar subasta
    const updatedAuctions = auctions.map(a => 
      a.id === editingAuction.id 
        ? { 
            ...a, 
            title: auctionForm.title.trim(),
            description: auctionForm.description.trim(),
            startPrice: Number(auctionForm.startPrice),
            currentPrice: Math.max(Number(auctionForm.currentPrice), Number(auctionForm.startPrice)),
            buyNowPrice: auctionForm.buyNowPrice > 0 ? Number(auctionForm.buyNowPrice) : undefined,
            categoryId: auctionForm.categoryId,
            images: auctionForm.images,
            condition: auctionForm.condition,
            featured: auctionForm.featured,
            endTime: newEndTime,
            isFlash: totalMinutes <= 60
          }
        : a
    );
    
    setAuctions(updatedAuctions);
    alert('✅ Subasta actualizada correctamente');
    setEditingAuction(null);
    setActiveTab('auctions');
  };
  const handleDeleteAuction = (auctionId: string) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (window.confirm(`¿Estás seguro de eliminar "${auction?.title}"?\n\nSe perderán todas las ofertas asociadas.`)) {
      const updatedAuctions = auctions.filter(a => a.id !== auctionId);
      setAuctions(updatedAuctions);
      alert('🗑️ Subasta eliminada correctamente');
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

  // Función de Reset
  const handleResetData = () => {
    if (window.confirm('⚠️ ADVERTENCIA: Esto reiniciará todos los datos a los valores por defecto.\n\n¿Estás seguro de continuar?')) {
      if (window.confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Se perderán todos los datos actuales. ¿Proceder?')) {
        window.location.reload();
        alert('✅ Datos reiniciados correctamente');
      }
    }
  };

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
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
      pending: orders.filter(o => o.status === 'pending_payment').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      revenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.amount, 0)
    };
    return stats;
  };

  const orderStats = getTotalStats();

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header con Título y Botón Reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={36} color="var(--primary)" />
              Panel de Administración
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Gestiona productos, subastas, usuarios y pedidos desde un solo lugar
            </p>
          </div>
          <button 
            onClick={handleResetData}
            style={{ padding: '0.875rem 1.5rem', background: 'var(--error)', color: 'white', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9375rem' }}
          >
            <RefreshCw size={18} />
            Reiniciar Datos
          </button>
        </div>

        {/* Navegación Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'users', label: 'Usuarios', icon: Users },
            { id: 'products', label: 'Productos', icon: Package },
            { id: 'auctions', label: 'Subastas', icon: Gavel },
            { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
            { id: 'inventory', label: 'Inventario', icon: Package },
            { id: 'bots', label: 'Bots', icon: Bot },
            { id: 'create-auction', label: 'Crear Subasta', icon: Plus }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                  border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Stats Cards Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1.75rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '1.25rem', color: 'white', boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <Users size={36} style={{ opacity: 0.9 }} />
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    +12%
                  </div>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{activeUsers}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Usuarios Activos</div>
              </div>

              <div style={{ padding: '1.75rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '1.25rem', color: 'white', boxShadow: '0 8px 24px rgba(240, 147, 251, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <DollarSign size={36} style={{ opacity: 0.9 }} />
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    +{conversionRate}%
                  </div>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{formatCurrency(totalRevenue)}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Ingresos Totales</div>
              </div>

              <div style={{ padding: '1.75rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '1.25rem', color: 'white', boxShadow: '0 8px 24px rgba(79, 172, 254, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <ShoppingBag size={36} style={{ opacity: 0.9 }} />
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    HOY
                  </div>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{totalOrders}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Pedidos Totales</div>
              </div>

              <div style={{ padding: '1.75rem', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: '1.25rem', color: 'white', boxShadow: '0 8px 24px rgba(250, 112, 154, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <Gavel size={36} style={{ opacity: 0.9 }} />
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    ACTIVAS
                  </div>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{activeAuctions}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Subastas</div>
              </div>
            </div>
{/* Stats Cards Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1.75rem', background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border)', boxShadow: '0 2px 8px var(--shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--primary-light)', borderRadius: '0.75rem' }}>
                    <Award size={24} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{avgBidsPerAuction}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Promedio Ofertas</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.75rem', background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border)', boxShadow: '0 2px 8px var(--shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--success-light)', borderRadius: '0.75rem' }}>
                    <Package size={24} color="var(--success)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{products.length}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Productos Totales</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.75rem', background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border)', boxShadow: '0 2px 8px var(--shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--warning-light)', borderRadius: '0.75rem' }}>
                    <AlertTriangle size={24} color="var(--warning)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{lowStockProducts.length}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Stock Bajo</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.75rem', background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border)', boxShadow: '0 2px 8px var(--shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--info-light)', borderRadius: '0.75rem' }}>
                    <Bot size={24} color="var(--info)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{bots.filter(b => b.isActive).length}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Bots Activos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alertas y Notificaciones */}
            {(pendingPayments > 0 || expiringSoon > 0 || lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={20} color="var(--warning)" />
                  Alertas y Notificaciones
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {pendingPayments > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--warning-light)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Clock size={20} color="var(--warning)" />
                      <span><strong>{pendingPayments}</strong> pedidos pendientes de pago</span>
                    </div>
                  )}
                  {expiringSoon > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--error-light)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Timer size={20} color="var(--error)" />
                      <span><strong>{expiringSoon}</strong> pedidos expiran en menos de 24 horas</span>
                    </div>
                  )}
                  {lowStockProducts.length > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--warning-light)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Package size={20} color="var(--warning)" />
                      <span><strong>{lowStockProducts.length}</strong> productos con stock bajo (menos de 5 unidades)</span>
                    </div>
                  )}
                  {outOfStockProducts.length > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--error-light)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <XCircle size={20} color="var(--error)" />
                      <span><strong>{outOfStockProducts.length}</strong> productos sin stock</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actividad Reciente */}
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={24} />
                Resumen de Actividad
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Subastas</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Activas</span>
                      <strong style={{ color: 'var(--success)' }}>{activeAuctions}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Finalizadas</span>
                      <strong>{endedAuctions}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Total Ofertas</span>
                      <strong style={{ color: 'var(--primary)' }}>{totalBids}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Inventario</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Valor Total</span>
                      <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalInventoryValue)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Stock Bajo</span>
                      <strong style={{ color: 'var(--warning)' }}>{lowStockProducts.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Sin Stock</span>
                      <strong style={{ color: 'var(--error)' }}>{outOfStockProducts.length}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Pedidos</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Pendientes</span>
                      <strong style={{ color: 'var(--warning)' }}>{orderStats.pending}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>En Proceso</span>
                      <strong style={{ color: 'var(--info)' }}>{orderStats.processing}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <span>Entregados</span>
                      <strong style={{ color: 'var(--success)' }}>{orderStats.delivered}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                <Users size={28} />
                Usuarios Registrados ({realUsers.length})
              </h3>
              <button 
                onClick={loadUsers}
                className="btn btn-outline"
                disabled={loadingUsers}
              >
                <RefreshCw size={16} className={loadingUsers ? 'spinning' : ''} />
                Recargar
              </button>
            </div>

            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw size={48} color="var(--primary)" className="spinning" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
              </div>
            ) : realUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Users size={64} color="var(--text-secondary)" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>No hay usuarios registrados</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Usuario</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Teléfono</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Rol</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Registro</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                              {u.displayName?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{u.displayName || 'Sin nombre'}</div>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>ID: {u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>{u.email}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {u.phoneNumber || '-'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span className={u.isAdmin ? 'badge badge-primary' : 'badge badge-secondary'}>
                            {u.isAdmin ? 'Admin' : 'Usuario'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('es-AR') : '-'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button 
                            onClick={() => setSelectedUser(u)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem 0.75rem' }}
                          >
                            <Eye size={16} />
                            Ver Detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Package size={24} />
              Gestión de Productos ({products.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Producto</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Stock</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Precio</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Categoría</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '0.5rem' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600 }}>{product.name}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{product.description.substring(0, 50)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span className={product.stock === 0 ? 'badge badge-error' : product.stock < 5 ? 'badge badge-warning' : 'badge badge-success'}>
                          {product.stock}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(product.price)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                        {product.categoryId === '1' && '📱 Electrónica'}
                        {product.categoryId === '2' && '👕 Moda'}
                        {product.categoryId === '3' && '🏠 Hogar'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleEditProduct(product)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem 0.75rem' }}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem 0.75rem', color: 'var(--error)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EDIT PRODUCT TAB */}
        {activeTab === 'edit-product' && editingProduct && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Edit size={24} />
              Editando: {editingProduct.name}
            </h3>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nombre del Producto</label>
                <input 
                  type="text" 
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Descripción</label>
                <textarea 
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', minHeight: '100px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Precio</label>
                  <input 
                    type="number" 
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Stock</label>
                  <input 
                    type="number" 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Categoría</label>
                  <select 
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  >
                    <option value="1">📱 Electrónica</option>
                    <option value="2">👕 Moda</option>
                    <option value="3">🏠 Hogar</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={handleSaveProduct}
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  Guardar Cambios
                </button>
                <button 
                  onClick={() => {
                    setEditingProduct(null);
                    setActiveTab('products');
                  }}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AUCTIONS TAB */}
        {activeTab === 'auctions' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Gavel size={24} />
              Gestión de Subastas ({auctions.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Subasta</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Precio Actual</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Ofertas</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Tiempo</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map(auction => {
                    const timeLeft = new Date(auction.endTime).getTime() - Date.now();
                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    
                    return (
                      <tr key={auction.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img 
                              src={auction.images[0]} 
                              alt={auction.title}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '0.5rem' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600 }}>{auction.title}</div>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                {auction.description.substring(0, 50)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span className={`badge ${auction.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                            {auction.status === 'active' ? 'Activa' : 'Finalizada'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                          {formatCurrency(auction.currentPrice)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span className="badge badge-info">{auction.bids.length}</span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                          {auction.status === 'active' && timeLeft > 0 ? (
                            <span style={{ color: hoursLeft < 1 ? 'var(--error)' : 'var(--text-primary)' }}>
                              {hoursLeft}h {minutesLeft}m
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Finalizada</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleEditAuction(auction)}
                              className="btn btn-outline"
                              style={{ padding: '0.5rem 0.75rem' }}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteAuction(auction.id)}
                              className="btn btn-outline"
                              style={{ padding: '0.5rem 0.75rem', color: 'var(--error)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EDIT AUCTION TAB */}
        {activeTab === 'edit-auction' && editingAuction && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Edit size={28} color="var(--primary)" />
                Editando Subasta
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                Modificando: <strong style={{ color: 'var(--primary)' }}>{editingAuction.title}</strong>
              </p>
              {editingAuction.bids.length > 0 && (
                <div style={{ 
                  marginTop: '1rem',
                  padding: '0.75rem 1rem', 
                  background: 'var(--warning-light)', 
                  border: '2px solid var(--warning)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  ⚠️ Esta subasta tiene <strong>{editingAuction.bids.length} oferta(s)</strong>. Ten cuidado al modificar precios.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '2rem' }}>
              
              {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  📝 Información Básica
                </h4>
                
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* Título */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Título de la Subasta *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej: iPhone 15 Pro Max 256GB - Nuevo en Caja"
                      value={auctionForm.title}
                      onChange={(e) => setAuctionForm({...auctionForm, title: e.target.value})}
                      maxLength={100}
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem', 
                        fontSize: '1rem',
                        border: '2px solid var(--border)'
                      }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      {auctionForm.title.length}/100 caracteres
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Descripción Detallada *
                    </label>
                    <textarea 
                      placeholder="Describe el producto en detalle: características, estado, accesorios incluidos, etc."
                      value={auctionForm.description}
                      onChange={(e) => setAuctionForm({...auctionForm, description: e.target.value})}
                      maxLength={2000}
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem', 
                        minHeight: '150px', 
                        fontSize: '1rem', 
                        resize: 'vertical',
                        border: '2px solid var(--border)'
                      }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      {auctionForm.description.length}/2000 caracteres
                    </div>
                  </div>

                  {/* Categoría y Condición */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Categoría *</label>
                      <select 
                        value={auctionForm.categoryId}
                        onChange={(e) => setAuctionForm({...auctionForm, categoryId: e.target.value})}
                        style={{ 
                          width: '100%', 
                          padding: '0.875rem', 
                          borderRadius: '0.5rem',
                          fontSize: '1rem',
                          border: '2px solid var(--border)'
                        }}
                      >
                        <option value="1">📱 Electrónica</option>
                        <option value="2">👕 Moda</option>
                        <option value="3">🏠 Hogar</option>
                        <option value="4">🎮 Gaming</option>
                        <option value="5">📚 Libros</option>
                        <option value="6">🎨 Arte y Coleccionables</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Condición *</label>
                      <select 
                        value={auctionForm.condition}
                        onChange={(e) => setAuctionForm({...auctionForm, condition: e.target.value as any})}
                        style={{ 
                          width: '100%', 
                          padding: '0.875rem', 
                          borderRadius: '0.5rem',
                          fontSize: '1rem',
                          border: '2px solid var(--border)'
                        }}
                      >
                        <option value="new">✨ Nuevo</option>
                        <option value="like-new">💎 Como Nuevo</option>
                        <option value="excellent">⭐ Excelente</option>
                        <option value="good">👍 Bueno</option>
                        <option value="fair">🔧 Regular</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: IMÁGENES */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  📸 Imágenes del Producto
                </h4>
                <ImageUploader
                  images={auctionForm.images}
                  onChange={(images) => setAuctionForm({...auctionForm, images})}
                  maxImages={3}
                  maxSizeMB={5}
                />
              </div>

              {/* SECCIÓN 3: PRECIOS */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  💰 Configuración de Precios
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                  {/* Precio Inicial */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Precio Inicial *
                    </label>
                    <input 
                      type="number" 
                      placeholder="1000"
                      value={auctionForm.startPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, startPrice: Number(e.target.value)})}
                      min="100"
                      step="500"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        border: '2px solid var(--border)'
                      }}
                    />
                    {editingAuction.bids.length > 0 && auctionForm.startPrice !== editingAuction.startPrice && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--warning)', marginTop: '0.5rem', fontWeight: 600 }}>
                        ⚠️ Modificando precio inicial
                      </div>
                    )}
                  </div>

                  {/* Precio Actual */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Precio Actual
                    </label>
                    <input 
                      type="number" 
                      value={auctionForm.currentPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, currentPrice: Number(e.target.value)})}
                      min={auctionForm.startPrice}
                      step="500"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        border: '2px solid var(--border)'
                      }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      💡 {editingAuction.bids.length} oferta(s)
                    </div>
                  </div>

                  {/* Compra Ya */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Compra Ya (Opcional)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0 para desactivar"
                      value={auctionForm.buyNowPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, buyNowPrice: Number(e.target.value)})}
                      min="0"
                      step="500"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        border: '2px solid var(--border)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: DURACIÓN */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  ⏱️ Duración de la Subasta
                </h4>
                
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--info-light)', 
                  borderRadius: '0.5rem',
                  border: '2px solid var(--info)',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem'
                }}>
                  ℹ️ <strong>Finaliza:</strong> {new Date(editingAuction.endTime).toLocaleString('es-AR')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Días */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Días</label>
                    <input 
                      type="number" 
                      value={auctionForm.durationDays}
                      onChange={(e) => setAuctionForm({...auctionForm, durationDays: Number(e.target.value)})}
                      min="0"
                      max="7"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        border: '2px solid var(--border)'
                      }}
                    />
                  </div>

                  {/* Horas */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Horas</label>
                    <input 
                      type="number" 
                      value={auctionForm.durationHours}
                      onChange={(e) => setAuctionForm({...auctionForm, durationHours: Number(e.target.value)})}
                      min="0"
                      max="23"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        border: '2px solid var(--border)'
                      }}
                    />
                  </div>

                  {/* Minutos */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Minutos</label>
                    <input 
                      type="number" 
                      value={auctionForm.durationMinutes}
                      onChange={(e) => setAuctionForm({...auctionForm, durationMinutes: Number(e.target.value)})}
                      min="0"
                      max="59"
                      step="5"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        border: '2px solid var(--border)'
                      }}
                    />
                  </div>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--primary-light)', 
                  borderRadius: '0.5rem',
                  border: '2px solid var(--primary)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Nueva Duración
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {auctionForm.durationDays > 0 && `${auctionForm.durationDays}d `}
                    {auctionForm.durationHours > 0 && `${auctionForm.durationHours}h `}
                    {auctionForm.durationMinutes}min
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: OPCIONES AVANZADAS */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  ⚙️ Opciones Avanzadas
                </h4>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Destacada */}
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: '2px solid ' + (auctionForm.featured ? 'var(--primary)' : 'var(--border)')
                  }}>
                    <input 
                      type="checkbox"
                      checked={auctionForm.featured}
                      onChange={(e) => setAuctionForm({...auctionForm, featured: e.target.checked})}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>⭐ Marcar como Destacada</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        La subasta aparecerá con efecto especial en la página principal
                      </div>
                    </div>
                  </label>

                  {/* Extensión Automática */}
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: '2px solid ' + (auctionForm.allowExtension ? 'var(--primary)' : 'var(--border)')
                  }}>
                    <input 
                      type="checkbox"
                      checked={auctionForm.allowExtension}
                      onChange={(e) => setAuctionForm({...auctionForm, allowExtension: e.target.checked})}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🛡️ Permitir Extensión Automática (Anti-Sniping)</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Si alguien oferta en los últimos 2 minutos, se extiende 2 minutos más
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem' }}>
                <button 
                  onClick={handleSaveAuction}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem', fontSize: '1.0625rem', fontWeight: 600 }}
                >
                  <Edit size={20} />
                  Guardar Cambios
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Descartar cambios y volver?')) {
                      setEditingAuction(null);
                      setActiveTab('auctions');
                    }
                  }}
                  className="btn btn-outline"
                  style={{ padding: '1rem', minWidth: '150px' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
{/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {/* Stats de pedidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pendientes</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{orderStats.pending}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Procesando</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>{orderStats.processing}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Enviados</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{orderStats.shipped}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Entregados</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{orderStats.delivered}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '0.75rem', color: 'white' }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Ingresos Totales</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatCurrency(orderStats.revenue)}</div>
              </div>
            </div>

            {/* Filtros y búsqueda */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    <Search size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Buscar Pedido
                  </label>
                  <input
                    type="text"
                    placeholder="ID de pedido, usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    <Filter size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Filtrar por Estado
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending_payment">⏳ Pago Pendiente</option>
                    <option value="payment_expired">❌ Pago Expirado</option>
                    <option value="processing">🔄 Procesando</option>
                    <option value="shipped">📦 Enviado</option>
                    <option value="delivered">✅ Entregado</option>
                    <option value="cancelled">🚫 Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de pedidos */}
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShoppingBag size={24} />
                Pedidos ({filteredOrders.length})
              </h3>

              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <ShoppingBag size={64} color="var(--text-tertiary)" style={{ marginBottom: '1rem' }} />
                  <p>No se encontraron pedidos</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredOrders.map(order => {
                    const statusBadge = getStatusBadge(order.status);
                    const deliveryBadge = getDeliveryMethodBadge(order.deliveryMethod);
                    const timeLeft = order.expiresAt ? new Date(order.expiresAt).getTime() - Date.now() : 0;
                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

                    return (
                      <div 
                        key={order.id} 
                        style={{ 
                          padding: '1.5rem', 
                          background: 'var(--bg-tertiary)', 
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                          {/* Info del pedido */}
                          <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                              Pedido #{order.id.slice(0, 8)}
                            </div>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                              {order.type === 'auction' ? '🔨 Subasta' : '🛍️ Compra Directa'}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              {new Date(order.createdAt).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          {/* Monto y método */}
                          <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                              {formatCurrency(order.amount)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              {deliveryBadge.icon} {deliveryBadge.text}
                            </div>
                          </div>

                          {/* Estado */}
                          <div>
                            <span className={`badge ${statusBadge.className}`} style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}>
                              {statusBadge.text}
                            </span>
                            {order.status === 'pending_payment' && order.expiresAt && timeLeft > 0 && (
                              <div style={{ fontSize: '0.75rem', color: hoursLeft < 24 ? 'var(--error)' : 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                Expira en {hoursLeft}h
                              </div>
                            )}
                          </div>

                          {/* Acciones */}
                          <button 
                            className="btn btn-outline"
                            style={{ padding: '0.625rem 1rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                          >
                            <Eye size={16} />
                            Ver Detalles
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de detalles del pedido */}
        {selectedOrder && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0,0,0,0.7)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 1000,
              padding: '2rem'
            }}
            onClick={() => setSelectedOrder(null)}
          >
            <div 
              style={{ 
                background: 'var(--bg-secondary)', 
                borderRadius: '1rem', 
                maxWidth: '700px', 
                width: '100%', 
                maxHeight: '90vh', 
                overflow: 'auto',
                padding: '2rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem 0' }}>Pedido #{selectedOrder.id.slice(0, 8)}</h2>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Creado: {new Date(selectedOrder.createdAt).toLocaleString('es-AR')}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Información del pedido */}
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Estado</div>
                  <span className={`badge ${getStatusBadge(selectedOrder.status).className}`}>
                    {getStatusBadge(selectedOrder.status).text}
                  </span>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Monto Total</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(selectedOrder.amount)}
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Método de Entrega</div>
                  <div style={{ fontWeight: 600 }}>
                    {getDeliveryMethodBadge(selectedOrder.deliveryMethod).icon} {getDeliveryMethodBadge(selectedOrder.deliveryMethod).text}
                  </div>
                  {selectedOrder.shippingAddress && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}
                    </div>
                  )}
                </div>

                {/* Acciones de cambio de estado */}
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Cambiar Estado
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedOrder.status === 'pending_payment' && (
                      <>
                        <button 
                          onClick={() => {
                            updateOrderStatus(selectedOrder.id, 'processing');
                            setSelectedOrder({ ...selectedOrder, status: 'processing' });
                          }}
                          className="btn btn-primary"
                          style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                        >
                          ✅ Confirmar Pago
                        </button>
                        <button 
                          onClick={() => {
                            updateOrderStatus(selectedOrder.id, 'cancelled');
                            setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', color: 'var(--error)' }}
                        >
                          ❌ Cancelar
                        </button>
                      </>
                    )}
                    {selectedOrder.status === 'processing' && (
                      <button 
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, 'shipped');
                          setSelectedOrder({ ...selectedOrder, status: 'shipped' });
                        }}
                        className="btn btn-primary"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                      >
                        📦 Marcar como Enviado
                      </button>
                    )}
                    {selectedOrder.status === 'shipped' && (
                      <button 
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, 'delivered');
                          setSelectedOrder({ ...selectedOrder, status: 'delivered' });
                        }}
                        className="btn btn-success"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                      >
                        ✅ Marcar como Entregado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Todos', count: products.length },
                { id: 'low', label: 'Stock Bajo', count: lowStockProducts.length },
                { id: 'out', label: 'Sin Stock', count: outOfStockProducts.length }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setInventoryFilter(filter.id)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: inventoryFilter === filter.id ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: inventoryFilter === filter.id ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: inventoryFilter === filter.id ? 600 : 400,
                    fontSize: '0.9375rem'
                  }}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Resumen de inventario */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Valor Total</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
                  {formatCurrency(totalInventoryValue)}
                </div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Productos</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{products.length}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Stock Bajo</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>{lowStockProducts.length}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Sin Stock</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--error)' }}>{outOfStockProducts.length}</div>
              </div>
            </div>

            {/* Tabla de inventario */}
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Package size={24} />
                Inventario Detallado
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Producto</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Stock</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Precio Unit.</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Valor Total</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter(p => {
                      if (inventoryFilter === 'low') return p.stock < 5 && p.stock > 0;
                      if (inventoryFilter === 'out') return p.stock === 0;
                      return true;
                    })
                    .map(product => (
                      <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '0.5rem' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600 }}>{product.name}</div>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>ID: {product.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '1.125rem' }}>
                          {product.stock}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(product.price)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {formatCurrency(product.price * product.stock)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {product.stock === 0 ? (
                            <span className="badge badge-error">Sin Stock</span>
                          ) : product.stock < 5 ? (
                            <span className="badge badge-warning">Bajo</span>
                          ) : (
                            <span className="badge badge-success">OK</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleEditProduct(product)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem 0.75rem' }}
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOTS TAB */}
        {activeTab === 'bots' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bot size={28} />
                Gestión de Bots de Subastas
              </h3>
              <button 
                onClick={handleAddBot}
                className="btn btn-primary"
              >
                <Plus size={18} />
                Nuevo Bot
              </button>
            </div>

            {/* Formulario para crear bot */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Crear Nuevo Bot</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Nombre del Bot
                  </label>
                  <input 
                    type="text" 
                    placeholder="Bot Argentina"
                    value={botForm.name}
                    onChange={(e) => setBotForm({...botForm, name: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Balance Inicial
                  </label>
                  <input 
                    type="number" 
                    value={botForm.balance}
                    onChange={(e) => setBotForm({...botForm, balance: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    min="0"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Oferta Máxima
                  </label>
                  <input 
                    type="number" 
                    value={botForm.maxBidAmount}
                    onChange={(e) => setBotForm({...botForm, maxBidAmount: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    min="0"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Intervalo Mínimo (seg)
                  </label>
                  <input 
                    type="number" 
                    value={botForm.intervalMin}
                    onChange={(e) => setBotForm({...botForm, intervalMin: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    min="1"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Intervalo Máximo (seg)
                  </label>
                  <input 
                    type="number" 
                    value={botForm.intervalMax}
                    onChange={(e) => setBotForm({...botForm, intervalMax: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Lista de bots */}
            {bots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Bot size={64} color="var(--text-secondary)" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>No hay bots configurados</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {bots.map(bot => (
                  <div 
                    key={bot.id} 
                    style={{ 
                      padding: '1.5rem', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '1.5rem',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>
                        {bot.name}
                        <span className={`badge ${bot.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ marginLeft: '0.75rem' }}>
                          {bot.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </h4>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <span>Balance: {formatCurrency(bot.balance)}</span>
                        <span>•</span>
                        <span>Intervalo: {bot.intervalMin}-{bot.intervalMax}s</span>
                        <span>•</span>
                        <span>Oferta Máx: {formatCurrency(bot.maxBidAmount)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateBot(bot.id, { isActive: !bot.isActive })}
                      className={`btn ${bot.isActive ? 'btn-warning' : 'btn-success'}`}
                    >
                      {bot.isActive ? '⏸️ Pausar' : '▶️ Activar'}
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el bot "${bot.name}"?`)) {
                          deleteBot(bot.id);
                        }
                      }}
                      className="btn btn-outline"
                      style={{ color: 'var(--error)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* CREATE AUCTION TAB */}
        {activeTab === 'create-auction' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Plus size={28} color="var(--primary)" />
                Crear Nueva Subasta
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                Completa todos los campos para publicar una nueva subasta
              </p>
            </div>

            <div style={{ display: 'grid', gap: '2rem' }}>
              
              {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  📝 Información Básica
                </h4>
                
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* Título */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Título de la Subasta *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej: iPhone 15 Pro Max 256GB - Nuevo en Caja"
                      value={auctionForm.title}
                      onChange={(e) => setAuctionForm({...auctionForm, title: e.target.value})}
                      maxLength={100}
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem', 
                        fontSize: '1rem',
                        border: '2px solid var(--border)'
                      }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      {auctionForm.title.length}/100 caracteres
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Descripción Detallada *
                    </label>
                    <textarea 
                      placeholder="Describe el producto en detalle: características, estado, accesorios incluidos, etc."
                      value={auctionForm.description}
                      onChange={(e) => setAuctionForm({...auctionForm, description: e.target.value})}
                      maxLength={2000}
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem', 
                        minHeight: '150px', 
                        fontSize: '1rem', 
                        resize: 'vertical',
                        border: '2px solid var(--border)'
                      }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      {auctionForm.description.length}/2000 caracteres
                    </div>
                  </div>

                  {/* Categoría y Condición */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Categoría *</label>
                      <select 
                        value={auctionForm.categoryId}
                        onChange={(e) => setAuctionForm({...auctionForm, categoryId: e.target.value})}
                        style={{ 
                          width: '100%', 
                          padding: '0.875rem', 
                          borderRadius: '0.5rem',
                          fontSize: '1rem',
                          border: '2px solid var(--border)'
                        }}
                      >
                        <option value="1">📱 Electrónica</option>
                        <option value="2">👕 Moda</option>
                        <option value="3">🏠 Hogar</option>
                        <option value="4">🎮 Gaming</option>
                        <option value="5">📚 Libros</option>
                        <option value="6">🎨 Arte y Coleccionables</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Condición *</label>
                      <select 
                        value={auctionForm.condition}
                        onChange={(e) => setAuctionForm({...auctionForm, condition: e.target.value as any})}
                        style={{ 
                          width: '100%', 
                          padding: '0.875rem', 
                          borderRadius: '0.5rem',
                          fontSize: '1rem',
                          border: '2px solid var(--border)'
                        }}
                      >
                        <option value="new">✨ Nuevo</option>
                        <option value="like-new">💎 Como Nuevo</option>
                        <option value="excellent">⭐ Excelente</option>
                        <option value="good">👍 Bueno</option>
                        <option value="fair">🔧 Regular</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: IMÁGENES */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  📸 Imágenes del Producto
                </h4>
                <ImageUploader
                  images={auctionForm.images}
                  onChange={(images) => setAuctionForm({...auctionForm, images})}
                  maxImages={3}
                  maxSizeMB={5}
                />
              </div>

              {/* SECCIÓN 3: PRECIOS */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  💰 Configuración de Precios
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Precio Inicial */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Precio Inicial de Subasta *
                    </label>
                    <input 
                      type="number" 
                      placeholder="1000"
                      value={auctionForm.startPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, startPrice: Number(e.target.value)})}
                      min="100"
                      step="500"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        border: '2px solid var(--border)'
                      }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      💡 Precio mínimo: $100 • Incrementos de $500
                    </div>
                  </div>

                  {/* Compra Ya */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Precio "Compra Ya" (Opcional)
                    </label>
                    <input 
                      type="number" 
                      placeholder="Dejar en 0 para desactivar"
                      value={auctionForm.buyNowPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, buyNowPrice: Number(e.target.value)})}
                      min="0"
                      step="500"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        border: '2px solid var(--border)'
                      }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      💡 Si se activa, debe ser mayor al precio inicial
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: DURACIÓN */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  ⏱️ Duración de la Subasta
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Días */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Días</label>
                    <input 
                      type="number" 
                      value={auctionForm.durationDays}
                      onChange={(e) => setAuctionForm({...auctionForm, durationDays: Number(e.target.value)})}
                      min="0"
                      max="7"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        border: '2px solid var(--border)'
                      }}
                    />
                  </div>

                  {/* Horas */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Horas</label>
                    <input 
                      type="number" 
                      value={auctionForm.durationHours}
                      onChange={(e) => setAuctionForm({...auctionForm, durationHours: Number(e.target.value)})}
                      min="0"
                      max="23"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        border: '2px solid var(--border)'
                      }}
                    />
                  </div>

                  {/* Minutos */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Minutos</label>
                    <input 
                      type="number" 
                      value={auctionForm.durationMinutes}
                      onChange={(e) => setAuctionForm({...auctionForm, durationMinutes: Number(e.target.value)})}
                      min="0"
                      max="59"
                      step="5"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        border: '2px solid var(--border)'
                      }}
                    />
                  </div>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--primary-light)', 
                  borderRadius: '0.5rem',
                  border: '2px solid var(--primary)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Duración Total
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {auctionForm.durationDays > 0 && `${auctionForm.durationDays}d `}
                    {auctionForm.durationHours > 0 && `${auctionForm.durationHours}h `}
                    {auctionForm.durationMinutes}min
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    💡 Mínimo: 5 minutos • Máximo: 7 días
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: OPCIONES AVANZADAS */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  ⚙️ Opciones Avanzadas
                </h4>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Destacada */}
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: '2px solid ' + (auctionForm.featured ? 'var(--primary)' : 'var(--border)')
                  }}>
                    <input 
                      type="checkbox"
                      checked={auctionForm.featured}
                      onChange={(e) => setAuctionForm({...auctionForm, featured: e.target.checked})}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>⭐ Marcar como Destacada</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        La subasta aparecerá con efecto especial en la página principal
                      </div>
                    </div>
                  </label>

                  {/* Extensión Automática */}
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: '2px solid ' + (auctionForm.allowExtension ? 'var(--primary)' : 'var(--border)')
                  }}>
                    <input 
                      type="checkbox"
                      checked={auctionForm.allowExtension}
                      onChange={(e) => setAuctionForm({...auctionForm, allowExtension: e.target.checked})}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🛡️ Permitir Extensión Automática (Anti-Sniping)</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Si alguien oferta en los últimos 2 minutos, se extiende 2 minutos más
                      </div>
                    </div>
                  </label>

                  {/* Programar Inicio */}
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: '2px solid ' + (auctionForm.scheduled ? 'var(--primary)' : 'var(--border)')
                  }}>
                    <input 
                      type="checkbox"
                      checked={auctionForm.scheduled}
                      onChange={(e) => setAuctionForm({...auctionForm, scheduled: e.target.checked})}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>📅 Programar Inicio de Subasta</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        La subasta iniciará automáticamente en la fecha y hora seleccionada
                      </div>
                    </div>
                  </label>

                  {/* Fecha y Hora Programada */}
                  {auctionForm.scheduled && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '1rem',
                      padding: '1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '0.5rem',
                      border: '2px solid var(--primary)'
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Fecha de Inicio
                        </label>
                        <input 
                          type="date"
                          value={auctionForm.scheduledDate}
                          onChange={(e) => setAuctionForm({...auctionForm, scheduledDate: e.target.value})}
                          min={new Date().toISOString().split('T')[0]}
                          style={{ 
                            width: '100%', 
                            padding: '0.875rem', 
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            border: '2px solid var(--border)'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Hora de Inicio
                        </label>
                        <input 
                          type="time"
                          value={auctionForm.scheduledTime}
                          onChange={(e) => setAuctionForm({...auctionForm, scheduledTime: e.target.value})}
                          style={{ 
                            width: '100%', 
                            padding: '0.875rem', 
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            border: '2px solid var(--border)'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem' }}>
                <button 
                  onClick={handleCreateAuction}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem', fontSize: '1.0625rem', fontWeight: 600 }}
                >
                  <Plus size={20} />
                  Publicar Subasta
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Descartar cambios y volver?')) {
                      setAuctionForm({
                        title: '',
                        description: '',
                        startPrice: 1000,
                        currentPrice: 0,
                        buyNowPrice: 0,
                        categoryId: '1',
                        images: [] as string[],
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
                      setActiveTab('auctions');
                    }
                  }}
                  className="btn btn-outline"
                  style={{ padding: '1rem', minWidth: '150px' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalles de usuario */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};


export default AdminPanel;











