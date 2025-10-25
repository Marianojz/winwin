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
import ImageUploader from '../components/ImageUploader';

const AdminPanel = () => {
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
      title: auction.title,
      description: auction.description,
      startPrice: auction.startPrice,
      currentPrice: auction.currentPrice,
      buyNowPrice: auction.buyNowPrice || 0,
      categoryId: auction.categoryId,
      images: auction.images || [],
      durationDays: 0,
      durationHours: 0,
      durationMinutes: 30,
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

  // Tabs de navegación
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { id: 'users', label: 'Usuarios', icon: <Users size={18} /> },
    { id: 'orders', label: 'Pedidos', icon: <ShoppingBag size={18} /> },
    { id: 'auctions', label: 'Subastas', icon: <Gavel size={18} /> },
    { id: 'create-auction', label: 'Crear Subasta', icon: <Plus size={18} /> },
    { id: 'products', label: 'Productos', icon: <Package size={18} /> },
    { id: 'bots', label: 'Bots', icon: <Bot size={18} /> }
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem 0', background: 'var(--bg-primary)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BarChart3 size={36} />
            Panel de Administración
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Gestión completa de la plataforma
          </p>
        </div>

        {/* Tabs de navegación */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          marginBottom: '2rem',
          padding: '0.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: '0.75rem'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
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
            {/* Alertas importantes */}
            {expiringSoon > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--error)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
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
                </div>
              </div>
            )}

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

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--primary)' }}>
                <Users size={28} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{activeUsers}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Usuarios Activos</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--warning)' }}>
                <Gavel size={28} color="var(--warning)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{activeAuctions}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Subastas Activas</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--secondary)' }}>
                <Package size={28} color="var(--secondary)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{products.length}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Productos en Tienda</div>
              </div>
            </div>

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
                  onClick={() => setActiveTab('create-auction')}
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}
                >
                  <Plus size={16} />
                  Nueva Subasta
                </button>
                <button 
                  onClick={() => setActiveTab('create-product')}
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

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={28} />
                Usuarios Registrados
              </h3>
              <button onClick={loadUsers} className="btn btn-outline">
                <RefreshCw size={18} />
                Actualizar
              </button>
            </div>

            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Activity size={48} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
              </div>
            ) : realUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Users size={64} color="var(--text-secondary)" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>No hay usuarios registrados aún</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {realUsers.map(u => (
                  <div 
                    key={u.id} 
                    style={{ 
                      padding: '1.5rem', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <img 
                          src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&size=48&background=FF6B00&color=fff&bold=true`}
                          alt={u.username}
                          style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                        />
                        <div>
                          <h4 style={{ margin: 0 }}>{u.username || 'Usuario'}</h4>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{u.email}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <span>DNI: {u.dni || 'No especificado'}</span>
                        <span>•</span>
                        <span>Registrado: {new Date(u.createdAt).toLocaleDateString('es-AR')}</span>
                        <span>•</span>
                        <span className={u.role === 'admin' ? 'badge badge-warning' : 'badge badge-success'}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(u)}
                      className="btn btn-outline"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Eye size={16} />
                      Ver Detalles
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal de detalles de usuario */}
        {selectedUser && (
          <UserDetailsModal 
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={loadUsers}
          />
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShoppingBag size={28} />
              Gestión de Pedidos
            </h3>
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <ShoppingBag size={64} color="var(--text-secondary)" />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                Sistema de gestión de pedidos - En desarrollo
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Total de pedidos: {orders.length}
              </p>
            </div>
          </div>
        )}

        {/* CREATE PRODUCT TAB */}
        {activeTab === 'create-product' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Plus size={28} />
              Crear Nuevo Producto para la Tienda
            </h3>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Nombre del Producto */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Nombre del Producto *
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Auriculares Bluetooth Sony WH-1000XM5"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                />
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Mínimo 5 caracteres - Sé descriptivo y claro
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Descripción Detallada *
                </label>
                <textarea 
                  placeholder="Describe el producto: características, especificaciones, qué incluye, etc."
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  rows={5}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                />
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Mínimo 20 caracteres - Incluye toda la información relevante
                </div>
              </div>

              {/* Precio y Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio * (en pesos)
                  </label>
                  <input 
                    type="number" 
                    placeholder="15000"
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Stock Disponible *
                  </label>
                  <input 
                    type="number" 
                    placeholder="10"
                    value={productForm.stock || ''}
                    onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Categoría *
                </label>
                <select 
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
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

              {/* Cuadro Informativo */}
              <div style={{ 
                background: '#E3F2FD', 
                color: '#0D47A1',
                padding: '1.25rem', 
                borderRadius: '0.75rem',
                border: '2px solid #2196F3'
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                  <div style={{ fontSize: '1.5rem' }}>ℹ️</div>
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 700 }}>
                      Importante - Productos de la Tienda
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
                      <li>Los productos se venden al precio fijo indicado</li>
                      <li>El stock se descuenta automáticamente al confirmar la compra</li>
                      <li>Podés editar precio y stock en cualquier momento</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={() => {
                    // Validaciones
                    if (!productForm.name.trim()) {
                      alert('⚠️ Por favor ingresa un nombre para el producto');
                      return;
                    }
                    if (productForm.name.trim().length < 5) {
                      alert('⚠️ El nombre debe tener al menos 5 caracteres');
                      return;
                    }
                    if (!productForm.description.trim()) {
                      alert('⚠️ Por favor ingresa una descripción');
                      return;
                    }
                    if (productForm.description.trim().length < 20) {
                      alert('⚠️ La descripción debe tener al menos 20 caracteres');
                      return;
                    }
                    if (productForm.price <= 0) {
                      alert('⚠️ El precio debe ser mayor a $0');
                      return;
                    }
                    if (productForm.stock < 0) {
                      alert('⚠️ El stock no puede ser negativo');
                      return;
                    }

                    // Crear el producto
                    const newProduct = {
                      id: Date.now().toString(),
                      name: productForm.name.trim(),
                      description: productForm.description.trim(),
                      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
                      price: productForm.price,
                      stock: productForm.stock,
                      categoryId: productForm.categoryId,
                      ratings: [],
                      averageRating: 0
                    };

                    setProducts([...products, newProduct]);
                    
                    // Resetear formulario
                    setProductForm({
                      name: '',
                      description: '',
                      price: 0,
                      stock: 0,
                      categoryId: '1'
                    });

                    alert('✅ ¡Producto creado exitosamente!\n\n📌 El producto ya está visible en la Tienda.');
                    setActiveTab('products');
                  }}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1.125rem', fontSize: '1.0625rem', fontWeight: 600 }}
                >
                  ✨ Crear Producto
                </button>
                <button 
                  onClick={() => {
                    if (productForm.name || productForm.description || productForm.price > 0) {
                      if (window.confirm('¿Descartar los cambios y volver?')) {
                        setProductForm({
                          name: '',
                          description: '',
                          price: 0,
                          stock: 0,
                          categoryId: '1'
                        });
                        setActiveTab('products');
                      }
                    } else {
                      setActiveTab('products');
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Package size={28} />
                Productos de la Tienda
              </h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select 
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value)}
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                >
                  <option value="all">Todos los productos</option>
                  <option value="low-stock">Stock bajo (menos de 5)</option>
                  <option value="out-of-stock">Sin stock</option>
                  <option value="in-stock">Con stock</option>
                </select>
                <button 
                  onClick={() => setActiveTab('create-product')}
                  className="btn btn-primary"
                >
                  <Plus size={18} />
                  Nuevo Producto
                </button>
              </div>
            </div>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Package size={64} color="var(--text-secondary)" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>No hay productos en la tienda</p>
                <button 
                  onClick={() => setActiveTab('create-product')}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                >
                  <Plus size={18} />
                  Crear Primer Producto
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {products
                  .filter(product => {
                    switch (inventoryFilter) {
                      case 'low-stock': return product.stock < 5 && product.stock > 0;
                      case 'out-of-stock': return product.stock === 0;
                      case 'in-stock': return product.stock > 0;
                      default: return true;
                    }
                  })
                  .map(product => (
                    <div 
                      key={product.id} 
                      style={{ 
                        padding: '1.5rem', 
                        background: 'var(--bg-tertiary)', 
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border)',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        gap: '1.5rem',
                        alignItems: 'center'
                      }}
                    >
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        style={{ width: '80px', height: '80px', borderRadius: '0.5rem', objectFit: 'cover' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.name}
                        </h4>
                        <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {product.description}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(product.price)}</span>
                          <span style={{ color: product.stock > 5 ? 'var(--success)' : product.stock > 0 ? 'var(--warning)' : 'var(--error)' }}>
                            Stock: {product.stock}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Categoría: {['Electrónica', 'Moda', 'Hogar', 'Deportes', 'Juguetes', 'Libros'][parseInt(product.categoryId) - 1]}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="btn btn-outline"
                          style={{ padding: '0.5rem', color: 'var(--error)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Nombre del Producto *
                </label>
                <input 
                  type="text" 
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Descripción *
                </label>
                <textarea 
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  rows={5}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio *
                  </label>
                  <input 
                    type="number" 
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Stock Disponible *
                  </label>
                  <input 
                    type="number" 
                    value={productForm.stock || ''}
                    onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Categoría *
                </label>
                <select 
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
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

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={handleSaveProduct}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1.125rem', fontSize: '1.0625rem', fontWeight: 600 }}
                >
                  💾 Guardar Cambios
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Descartar los cambios?')) {
                      setEditingProduct(null);
                      setActiveTab('products');
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

        {/* CREATE AUCTION TAB */}
        {activeTab === 'create-auction' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
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
                  placeholder="Ej: iPhone 15 Pro Max 256GB Nuevo Sellado"
                  value={auctionForm.title}
                  onChange={(e) => setAuctionForm({...auctionForm, title: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Descripción Detallada *
                </label>
                <textarea 
                  placeholder="Describe el artículo: estado, características, qué incluye, etc."
                  value={auctionForm.description}
                  onChange={(e) => setAuctionForm({...auctionForm, description: e.target.value})}
                  rows={5}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>

              {/* Precios */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Inicial *
                  </label>
                  <input 
                    type="number" 
                    placeholder="1000"
                    value={auctionForm.startPrice || ''}
                    onChange={(e) => setAuctionForm({...auctionForm, startPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Actual *
                  </label>
                  <input 
                    type="number" 
                    placeholder="1000"
                    value={auctionForm.currentPrice || ''}
                    onChange={(e) => setAuctionForm({...auctionForm, currentPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Compra Ya (opcional)
                  </label>
                  <input 
                    type="number" 
                    placeholder="15000"
                    value={auctionForm.buyNowPrice || ''}
                    onChange={(e) => setAuctionForm({...auctionForm, buyNowPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Categoría *
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

              {/* Imágenes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Imágenes del Producto
                </label>
                <ImageUploader 
  images={productForm.images}
  onImagesChange={(images: string[]) => setProductForm({...productForm, images})}
/>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={() => {
                    // Validaciones básicas
                    if (!auctionForm.title.trim()) {
                      alert('⚠️ Por favor ingresa un título para la subasta');
                      return;
                    }
                    if (!auctionForm.description.trim()) {
                      alert('⚠️ Por favor ingresa una descripción');
                      return;
                    }
                    if (auctionForm.startPrice <= 0) {
                      alert('⚠️ El precio inicial debe ser mayor a $0');
                      return;
                    }
                    if (auctionForm.currentPrice < auctionForm.startPrice) {
                      alert('⚠️ El precio actual no puede ser menor al precio inicial');
                      return;
                    }

                    // Crear la subasta
                    const newAuction = {
                      id: Date.now().toString(),
                      title: auctionForm.title.trim(),
                      description: auctionForm.description.trim(),
                      images: auctionForm.images.length > 0 ? auctionForm.images : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
                      startPrice: auctionForm.startPrice,
                      currentPrice: auctionForm.currentPrice,
                      buyNowPrice: auctionForm.buyNowPrice || undefined,
                      categoryId: auctionForm.categoryId,
                      status: 'active',
                      bids: [],
                      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };

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

                    alert('✅ ¡Subasta creada exitosamente!\n\n📌 La subasta ya está activa y visible para los usuarios.');
                    setActiveTab('auctions');
                  }}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1.125rem', fontSize: '1.0625rem', fontWeight: 600 }}
                >
                  🎯 Crear Subasta
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

        {/* AUCTIONS TAB */}
        {activeTab === 'auctions' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Gavel size={28} />
                Gestión de Subastas
              </h3>
              <button 
                onClick={() => setActiveTab('create-auction')}
                className="btn btn-primary"
              >
                <Plus size={18} />
                Nueva Subasta
              </button>
            </div>

            {auctions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Gavel size={64} color="var(--text-secondary)" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>No hay subastas creadas</p>
                <button 
                  onClick={() => setActiveTab('create-auction')}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                >
                  <Plus size={18} />
                  Crear Primera Subasta
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {auctions.map(auction => (
                  <div 
                    key={auction.id} 
                    style={{ 
                      padding: '1.5rem', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '1.5rem',
                      alignItems: 'center'
                    }}
                  >
                    <img 
                      src={auction.images[0]} 
                      alt={auction.title}
                      style={{ width: '80px', height: '80px', borderRadius: '0.5rem', objectFit: 'cover' }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {auction.title}
                      </h4>
                      <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {auction.description}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {formatCurrency(auction.currentPrice)}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Ofertas: {auction.bids.length}
                        </span>
                        <span className={`badge badge-${auction.status === 'active' ? 'success' : auction.status === 'ended' ? 'secondary' : 'warning'}`}>
                          {auction.status === 'active' ? 'Activa' : auction.status === 'ended' ? 'Finalizada' : 'Programada'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Finaliza: {new Date(auction.endTime).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleEditAuction(auction)}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem' }}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteAuction(auction.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem', color: 'var(--error)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Título de la Subasta *
                </label>
                <input 
                  type="text" 
                  value={auctionForm.title}
                  onChange={(e) => setAuctionForm({...auctionForm, title: e.target.value})}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Descripción *
                </label>
                <textarea 
                  value={auctionForm.description}
                  onChange={(e) => setAuctionForm({...auctionForm, description: e.target.value})}
                  rows={5}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Inicial *
                  </label>
                  <input 
                    type="number" 
                    value={auctionForm.startPrice || ''}
                    onChange={(e) => setAuctionForm({...auctionForm, startPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Actual *
                  </label>
                  <input 
                    type="number" 
                    value={auctionForm.currentPrice || ''}
                    onChange={(e) => setAuctionForm({...auctionForm, currentPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Precio Compra Ya (opcional)
                  </label>
                  <input 
                    type="number" 
                    value={auctionForm.buyNowPrice || ''}
                    onChange={(e) => setAuctionForm({...auctionForm, buyNowPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Categoría *
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

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={handleSaveAuction}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1.125rem', fontSize: '1.0625rem', fontWeight: 600 }}
                >
                  💾 Guardar Cambios
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Descartar los cambios?')) {
                      setEditingAuction(null);
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
      </div>
    </div>
  );
};

export default AdminPanel;
