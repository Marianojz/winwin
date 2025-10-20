import { useState } from 'react';
import { 
  Users, Gavel, Package, TrendingUp, DollarSign, AlertCircle, 
  Clock, CheckCircle, XCircle, Truck, FileText, Download,
  Edit, Trash2, Eye, Search, Filter, Calendar, Activity,
  ShoppingBag, Timer, AlertTriangle, MapPin
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Order, OrderStatus } from '../types';

const AdminPanelPro = () => {
  const { user, auctions, products, orders, updateOrderStatus } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
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
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.amount, 0);
  
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

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Función para obtener el color del estado
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

  // Función para obtener el texto del estado
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

  // Calcular tiempo restante para pagos pendientes
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

  // Función para cambiar estado de orden
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (window.confirm(`¿Confirmar cambio de estado a "${getStatusText(newStatus)}"?`)) {
      const updates: Partial<Order> = {};
      
      // Agregar tracking number si pasa a en tránsito
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
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={36} color="var(--primary)" />
            Panel de Administración Pro
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sistema completo de gestión de pedidos y productos</p>
        </div>

        {/* Tabs Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border)', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={18} /> },
            { id: 'orders', label: 'Pedidos', icon: <ShoppingBag size={18} /> },
            { id: 'products', label: 'Productos', icon: <Package size={18} /> },
            { id: 'auctions', label: 'Subastas', icon: <Gavel size={18} /> },
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

            {/* Actividad Reciente */}
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={24} />
                Actividad Reciente
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {order.productName}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Cliente: {order.userName} • {formatCurrency(order.amount)}
                      </div>
                    </div>
                    <div style={{ 
                      padding: '0.5rem 1rem', 
                      background: getStatusColor(order.status) + '20', 
                      color: getStatusColor(order.status),
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      {getStatusText(order.status)}
                    </div>
                  </div>
                ))}
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

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={24} />
              Gestión de Productos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {products.map(product => (
                <div key={product.id} style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1rem' }}
                  />
                  <h4 style={{ marginBottom: '0.5rem' }}>{product.name}</h4>
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
                    <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}>
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn"
                      style={{ flex: 1, padding: '0.5rem', background: 'var(--error)', color: 'white' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUCTIONS TAB */}
        {activeTab === 'auctions' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gavel size={24} />
              Gestión de Subastas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {auctions.map(auction => (
                <div key={auction.id} style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>{auction.title}</h4>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        {auction.bids.length} ofertas • Finaliza: {new Date(auction.endTime).toLocaleDateString('es-AR')}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                    <div style={{ 
                      padding: '0.5rem 1rem', 
                      background: auction.status === 'active' ? 'var(--success)' : 'var(--error)',
                      color: 'white',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      {auction.status === 'active' ? 'Activa' : 'Finalizada'}
                    </div>
                  </div>
                </div>
              ))}
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
              {/* Imagen del producto */}
              <img 
                src={selectedOrder.productImage} 
                alt={selectedOrder.productName}
                style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '0.75rem' }}
              />

              {/* Información básica */}
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>{selectedOrder.productName}</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {selectedOrder.productType === 'auction' ? '🔨 Subasta' : '🛒 Tienda'} • ID: {selectedOrder.id}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {formatCurrency(selectedOrder.amount)}
                </div>
              </div>

              {/* Cliente */}
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

              {/* Estado actual */}
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

              {/* Cambiar estado */}
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

              {/* Fechas */}
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
    </div>
  );
};

export default AdminPanelPro;
