import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Package, ChevronLeft, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';
import { useSEO, generateProductStructuredData } from '../hooks/useSEO';
import PaymentOptionsModal from '../components/PaymentOptionsModal';
import { createAutoMessage, saveMessage } from '../utils/messages';
import { generateOrderNumber } from '../utils/orderNumberGenerator';
import { logOrderCreated } from '../utils/orderTransactions';
import { Order } from '../types';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, addNotification, isAuthenticated, user, addOrder, setProducts } = useStore();
  
  const product = products.find(p => p.id === id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Inicializar quantity: si solo se vende por bulto, comenzar con un bulto completo
  const initialQuantity = product?.sellOnlyByBundle && product?.unitsPerBundle && product.unitsPerBundle > 0
    ? product.unitsPerBundle
    : 1;
  const [quantity, setQuantity] = useState(initialQuantity);
  
  // Actualizar quantity cuando cambie el producto
  useEffect(() => {
    if (product?.sellOnlyByBundle && product?.unitsPerBundle && product.unitsPerBundle > 0) {
      setQuantity(product.unitsPerBundle);
    } else {
      setQuantity(1);
    }
  }, [product?.id, product?.sellOnlyByBundle, product?.unitsPerBundle]);

  // SEO: Meta tags y structured data para productos
  const productImage = product?.images[0]?.startsWith('http') 
    ? product.images[0] 
    : product?.images[0] 
      ? `https://www.clickio.com.ar${product.images[0]}` 
      : undefined;
  
  useSEO({
    title: product?.name,
    description: product?.description 
      ? (product.description.length > 160 
          ? product.description.substring(0, 157) + '...' 
          : product.description)
      : undefined,
    image: productImage,
    url: product ? `https://www.clickio.com.ar/producto/${product.id}` : undefined,
    type: 'product',
    structuredData: product ? generateProductStructuredData({
      ...product,
      categoryId: product.categoryId
    }) : undefined
  });

  if (!product) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={64} color="var(--error)" style={{ marginBottom: '1rem' }} />
          <h2>Producto no encontrado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>El producto que buscas no existe o fue eliminado.</p>
          <button onClick={() => navigate('/tienda')} className="btn btn-primary">
            Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Validar que si solo se vende por bulto, la cantidad sea un múltiplo de unitsPerBundle
    if (product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0) {
      if (quantity % product.unitsPerBundle !== 0) {
        alert(`⚠️ Este producto solo se vende por bultos completos de ${product.unitsPerBundle} unidades`);
        return;
      }
      const bundles = quantity / product.unitsPerBundle;
      if (bundles > (product.bundles || 0)) {
        alert(`Solo hay ${product.bundles || 0} bulto${(product.bundles || 0) !== 1 ? 's' : ''} disponible${(product.bundles || 0) !== 1 ? 's' : ''}`);
        return;
      }
    } else {
      if (quantity > product.stock) {
        alert(`Solo hay ${product.stock} unidades disponibles`);
        return;
      }
    }

    addToCart(product, quantity);
    const displayQuantity = product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0
      ? `${quantity / product.unitsPerBundle} bulto${quantity / product.unitsPerBundle !== 1 ? 's' : ''} (${quantity} unidades)`
      : `${quantity} unidad${quantity !== 1 ? 'es' : ''}`;
    addNotification({
      userId: 'current',
      type: 'purchase',
      title: 'Agregado al carrito',
      message: `${product.name} (${displayQuantity}) agregado al carrito`,
      read: false
    });
    alert('¡Producto agregado al carrito! 🛒');
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Validar que si solo se vende por bulto, la cantidad sea un múltiplo de unitsPerBundle
    if (product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0) {
      if (quantity % product.unitsPerBundle !== 0) {
        alert(`⚠️ Este producto solo se vende por bultos completos de ${product.unitsPerBundle} unidades`);
        return;
      }
      const bundles = quantity / product.unitsPerBundle;
      if (bundles > (product.bundles || 0)) {
        alert(`Solo hay ${product.bundles || 0} bulto${(product.bundles || 0) !== 1 ? 's' : ''} disponible${(product.bundles || 0) !== 1 ? 's' : ''}`);
        return;
      }
    } else {
      if (quantity > product.stock) {
        alert(`Solo hay ${product.stock} unidades disponibles`);
        return;
      }
    }

    // Mostrar modal de opciones de pago
    setShowPaymentModal(true);
  };

  // Costo de envío estimado (puedes ajustar este valor o calcularlo dinámicamente)
  const shippingCost = 5000; // $5000 ARS como ejemplo

  const handlePayNow = async () => {
    setShowPaymentModal(false);
    const totalAmount = product.price * quantity;
    const totalWithShipping = totalAmount + shippingCost;
    
    const displayQuantity = product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0
      ? `${quantity / product.unitsPerBundle} bulto${quantity / product.unitsPerBundle !== 1 ? 's' : ''} (${quantity} unidades)`
      : `${quantity} unidad${quantity !== 1 ? 'es' : ''}`;

    const confirm = window.confirm(
      `¿Confirmas la compra de ${displayQuantity} por ${formatCurrency(totalAmount)}?\n\nCosto de envío: ${formatCurrency(shippingCost)}\nTotal a pagar: ${formatCurrency(totalWithShipping)}\n\nSerás redirigido a MercadoPago para completar el pago.`
    );

    if (confirm && user) {
      try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas para pagar
        const orderNumber = await generateOrderNumber();
        
        const order: Order = {
          id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderNumber,
          userId: user.id,
          userName: user.username,
          productId: product.id,
          productName: product.name,
          productImage: product.images[0] || '',
          productType: 'store',
          type: 'store',
          amount: totalWithShipping,
          quantity: quantity,
          status: 'pending_payment',
          deliveryMethod: 'shipping',
          createdAt: now,
          expiresAt: expiresAt,
          address: user.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } },
          unitsPerBundle: product.unitsPerBundle,
          bundles: product.bundles
        };

        await addOrder(order);
        
        // Registrar transacción en el log
        await logOrderCreated(order.id, orderNumber, user.id, user.username, order.amount);

        // Reducir stock temporalmente (se devolverá si no paga)
        const updatedProducts = products.map(p => {
          if (p.id === product.id) {
            const updatedProduct: any = {
              ...p,
              stock: p.stock - quantity
            };
            // Solo actualizar bundles si el producto tiene unitsPerBundle
            if (product.unitsPerBundle && product.unitsPerBundle > 0) {
              updatedProduct.bundles = (product.bundles || 0) - Math.floor(quantity / product.unitsPerBundle);
            }
            return updatedProduct;
          }
          return p;
        });
        setProducts(updatedProducts);

        addNotification({
          userId: 'current',
          type: 'purchase',
          title: 'Compra realizada',
          message: `Compraste ${product.name} (${displayQuantity}) por ${formatCurrency(totalWithShipping)} (incluye envío)`,
          read: false
        });
        
        // Redirigir a MercadoPago (aquí iría la integración real)
        const mercadopagoLink = `https://www.mercadopago.com.ar/checkout/v1/payment?preference_id=MOCK-${product.id}-${Date.now()}`;
        alert(`✅ Pedido creado exitosamente!\n\nTotal a pagar: ${formatCurrency(totalWithShipping)}\n\nRedirigiendo a MercadoPago...`);
        // window.location.href = mercadopagoLink; // Descomentar cuando tengas la integración real
      } catch (error) {
        console.error('Error creando pedido:', error);
        alert('Hubo un error al crear el pedido. Por favor, intentá nuevamente.');
      }
    }
  };

  const handlePayOnDelivery = async () => {
    setShowPaymentModal(false);
    const totalAmount = product.price * quantity;
    const totalWithShipping = totalAmount + shippingCost;
    
    const displayQuantity = product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0
      ? `${quantity / product.unitsPerBundle} bulto${quantity / product.unitsPerBundle !== 1 ? 's' : ''} (${quantity} unidades)`
      : `${quantity} unidad${quantity !== 1 ? 'es' : ''}`;

    const confirm = window.confirm(
      `¿Confirmas la compra de ${displayQuantity} por ${formatCurrency(totalAmount)}?\n\nCosto de envío: ${formatCurrency(shippingCost)}\nTotal a pagar al recibir: ${formatCurrency(totalWithShipping)}\n\nSe enviará un mensaje de preparación de tu pedido.`
    );

    if (confirm && user) {
      try {
        const now = new Date();
        const orderNumber = await generateOrderNumber();
        
        const order: Order = {
          id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderNumber,
          userId: user.id,
          userName: user.username,
          productId: product.id,
          productName: product.name,
          productImage: product.images[0] || '',
          productType: 'store',
          type: 'store',
          amount: totalWithShipping,
          quantity: quantity,
          status: 'preparing', // Estado de preparación para pago al recibir
          deliveryMethod: 'shipping',
          createdAt: now,
          address: user.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } },
          unitsPerBundle: product.unitsPerBundle,
          bundles: product.bundles
        };

        await addOrder(order);
        
        // Registrar transacción en el log
        await logOrderCreated(order.id, orderNumber, user.id, user.username, order.amount);

        // Reducir stock (ya que el pedido está confirmado)
        const updatedProducts = products.map(p => {
          if (p.id === product.id) {
            const updatedProduct: any = {
              ...p,
              stock: p.stock - quantity
            };
            // Solo actualizar bundles si el producto tiene unitsPerBundle
            if (product.unitsPerBundle && product.unitsPerBundle > 0) {
              updatedProduct.bundles = (product.bundles || 0) - Math.floor(quantity / product.unitsPerBundle);
            }
            return updatedProduct;
          }
          return p;
        });
        setProducts(updatedProducts);

        // Enviar mensaje de preparación al cliente
        const preparationMessage = await createAutoMessage(
          user.id,
          user.username,
          'purchase',
          {
            productName: `${product.name} (${displayQuantity})`,
            productId: product.id,
            orderId: orderNumber,
            amount: totalWithShipping
          }
        );

        // Personalizar el mensaje para preparación
        preparationMessage.content = `Hola ${user.username}, 👋

Tu pedido de "${product.name}" (${displayQuantity}) está siendo preparado.

Detalles:
• Número de pedido: ${orderNumber}
• Producto: ${product.name}
• Cantidad: ${displayQuantity}
• Subtotal: ${formatCurrency(totalAmount)}
• Costo de envío: ${formatCurrency(shippingCost)}
• Total a pagar al recibir: ${formatCurrency(totalWithShipping)}

Te notificaremos cuando tu pedido esté listo para el envío. El pago se realizará al momento de la entrega.`;

        await saveMessage(preparationMessage);

        addNotification({
          userId: 'current',
          type: 'purchase',
          title: 'Pedido confirmado',
          message: `Tu pedido de ${product.name} (${displayQuantity}) está siendo preparado. Total a pagar al recibir: ${formatCurrency(totalWithShipping)}`,
          read: false
        });

        alert(`✅ Pedido confirmado!\n\nNúmero de pedido: ${orderNumber}\n\nSe ha enviado un mensaje de preparación a tu bandeja de entrada.\n\nTotal a pagar al recibir: ${formatCurrency(totalWithShipping)}`);
      } catch (error) {
        console.error('Error creando pedido:', error);
        alert('Hubo un error al crear el pedido. Por favor, intentá nuevamente.');
      }
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '1rem 0' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        <button 
          onClick={() => navigate('/tienda')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: 'transparent',
            color: 'var(--text-secondary)',
            padding: '0.5rem 0',
            marginBottom: '1rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          <ChevronLeft size={18} />
          Volver a la Tienda
        </button>

        <div className="product-detail-grid">
          {/* Galería de Imágenes */}
          <div className="product-images">
            <div className="main-image">
              <img 
                src={product.images[selectedImage]} 
                alt={product.name}
              />
            </div>
            {product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={selectedImage === idx ? 'thumbnail active' : 'thumbnail'}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del Producto */}
          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>

            {/* Rating */}
            {product.averageRating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      fill={i < product.averageRating ? 'var(--warning)' : 'none'}
                      color={i < product.averageRating ? 'var(--warning)' : 'var(--text-tertiary)'}
                    />
                  ))}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                  ({product.ratings.length} {product.ratings.length === 1 ? 'reseña' : 'reseñas'})
                </span>
              </div>
            )}

            {/* Stock */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {product.stock > 0 ? (
                <>
                  <span className="badge badge-success">
                    <Package size={14} />
                    En Stock
                  </span>
                  {product.stock < 5 && (
                    <span className="badge badge-warning">
                      ¡Solo {product.stock} disponibles!
                    </span>
                  )}
                  {product.unitsPerBundle && product.unitsPerBundle > 0 && product.bundles && product.bundles > 0 && (
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                      {product.bundles} bulto{product.bundles !== 1 ? 's' : ''} × {product.unitsPerBundle} uxb = {product.bundles * product.unitsPerBundle} unidades
                    </span>
                  )}
                </>
              ) : (
                <span className="badge badge-error">Sin Stock</span>
              )}
            </div>

            {/* Precio */}
            <div className="price-box">
              <div className="price-label">Precio</div>
              <div className="price-amount">
                {formatCurrency(product.price)}
              </div>
              {quantity > 1 && (
                <div style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
                  Total: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(product.price * quantity)}</strong>
                </div>
              )}
            </div>

            {/* Cantidad y Compra */}
            {product.stock > 0 && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={24} />
                  Comprar Producto
                </h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    {product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0 
                      ? 'Cantidad de Bultos' 
                      : 'Cantidad'}
                  </label>
                  {product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0 ? (
                    // Solo se vende por bulto: mostrar selector de bultos
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button 
                        onClick={() => {
                          const currentBundles = Math.floor(quantity / product.unitsPerBundle);
                          const newBundles = Math.max(1, currentBundles - 1);
                          setQuantity(newBundles * product.unitsPerBundle);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.75rem 1.25rem', fontSize: '1.25rem' }}
                      >
                        −
                      </button>
                      <input 
                        type="number"
                        value={Math.floor(quantity / product.unitsPerBundle)}
                        onChange={(e) => {
                          const bundles = Math.max(1, Math.min(
                            product.bundles || Math.floor(product.stock / product.unitsPerBundle),
                            parseInt(e.target.value) || 1
                          ));
                          setQuantity(bundles * product.unitsPerBundle);
                        }}
                        min="1"
                        max={product.bundles || Math.floor(product.stock / product.unitsPerBundle)}
                        style={{ width: '80px', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', fontSize: '1.125rem', fontWeight: 600 }}
                      />
                      <button 
                        onClick={() => {
                          const currentBundles = Math.floor(quantity / product.unitsPerBundle);
                          const maxBundles = product.bundles || Math.floor(product.stock / product.unitsPerBundle);
                          const newBundles = Math.min(maxBundles, currentBundles + 1);
                          setQuantity(newBundles * product.unitsPerBundle);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.75rem 1.25rem', fontSize: '1.25rem' }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    // Se puede vender por unidad: selector normal
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="btn btn-outline"
                        style={{ padding: '0.75rem 1.25rem', fontSize: '1.25rem' }}
                      >
                        −
                      </button>
                      <input 
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                        min="1"
                        max={product.stock}
                        style={{ width: '80px', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', fontSize: '1.125rem', fontWeight: 600 }}
                      />
                      <button 
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="btn btn-outline"
                        style={{ padding: '0.75rem 1.25rem', fontSize: '1.25rem' }}
                      >
                        +
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {product.sellOnlyByBundle && product.unitsPerBundle && product.unitsPerBundle > 0 ? (
                      <>
                        <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                          ⚠️ Solo se vende por bulto completo
                        </span>
                        <span style={{ display: 'block', marginTop: '0.25rem' }}>
                          {Math.floor(quantity / product.unitsPerBundle)} bulto{Math.floor(quantity / product.unitsPerBundle) !== 1 ? 's' : ''} = {quantity} unidades
                        </span>
                        {product.bundles && product.bundles > 0 && (
                          <span style={{ display: 'block', marginTop: '0.25rem' }}>
                            Disponibles: {product.bundles} bulto{product.bundles !== 1 ? 's' : ''} ({product.stock} unidades)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        Disponibles: {product.stock} unidades
                        {product.unitsPerBundle && product.unitsPerBundle > 0 && product.bundles && product.bundles > 0 && (
                          <span style={{ display: 'block', marginTop: '0.25rem' }}>
                            ({product.bundles} bulto{product.bundles !== 1 ? 's' : ''} × {product.unitsPerBundle} uxb)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <button onClick={handleAddToCart} className="btn btn-outline" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', marginBottom: '0.75rem' }}>
                  <ShoppingCart size={20} />
                  Agregar al Carrito
                </button>

                <button onClick={handleBuyNow} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
                  <CreditCard size={20} />
                  Comprar Ahora
                </button>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
                  El carrito no asegura el stock
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="product-description">
          <h2 style={{ marginBottom: '1rem' }}>Descripción del Producto</h2>
          <p style={{ fontSize: '1.0625rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
            {product.description}
          </p>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Información de Compra</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Stock en tiempo real</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Pago seguro con MercadoPago</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>El carrito no asegura el stock hasta completar la compra</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>
                  Precio: {formatCurrency(product.price)} por unidad
                  {product.unidades && product.bultos && (
                    <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      ({product.bultos} bulto{product.bultos !== 1 ? 's' : ''} disponibles, {product.unidades} unidades por bulto)
                    </span>
                  )}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Reseñas */}
        {product.ratings.length > 0 && (
          <div style={{ marginTop: '2rem', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Reseñas de Clientes ({product.ratings.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {product.ratings.map((rating, index) => (
                <div key={index} style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{rating.username}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {formatTimeAgo(rating.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.125rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          fill={i < rating.rating ? 'var(--warning)' : 'none'}
                          color={i < rating.rating ? 'var(--warning)' : 'var(--text-tertiary)'}
                        />
                      ))}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{rating.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PaymentOptionsModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPayNow={handlePayNow}
        onPayOnDelivery={handlePayOnDelivery}
        productName={product.name}
        totalAmount={product.price * quantity}
        shippingCost={shippingCost}
      />

      <style>{`
        .product-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: start;
        }

        .product-images {
          position: sticky;
          top: 1rem;
        }

        .main-image {
          background: var(--bg-secondary);
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 1rem;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-thumbnails {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 0.75rem;
        }

        .thumbnail {
          background: var(--bg-secondary);
          border: 2px solid transparent;
          border-radius: 0.75rem;
          overflow: hidden;
          aspect-ratio: 1;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
        }

        .thumbnail.active {
          border-color: var(--primary);
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-title {
          margin-bottom: 1rem;
          font-size: 1.75rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .price-box {
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: 1rem;
          margin-bottom: 1.5rem;
        }

        .price-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .price-amount {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Poppins', sans-serif;
        }

        .product-description {
          margin-top: 2rem;
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: 1rem;
        }

        @media (max-width: 768px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .product-images {
            position: relative;
            top: 0;
          }

          .main-image {
            margin-bottom: 0.75rem;
          }

          .image-thumbnails {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }

          .product-title {
            font-size: 1.5rem;
            margin-bottom: 0.75rem;
          }

          .price-box {
            padding: 1.25rem;
            margin-bottom: 1.25rem;
          }

          .price-amount {
            font-size: 1.75rem;
          }

          .product-description {
            margin-top: 1.5rem;
            padding: 1.25rem;
          }

          .product-description h2 {
            font-size: 1.25rem;
          }

          .product-description p {
            font-size: 0.9375rem;
            line-height: 1.6;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
        }

        @media (max-width: 480px) {
          .product-title {
            font-size: 1.25rem;
          }

          .price-amount {
            font-size: 1.5rem;
          }

          .image-thumbnails {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;
