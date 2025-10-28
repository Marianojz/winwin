import { ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';

const Carrito = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal } = useStore();

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    // Verificar stock disponible
    const stockIssues = cart.filter(item => item.quantity > item.product.stock);
    if (stockIssues.length > 0) {
      alert(`Stock insuficiente para:\n${stockIssues.map(item => `- ${item.product.name} (disponibles: ${item.product.stock})`).join('\n')}`);
      return;
    }

    // Crear órdenes para cada producto
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas para pagar

    cart.forEach(item => {
      const order: Order = {
        id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        userName: user.username,
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0] || '',
        productType: 'store',
        type: 'store',
        amount: item.product.price * item.quantity,
        status: 'pending_payment',
        deliveryMethod: 'shipping',
        createdAt: now,
        expiresAt: expiresAt,
        address: user.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } }
      };

      addOrder(order);

      // Reducir stock temporalmente (se devolverá si no paga)
      const updatedProducts = products.map(p =>
        p.id === item.product.id
          ? { ...p, stock: p.stock - item.quantity }
          : p
      );
      setProducts(updatedProducts);
    });

    // Notificación para el usuario
    addNotification({
      userId: user.id,
      type: 'purchase',
      title: '🛍️ Compra Iniciada',
      message: `Compraste ${cart.length} producto(s) por ${formatCurrency(cartTotal)}. Tenés 48hs para pagar.`,
      read: false
    });

    // Notificación para el admin
    addNotification({
      userId: 'admin',
      type: 'purchase',
      title: '🛍️ Nueva Compra',
      message: `${user.username} inició una compra por ${formatCurrency(cartTotal)}. Esperando pago.`,
      read: false
    });

    clearCart();
    alert('¡Compra iniciada! Te enviamos el link de pago por email. Tenés 48hs para completar el pago.');
    navigate('/notificaciones');
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
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '1.5rem 0' }}>
      <div className="container">
        <h1 style={{ marginBottom: '1.5rem', fontSize: 'clamp(1.5rem, 5vw, 2.25rem)' }}>
          <ShoppingCart size={32} style={{ display: 'inline', marginRight: '0.75rem', verticalAlign: 'middle' }} />
          Carrito de Compras
        </h1>

        <div className="carrito-layout">
          {/* Lista de productos */}
          <div className="carrito-items">
            {cart.map(item => (
              <div key={item.productId} className="cart-item-card">
                <img 
                  src={item.product.images[0]} 
                  alt={item.product.name} 
                  className="cart-item-image"
                />
                <div className="cart-item-content">
                  <h3 className="cart-item-title">{item.product.name}</h3>
                  <p className="cart-item-description">{item.product.description}</p>
                  
                  <div className="cart-item-actions">
                    <div className="quantity-selector">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)} 
                        className="quantity-btn"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)} 
                        className="quantity-btn"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="cart-item-price">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => removeFromCart(item.productId)} 
                  className="remove-btn"
                  aria-label="Eliminar producto"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Resumen del pedido */}
          <div className="order-summary">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Resumen del Pedido</h3>
            
            <div className="summary-row">
              <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
              <span className="summary-value">{formatCurrency(cartTotal)}</span>
            </div>
            
            <div className="summary-row">
              <span>Envío</span>
              <span className="summary-value summary-free">Gratis</span>
            </div>
            
            <div className="summary-total">
              <span>Total</span>
              <span className="total-value">{formatCurrency(cartTotal)}</span>
            </div>
            
            <button 
              onClick={handleCheckout} 
              className="btn btn-primary checkout-btn"
            >
              <CreditCard size={22} />
              Pagar con MercadoPago
            </button>
            
            <p className="cart-disclaimer">
              El carrito no asegura el stock
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .carrito-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .carrito-layout {
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
          }
        }

        .carrito-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cart-item-card {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: 1rem;
          display: grid;
          grid-template-columns: 80px 1fr auto;
          gap: 1rem;
          align-items: start;
        }

        @media (min-width: 640px) {
          .cart-item-card {
            grid-template-columns: 120px 1fr auto;
            padding: 1.5rem;
            gap: 1.5rem;
          }
        }

        .cart-item-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 0.75rem;
        }

        @media (min-width: 640px) {
          .cart-item-image {
            width: 120px;
            height: 120px;
          }
        }

        .cart-item-content {
          flex: 1;
          min-width: 0;
        }

        .cart-item-title {
          margin-bottom: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        @media (min-width: 640px) {
          .cart-item-title {
            font-size: 1.125rem;
          }
        }

        .cart-item-description {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        @media (min-width: 640px) {
          .cart-item-description {
            font-size: 0.9375rem;
          }
        }

        .cart-item-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        @media (min-width: 640px) {
          .cart-item-actions {
            flex-direction: row;
            align-items: center;
            gap: 1rem;
          }
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-tertiary);
          padding: 0.5rem;
          border-radius: 0.5rem;
          width: fit-content;
        }

        .quantity-btn {
          padding: 0.25rem 0.5rem;
          background: transparent;
          color: var(--text-primary);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .quantity-btn:hover {
          opacity: 0.7;
        }

        .quantity-value {
          font-weight: 600;
          min-width: 30px;
          text-align: center;
        }

        .cart-item-price {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--primary);
        }

        @media (min-width: 640px) {
          .cart-item-price {
            font-size: 1.25rem;
          }
        }

        .remove-btn {
          padding: 0.5rem;
          background: var(--error);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          height: fit-content;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .remove-btn:hover {
          opacity: 0.9;
        }

        .order-summary {
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: 1rem;
          height: fit-content;
        }

        @media (min-width: 768px) {
          .order-summary {
            position: sticky;
            top: 100px;
            padding: 2rem;
          }
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
          font-size: 0.9375rem;
        }

        .summary-value {
          font-weight: 600;
        }

        .summary-free {
          color: var(--success);
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-top: 0.75rem;
        }

        .summary-total > span:first-child {
          font-size: 1.125rem;
          font-weight: 700;
        }

        @media (min-width: 640px) {
          .summary-total > span:first-child {
            font-size: 1.25rem;
          }
        }

        .total-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary);
        }

        @media (min-width: 640px) {
          .total-value {
            font-size: 1.5rem;
          }
        }

        .checkout-btn {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
        }

        @media (min-width: 640px) {
          .checkout-btn {
            font-size: 1.125rem;
          }
        }

        .cart-disclaimer {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-top: 1rem;
          text-align: center;
        }

        @media (min-width: 640px) {
          .cart-disclaimer {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Carrito;
