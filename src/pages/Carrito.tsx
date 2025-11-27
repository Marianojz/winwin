import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, CreditCard, Minus, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, generateUlid } from '../utils/helpers';
import { Order } from '../types';
import { createAutoMessage, saveMessage } from '../utils/messages';
import { generateOrderNumber } from '../utils/orderNumberGenerator';
import { logOrderCreated } from '../utils/orderTransactions';
import PaymentOptionsModal from '../components/PaymentOptionsModal';
import PaymentProofModal from '../components/PaymentProofModal';
import { getNextBankAccount, BankAccount } from '../utils/bankAccounts';
import { validateCouponForAmount, incrementCouponUsage } from '../utils/coupons';
import { reserveStock } from '../utils/stockReservations';
import { triggerRuleBasedNotification } from '../utils/notificationRules';

const Carrito = () => {
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [createdBankAccount, setCreatedBankAccount] = useState<BankAccount | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const shippingCost = 5000; // Costo de envío fijo
  
  const { 
    cart, 
    user,
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    cartTotal,
    addOrder,
    addNotification
  } = useStore();

  const validateCart = (): boolean => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return false;
    }

    if (!user) {
      navigate('/login');
      return false;
    }

    // Verificar stock disponible y validar bultos completos si aplica
    const stockIssues: Array<{ item: typeof cart[0]; message: string }> = [];
    
    cart.forEach(item => {
      // Validar que si solo se vende por bulto, la cantidad sea un múltiplo de unitsPerBundle
      if (item.product.sellOnlyByBundle && item.product.unitsPerBundle && item.product.unitsPerBundle > 0) {
        if (item.quantity % item.product.unitsPerBundle !== 0) {
          stockIssues.push({
            item,
            message: `- ${item.product.name}: Solo se vende por bultos completos de ${item.product.unitsPerBundle} unidades (cantidad actual: ${item.quantity})`
          });
          return;
        }
        const bundles = item.quantity / item.product.unitsPerBundle;
        if (bundles > (item.product.bundles || 0)) {
          stockIssues.push({
            item,
            message: `- ${item.product.name}: Solo hay ${item.product.bundles || 0} bulto${(item.product.bundles || 0) !== 1 ? 's' : ''} disponible${(item.product.bundles || 0) !== 1 ? 's' : ''} (solicitado: ${bundles})`
          });
          return;
        }
      } else {
        if (item.quantity > item.product.stock) {
          stockIssues.push({
            item,
            message: `- ${item.product.name} (disponibles: ${item.product.stock} unidades)`
          });
        }
      }
    });
    
    if (stockIssues.length > 0) {
      alert(`Problemas con el carrito:\n${stockIssues.map(issue => issue.message).join('\n')}`);
      return false;
    }

    return true;
  };

  const handleCheckout = () => {
    if (!validateCart()) return;
    setShowPaymentModal(true);
  };

  const handlePayNow = async () => {
    setShowPaymentModal(false);
    if (!validateCart() || !user) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas para pagar
    const totalWithShipping = Math.max(0, cartTotal + shippingCost - couponDiscount);

    try {
      const bankAccount = await getNextBankAccount();

      const confirm = window.confirm(
        `¿Confirmás la compra de ${cart.length} producto(s) por ${formatCurrency(cartTotal)}?\n\n` +
        `Costo de envío: ${formatCurrency(shippingCost)}\n` +
        `Descuento: ${formatCurrency(couponDiscount)}\n` +
        `Total a transferir: ${formatCurrency(totalWithShipping)}`
      );

      if (!confirm) return;

      // Reservar stock de todos los productos antes de crear órdenes
      const reservationErrors: string[] = [];
      for (const item of cart) {
        const res = await reserveStock(item.product.id, item.quantity, {
          userId: user.id
        });
        if (!res.success) {
          reservationErrors.push(
            `- ${item.product.name}: ${res.message || 'No hay stock suficiente'}`
          );
        }
      }

      if (reservationErrors.length > 0) {
        alert(
          `No se pudo reservar stock para algunos productos:\n${reservationErrors.join(
            '\n'
          )}`
        );
        return;
      }

      // Crear órdenes de forma asíncrona para generar números únicos
      const createOrders = async () => {
      let firstOrder: Order | null = null;
      
      for (const item of cart) {
        try {
          const orderNumber = await generateOrderNumber();
          const nowDate = new Date();
          const yyyy = nowDate.getFullYear();
          const mm = String(nowDate.getMonth() + 1).padStart(2, '0');
          const dd = String(nowDate.getDate()).padStart(2, '0');
          const datePart = `${yyyy}${mm}${dd}`;

          const order: Order = {
            id: `ORD-${datePart}-${generateUlid()}`,
            orderNumber,
            userId: user.id,
            userName: user.username,
            productId: item.product.id,
            productName: item.product.name,
            productImage: item.product.images[0] || '',
            productType: 'store',
            type: 'store',
            amount:
              item.product.price * item.quantity +
              (shippingCost / cart.length) -
              (couponDiscount / cart.length),
            quantity: item.quantity,
            status: 'pending_payment',
            paymentMethod: 'bank_transfer',
            deliveryMethod: 'shipping',
            createdAt: now,
            expiresAt: expiresAt,
            address: user.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } },
            couponCode: appliedCouponCode || undefined,
            discountAmount: couponDiscount / cart.length,
            unitsPerBundle: item.product.unitsPerBundle,
            bundles: item.product.bundles,
            bankAccountId: bankAccount.id,
            bankAccountAlias: bankAccount.alias,
            bankAccountCbu: bankAccount.cbu,
            paymentVerificationStatus: 'pending'
          };

          await addOrder(order);
          
          // Guardar la primera orden para mostrar el modal
          if (!firstOrder) {
            firstOrder = order;
          }
          
          // Registrar transacción en el log
          await logOrderCreated(order.id, orderNumber, user.id, user.username, order.amount);

          // Crear mensaje automático para la compra
          try {
            const autoMsg = await createAutoMessage(
              user.id,
              user.username,
              'purchase',
              {
                productName: item.product.name,
                productId: item.product.id,
                orderId: order.id,
                amount: order.amount
              }
            );
            saveMessage(autoMsg);
            console.log(`💬 Mensaje automático enviado para compra de ${item.product.name}`);
          } catch (error) {
            console.error('Error creando mensaje automático:', error);
          }
        } catch (error) {
          console.error('Error creando pedido:', error);
        }
      }
      
      // Notificación para el usuario basada en reglas
      triggerRuleBasedNotification(
        'purchase',
        user.id,
        addNotification,
        {
          amount: totalWithShipping,
          productName: cart.length === 1 ? cart[0].product.name : `${cart.length} productos`
        }
      );

      if (appliedCouponCode) {
        try {
          await incrementCouponUsage(appliedCouponCode);
        } catch (e) {
          console.warn('No se pudo incrementar el uso del cupón:', e);
        }
      }

      clearCart();
      
      // Si hay múltiples órdenes, mostrar el modal para la primera
      // El usuario puede subir comprobantes para las demás desde "Mis pedidos"
      if (firstOrder) {
        setCreatedOrder(firstOrder);
        setCreatedBankAccount(bankAccount);
        setShowProofModal(true);
      }
      };

      await createOrders();
    } catch (error) {
      console.error('Error en pago por transferencia desde carrito:', error);
      alert('Hubo un error al procesar la compra por transferencia. Intentá nuevamente.');
    }
  };

  const handlePayOnDelivery = async () => {
    setShowPaymentModal(false);
    if (!validateCart() || !user) return;

    const totalWithShipping = cartTotal + shippingCost;
    const productNames = cart.map(item => item.product.name).join(', ');

    const confirm = window.confirm(
      `¿Confirmas la compra de ${cart.length} producto(s) por ${formatCurrency(cartTotal)}?\n\nCosto de envío: ${formatCurrency(shippingCost)}\nTotal a pagar al recibir: ${formatCurrency(totalWithShipping)}\n\nSe enviará un mensaje de preparación de tu pedido.`
    );

    if (!confirm) return;

    const now = new Date();

    // Reservar stock de todos los productos antes de crear órdenes
    const reservationErrors: string[] = [];
    for (const item of cart) {
      // NO reservar stock para bots (compras ficticias)
      const isBot = user.id.startsWith('bot-');
      if (isBot) {
        continue;
      }

      const res = await reserveStock(item.product.id, item.quantity, {
        userId: user.id
      });
      if (!res.success) {
        reservationErrors.push(
          `- ${item.product.name}: ${res.message || 'No hay stock suficiente'}`
        );
      }
    }

    if (reservationErrors.length > 0) {
      alert(
        `No se pudo reservar stock para algunos productos:\n${reservationErrors.join(
          '\n'
        )}`
      );
      return;
    }

    // Crear órdenes de forma asíncrona para generar números únicos
    const createOrders = async () => {
      for (const item of cart) {
        try {
          const orderNumber = await generateOrderNumber();
          
          const displayQuantity = item.product.sellOnlyByBundle && item.product.unitsPerBundle && item.product.unitsPerBundle > 0
            ? `${item.quantity / item.product.unitsPerBundle} bulto${item.quantity / item.product.unitsPerBundle !== 1 ? 's' : ''} (${item.quantity} unidades)`
            : `${item.quantity} unidad${item.quantity !== 1 ? 'es' : ''}`;

          const nowDate = new Date();
          const yyyy = nowDate.getFullYear();
          const mm = String(nowDate.getMonth() + 1).padStart(2, '0');
          const dd = String(nowDate.getDate()).padStart(2, '0');
          const datePart = `${yyyy}${mm}${dd}`;

          const order: Order = {
            id: `ORD-${datePart}-${generateUlid()}`,
            orderNumber,
            userId: user.id,
            userName: user.username,
            productId: item.product.id,
            productName: item.product.name,
            productImage: item.product.images[0] || '',
            productType: 'store',
            type: 'store',
            amount: (item.product.price * item.quantity) +
              (shippingCost / cart.length) -
              (couponDiscount / cart.length),
            quantity: item.quantity,
            status: 'preparing', // Estado de preparación para pago al recibir
            deliveryMethod: 'shipping',
            createdAt: now,
            address: user.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } },
            couponCode: appliedCouponCode || undefined,
            discountAmount: couponDiscount / cart.length,
            unitsPerBundle: item.product.unitsPerBundle,
            bundles: item.product.bundles
          };

          await addOrder(order);
          
          // Registrar transacción en el log
          await logOrderCreated(order.id, orderNumber, user.id, user.username, order.amount);

          // Enviar mensaje de preparación al cliente
          const preparationMessage = await createAutoMessage(
            user.id,
            user.username,
            'purchase',
            {
              productName: `${item.product.name} (${displayQuantity})`,
              productId: item.product.id,
              orderId: orderNumber,
              amount: order.amount
            }
          );

          // Personalizar el mensaje para preparación
          preparationMessage.content = `Hola ${user.username}, 👋

Tu pedido de "${item.product.name}" (${displayQuantity}) está siendo preparado.

Detalles:
• Número de pedido: ${orderNumber}
• Producto: ${item.product.name}
• Cantidad: ${displayQuantity}
• Subtotal: ${formatCurrency(item.product.price * item.quantity)}
• Costo de envío (proporcional): ${formatCurrency(shippingCost / cart.length)}
• Total a pagar al recibir: ${formatCurrency(order.amount)}

Te notificaremos cuando tu pedido esté listo para el envío. El pago se realizará al momento de la entrega.`;

          await saveMessage(preparationMessage);
        } catch (error) {
          console.error('Error creando pedido:', error);
        }
      }

      // Notificación para el usuario
      addNotification({
        userId: user.id,
        type: 'purchase',
        title: 'Pedido confirmado',
        message: `Tu pedido de ${cart.length} producto(s) está siendo preparado. Total a pagar al recibir: ${formatCurrency(totalWithShipping)}`,
        read: false
      });

      // Notificación para el admin
      addNotification({
        userId: 'admin',
        type: 'purchase',
        title: '🛍️ Nueva Compra (Pago al Recibir)',
        message: `${user.username} realizó una compra por ${formatCurrency(totalWithShipping)}. Pago al recibir.`,
        read: false
      });

      clearCart();
      alert(`✅ Pedido confirmado!\n\nTotal a pagar al recibir: ${formatCurrency(totalWithShipping)}\n\nTe notificaremos cuando tu pedido esté listo.`);
      navigate('/notificaciones');
    };

    createOrders();

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
                  {item.product.unitsPerBundle && item.product.unitsPerBundle > 0 && item.product.bundles && item.product.bundles > 0 && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {item.product.bundles} bulto{item.product.bundles !== 1 ? 's' : ''} × {item.product.unitsPerBundle} uxb
                    </p>
                  )}
                  
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
              <span className="summary-value">{formatCurrency(shippingCost)}</span>
            </div>

            {/* Cupón de descuento */}
            <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Código de cupón
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponError(null);
                  }}
                  placeholder="Ingresá tu cupón"
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={async () => {
                    setCouponError(null);
                    if (!couponCode.trim()) {
                      setCouponError('Ingresá un código.');
                      return;
                    }
                    const subtotalWithShipping = cartTotal + shippingCost;
                    try {
                      const result = await validateCouponForAmount(
                        couponCode,
                        subtotalWithShipping
                      );
                      if (!result.valid) {
                        setCouponDiscount(0);
                        setAppliedCouponCode(null);
                        setCouponError(result.errorMessage || 'Cupón no válido.');
                        return;
                      }
                      setCouponDiscount(result.discountAmount);
                      setAppliedCouponCode(couponCode.trim().toUpperCase());
                    } catch (err: any) {
                      console.error('Error validando cupón:', err);
                      setCouponError(
                        err?.message || 'No se pudo validar el cupón. Intentá nuevamente.'
                      );
                    }
                  }}
                >
                  Aplicar
                </button>
              </div>
              {couponError && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--error)' }}>
                  {couponError}
                </div>
              )}
              {appliedCouponCode && couponDiscount > 0 && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--success)'
                  }}
                >
                  Cupón <strong>{appliedCouponCode}</strong> aplicado: -
                  {formatCurrency(couponDiscount)}
                </div>
              )}
            </div>
            
            <div className="summary-total">
              <span>Total</span>
              <span className="total-value">
                {formatCurrency(Math.max(0, cartTotal + shippingCost - couponDiscount))}
              </span>
            </div>
            
            <button 
              onClick={handleCheckout} 
              className="btn btn-primary checkout-btn"
            >
              <CreditCard size={22} />
              Proceder al Pago
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

      <PaymentOptionsModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPayNow={handlePayNow}
        onPayOnDelivery={handlePayOnDelivery}
        productName={cart.length === 1 ? cart[0].product.name : `${cart.length} productos`}
        totalAmount={cartTotal}
        shippingCost={shippingCost}
      />

      {createdOrder && createdBankAccount && (
        <PaymentProofModal
          isOpen={showProofModal}
          onClose={() => {
            setShowProofModal(false);
            setCreatedOrder(null);
            setCreatedBankAccount(null);
          }}
          order={createdOrder}
          bankAccount={createdBankAccount}
          onSuccess={() => {
            // Opcional: redirigir o mostrar mensaje adicional
            addNotification({
              userId: 'current',
              type: 'purchase',
              title: 'Pago confirmado',
              message: `Tu comprobante fue subido y el pago fue aprobado. ${cart.length > 1 ? 'Podés subir comprobantes para los demás pedidos desde "Mis pedidos".' : 'Tu pedido está siendo procesado.'}`,
              read: false
            });
          }}
        />
      )}
    </div>
  );
};

export default Carrito;
