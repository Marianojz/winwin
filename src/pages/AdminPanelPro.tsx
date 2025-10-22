import { useState, useEffect } from 'react';
import { 
  Eye, Edit, Trash2, Users, Award, Clock, AlertCircle, Activity, RefreshCw,
  Gavel, Package, Bot, TrendingUp, DollarSign, Plus, CheckCircle, XCircle, 
  Truck, FileText, Download, Search, Filter, Calendar, ShoppingBag, Timer, 
  AlertTriangle, MapPin, BarChart3
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import UserDetailsModal from '../components/UserDetailsModal';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Product, Auction, Order, OrderStatus } from '../types';

const AdminPanelPro = () => {
  const { 
    user, auctions, products, bots, orders,
    addBot, updateBot, deleteBot, setProducts, setAuctions, updateOrderStatus 
  } = useStore();
  
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
    categoryId: '1'
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

// useEffect para cargar usuarios al montar el componente
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
  const activeUsers = 150; // Mock
  const totalOrders = orders.length;
  const activeAuctions = auctions.filter(a => a.status === 'active').length;
  const endedAuctions = auctions.filter(a => a.status === 'ended').length;
  const lowStockProducts = products.filter(p => p.stock < 5 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const avgBidsPerAuction = auctions.length > 0 ? (totalBids / auctions.length).toFixed(1) : 0;
  const conversionRate = totalOrders > 0 ? ((totalOrders / activeUsers) * 100).toFixed(1) : 0;

  const pendingPayments = orders.filter(o => o.status === 'pending_payment').length;
  const inTransit = orders.filter(o => o.status === 'in_transit').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
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
      categoryId: product.categoryId
    });
    setActiveTab('edit-product');
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

  // Funciones para Subastas
  const handleEditAuction = (auction: Auction) => {
    setEditingAuction(auction);
    setAuctionForm({
  title: '',
  description: '',
  startPrice: 0,
  currentPrice: 0,
  buyNowPrice: 0,
  categoryId: '1',
  images: [],
  durationDays: 7,
  durationHours: 0,
  durationMinutes: 0,
  condition: 'new',
  featured: false,
  allowExtension: true
});
    setActiveTab('edit-auction');
  };

  const handleSaveAuction = () => {
    if (editingAuction) {
      const updatedAuctions = auctions.map(a => 
        a.id === editingAuction.id 
          ? { 
              ...a, 
              title: auctionForm.title,
              description: auctionForm.description,
              startPrice: auctionForm.startPrice,
              currentPrice: auctionForm.currentPrice,
              buyNowPrice: auctionForm.buyNowPrice || undefined,
              categoryId: auctionForm.categoryId
            }
          : a
      );
      setAuctions(updatedAuctions);
      alert('✅ Subasta actualizada correctamente');
      setEditingAuction(null);
      setActiveTab('auctions');
    }
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
      if (window.confirm('🔴 ÚLTIMA CONFIRMACIÓN\n\nSe perderán todos los cambios realizados.\n\n¿Confirmas el reset?')) {
        window.location.reload();
      }
    }
  };

  // Funciones para Pedidos
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      pending_payment: 'var(--warning)',
      payment_confirmed: 'var(--info)',
      preparing: 'var(--primary)',
      in_transit: 'var(--secondary)',
      delivered: 'var(--success)',
      cancelled: 'var(--error)',
      expired: 'var(--error)'
    };
    return colors[status] || 'var(--text-secondary)';
  };

  const getStatusText = (status: OrderStatus) => {
    const texts = {
      pending_payment: 'Pendiente de Pago',
      payment_confirmed: 'Pago Confirmado',
      preparing: 'Preparando Envío',
      in_transit: 'En Tránsito',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      expired: 'Expirado'
    };
    return texts[status] || status;
  };

  const getTimeRemaining = (expiresAt?: Date) => {
    if (!expiresAt) return null;
    const now = Date.now();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;
    
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (window.confirm(`¿Confirmar cambio de estado a "${getStatusText(newStatus)}"?`)) {
      const updates: Partial<Order> = {};
      
      if (newStatus === 'in_transit' && !selectedOrder?.trackingNumber) {
        const tracking = prompt('Ingrese el número de seguimiento:');
        if (tracking) {
          updates.trackingNumber = tracking;
        }
      }
      
      updateOrderStatus(orderId, newStatus, updates);
      alert('✅ Estado actualizado correctamente');
      setSelectedOrder(null);
    }
  };
  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem 0', background: 'var(--bg-primary)' }}>
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={36} color="var(--primary)" />
              Panel de Administración
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Gestiona toda la plataforma desde un solo lugar</p>
          </div>
          <button 
            onClick={handleResetData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            <RefreshCw size={18} />
            Reset Datos
          </button>
        </div>

        {/* Tabs Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border)', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={18} /> },
            { id: 'orders', label: 'Pedidos', icon: <ShoppingBag size={18} /> },
            { id: 'users', label: 'Usuarios', icon: <Users size={18} /> },
            { id: 'auctions', label: 'Subastas', icon: <Gavel size={18} /> },
            { id: 'products', label: 'Productos', icon: <Package size={18} /> },
            { id: 'inventory', label: 'Inventario', icon: <BarChart3 size={18} /> },
            { id: 'bots', label: 'Bots', icon: <Bot size={18} /> },
            { id: 'reports', label: 'Reportes', icon: <FileText size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.875rem 1.5rem',
                background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-secondary)',
                color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <DollarSign size={28} color="var(--success)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', background: 'rgba(34, 197, 94, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                    +12%
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>
                  {formatCurrency(totalRevenue)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ingresos Totales</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <Clock size={28} color="var(--warning)" />
                  {expiringSoon > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                      ¡Urgente!
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.25rem' }}>
                  {pendingPayments}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Pagos Pendientes {expiringSoon > 0 && `(${expiringSoon} por expirar)`}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <Truck size={28} color="var(--secondary)" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                  {inTransit}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>En Tránsito</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <CheckCircle size={28} color="var(--primary)" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  {delivered}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Entregados</div>
              </div>
            </div>

            {/* Alertas Importantes */}
            {(expiringSoon > 0 || pendingPayments > 5) && (
              <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(251, 146, 60, 0.1))', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '2px solid var(--error)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--error)' }}>
                  <AlertTriangle size={24} />
                  Alertas Importantes
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {expiringSoon > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Timer size={18} color="var(--error)" />
                      <span>{expiringSoon} pago(s) de subasta expiran en menos de 24 horas</span>
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="btn btn-sm"
                        style={{ marginLeft: 'auto', background: 'var(--error)', color: 'white', padding: '0.5rem 1rem' }}
                      >
                        Ver Pedidos
                      </button>
                    </div>
                  )}
                  {pendingPayments > 5 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={18} color="var(--warning)" />
                      <span>{pendingPayments} pagos pendientes requieren atención</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen Rápido */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Gavel size={20} />
                  Subastas
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Activas</span>
                  <strong style={{ color: 'var(--success)' }}>{activeAuctions}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Finalizadas</span>
                  <strong>{endedAuctions}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Promedio ofertas</span>
                  <strong>{avgBidsPerAuction}</strong>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={20} />
                  Inventario
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Valor Total</span>
                  <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalInventoryValue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Stock Bajo</span>
                  <strong style={{ color: 'var(--warning)' }}>{lowStockProducts.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sin Stock</span>
                  <strong style={{ color: 'var(--error)' }}>{outOfStockProducts.length}</strong>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} />
                  Estadísticas
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Usuarios Activos</span>
                  <strong>{activeUsers}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Pedidos</span>
                  <strong>{totalOrders}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tasa Conversión</span>
                  <strong style={{ color: 'var(--success)' }}>{conversionRate}%</strong>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Acciones Rápidas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  onClick={() => setActiveTab('auctions')}
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}
                >
                  <Plus size={16} />
                  Nueva Subasta
                </button>
                <button 
                  onClick={() => setActiveTab('products')}
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}
                >
                  <Plus size={16} />
                  Nuevo Producto
                </button>
                <button 
                  onClick={() => setActiveTab('bots')}
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}
                >
                  <Plus size={16} />
                  Nuevo Bot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {/* Filtros y Búsqueda */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    <Search size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Buscar
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ID, producto o cliente..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    <Filter size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Filtrar por Estado
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="pending_payment">Pendiente de Pago</option>
                    <option value="payment_confirmed">Pago Confirmado</option>
                    <option value="preparing">Preparando</option>
                    <option value="in_transit">En Tránsito</option>
                    <option value="delivered">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="expired">Expirado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Órdenes */}
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>
                Pedidos ({filteredOrders.length})
              </h3>
              
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <ShoppingBag size={64} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>No se encontraron pedidos</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredOrders.map(order => (
                    <div 
                      key={order.id} 
                      style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '1.5rem', 
                        borderRadius: '0.75rem',
                        border: order.status === 'pending_payment' && order.expiresAt && 
                               (new Date(order.expiresAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000 
                               ? '2px solid var(--error)' : 'none'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                        {/* Información del Pedido */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <img 
                              src={order.productImage} 
                              alt={order.productName}
                              style={{ width: '50px', height: '50px', borderRadius: '0.5rem', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                {order.productName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                ID: {order.id}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div>
                              <Users size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                              {order.userName}
                            </div>
                            <div>
                              <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                              {order.address.locality}, {order.address.province}
                            </div>
                          </div>
                        </div>

                        {/* Tipo y Monto */}
                        <div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {order.productType === 'auction' ? '🔨 Subasta' : '🛒 Tienda'}
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {formatCurrency(order.amount)}
                          </div>
                        </div>

                        {/* Estado */}
                        <div>
                          <div style={{ 
                            padding: '0.5rem 1rem', 
                            background: getStatusColor(order.status) + '20', 
                            color: getStatusColor(order.status),
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}>
                            {getStatusText(order.status)}
                          </div>
                          {order.trackingNumber && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                              📦 {order.trackingNumber}
                            </div>
                          )}
                        </div>

                        {/* Tiempo restante para pagos pendientes */}
                        {order.status === 'pending_payment' && order.expiresAt && (
                          <div style={{ textAlign: 'center' }}>
                            <Timer size={20} color={
                              (new Date(order.expiresAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000 
                              ? 'var(--error)' : 'var(--warning)'
                            } />
                            <div style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 600,
                              color: (new Date(order.expiresAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000 
                                ? 'var(--error)' : 'var(--warning)'
                            }}>
                              {getTimeRemaining(order.expiresAt)}
                            </div>
                          </div>
                        )}

                        {/* Acciones */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem' }}
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

       {/* USERS TAB */}
{activeTab === 'users' && (
  <div>
    <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={28} />
          Gestión de Usuarios
        </h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Total: <strong style={{ color: 'var(--primary)' }}>{realUsers.length}</strong> usuarios
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Award size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {realUsers.filter(u => u.role === 'admin').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Administradores</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Users size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
              {realUsers.filter(u => u.active).length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Usuarios Activos</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Clock size={24} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>
              {realUsers.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Registrados</div>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Cargando usuarios...
            </div>
          ) : realUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No hay usuarios registrados
            </div>
          ) : (
            realUsers.map((realUser) => (
              <div key={realUser.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      src={realUser.avatar} 
                      alt={realUser.username} 
                      style={{ 
                        width: '30px', 
                        height: '30px', 
                        borderRadius: '50%',
                        border: '2px solid var(--primary)'
                      }} 
                    />
                    {realUser.username}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{realUser.email}</div>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  DNI: {realUser.dni || 'Sin DNI'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {realUser.locality || 'Sin localidad'}, {realUser.province || 'Sin provincia'}
                </div>
                <span className={realUser.role === 'admin' ? 'badge badge-warning' : 'badge badge-success'}>
                  {realUser.role === 'admin' ? 'Admin' : 'Usuario'}
                </span>
                <span className={realUser.active ? 'badge badge-success' : 'badge badge-error'}>
                  {realUser.active ? 'Activo' : 'Suspendido'}
                </span>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                  onClick={() => setSelectedUser(realUser)}
                >
                  <Eye size={16} />
                  Ver
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
)}

        {/* AUCTIONS TAB */}
        {activeTab === 'auctions' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Gavel size={28} />
                Gestión de Subastas
              </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                  Activas: <strong style={{ color: 'var(--success)' }}>{activeAuctions}</strong> | 
                  Finalizadas: <strong style={{ color: 'var(--text-secondary)' }}>{endedAuctions}</strong>
                </span>
                <button className="btn btn-primary" onClick={() => setActiveTab('create-auction')}>
                  <Plus size={18} />
                  Nueva Subasta
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {auctions.map(auction => (
                <div key={auction.id} style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>{auction.title}</h4>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        {auction.bids.length} ofertas • Finaliza: {new Date(auction.endTime).toLocaleDateString('es-AR')}
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Precio Inicial</div>
                          <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{formatCurrency(auction.startPrice)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Precio Actual</div>
                          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(auction.currentPrice)}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <span style={{ 
                        padding: '0.5rem 1rem', 
                        background: auction.status === 'active' ? 'var(--success)' : 'var(--error)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {auction.status === 'active' ? 'Activa' : 'Finalizada'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleEditAuction(auction)}
                          className="btn btn-outline" 
                          style={{ padding: '0.5rem 0.75rem' }}
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteAuction(auction.id)}
                          style={{ padding: '0.5rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDIT AUCTION TAB */}
        {activeTab === 'edit-auction' && editingAuction && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Edit size={28} />
              Editar Subasta: {editingAuction.title}
            </h3>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Título</label>
                <input 
                  type="text" 
                  value={auctionForm.title}
                  onChange={(e) => setAuctionForm({...auctionForm, title: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Descripción</label>
                <textarea 
                  value={auctionForm.description}
                  onChange={(e) => setAuctionForm({...auctionForm, description: e.target.value})}
                  rows={4}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Precio Inicial</label>
                  <input 
                    type="number" 
                    value={auctionForm.startPrice}
                    onChange={(e) => setAuctionForm({...auctionForm, startPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Precio Actual</label>
                  <input 
                    type="number" 
                    value={auctionForm.currentPrice}
                    onChange={(e) => setAuctionForm({...auctionForm, currentPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Compra Directa (Opcional)</label>
                  <input 
                    type="number" 
                    value={auctionForm.buyNowPrice}
                    onChange={(e) => setAuctionForm({...auctionForm, buyNowPrice: Number(e.target.value)})}
                    placeholder="0 = sin compra directa"
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={handleSaveAuction}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem', fontSize: '1.0625rem' }}
                >
                  💾 Guardar Cambios
                </button>
                <button 
                  onClick={() => { setActiveTab('auctions'); setEditingAuction(null); }}
                  className="btn btn-outline" 
                  style={{ padding: '1rem', minWidth: '120px' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE AUCTION TAB */}
        {activeTab === 'create-auction' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <button 
              onClick={() => {
                if (auctionForm.title || auctionForm.description || auctionForm.startPrice > 0) {
                  if (window.confirm('¿Descartar los cambios y volver?')) {
                    setAuctionForm({
  title: '',
  description: '',
  startPrice: 0,
  currentPrice: 0,
  buyNowPrice: 0,
  categoryId: '1',
  images: [],
  durationDays: 7,
  durationHours: 0,
  durationMinutes: 0,
  condition: 'new',
  featured: false,
  allowExtension: true
});
                    setActiveTab('auctions');
                  }
                } else {
                  setActiveTab('auctions');
                }
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                background: 'transparent',
                color: 'var(--text-secondary)',
                padding: '0.5rem 0',
                marginBottom: '1.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9375rem'
              }}
            >
              ← Volver a Subastas
            </button>

            <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Plus size={28} />
              Crear Nueva Subasta
            </h3>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Título de la Subasta *
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: iPhone 14 Pro Max 256GB Nuevo en Caja"
                  value={auctionForm.title}
                  onChange={(e) => setAuctionForm({...auctionForm, title: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  maxLength={100}
                />
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {auctionForm.title.length}/100 caracteres
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Descripción Completa *
                </label>
                <textarea 
                  placeholder="Describe el producto en detalle: características técnicas, estado, accesorios incluidos, garantía, etc..."
                  value={auctionForm.description}
                  onChange={(e) => setAuctionForm({...auctionForm, description: e.target.value})}
                  rows={6}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                  maxLength={1000}
                />
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {auctionForm.description.length}/1000 caracteres
                </div>
              </div>

              {/* Carga de Imágenes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Imágenes del Producto * (Máximo 3)
                </label>
                <div style={{ 
                  border: '2px dashed var(--border)', 
                  borderRadius: '0.75rem', 
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'var(--bg-tertiary)'
                }}>
                  <input 
                    type="file" 
                    id="auction-images"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      
                      // Validar cantidad
                      if (files.length > 3) {
                        alert('⚠️ Máximo 3 imágenes permitidas');
                        e.target.value = '';
                        return;
                      }

                      // Validar tamaño (máximo 2MB por imagen)
                      const maxSize = 2 * 1024 * 1024; // 2MB
                      const oversizedFiles = files.filter(f => f.size > maxSize);
                      
                      if (oversizedFiles.length > 0) {
                        alert('⚠️ Cada imagen debe pesar menos de 2MB\n\nImágenes rechazadas:\n' + 
                          oversizedFiles.map(f => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join('\n'));
                        e.target.value = '';
                        return;
                      }

                      // Procesar imágenes válidas
                      const readers = files.map(file => {
                        return new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = (e) => resolve(e.target?.result as string);
                          reader.readAsDataURL(file);
                        });
                      });

                      Promise.all(readers).then(images => {
                        setAuctionForm({...auctionForm, images: images as any});
                      });
                    }}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="auction-images" 
                    style={{ 
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <Package size={48} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        Haz clic para seleccionar imágenes
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        JPG, PNG o WEBP • Máximo 2MB por imagen • Hasta 3 imágenes
                      </div>
                    </div>
                  </label>
                </div>

                {/* Preview de imágenes */}
                {(auctionForm as any).images && (auctionForm as any).images.length > 0 && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                    gap: '1rem',
                    marginTop: '1rem' 
                  }}>
                    {(auctionForm as any).images.map((img: string, idx: number) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        <img 
                          src={img} 
                          alt={`Preview ${idx + 1}`}
                          style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => {
                            const newImages = [...(auctionForm as any).images];
                            newImages.splice(idx, 1);
                            setAuctionForm({...auctionForm, images: newImages as any});
                          }}
                          style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.125rem',
                            fontWeight: 'bold'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Precios */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Inicial * (en pesos)
                  </label>
                  <input 
                    type="number" 
                    placeholder="10000"
                    value={auctionForm.startPrice || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number(e.target.value);
                      setAuctionForm({
                        ...auctionForm, 
                        startPrice: value,
                        currentPrice: value
                      });
                    }}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Precio con el que inicia la subasta
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Compra Directa (opcional)
                  </label>
                  <input 
                    type="number" 
                    placeholder="Dejar vacío si no aplica"
                    value={auctionForm.buyNowPrice || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number(e.target.value);
                      setAuctionForm({...auctionForm, buyNowPrice: value});
                    }}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Dejar en 0 o vacío para desactivar
                  </div>
                </div>
              </div>

              {/* Duración de la Subasta */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                  Duración de la Subasta *
                </label>
                
                {/* Sugerencias rápidas */}
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => setAuctionForm({
                      ...auctionForm, 
                      durationDays: 0, 
                      durationHours: 0, 
                      durationMinutes: 15
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    ⚡ 15 min (Relámpago)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuctionForm({
                      ...auctionForm, 
                      durationDays: 0, 
                      durationHours: 0, 
                      durationMinutes: 30
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    ⚡ 30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuctionForm({
                      ...auctionForm, 
                      durationDays: 0, 
                      durationHours: 1, 
                      durationMinutes: 0
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    🕐 1 hora
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuctionForm({
                      ...auctionForm, 
                      durationDays: 1, 
                      durationHours: 0, 
                      durationMinutes: 0
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    📅 1 día
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuctionForm({
                      ...auctionForm, 
                      durationDays: 7, 
                      durationHours: 0, 
                      durationMinutes: 0
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    📅 7 días
                  </button>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                  gap: '1rem',
                  background: 'var(--bg-tertiary)',
                  padding: '1.25rem',
                  borderRadius: '0.75rem'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      Días
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={auctionForm.durationDays}
                      onChange={(e) => setAuctionForm({...auctionForm, durationDays: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                      min="0"
                      max="30"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      Horas
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={auctionForm.durationHours}
                      onChange={(e) => setAuctionForm({...auctionForm, durationHours: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                      min="0"
                      max="23"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      Minutos
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={auctionForm.durationMinutes}
                      onChange={(e) => setAuctionForm({...auctionForm, durationMinutes: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                      min="0"
                      max="59"
                    />
                  </div>
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--primary)', 
                  marginTop: '0.75rem',
                  fontWeight: 600 
                }}>
                  ⏱️ Duración total: {
                    (() => {
                      const days = auctionForm.durationDays;
                      const hours = auctionForm.durationHours;
                      const minutes = auctionForm.durationMinutes;
                      const parts = [];
                      if (days > 0) parts.push(`${days} día${days > 1 ? 's' : ''}`);
                      if (hours > 0) parts.push(`${hours} hora${hours > 1 ? 's' : ''}`);
                      if (minutes > 0) parts.push(`${minutes} minuto${minutes > 1 ? 's' : ''}`);
                      return parts.length > 0 ? parts.join(', ') : '⚠️ Debes definir una duración';
                    })()
                  }
                </div>
              </div>

              {/* Programar Subasta */}
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '1.25rem', 
                borderRadius: '0.75rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '1rem' }}>
                  <input 
                    type="checkbox"
                    checked={auctionForm.scheduled}
                    onChange={(e) => setAuctionForm({...auctionForm, scheduled: e.target.checked})}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600 }}>📅 Programar inicio de subasta</span>
                </label>

                {auctionForm.scheduled && (
                  <div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '1rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          Fecha de inicio
                        </label>
                        <input 
                          type="date" 
                          value={auctionForm.scheduledDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setAuctionForm({...auctionForm, scheduledDate: e.target.value})}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          Hora de inicio
                        </label>
                        <input 
                          type="time" 
                          value={auctionForm.scheduledTime}
                          onChange={(e) => setAuctionForm({...auctionForm, scheduledTime: e.target.value})}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      💡 La subasta se activará automáticamente en la fecha y hora programada
                    </div>
                  </div>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Categoría del Producto *
                </label>
                <select 
                  value={auctionForm.categoryId}
                  onChange={(e) => setAuctionForm({...auctionForm, categoryId: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                >
                  <option value="1">📱 Electrónica</option>
                  <option value="2">👕 Moda</option>
                  <option value="3">🏠 Hogar</option>
                  <option value="4">⚽ Deportes</option>
                  <option value="5">🧸 Juguetes</option>
                  <option value="6">📚 Libros</option>
                </select>
              </div>

              {/* Estado del Producto */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Estado del Producto *
                </label>
                <select 
                  value={(auctionForm as any).condition || 'new'}
                  onChange={(e) => setAuctionForm({...auctionForm, condition: e.target.value as any})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                >
                  <option value="new">🆕 Nuevo (sin usar)</option>
                  <option value="like-new">✨ Como Nuevo (usado 1-2 veces)</option>
                  <option value="excellent">⭐ Excelente (usado, impecable)</option>
                  <option value="good">👍 Muy Bueno (señales leves de uso)</option>
                  <option value="fair">👌 Bueno (usado, funcional)</option>
                </select>
              </div>

              {/* Opciones adicionales */}
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '1.25rem', 
                borderRadius: '0.75rem'
              }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Opciones Adicionales</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={(auctionForm as any).featured || false}
                      onChange={(e) => setAuctionForm({...auctionForm, featured: e.target.checked as any})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>⭐ Marcar como Destacada (aparecerá primero en la lista)</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={(auctionForm as any).allowExtension || true}
                      onChange={(e) => setAuctionForm({...auctionForm, allowExtension: e.target.checked as any})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>🕐 Permitir extensión automática (si hay ofertas en los últimos 5 min)</span>
                  </label>
                </div>
              </div>

              {/* Cuadro de Importante */}
              <div style={{ 
                background: '#FFA500', 
                color: '#000',
                padding: '1.25rem', 
                borderRadius: '0.75rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'start',
                border: '2px solid #FF8C00'
              }}>
                <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.9375rem' }}>
                  <strong>📝 Importante:</strong>
                  <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.25rem' }}>
                    <li>La subasta se creará en estado <strong>"activa"</strong> inmediatamente</li>
                    <li>Las ofertas deben ser múltiplos de <strong>$500</strong></li>
                    <li>Si no subes imágenes, se usarán imágenes de ejemplo</li>
                    <li>La duración mínima recomendada es <strong>1 día</strong></li>
                  </ul>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={() => {
                    // Validaciones
                    if (!auctionForm.title.trim()) {
                      alert('⚠️ Por favor ingresa un título para la subasta');
                      return;
                    }
                    if (auctionForm.title.trim().length < 10) {
                      alert('⚠️ El título debe tener al menos 10 caracteres');
                      return;
                    }
                    if (!auctionForm.description.trim()) {
                      alert('⚠️ Por favor ingresa una descripción');
                      return;
                    }
                    if (auctionForm.description.trim().length < 20) {
                      alert('⚠️ La descripción debe tener al menos 20 caracteres');
                      return;
                    }
                    if (auctionForm.startPrice <= 0) {
                      alert('⚠️ El precio inicial debe ser mayor a $0');
                      return;
                    }
                    if (auctionForm.buyNowPrice > 0 && auctionForm.buyNowPrice <= auctionForm.startPrice) {
                      alert('⚠️ El precio de compra directa debe ser mayor al precio inicial');
                      return;
                    }

                    // Calcular duración
                    const days = (auctionForm as any).durationDays || 7;
                    const hours = (auctionForm as any).durationHours || 0;
                    const minutes = (auctionForm as any).durationMinutes || 0;
                    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;

                    if (totalMinutes < 60) {
                      alert('⚠️ La duración mínima de la subasta es 1 hora');
                      return;
                    }

                    // Preparar imágenes
                    let images = (auctionForm as any).images || [];
                    if (images.length === 0) {
                      images = [
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'
                      ];
                    }

                    // Crear nueva subasta
                    const newAuction = {
                      id: Date.now().toString(),
                      title: auctionForm.title.trim(),
                      description: auctionForm.description.trim(),
                      images: images,
                      startPrice: auctionForm.startPrice,
                      currentPrice: auctionForm.startPrice,
                      buyNowPrice: auctionForm.buyNowPrice > 0 ? auctionForm.buyNowPrice : undefined,
                      endTime: new Date(Date.now() + totalMinutes * 60 * 1000),
                      status: 'active' as const,
                      categoryId: auctionForm.categoryId,
                      bids: [],
                      winnerId: undefined
                    };

                    // Agregar al estado
                    setAuctions([...auctions, newAuction]);
                    
                    // Resetear formulario
                    setAuctionForm({
  title: '',
  description: '',
  startPrice: 0,
  currentPrice: 0,
  buyNowPrice: 0,
  categoryId: '1',
  images: [],
  durationDays: 7,
  durationHours: 0,
  durationMinutes: 0,
  condition: 'new',
  featured: false,
  allowExtension: true
});

                    // Limpiar input de imágenes
                    const imageInput = document.getElementById('auction-images') as HTMLInputElement;
                    if (imageInput) imageInput.value = '';

                    // Notificar
                    alert('✅ ¡Subasta creada exitosamente!\n\n📌 La subasta está ahora activa y visible para todos los usuarios.');
                    setActiveTab('auctions');
                  }}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1.125rem', fontSize: '1.0625rem', fontWeight: 600 }}
                >
                  ✨ Crear Subasta
                </button>
                <button 
                  onClick={() => {
                    if (auctionForm.title || auctionForm.description || auctionForm.startPrice > 0) {
                      if (window.confirm('¿Descartar los cambios y volver?')) {
                        setAuctionForm({
  title: '',
  description: '',
  startPrice: 0,
  currentPrice: 0,
  buyNowPrice: 0,
  categoryId: '1',
  images: [],
  durationDays: 7,
  durationHours: 0,
  durationMinutes: 0,
  condition: 'new',
  featured: false,
  allowExtension: true
});
                        const imageInput = document.getElementById('auction-images') as HTMLInputElement;
                        if (imageInput) imageInput.value = '';
                        setActiveTab('auctions');
                      }
                    } else {
                      setActiveTab('auctions');
                    }
                  }}
                  className="btn btn-outline" 
                  style={{ padding: '1.125rem', minWidth: '140px', fontSize: '1rem' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Package size={28} />
                Gestión de Productos
              </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                  Total: <strong style={{ color: 'var(--primary)' }}>{products.length}</strong> productos
                </span>
                <button className="btn btn-primary" onClick={() => alert('Función de crear producto en desarrollo')}>
                  <Plus size={18} />
                  Nuevo Producto
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {products.map(product => (
                <div key={product.id} style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{product.name}</h4>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                      {formatCurrency(product.price)}
                    </div>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: product.stock < 5 ? 'var(--error)' : 'var(--success)',
                      marginBottom: '1rem'
                    }}>
                      Stock: {product.stock} unidades
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="btn btn-outline" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        style={{ padding: '0.5rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDIT PRODUCT TAB */}
        {activeTab === 'edit-product' && editingProduct && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Edit size={28} />
              Editar Producto: {editingProduct.name}
            </h3>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nombre</label>
                <input 
                  type="text" 
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Descripción</label>
                <textarea 
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  rows={4}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Precio</label>
                  <input 
                    type="number" 
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Stock</label>
                  <input 
                    type="number" 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={handleSaveProduct}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem', fontSize: '1.0625rem' }}
                >
                  💾 Guardar Cambios
                </button>
                <button 
                  onClick={() => { setActiveTab('products'); setEditingProduct(null); }}
                  className="btn btn-outline" 
                  style={{ padding: '1rem', minWidth: '120px' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
{/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div>
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BarChart3 size={28} />
                Control de Inventario
              </h3>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setInventoryFilter('all')}
                  className={inventoryFilter === 'all' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ padding: '0.75rem 1.25rem' }}
                >
                  Todos ({products.length})
                </button>
                <button 
                  onClick={() => setInventoryFilter('low')}
                  className={inventoryFilter === 'low' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ padding: '0.75rem 1.25rem' }}
                >
                  Stock Bajo ({lowStockProducts.length})
                </button>
                <button 
                  onClick={() => setInventoryFilter('out')}
                  className={inventoryFilter === 'out' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ padding: '0.75rem 1.25rem' }}
                >
                  Sin Stock ({outOfStockProducts.length})
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                  <Package size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {products.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Productos</div>
                </div>
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                  <DollarSign size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
                    {formatCurrency(totalInventoryValue)}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Valor Total</div>
                </div>
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                  <AlertCircle size={24} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>
                    {lowStockProducts.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Stock Bajo</div>
                </div>
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                  <AlertCircle size={24} color="var(--error)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--error)' }}>
                    {outOfStockProducts.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Sin Stock</div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' }}>
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
          </div>
        )}

        {/* BOTS TAB */}
        {activeTab === 'bots' && (
          <div>
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', marginBottom: '2rem', boxShadow: '0 2px 8px var(--shadow)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Plus size={24} />
                Crear Nuevo Bot
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nombre del Bot</label>
                  <input 
                    type="text" 
                    placeholder="Bot 1" 
                    value={botForm.name}
                    onChange={(e) => setBotForm({...botForm, name: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Saldo Disponible</label>
                  <input 
                    type="number" 
                    value={botForm.balance}
                    onChange={(e) => setBotForm({...botForm, balance: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Intervalo Mín (min)</label>
                  <input 
                    type="number" 
                    value={botForm.intervalMin}
                    onChange={(e) => setBotForm({...botForm, intervalMin: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Intervalo Máx (min)</label>
                  <input 
                    type="number" 
                    value={botForm.intervalMax}
                    onChange={(e) => setBotForm({...botForm, intervalMax: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Oferta Máxima</label>
                  <input 
                    type="number" 
                    value={botForm.maxBidAmount}
                    onChange={(e) => setBotForm({...botForm, maxBidAmount: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={handleAddBot} className="btn btn-primary" style={{ width: '100%' }}>
                    <Plus size={18} />
                    Crear Bot
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bot size={24} />
                Bots Activos ({bots.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bots.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <Bot size={64} color="var(--text-tertiary)" style={{ marginBottom: '1rem' }} />
                    <p>No hay bots configurados. Crea tu primer bot arriba.</p>
                  </div>
                ) : (
                  bots.map(bot => (
                    <div key={bot.id} style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                          <Bot size={24} color="var(--primary)" />
                          <h4 style={{ margin: 0 }}>{bot.name}</h4>
                          <span className={bot.isActive ? 'badge badge-success' : 'badge badge-error'}>
                            {bot.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <div>Saldo: <strong>{formatCurrency(bot.balance)}</strong></div>
                          <div>Intervalo: <strong>{bot.intervalMin}-{bot.intervalMax}min</strong></div>
                          <div>Oferta Máx: <strong>{formatCurrency(bot.maxBidAmount)}</strong></div>
                          <div>Subastas: <strong>{bot.targetAuctions.length || 'Todas'}</strong></div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => updateBot(bot.id, { isActive: !bot.isActive })}
                          className="btn btn-outline"
                          style={{ padding: '0.625rem 1rem' }}
                        >
                          {bot.isActive ? 'Pausar' : 'Activar'}
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`¿Eliminar el bot "${bot.name}"?`)) {
                              deleteBot(bot.id);
                            }
                          }}
                          style={{ padding: '0.625rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Resumen de Ventas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <span>Total Vendido</span>
                    <strong style={{ color: 'var(--primary)' }}>{formatCurrency(totalRevenue)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <span>Pedidos Completados</span>
                    <strong>{delivered}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <span>En Proceso</span>
                    <strong>{inTransit + orders.filter(o => o.status === 'preparing').length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ticket Promedio</span>
                    <strong style={{ color: 'var(--success)' }}>
                      {delivered > 0 ? formatCurrency(totalRevenue / delivered) : '$0'}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Estado de Pedidos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { status: 'pending_payment' as OrderStatus, label: 'Pendiente de Pago' },
                    { status: 'payment_confirmed' as OrderStatus, label: 'Pago Confirmado' },
                    { status: 'preparing' as OrderStatus, label: 'Preparando' },
                    { status: 'in_transit' as OrderStatus, label: 'En Tránsito' },
                    { status: 'delivered' as OrderStatus, label: 'Entregado' }
                  ].map(({ status, label }) => {
                    const count = orders.filter(o => o.status === status).length;
                    const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;

                  {/* Modal de Detalles de Usuario */}
      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            loadUsers();
            setSelectedUser(null);
          }}
        />
      )}
                    
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem' }}>{label}</span>
                          <strong>{count}</strong>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            background: getStatusColor(status),
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Exportar Reportes</h3>
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={18} />
                  Descargar Excel
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>
                Exporta todos los datos de pedidos, productos y subastas en formato Excel para análisis detallado.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Orden */}
      {selectedOrder && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
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
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Detalle del Pedido</h2>
              <button 
                onClick={() => setSelectedOrder(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <img 
                src={selectedOrder.productImage} 
                alt={selectedOrder.productName}
                style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '0.75rem' }}
              />

              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>{selectedOrder.productName}</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {selectedOrder.productType === 'auction' ? '🔨 Subasta' : '🛒 Tienda'} • ID: {selectedOrder.id}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {formatCurrency(selectedOrder.amount)}
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Cliente</h4>
                <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <Users size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    {selectedOrder.userName}
                  </div>
                  <div>
                    <MapPin size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    {selectedOrder.address.street}, {selectedOrder.address.locality}, {selectedOrder.address.province}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Estado Actual</h4>
                <div style={{ 
                  padding: '1rem', 
                  background: getStatusColor(selectedOrder.status) + '20', 
                  color: getStatusColor(selectedOrder.status),
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  fontSize: '1.125rem'
                }}>
                  {getStatusText(selectedOrder.status)}
                </div>

                {selectedOrder.status === 'pending_payment' && selectedOrder.expiresAt && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <Clock size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    <strong>Expira en: {getTimeRemaining(selectedOrder.expiresAt)}</strong>
                  </div>
                )}

                {selectedOrder.trackingNumber && (
                  <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                    <Truck size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Tracking: <strong>{selectedOrder.trackingNumber}</strong>
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ marginBottom: '0.75rem' }}>Cambiar Estado</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {selectedOrder.status === 'pending_payment' && (
                    <button 
                      onClick={() => handleStatusChange(selectedOrder.id, 'payment_confirmed')}
                      className="btn"
                      style={{ background: 'var(--success)', color: 'white', padding: '0.75rem' }}
                    >
                      <CheckCircle size={16} />
                      Confirmar Pago
                    </button>
                  )}
                  {selectedOrder.status === 'payment_confirmed' && (
                    <button 
                      onClick={() => handleStatusChange(selectedOrder.id, 'preparing')}
                      className="btn btn-primary"
                      style={{ padding: '0.75rem' }}
                    >
                      Preparar Envío
                    </button>
                  )}
                  {selectedOrder.status === 'preparing' && (
                    <button 
                      onClick={() => handleStatusChange(selectedOrder.id, 'in_transit')}
                      className="btn"
                      style={{ background: 'var(--secondary)', color: 'white', padding: '0.75rem' }}
                    >
                      <Truck size={16} />
                      En Tránsito
                    </button>
                  )}
                  {selectedOrder.status === 'in_transit' && (
                    <button 
                      onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                      className="btn"
                      style={{ background: 'var(--success)', color: 'white', padding: '0.75rem' }}
                    >
                      <CheckCircle size={16} />
                      Entregado
                    </button>
                  )}
                  {['pending_payment', 'payment_confirmed', 'preparing'].includes(selectedOrder.status) && (
                    <button 
                      onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}
                      className="btn"
                      style={{ background: 'var(--error)', color: 'white', padding: '0.75rem' }}
                    >
                      <XCircle size={16} />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {(selectedOrder.paidAt || selectedOrder.shippedAt || selectedOrder.deliveredAt) && (
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>Historial</h4>
                  <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                      Creado: {new Date(selectedOrder.createdAt).toLocaleString('es-AR')}
                    </div>
                    {selectedOrder.paidAt && (
                      <div>
                        <CheckCircle size={16} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--success)' }} />
                        Pagado: {new Date(selectedOrder.paidAt).toLocaleString('es-AR')}
                      </div>
                    )}
                    {selectedOrder.shippedAt && (
                      <div>
                        <Truck size={16} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--secondary)' }} />
                        Enviado: {new Date(selectedOrder.shippedAt).toLocaleString('es-AR')}
                      </div>
                    )}
                    {selectedOrder.deliveredAt && (
                      <div>
                        <CheckCircle size={16} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--primary)' }} />
                        Entregado: {new Date(selectedOrder.deliveredAt).toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Usuario */}
      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            loadUsers();
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminPanelPro;
