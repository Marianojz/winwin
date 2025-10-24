import { useState } from 'react';
import { Users, Gavel, Package, Bot, TrendingUp, DollarSign, Plus, Edit, Trash2, RefreshCw, AlertCircle, Calendar, Award, BarChart3, Activity, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Product, Auction } from '../types';

const AdminPanel = () => {
  const { user, auctions, products, bots, addBot, updateBot, deleteBot, setProducts, setAuctions, notifications } = useStore();
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

  // Cálculos estadísticos
  const totalBids = auctions.reduce((sum, a) => sum + a.bids.length, 0);
  const totalRevenue = auctions.reduce((sum, a) => sum + a.currentPrice, 0) + products.reduce((sum, p) => sum + p.price * (20 - p.stock), 0);
  const activeUsers = 150; // Mock
  const totalOrders = 45; // Mock
  const activeAuctions = auctions.filter(a => a.status === 'active').length;
  const endedAuctions = auctions.filter(a => a.status === 'ended').length;
  const lowStockProducts = products.filter(p => p.stock < 5 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const avgBidsPerAuction = auctions.length > 0 ? (totalBids / auctions.length).toFixed(1) : 0;
  const conversionRate = totalOrders > 0 ? ((totalOrders / activeUsers) * 100).toFixed(1) : 0;

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
            { id: 'users', label: 'Usuarios', icon: <Users size={18} /> },
            { id: 'auctions', label: 'Subastas', icon: <Gavel size={18} /> },
            { id: 'products', label: 'Productos', icon: <Package size={18} /> },
            { id: 'inventory', label: 'Inventario', icon: <BarChart3 size={18} /> },
            { id: 'bots', label: 'Bots', icon: <Bot size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.875rem 1.5rem',
                background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-secondary)',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '0.75rem',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
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
            {/* Métricas Principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8533)', padding: '2rem', borderRadius: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(255, 107, 0, 0.2)' }}>
                <Users size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{activeUsers}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Usuarios Activos</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #0044AA, #3366CC)', padding: '2rem', borderRadius: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(0, 68, 170, 0.2)' }}>
                <Gavel size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{activeAuctions}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Subastas Activas</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #00C853, #03DAC6)', padding: '2rem', borderRadius: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(0, 200, 83, 0.2)' }}>
                <Package size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{products.length}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Productos en Venta</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #BB86FC, #9C64E7)', padding: '2rem', borderRadius: '1rem', color: 'white', boxShadow: '0 4px 12px rgba(187, 134, 252, 0.2)' }}>
                <DollarSign size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{formatCurrency(totalRevenue)}</div>
                <div style={{ opacity: 0.9, fontSize: '0.9375rem' }}>Ingresos Totales</div>
              </div>
            </div>

            {/* Estadísticas Detalladas y Alertas */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Estadísticas */}
              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={24} />
                  Estadísticas Detalladas
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total de Ofertas</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{totalBids}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pedidos Completados</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{totalOrders}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tasa de Conversión</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{conversionRate}%</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Promedio Ofertas/Subasta</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--secondary)' }}>{avgBidsPerAuction}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Subastas Finalizadas</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{endedAuctions}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Bots Activos</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {bots.filter(b => b.isActive).length}/{bots.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alertas y Acciones */}
              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={24} />
                  Alertas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {lowStockProducts.length > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--warning)', color: 'var(--text-primary)', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
                      <strong>{lowStockProducts.length}</strong> productos con stock bajo
                    </div>
                  )}
                  {outOfStockProducts.length > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--error)', color: 'white', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
                      <strong>{outOfStockProducts.length}</strong> productos sin stock
                    </div>
                  )}
                  {activeAuctions > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--success)', color: 'white', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
                      <strong>{activeAuctions}</strong> subastas activas
                    </div>
                  )}
                  {notifications.filter(n => !n.read).length > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
                      <strong>{notifications.filter(n => !n.read).length}</strong> notificaciones sin leer
                    </div>
                  )}
                </div>

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem' }}>Acciones Rápidas</h3>
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

            {/* Valor de Inventario */}
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={24} />
                Resumen de Inventario
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Valor Total Inventario</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(totalInventoryValue)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Productos Únicos</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>{products.length}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Unidades Totales</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--secondary)' }}>
                    {products.reduce((sum, p) => sum + p.stock, 0)}
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Precio Promedio</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>
                    {formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / products.length)}
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
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={28} />
                Gestión de Usuarios
              </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                  Total: <strong style={{ color: 'var(--primary)' }}>{activeUsers}</strong> usuarios
                </span>
                <button className="btn btn-primary">
                  <Plus size={18} />
                  Nuevo Usuario
                </button>
              </div>
            </div>

            {/* Estadísticas de Usuarios */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                <Users size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{activeUsers}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Usuarios Activos</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                <Award size={24} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)' }}>2</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Administradores</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                <Calendar size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>23</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Registros Hoy</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                <Activity size={24} color="var(--secondary)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--secondary)' }}>87%</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tasa Actividad</div>
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
                  Finalizadas: <strong style={{ color: 'var(--error)' }}>{endedAuctions}</strong>
                </span>
                <button className="btn btn-primary" onClick={() => alert('Función de crear subasta en desarrollo')}>
                  <Plus size={18} />
                  Nueva Subasta
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {auctions.map(auction => (
                <div key={auction.id} style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', border: '2px solid var(--border)', transition: 'all 0.2s ease' }}>
                  <img 
                    src={auction.images[0]} 
                    alt={auction.title}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, flex: 1 }}>{auction.title}</h4>
                    <span className={auction.status === 'active' ? 'badge badge-success' : 'badge badge-error'}>
                      {auction.status === 'active' ? 'Activa' : 'Finalizada'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Precio inicial:</span>
                      <strong>{formatCurrency(auction.startPrice)}</strong>
                    </p>
                    <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Precio actual:</span>
                      <strong style={{ color: 'var(--primary)' }}>{formatCurrency(auction.currentPrice)}</strong>
                    </p>
                    {auction.buyNowPrice && (
                      <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Compra directa:</span>
                        <strong style={{ color: 'var(--warning)' }}>{formatCurrency(auction.buyNowPrice)}</strong>
                      </p>
                    )}
                    <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ofertas:</span>
                      <strong>{auction.bids.length}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEditAuction(auction)}
                      className="btn btn-outline" 
                      style={{ flex: 1, padding: '0.625rem' }}
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteAuction(auction.id)}
                      style={{ padding: '0.625rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDIT AUCTION TAB */}
        {activeTab === 'edit-auction' && editingAuction && (
          <div>
            <button 
              onClick={() => { setActiveTab('auctions'); setEditingAuction(null); }}
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

            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Edit size={24} />
                Editar Subasta: {editingAuction.title}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Título de la Subasta</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Precio Inicial</label>
                    <input 
                      type="number" 
                      value={auctionForm.startPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, startPrice: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Precio con el que inicia la subasta
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Precio Actual</label>
                    <input 
                      type="number" 
                      value={auctionForm.currentPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, currentPrice: Number(e.target.value)})}
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Última oferta registrada
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Precio Compra Directa (opcional)</label>
                    <input 
                      type="number" 
                      value={auctionForm.buyNowPrice}
                      onChange={(e) => setAuctionForm({...auctionForm, buyNowPrice: Number(e.target.value)})}
                      placeholder="0 = sin compra directa"
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    />
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Dejar en 0 si no aplica
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Categoría</label>
                    <select 
                      value={auctionForm.categoryId}
                      onChange={(e) => setAuctionForm({...auctionForm, categoryId: e.target.value})}
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    >
                      <option value="1">Electrónica</option>
                      <option value="2">Moda</option>
                      <option value="3">Hogar</option>
                      <option value="4">Deportes</option>
                      <option value="5">Juguetes</option>
                      <option value="6">Libros</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.75rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} />
                    Información Adicional
                  </h4>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    <p style={{ margin: '0.25rem 0' }}>• Total de ofertas: <strong>{editingAuction.bids.length}</strong></p>
                    <p style={{ margin: '0.25rem 0' }}>• Estado: <strong>{editingAuction.status === 'active' ? 'Activa' : 'Finalizada'}</strong></p>
                    <p style={{ margin: '0.25rem 0' }}>• Finaliza: <strong>{new Date(editingAuction.endTime).toLocaleString('es-AR')}</strong></p>
                    <p style={{ margin: '0.25rem 0' }}>• ID: <strong>{editingAuction.id}</strong></p>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {products.map(product => (
                <div key={product.id} style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', border: '2px solid var(--border)', transition: 'all 0.2s ease' }}>
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, flex: 1 }}>{product.name}</h4>
                    {product.stock === 0 ? (
                      <span className="badge badge-error">Sin Stock</span>
                    ) : product.stock < 5 ? (
                      <span className="badge badge-warning">Stock Bajo</span>
                    ) : (
                      <span className="badge badge-success">Disponible</span>
                    )}
                  </div>
                  
                  <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Precio:</span>
                      <strong style={{ color: 'var(--primary)' }}>{formatCurrency(product.price)}</strong>
                    </p>
                    <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Stock:</span>
                      <strong>{product.stock} unidades</strong>
                    </p>
                    <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Valor inventario:</span>
                      <strong>{formatCurrency(product.price * product.stock)}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEditProduct(product)}
                      className="btn btn-outline" 
                      style={{ flex: 1, padding: '0.625rem' }}
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      style={{ padding: '0.625rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDIT PRODUCT TAB */}
        {activeTab === 'edit-product' && editingProduct && (
          <div>
            <button 
              onClick={() => { setActiveTab('products'); setEditingProduct(null); }}
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
              ← Volver a Productos
            </button>

            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Edit size={24} />
                Editar Producto: {editingProduct.name}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nombre del Producto</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Categoría</label>
                    <select 
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                      style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem' }}
                    >
                      <option value="1">Electrónica</option>
                      <option value="2">Moda</option>
                      <option value="3">Hogar</option>
                      <option value="4">Deportes</option>
                      <option value="5">Juguetes</option>
                      <option value="6">Libros</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.75rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} />
                    Información Adicional
                  </h4>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    <p style={{ margin: '0.25rem 0' }}>• Valor en inventario: <strong>{formatCurrency(productForm.price * productForm.stock)}</strong></p>
                    <p style={{ margin: '0.25rem 0' }}>• Reseñas: <strong>{editingProduct.ratings.length}</strong></p>
                    <p style={{ margin: '0.25rem 0' }}>• Rating promedio: <strong>{editingProduct.averageRating}/5 ⭐</strong></p>
                    <p style={{ margin: '0.25rem 0' }}>• ID: <strong>{editingProduct.id}</strong></p>
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
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BarChart3 size={28} />
                Control de Inventario
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setInventoryFilter('all')}
                  className={inventoryFilter === 'all' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ padding: '0.625rem 1rem' }}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setInventoryFilter('low')}
                  className={inventoryFilter === 'low' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ padding: '0.625rem 1rem' }}
                >
                  Stock Bajo
                </button>
                <button 
                  onClick={() => setInventoryFilter('out')}
                  className={inventoryFilter === 'out' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ padding: '0.625rem 1rem' }}
                >
                  Sin Stock
                </button>
              </div>
            </div>

            {/* Resumen de Inventario */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center' }}>
                <Package size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {products.reduce((sum, p) => sum + p.stock, 0)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Unidades Totales</div>
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

            {/* Tabla de Inventario */}
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
      </div>
    </div>
  );
};

export default AdminPanel;
