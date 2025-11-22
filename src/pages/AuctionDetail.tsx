        import { soundManager } from '../utils/sounds';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gavel, User, Clock, ShoppingCart, AlertCircle, TrendingUp, ChevronLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';
import { launchConfettiFromTop } from '../utils/celebrations';
import Countdown from '../components/Countdown';
import { useSEO, generateAuctionStructuredData } from '../hooks/useSEO';
import PaymentOptionsModal from '../components/PaymentOptionsModal';
import { createAutoMessage, saveMessage } from '../utils/messages';
import { generateOrderNumber } from '../utils/orderNumberGenerator';
import { logOrderCreated } from '../utils/orderTransactions';
import { Order } from '../types';

const AuctionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auctions, user, isAuthenticated, addBid, addNotification, addOrder } = useStore();
  
  const auction = auctions.find(a => a.id === id);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBidError, setShowBidError] = useState('');
  const [isRecentlyEnded, setIsRecentlyEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (auction) {
      const nextBid = auction.currentPrice + 500;
      setBidAmount(nextBid.toString());

      // Verificar si la subasta finalizó recientemente (menos de 30 minutos)
      if (auction.status === 'ended' || auction.status === 'sold') {
        if (auction.endTime) {
          const endTime = new Date(auction.endTime).getTime();
          const now = new Date().getTime();
          const thirtyMinutes = 30 * 60 * 1000;
          const timeSinceEnd = now - endTime;
          
          setIsRecentlyEnded(timeSinceEnd <= thirtyMinutes);
          
          // Calcular tiempo restante para ocultar
          if (timeSinceEnd <= thirtyMinutes) {
            setTimeRemaining(Math.max(0, thirtyMinutes - timeSinceEnd));
          }
        }
      }
    }
  }, [auction]);

  // Efecto para contar el tiempo restante
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            clearInterval(timer);
            setIsRecentlyEnded(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // SEO: Schema.org para subasta (DEBE ir antes de cualquier return condicional)
  const auctionImage = auction?.images[0]?.startsWith('http') 
    ? auction.images[0] 
    : auction?.images[0] 
      ? `https://www.clickio.com.ar${auction.images[0]}` 
      : undefined;
  
  useSEO({
    title: auction?.title,
    description: auction?.description 
      ? (auction.description.length > 160 
          ? auction.description.substring(0, 157) + '...' 
          : auction.description)
      : undefined,
    image: auctionImage,
    url: auction ? `https://www.clickio.com.ar/subastas/${auction.id}` : undefined,
    type: 'product',
    structuredData: auction ? generateAuctionStructuredData(auction) : undefined
  });

  // Si la subasta no existe O si finalizó hace más de 30 minutos
  if (!auction || ((auction.status === 'ended' || auction.status === 'sold') && !isRecentlyEnded)) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={64} color="var(--error)" style={{ marginBottom: '1rem' }} />
          <h2>Subasta no encontrada</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>La subasta que buscas no existe o fue eliminada.</p>
          <button onClick={() => navigate('/subastas')} className="btn btn-primary">
            Volver a Subastas
          </button>
        </div>
      </div>
    );
  }

  const isActive = auction.status === 'active';

  // Agregar hooks/cálculos auxiliares para saber tiempo restante (en segundos)
  const now = Date.now();
  const auctionEndTimestamp = new Date(auction.endTime).getTime();
  const secondsToFinish = Math.max(0, Math.floor((auctionEndTimestamp - now) / 1000));
  const lessThanOneMinute = isActive && secondsToFinish <= 60;
  const lessThanTenSeconds = isActive && secondsToFinish <= 10;

  const handleBid = () => {
  if (!isAuthenticated) {
    navigate('/login');
    return;
  }

  // VALIDACIÓN: Verificar que la subasta esté activa
  if (!isActive) {
    alert('Esta subasta ya finalizó. No se pueden realizar más ofertas.');
    return;
  }

  const amount = parseInt(bidAmount);
  
  if (isNaN(amount)) {
    setShowBidError('Ingresa un monto válido');
    return;
  }

  if (amount % 500 !== 0) {
    setShowBidError('La oferta debe ser múltiplo de $500');
    return;
  }

  // ✅ CORRECCIÓN CRÍTICA: Validar que sea mayor al precio actual
  if (amount <= auction.currentPrice) {
    setShowBidError(`La oferta debe ser mayor a ${formatCurrency(auction.currentPrice)}`);
    return;
  }

  // ✅ CORRECCIÓN: Validar que no sea tu propia oferta la ganadora
  const lastBid = auction.bids[auction.bids.length - 1];
  if (lastBid && lastBid.userId === user!.id) {
    setShowBidError('Ya sos el mejor postor. Esperá a que alguien supere tu oferta.');
    return;
  }

  // Si la oferta es mayor o igual al precio de compra directa, sugerir usar "Comprar Ahora"
  if (auction.buyNowPrice && amount >= auction.buyNowPrice) {
    const useBuyNow = window.confirm(
      `Tu oferta de ${formatCurrency(amount)} es igual o mayor al precio de compra directa (${formatCurrency(auction.buyNowPrice)}).\n\n¿Querés usar "Comprar Ahora" en su lugar? Esto garantizará que obtengas el producto inmediatamente.`
    );
    
    if (useBuyNow) {
      // Cancelar esta oferta y usar compra directa
      handleBuyNow();
      return;
    }
  }

  addBid(auction.id, amount, user!.id, user!.username);
  // Ajustar el próximo valor sugerido inmediatamente
  setBidAmount((amount + 500).toString());
  // Haptics en móvil
  if (navigator.vibrate) { try { navigator.vibrate(20); } catch {} }
  soundManager.playBid();

  // Notificación de oferta realizada (sin confeti - eso solo aparece al ganar)
  addNotification({
    userId: user!.id,
    type: 'auction_outbid',
    title: 'Oferta realizada',
    message: `Ofertaste ${formatCurrency(amount)} en "${auction.title}"`,
    read: false
  });
  
  alert(`✅ Oferta realizada con éxito!\n\nMonto: ${formatCurrency(amount)}\n\nSos el mejor postor actual.`);

  setShowBidError('');
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // VALIDACIÓN: Verificar que la subasta esté activa
    if (!isActive) {
      alert('Esta subasta ya finalizó. No se puede realizar la compra directa.');
      return;
    }

    if (auction.buyNowPrice) {
      // Mostrar modal de opciones de pago
      setShowPaymentModal(true);
    }
  };

  // Costo de envío estimado (puedes ajustar este valor o calcularlo dinámicamente)
  const shippingCost = 5000; // $5000 ARS como ejemplo

  const handlePayNow = async () => {
    setShowPaymentModal(false);
    const totalAmount = auction.buyNowPrice!;
    const totalWithShipping = totalAmount + shippingCost;

    // Información sobre bultos si aplica
    let bundleInfo = '';
    if (auction.sellOnlyByBundle && auction.unitsPerBundle && auction.unitsPerBundle > 0) {
      bundleInfo = `\n\n⚠️ IMPORTANTE: Esta subasta solo se vende por bulto completo.\nEstás comprando 1 bulto de ${auction.unitsPerBundle} unidades.`;
      if (auction.bundles && auction.bundles > 0) {
        bundleInfo += `\nBultos disponibles: ${auction.bundles}`;
      }
    } else if (auction.unitsPerBundle && auction.unitsPerBundle > 0 && auction.bundles && auction.bundles > 0) {
      bundleInfo = `\n\n📦 Información: ${auction.bundles} bulto${auction.bundles !== 1 ? 's' : ''} disponible${auction.bundles !== 1 ? 's' : ''} (${auction.unitsPerBundle} unidades por bulto)`;
    }

    const confirm = window.confirm(
      `¿Confirmas la compra directa por ${formatCurrency(totalAmount)}?${bundleInfo}\n\nCosto de envío: ${formatCurrency(shippingCost)}\nTotal a pagar: ${formatCurrency(totalWithShipping)}\n\nSerás redirigido a MercadoPago para completar el pago.`
    );

    if (confirm && user) {
      try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas para pagar
        const orderNumber = await generateOrderNumber();
        
        const quantity = auction.sellOnlyByBundle && auction.unitsPerBundle ? auction.unitsPerBundle : 1;
        
        const order: Order = {
          id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderNumber,
          userId: user.id,
          userName: user.username,
          productId: auction.id,
          productName: auction.title,
          productImage: auction.images[0] || '',
          productType: 'auction',
          type: 'auction',
          amount: totalWithShipping,
          quantity: quantity,
          status: 'pending_payment',
          deliveryMethod: 'shipping',
          createdAt: now,
          expiresAt: expiresAt,
          address: user.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } },
          unitsPerBundle: auction.unitsPerBundle,
          bundles: auction.bundles
        };

        await addOrder(order);
        
        // Registrar transacción en el log
        await logOrderCreated(order.id, orderNumber, user.id, user.username, order.amount);

        const purchaseMessage = auction.sellOnlyByBundle && auction.unitsPerBundle && auction.unitsPerBundle > 0
          ? `Compraste "${auction.title}" (1 bulto de ${auction.unitsPerBundle} unidades) por ${formatCurrency(totalWithShipping)} (incluye envío). Tenés 48hs para completar el pago en MercadoPago.`
          : `Compraste "${auction.title}" por ${formatCurrency(totalWithShipping)} (incluye envío). Tenés 48hs para completar el pago en MercadoPago.`;

        addNotification({
          userId: user.id,
          type: 'auction_won',
          title: '¡Compra realizada con éxito!',
          message: purchaseMessage,
          read: false,
          link: '/notificaciones'
        });
        launchConfettiFromTop(3500);

        const mercadopagoLink = `https://www.mercadopago.com.ar/checkout/v1/payment?preference_id=MOCK-${auction.id}-${Date.now()}`;

        const successMessage = auction.sellOnlyByBundle && auction.unitsPerBundle && auction.unitsPerBundle > 0
          ? `🎉 ¡COMPRA EXITOSA!\n\nNúmero de pedido: ${orderNumber}\nProducto: ${auction.title}\nCantidad: 1 bulto de ${auction.unitsPerBundle} unidades\nSubtotal: ${formatCurrency(totalAmount)}\nCosto de envío: ${formatCurrency(shippingCost)}\nTotal: ${formatCurrency(totalWithShipping)}\n\nTenés 48 horas para completar el pago.\n\n📧 Revisá tus notificaciones para ver el ticket de pago.\n\n🔗 Link de pago: ${mercadopagoLink}`
          : `🎉 ¡COMPRA EXITOSA!\n\nNúmero de pedido: ${orderNumber}\nProducto: ${auction.title}\nSubtotal: ${formatCurrency(totalAmount)}\nCosto de envío: ${formatCurrency(shippingCost)}\nTotal: ${formatCurrency(totalWithShipping)}\n\nTenés 48 horas para completar el pago.\n\n📧 Revisá tus notificaciones para ver el ticket de pago.\n\n🔗 Link de pago: ${mercadopagoLink}`;

        alert(successMessage);
        // window.location.href = mercadopagoLink; // Descomentar cuando tengas la integración real
      } catch (error) {
        console.error('Error creando pedido:', error);
        alert('Hubo un error al crear el pedido. Por favor, intentá nuevamente.');
      }
    }
  };

  const handlePayOnDelivery = async () => {
    setShowPaymentModal(false);
    const totalAmount = auction.buyNowPrice!;
    const totalWithShipping = totalAmount + shippingCost;

    // Información sobre bultos si aplica
    let bundleInfo = '';
    if (auction.sellOnlyByBundle && auction.unitsPerBundle && auction.unitsPerBundle > 0) {
      bundleInfo = `\n\n⚠️ IMPORTANTE: Esta subasta solo se vende por bulto completo.\nEstás comprando 1 bulto de ${auction.unitsPerBundle} unidades.`;
      if (auction.bundles && auction.bundles > 0) {
        bundleInfo += `\nBultos disponibles: ${auction.bundles}`;
      }
    } else if (auction.unitsPerBundle && auction.unitsPerBundle > 0 && auction.bundles && auction.bundles > 0) {
      bundleInfo = `\n\n📦 Información: ${auction.bundles} bulto${auction.bundles !== 1 ? 's' : ''} disponible${auction.bundles !== 1 ? 's' : ''} (${auction.unitsPerBundle} unidades por bulto)`;
    }

    const confirm = window.confirm(
      `¿Confirmas la compra directa por ${formatCurrency(totalAmount)}?${bundleInfo}\n\nCosto de envío: ${formatCurrency(shippingCost)}\nTotal a pagar al recibir: ${formatCurrency(totalWithShipping)}\n\nSe enviará un mensaje de preparación de tu pedido.`
    );

    if (confirm && user) {
      try {
        const now = new Date();
        const orderNumber = await generateOrderNumber();
        const quantity = auction.sellOnlyByBundle && auction.unitsPerBundle ? auction.unitsPerBundle : 1;
        
        const order: Order = {
          id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderNumber,
          userId: user.id,
          userName: user.username,
          productId: auction.id,
          productName: auction.title,
          productImage: auction.images[0] || '',
          productType: 'auction',
          type: 'auction',
          amount: totalWithShipping,
          quantity: quantity,
          status: 'preparing', // Estado de preparación para pago al recibir
          deliveryMethod: 'shipping',
          createdAt: now,
          address: user.address || { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } },
          unitsPerBundle: auction.unitsPerBundle,
          bundles: auction.bundles
        };

        await addOrder(order);
        
        // Registrar transacción en el log
        await logOrderCreated(order.id, orderNumber, user.id, user.username, order.amount);

        const productDescription = auction.sellOnlyByBundle && auction.unitsPerBundle && auction.unitsPerBundle > 0
          ? `${auction.title} (1 bulto de ${auction.unitsPerBundle} unidades)`
          : auction.title;

        // Enviar mensaje de preparación al cliente
        const preparationMessage = await createAutoMessage(
          user.id,
          user.username,
          'purchase',
          {
            productName: productDescription,
            productId: auction.id,
            orderId: orderNumber,
            amount: totalWithShipping
          }
        );

        // Personalizar el mensaje para preparación
        preparationMessage.content = `Hola ${user.username}, 👋

Tu pedido de "${auction.title}" está siendo preparado.

Detalles:
• Número de pedido: ${orderNumber}
• Producto: ${auction.title}${auction.sellOnlyByBundle && auction.unitsPerBundle ? ` (1 bulto de ${auction.unitsPerBundle} unidades)` : ''}
• Subtotal: ${formatCurrency(totalAmount)}
• Costo de envío: ${formatCurrency(shippingCost)}
• Total a pagar al recibir: ${formatCurrency(totalWithShipping)}

Te notificaremos cuando tu pedido esté listo para el envío. El pago se realizará al momento de la entrega.`;

        await saveMessage(preparationMessage);

        addNotification({
          userId: user.id,
          type: 'auction_won',
          title: 'Pedido confirmado',
          message: `Tu pedido de ${auction.title} está siendo preparado. Total a pagar al recibir: ${formatCurrency(totalWithShipping)}`,
          read: false,
          link: '/notificaciones'
        });

        launchConfettiFromTop(3500);

        alert(`✅ Pedido confirmado!\n\nNúmero de pedido: ${orderNumber}\n\nSe ha enviado un mensaje de preparación a tu bandeja de entrada.\n\nTotal a pagar al recibir: ${formatCurrency(totalWithShipping)}`);
      } catch (error) {
        console.error('Error creando pedido:', error);
        alert('Hubo un error al crear el pedido. Por favor, intentá nuevamente.');
      }
    }
  };

  const incrementBid = (amount: number) => {
    const current = parseInt(bidAmount) || auction.currentPrice;
    setBidAmount((current + amount).toString());
  };

  const lastThreeBids = auction.bids.slice(-3).reverse();

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '1rem 0' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        <button 
          onClick={() => navigate('/subastas')}
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
          Volver a Subastas
        </button>

        <div className="auction-detail-grid">
          <div className="auction-images">
            <div className="auction-main-image">
              <img 
                src={auction.images[selectedImage]} 
                alt={auction.title}
              />
            </div>
            {auction.images.length > 1 && (
              <div className="auction-thumbnails">
                {auction.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={selectedImage === idx ? 'auction-thumbnail active' : 'auction-thumbnail'}
                  >
                    <img src={img} alt={`${auction.title} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="auction-info">
            <h1 className="auction-title">{auction.title}</h1>
            
            {/* Información de bultos si aplica */}
            {auction.unitsPerBundle && auction.unitsPerBundle > 0 && (
              <div style={{ 
                marginBottom: '1rem',
                padding: '0.75rem',
                background: auction.sellOnlyByBundle ? 'rgba(255, 167, 38, 0.1)' : 'var(--bg-tertiary)',
                borderRadius: '0.5rem',
                border: auction.sellOnlyByBundle ? '1px solid var(--warning)' : '1px solid var(--border)'
              }}>
                {auction.sellOnlyByBundle ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 600 }}>
                    <span>⚠️</span>
                    <span>Solo se vende por bulto completo: {auction.unitsPerBundle} unidades</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    📦 {auction.bundles || 0} bulto{(auction.bundles || 0) !== 1 ? 's' : ''} disponible{(auction.bundles || 0) !== 1 ? 's' : ''} × {auction.unitsPerBundle} unidades por bulto
                  </div>
                )}
              </div>
            )}
            
            <div className="auction-price-box">
              <div className="auction-price-section">
                <div className="auction-price-label">💰 Precio Actual de la Subasta</div>
                <div className="auction-price-amount">
                  {formatCurrency(auction.currentPrice)}
                </div>
              </div>

              {auction.buyNowPrice && isActive && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Precio de Compra Directa</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(auction.buyNowPrice)}</div>
                </div>
              )}

              {/* Mejorar panel de estado según ACTIVA o FINALIZADA */}
{isActive ? (
  <div
    style={{
      padding: '0.75rem 0.5rem',
      background: lessThanOneMinute ? '#ffa726' : 'var(--bg-tertiary)',
      borderRadius: '0.75rem',
      boxShadow: lessThanOneMinute
        ? '0 0 35px 5px #FFA50080, 0 0 15px #ff5722, inset 0 0 20px rgba(255, 87, 34, 0.3)' : '0 2px 8px #0001',
      border: lessThanOneMinute ? '3px solid #e65100' : '2px solid var(--primary)',
      color: lessThanOneMinute ? '#fff' : 'var(--text-primary)',
      position: 'relative',
      textAlign: 'center',
      transition: 'all .33s cubic-bezier(.6,-0.01,0,1.01)',
      animation: lessThanTenSeconds ? 'container-panic 0.5s infinite' : (lessThanOneMinute ? 'container-pulse 1.5s ease-in-out infinite' : undefined),
      flexShrink: 0
    }}
  >
    <div
      className="countdown-container"
      style={{
        marginBottom: '0.375rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        animation: lessThanTenSeconds ? 'shake-intense 0.25s infinite' : (lessThanOneMinute ? 'pulse-urgent-intense 0.8s ease-in-out infinite' : undefined)
      }}
    >
      <Clock 
        size={lessThanOneMinute ? 36 : 32} 
        className="countdown-clock"
        style={{ 
          color: lessThanOneMinute ? '#fff7a7' : 'var(--primary)', 
          transition: 'all .33s',
          filter: lessThanOneMinute ? 'drop-shadow(0 0 15px rgba(255, 247, 167, 1)) drop-shadow(0 0 30px rgba(255, 247, 167, 0.6))' : undefined,
          animation: lessThanTenSeconds ? 'clock-panic-intense 0.3s infinite' : (lessThanOneMinute ? 'clock-wobble 0.6s ease-in-out infinite' : undefined)
        }} 
      />
      <span
        className="countdown-text"
        style={{
          fontWeight: '900',
          fontSize: lessThanOneMinute ? '2rem' : '1.75rem',
          color: lessThanOneMinute ? '#fff' : 'var(--primary)',
          letterSpacing: '1px',
          transition: 'all .3s',
          animation: lessThanOneMinute ? 'blinker-intense 0.6s steps(2) infinite' : undefined,
          textShadow: lessThanOneMinute ? '0 0 30px rgba(255, 255, 255, 1), 0 0 60px rgba(255, 247, 167, 0.8), 0 0 90px rgba(255, 247, 167, 0.4)' : '0 4px 12px rgba(255, 107, 0, 0.4)',
          fontFamily: 'monospace',
          lineHeight: 1
        }}
      >
        <Countdown endTime={auction.endTime} />
      </span>
    </div>
    <div style={{
      fontSize: '0.875rem', 
      fontWeight: 600,
      animation: lessThanOneMinute ? 'text-pulse 1s ease-in-out infinite' : undefined,
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      padding: '0 0.5rem'
    }}>
      {lessThanOneMinute ? '¡Poco tiempo! ¡No te quedes afuera!' : 'Subasta Activa'}
    </div>
    <style>
      {`
        @keyframes blinker-intense { 
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.02); }
        }
        @keyframes shake-intense {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          5% { transform: translateX(-8px) rotate(-3deg); }
          10% { transform: translateX(8px) rotate(3deg); }
          15% { transform: translateX(-8px) rotate(-3deg); }
          20% { transform: translateX(8px) rotate(3deg); }
          25% { transform: translateX(-6px) rotate(-2deg); }
          30% { transform: translateX(6px) rotate(2deg); }
          35% { transform: translateX(-6px) rotate(-2deg); }
          40% { transform: translateX(6px) rotate(2deg); }
          45% { transform: translateX(-4px) rotate(-1deg); }
          50% { transform: translateX(4px) rotate(1deg); }
          55% { transform: translateX(-4px) rotate(-1deg); }
          60% { transform: translateX(4px) rotate(1deg); }
          65% { transform: translateX(-2px) rotate(0deg); }
          70% { transform: translateX(2px) rotate(0deg); }
          75% { transform: translateX(-2px) rotate(0deg); }
          80% { transform: translateX(2px) rotate(0deg); }
          85% { transform: translateX(-1px) rotate(0deg); }
          90% { transform: translateX(1px) rotate(0deg); }
          95% { transform: translateX(0) rotate(0deg); }
        }
        @keyframes pulse-urgent-intense {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes clock-panic-intense {
          0%, 100% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-8deg) scale(1.15); }
          40% { transform: rotate(8deg) scale(1.15); }
          60% { transform: rotate(-6deg) scale(1.1); }
          80% { transform: rotate(6deg) scale(1.1); }
        }
        @keyframes clock-wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes container-panic {
          0%, 100% { transform: scale(1); box-shadow: 0 0 35px 5px #FFA50080, 0 0 15px #ff5722, inset 0 0 20px rgba(255, 87, 34, 0.3); }
          50% { transform: scale(1.02); box-shadow: 0 0 45px 8px #FFA50080, 0 0 20px #ff5722, inset 0 0 25px rgba(255, 87, 34, 0.5); }
        }
        @keyframes container-pulse {
          0%, 100% { box-shadow: 0 0 35px 5px #FFA50080, 0 0 15px #ff5722, inset 0 0 20px rgba(255, 87, 34, 0.3); }
          50% { box-shadow: 0 0 40px 7px #FFA50080, 0 0 18px #ff5722, inset 0 0 22px rgba(255, 87, 34, 0.4); }
        }
        @keyframes text-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}
    </style>
  </div>
) : (
  <div style={{
    padding: '1.5rem 1rem', background: '#666', color: '#fff', borderRadius: '0.75rem', marginBottom: '1.25rem', textAlign: 'center', border: '2px solid #444', boxShadow: '0 1px 6px #0002',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
  }}>
    <AlertCircle size={40} color="#ffe37a" style={{ marginBottom: '0.5rem' }} />
    <div style={{fontWeight: 700,fontSize: '1.25rem'}}>Subasta Finalizada</div>
    <div style={{fontSize: '1rem', opacity: 0.88}}>No se pueden aceptar más ofertas en este artículo.</div>
    {isRecentlyEnded && (
      <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.25rem' }}>
        Se ocultará en: {formatTime(timeRemaining)}
      </div>
    )}
  </div>
)}
            </div>

            {/* SOLO mostrar controles de oferta si la subasta está ACTIVA */}
            {(auction.status === 'active' && auction.endTime && new Date(auction.endTime) > new Date()) ? (
              <div style={{ 
                background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', 
                padding: '1.25rem', 
                borderRadius: '1rem', 
                border: '2px solid var(--primary)',
                boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                maxHeight: '100%'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255, 107, 0, 0.1) 0%, transparent 70%)',
                  animation: 'pulse-glow 3s ease-in-out infinite',
                  pointerEvents: 'none',
                  zIndex: 0
                }} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Gavel size={20} />
                    Realizar Oferta
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Ingresa tu oferta"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '2px solid var(--primary)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontWeight: 600
                      }}
                    />
                  </div>

                  <div className="bid-increment-buttons" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={() => incrementBid(500)} className="btn btn-secondary" style={{ flex: '1 1 auto', minWidth: '70px', padding: '0.5rem', fontSize: '0.875rem' }}>+$500</button>
                    <button onClick={() => incrementBid(1000)} className="btn btn-secondary" style={{ flex: '1 1 auto', minWidth: '70px', padding: '0.5rem', fontSize: '0.875rem' }}>+$1.000</button>
                    <button onClick={() => incrementBid(5000)} className="btn btn-secondary" style={{ flex: '1 1 auto', minWidth: '70px', padding: '0.5rem', fontSize: '0.875rem' }}>+$5.000</button>
                  </div>

                  {showBidError && (
                    <div style={{ color: 'var(--error)', marginBottom: '0.75rem', fontSize: '0.75rem', padding: '0.5rem', background: 'rgba(255, 0, 0, 0.1)', borderRadius: '0.5rem' }}>
                      {showBidError}
                    </div>
                  )}

                  <button 
                    onClick={handleBid} 
                    className="btn btn-primary" 
                    style={{ 
                      width: '100%', 
                      padding: '0.875rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      border: 'none',
                      boxShadow: '0 0 25px rgba(255, 107, 0, 0.5), 0 8px 16px rgba(255, 107, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      marginTop: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 35px rgba(255, 107, 0, 0.7), 0 12px 24px rgba(255, 107, 0, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 107, 0, 0.5), 0 8px 16px rgba(255, 107, 0, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Gavel size={20} style={{ marginRight: '0.5rem' }} />
                    Realizar Oferta
                  </button>
                </div>
                <style>{`
                  @keyframes pulse-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                  }
                `}</style>
              </div>
            ) : null}

            {/* COMPRAR AHORA - Separado visualmente de las ofertas */}
            {auction.buyNowPrice && isActive && (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)', 
                padding: '1rem', 
                borderRadius: '1rem', 
                border: '2px solid var(--success)',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.2)',
                flex: '0 1 auto'
              }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem', fontWeight: 600 }}>
                    🛒 Compra Directa Disponible
                  </div>
                  <div className="buy-now-price" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.375rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                    {formatCurrency(auction.buyNowPrice)}
                  </div>
                  {auction.sellOnlyByBundle && auction.unitsPerBundle && auction.unitsPerBundle > 0 && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--warning)', 
                      fontWeight: 600,
                      padding: '0.375rem',
                      background: 'rgba(255, 167, 38, 0.1)',
                      borderRadius: '0.5rem',
                      marginBottom: '0.375rem'
                    }}>
                      ⚠️ Solo se vende por bulto completo: {auction.unitsPerBundle} unidades
                    </div>
                  )}
                  {auction.unitsPerBundle && auction.unitsPerBundle > 0 && auction.bundles && auction.bundles > 0 && !auction.sellOnlyByBundle && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                      📦 {auction.bundles} bulto{auction.bundles !== 1 ? 's' : ''} disponible{auction.bundles !== 1 ? 's' : ''} ({auction.unitsPerBundle} unidades por bulto)
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleBuyNow} 
                  className="btn btn-success" 
                  style={{ 
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <ShoppingCart size={18} style={{ marginRight: '0.5rem' }} />
                  Comprar Ahora
                </button>
              </div>
            )}

            {/* Subasta Finalizada */}
            {!(auction.status === 'active' && auction.endTime && new Date(auction.endTime) > new Date()) && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <AlertCircle size={48} color="var(--error)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Subasta Finalizada</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Esta subasta ya no acepta ofertas.</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Estado: {auction.status} | Tiempo final: {auction.endTime ? new Date(auction.endTime).toLocaleString() : 'No definido'}
                </p>
              </div>
            )}
        

            {lastThreeBids.length > 0 && (
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '1rem', 
                borderRadius: '1rem',
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                maxHeight: '100%',
                overflow: 'hidden'
              }}>
                <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                  <TrendingUp size={18} />
                  Últimas Ofertas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                  {lastThreeBids.map((bid) => (
                    <div key={bid.id} className="bid-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0, flex: '1 1 auto' }}>
                        <User size={14} style={{ flexShrink: 0 }} />
                        <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', fontSize: '0.875rem' }}>{bid.username}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatTimeAgo(bid.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-word', overflowWrap: 'break-word', flexShrink: 0, fontSize: '0.875rem' }}>
                        {formatCurrency(bid.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="auction-description-section" style={{ marginTop: '2rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Descripción</h2>
          <p className="description-text" style={{ fontSize: '1rem', lineHeight: '1.8', color: 'var(--text-secondary)', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            {auction.description}
          </p>

          <div className="how-it-works" style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              📖 ¿Cómo funciona?
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>Ofertá en múltiplos de $500</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>Debe superar el precio actual: {formatCurrency(auction.currentPrice)}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>Ganá ofertando más que otros</span>
              </li>
              {auction.buyNowPrice && (
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>O comprá directo por {formatCurrency(auction.buyNowPrice)}</span>
                </li>
              )}
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>El ganador tiene 48 horas para realizar el pago</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>Si no se completa el pago, la subasta se republica</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>Precio de inicio: {formatCurrency(auction.startingPrice ?? auction.currentPrice)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .auction-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: stretch;
        }

        .auction-images {
          position: sticky;
          top: 1rem;
          display: flex;
          flex-direction: column;
        }

        .auction-main-image {
          background: var(--bg-secondary);
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 1rem;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .auction-main-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .auction-thumbnails {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .auction-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
          overflow: hidden;
        }

        .auction-price-box {
          flex-shrink: 0;
          padding: 1rem !important;
        }

        .auction-price-amount {
          font-size: 2rem !important;
        }

        .auction-thumbnail {
          background: var(--bg-secondary);
          border: 3px solid transparent;
          border-radius: 0.5rem;
          overflow: hidden;
          cursor: pointer;
          padding: 0;
          aspect-ratio: 1;
          transition: all 0.2s;
        }

        .auction-thumbnail.active {
          border-color: var(--primary);
        }

        .auction-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .auction-title {
          font-size: 1.75rem;
          margin-bottom: 1rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .auction-price-box {
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: 1rem;
          flex-shrink: 0;
        }

        .auction-price-label {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          fontWeight: 600;
        }

        .auction-price-amount {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--primary);
          text-shadow: 0 4px 12px rgba(255, 107, 0, 0.4), 0 0 20px rgba(255, 107, 0, 0.2);
          letter-spacing: -1px;
          line-height: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .countdown-text {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        @media (max-width: 768px) {
          .auction-detail-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .auction-images {
            position: relative;
            top: 0;
          }

          .auction-main-image {
            margin-bottom: 0.75rem;
          }

          .auction-thumbnails {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
          }

          .auction-title {
            font-size: 1.5rem;
            margin-bottom: 0.75rem;
          }

          .auction-price-box {
            padding: 1.25rem;
            margin-bottom: 1.25rem;
          }

          .auction-price-label {
            font-size: 0.875rem;
          }

          .auction-price-amount {
            font-size: 2rem;
            letter-spacing: -0.5px;
          }

          .countdown-container {
            gap: 0.75rem !important;
            padding: 0 0.5rem;
          }

          .countdown-clock {
            width: 32px !important;
            height: 32px !important;
            flex-shrink: 0;
          }

          .countdown-text {
            font-size: 1.75rem !important;
            letter-spacing: 1px !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          .auction-description-section {
            padding: 1.25rem !important;
          }

          .section-title {
            font-size: 1.125rem !important;
          }

          .description-text {
            font-size: 0.9375rem !important;
          }

          .how-it-works {
            padding: 1rem !important;
          }

          .how-it-works h3 {
            font-size: 0.9375rem !important;
          }

          .how-it-works li span {
            font-size: 0.8125rem !important;
          }

          .bid-item {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .bid-increment-buttons button {
            font-size: 0.8125rem !important;
            padding: 0.5rem !important;
          }

          .buy-now-price {
            font-size: 1.25rem !important;
          }
        }

        @media (max-width: 480px) {
          .auction-title {
            font-size: 1.25rem;
          }

          .auction-price-amount {
            font-size: 1.75rem;
          }

          .countdown-container {
            gap: 0.5rem !important;
          }

          .countdown-text {
            font-size: 1.5rem !important;
            letter-spacing: 0.5px !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          .countdown-clock {
            width: 28px !important;
            height: 28px !important;
            flex-shrink: 0;
          }

          .auction-description-section {
            padding: 1.25rem !important;
            margin-top: 1.5rem !important;
          }

          .section-title {
            font-size: 1.25rem !important;
          }

          .description-text {
            font-size: 0.9375rem !important;
          }

          .how-it-works {
            padding: 1rem !important;
          }

          .how-it-works h3 {
            font-size: 1rem !important;
          }

          .how-it-works li span {
            font-size: 0.875rem !important;
          }

          .bid-item {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .bid-increment-buttons button {
            font-size: 0.875rem !important;
            padding: 0.625rem 0.5rem !important;
          }

          .buy-now-price {
            font-size: 1.5rem !important;
          }
        }
      `}</style>

      {auction && auction.buyNowPrice && (
        <PaymentOptionsModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPayNow={handlePayNow}
          onPayOnDelivery={handlePayOnDelivery}
          productName={auction.title}
          totalAmount={auction.buyNowPrice}
          shippingCost={shippingCost}
        />
      )}
    </div>
  );
};

export default AuctionDetail;
