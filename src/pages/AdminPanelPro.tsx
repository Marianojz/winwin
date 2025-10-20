import { useState } from 'react';
import { 
  Users, Gavel, Package, Bot, TrendingUp, DollarSign, Plus, Edit, Trash2, RefreshCw, AlertCircle, 
  Clock, CheckCircle, XCircle, Truck, FileText, Download, Eye, Search, Filter, Calendar, Activity,
  ShoppingBag, Timer, AlertTriangle, MapPin, BarChart3, Award
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Product, Auction, Order, OrderStatus } from '../types';

const AdminPanelPro = () => {
  const { 
    user, auctions, products, bots, orders, notifications,
    addBot, updateBot, deleteBot, setProducts, setAuctions, updateOrderStatus 
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  
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
    categoryId: '1'
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
      title: auction.title,
      description: auction.description,
      startPrice: auction.startPrice,
      currentPrice: auction.currentPrice,
      buyNowPrice: auction.buyNowPrice || 0,
      categoryId: auction.categoryId
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
                    Total: <strong style={{ color: 'var(--primary)' }}>{activeUsers}</strong> usuarios
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Award size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>5</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Administradores</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Users size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>{activeUsers}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Usuarios Activos</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Clock size={24} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>23</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nuevos Hoy</div>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { id: '1', name: 'Juan Pérez', email: 'juan@email.com', role: 'Usuario', status: 'Activo', orders: 12 },
                    { id: '2', name: 'María García', email: 'maria@email.com', role: 'Usuario', status: 'Activo', orders: 8 },
                    { id: '3', name: 'Carlos López', email: 'carlos@email.com', role: 'Usuario', status: 'Activo', orders: 15 },
                    { id: '4', name: user?.username || 'Admin', email: user?.email || 'admin@email.com', role: 'Admin', status: 'Activo', orders: 0 }
                  ].map((mockUser) => (
                    <div key={mockUser.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{mockUser.name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{mockUser.email}</div>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {mockUser.orders} pedidos
                      </div>
                      <span className={mockUser.role === 'Admin' ? 'badge badge-warning' : 'badge badge-success'}>
                        {mockUser.role}
                      </span>
                      <span className={mockUser.status === 'Activo' ? 'badge badge-success' : 'badge badge-error'}>
                        {mockUser.status}
                      </span>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                        onClick={() => alert(`Ver detalles de ${mockUser.name}`)}
                      >
                        <Eye size={16} />
                        Ver
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.5rem' }}>
                          <Edit size={16} />
                        </button>
                        {mockUser.role !== 'Admin' && (
                          <button style={{ padding: '0.5rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '0.5rem' }}>💡 <strong>Nota:</strong> Esta es una vista previa con datos de ejemplo.</p>
              <p style={{ fontSize: '0.875rem' }}>La gestión completa de usuarios estará disponible en la próxima actualización.</p>
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
                <button className="btn btn-primary" onClick={() => alert('Función de crear subasta en desarrollo')}>
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
