import { ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';

const Carrito = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal } = useStore();

  const handleCheckout = () => {
    alert('Redirigiendo a MercadoPago...');
    clearCart();
  };

  if (cart.length === 0) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <ShoppingCart size={80} color="var(--text-tertiary)" style={{ margin: '0 auto 1.5rem' }} />
          <h2>Tu carrito está vacío</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Agregá productos desde la tienda</p>
          <a href="/tienda" className="btn btn-primary">Ir a la Tienda</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 0' }}>
      <div className="container">
        <h1 style={{ marginBottom: '2rem' }}>
          <ShoppingCart size={36} style={{ display: 'inline', marginRight: '0.75rem' }} />
          Carrito de Compras
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cart.map(item => (
              <div key={item.productId} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', display: 'flex', gap: '1.5rem' }}>
                <img src={item.product.images[0]} alt={item.product.name} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '0.75rem' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>{item.product.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1rem' }}>{item.product.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} style={{ padding: '0.25rem 0.5rem', background: 'transparent', color: 'var(--text-primary)' }}>
                        <Minus size={16} />
                      </button>
                      <span style={{ fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} style={{ padding: '0.25rem 0.5rem', background: 'transparent', color: 'var(--text-primary)' }}>
                        <Plus size={16} />
                      </button>
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(item.product.price * item.quantity)}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.productId)} style={{ padding: '0.5rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', height: 'fit-content' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', position: 'sticky', top: '100px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Resumen del Pedido</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <span>Subtotal ({cart.length} items)</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(cartTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <span>Envío</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Gratis</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(cartTotal)}</span>
            </div>
            <button onClick={handleCheckout} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
              <CreditCard size={22} />
              Pagar con MercadoPago
            </button>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              El carrito no asegura el stock
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carrito;
