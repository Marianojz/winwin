import { useState } from 'react';
import { Users, Gavel, Package, Bot, TrendingUp, DollarSign, Plus, Edit, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Product } from '../types';
import { formatCurrency } from '../utils/helpers';

const AdminPanel = () => {
  const { user, auctions, products, bots, addBot, updateBot, deleteBot } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
const [productForm, setProductForm] = useState({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  categoryId: '1'
});
  const [botForm, setBotForm] = useState({
    name: '',
    balance: 10000,
    intervalMin: 5,
    intervalMax: 15,
    maxBidAmount: 5000,
    targetAuctions: [] as string[]
  });

  if (!user?.isAdmin) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Acceso Denegado</h2>
        <p>Solo administradores pueden acceder a este panel</p>
      </div>
    );
  }

  const totalBids = auctions.reduce((sum, a) => sum + a.bids.length, 0);
  const totalRevenue = auctions.reduce((sum, a) => sum + a.currentPrice, 0) + products.reduce((sum, p) => sum + p.price, 0);
  const activeUsers = 150; // Mock data
  const totalOrders = 45; // Mock data

  const handleAddBot = () => {
    if (botForm.name) {
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
    }
  };
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
    // Actualizar producto existente
    const updatedProducts = products.map(p => 
      p.id === editingProduct.id 
        ? { ...p, ...productForm }
        : p
    );
    setProducts(updatedProducts);
    alert('Producto actualizado correctamente');
    setEditingProduct(null);
    setActiveTab('products');
  }
};

const handleDeleteProduct = (productId: string) => {
  if (window.confirm('¿Estás seguro de eliminar este producto?')) {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    alert('Producto eliminado correctamente');
  }
};
  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 0' }}>
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Panel de Administración</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona toda la plataforma desde un solo lugar</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border)', overflowX: 'auto' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={18} /> },
            { id: 'users', label: 'Usuarios', icon: <Users size={18} /> },
            { id: 'auctions', label: 'Subastas', icon: <Gavel size={18} /> },
            { id: 'products', label: 'Productos', icon: <Package size={18} /> },
            { id: 'bots', label: 'Bots', icon: <Bot size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.875rem 1.5rem',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '0.5rem 0.5rem 0 0',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8533)', padding: '2rem', borderRadius: '1rem', color: 'white' }}>
                <Users size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{activeUsers}</div>
                <div style={{ opacity: 0.9 }}>Usuarios Activos</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #0044AA, #3366CC)', padding: '2rem', borderRadius: '1rem', color: 'white' }}>
                <Gavel size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{auctions.length}</div>
                <div style={{ opacity: 0.9 }}>Subastas Activas</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #00C853, #03DAC6)', padding: '2rem', borderRadius: '1rem', color: 'white' }}>
                <Package size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{products.length}</div>
                <div style={{ opacity: 0.9 }}>Productos en Venta</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #BB86FC, #9C64E7)', padding: '2rem', borderRadius: '1rem', color: 'white' }}>
                <DollarSign size={32} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{formatCurrency(totalRevenue)}</div>
                <div style={{ opacity: 0.9 }}>Ingresos Totales</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Estadísticas Detalladas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                    <span>Total de Ofertas</span>
                    <span style={{ fontWeight: 700 }}>{totalBids}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                    <span>Pedidos Completados</span>
                    <span style={{ fontWeight: 700 }}>{totalOrders}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                    <span>Tasa de Conversión</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>23.4%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                    <span>Bots Activos</span>
                    <span style={{ fontWeight: 700 }}>{bots.filter(b => b.isActive).length} / {bots.length}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Acciones Rápidas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <Plus size={18} />
                    Nueva Subasta
                  </button>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <Plus size={18} />
                    Nuevo Producto
                  </button>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <Plus size={18} />
                    Nuevo Bot
                  </button>
                </div>
              </div>
            </div>
          </div>
         )
        }

        {/* Bots Tab */}
        {activeTab === 'bots' && (
          <div>
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Crear Nuevo Bot</h3>
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

            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Bots Activos ({bots.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bots.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No hay bots configurados. Crea tu primer bot arriba.
                  </p>
                ) : (
                  bots.map(bot => (
                    <div key={bot.id} style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                          <Bot size={24} color="var(--primary)" />
                          <h4 style={{ margin: 0 }}>{bot.name}</h4>
                          <span className={bot.isActive ? 'badge badge-success' : 'badge badge-error'}>
                            {bot.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
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
                          onClick={() => deleteBot(bot.id)}
                          style={{ padding: '0.625rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem' }}
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Gestión de Usuarios</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Función en desarrollo...</p>
          </div>
        )}

        {/* Auctions Tab */}
        {activeTab === 'auctions' && (
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Gestión de Subastas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {auctions.map(auction => (
                <div key={auction.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <h4>{auction.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                    Precio actual: {formatCurrency(auction.currentPrice)}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Ofertas: {auction.bids.length}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}>
                      <Edit size={16} />
                      Editar
                    </button>
                    <button style={{ padding: '0.5rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Tab */}
{activeTab === 'products' && (
  <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h3>Gestión de Productos</h3>
      <button className="btn btn-primary" onClick={() => alert('Función de crear producto en desarrollo')}>
        <Plus size={18} />
        Nuevo Producto
      </button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
      {products.map(product => (
        <div key={product.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
          <img 
            src={product.images[0]} 
            alt={product.name}
            style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '0.75rem' }}
          />
          <h4 style={{ marginBottom: '0.5rem' }}>{product.name}</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
            Precio: {formatCurrency(product.price)}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Stock: {product.stock} unidades
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button 
              onClick={() => handleEditProduct(product)}
              className="btn btn-outline" 
              style={{ flex: 1, padding: '0.5rem' }}
            >
              <Edit size={16} />
              Editar
            </button>
            <button 
              onClick={() => handleDeleteProduct(product.id)}
              style={{ padding: '0.5rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{/* Edit Product Tab */}
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
        cursor: 'pointer'
      }}
    >
      ← Volver a Productos
    </button>

    <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Editar Producto: {editingProduct.name}</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
            rows={4}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem' }}
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
              <option value="1">Electrónica</option>
              <option value="2">Moda</option>
              <option value="3">Hogar</option>
              <option value="4">Deportes</option>
              <option value="5">Juguetes</option>
              <option value="6">Libros</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            onClick={handleSaveProduct}
            className="btn btn-primary" 
            style={{ flex: 1, padding: '1rem' }}
          >
            💾 Guardar Cambios
          </button>
          <button 
            onClick={() => { setActiveTab('products'); setEditingProduct(null); }}
            className="btn btn-outline" 
            style={{ padding: '1rem' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
)}

export default AdminPanel;
