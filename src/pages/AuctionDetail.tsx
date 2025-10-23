import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gavel, User, Clock, ShoppingCart, AlertCircle, TrendingUp, ChevronLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';
import Countdown from '../components/Countdown';

const AuctionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auctions, user, isAuthenticated, addBid, addNotification } = useStore();
  
  const auction = auctions.find(a => a.id === id);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBidError, setShowBidError] = useState('');

  useEffect(() => {
    if (auction) {
      const nextBid = auction.currentPrice + 500;
      setBidAmount(nextBid.toString());
    }
  }, [auction]);

  if (!auction) {
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

  const handleBid = () => {
    if (!isAuthenticated) {
      // Verificar que la subasta esté activa
if (auction.status !== 'active') {
  alert('Esta subasta ya finalizó. No se pueden realizar más ofertas.');
  return;
}
      navigate('/login');
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

    if (amount <= auction.currentPrice) {
      setShowBidError(`La oferta debe ser mayor a ${formatCurrency(auction.currentPrice)}`);
      return;
    }

    addBid(auction.id, amount, user!.id, user!.username);
    addNotification({
      userId: user!.id,
      type: 'auction_outbid',
      title: 'Oferta realizada',
      message: `Ofertaste ${formatCurrency(amount)} en "${auction.title}"`,
      read: false
    });

    setShowBidError('');

// Verificar si es la oferta ganadora (cuando se cierra la subasta)
const isWinningBid = amount >= (auction.buyNowPrice || Infinity);

if (isWinningBid && auction.buyNowPrice) {
  // Si alcanza el precio de compra directa, finalizar subasta
  addNotification({
    userId: user!.id,
    type: 'auction_won',
    title: '¡ Ganaste la subasta!',
    message: `Ganaste "${auction.title}" por ${formatCurrency(amount)}. Tenés 48hs para pagar.`,
    read: false,
    link: '/notificaciones'
  });
  alert(`🎉 ¡GANASTE LA SUBASTA!\n\nProducto: ${auction.title}\nMonto final: ${formatCurrency(amount)}\n\nTenés 48 horas para completar el pago.\nRevisá tus notificaciones para ver el ticket de pago.`);
} else {
  alert(`✅ Oferta realizada con éxito!\n\nMonto: ${formatCurrency(amount)}\n\nSos el mejor postor actual.`);
}
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Verificar que la subasta esté activa
    if (auction.status !== 'active') {
      alert('Esta subasta ya finalizó. No se puede realizar la compra directa.');
      return;
    }

    if (auction.buyNowPrice) {
      const confirm = window.confirm(
        `¿Confirmas la compra directa por ${formatCurrency(auction.buyNowPrice)}?\n\nSerás redirigido a MercadoPago para completar el pago.`
      );
      
      if (confirm) {
        // Crear notificación de compra ganada
        addNotification({
          userId: user!.id,
          type: 'auction_won',
          title: '¡Compra realizada con éxito!',
          message: `Compraste "${auction.title}" por ${formatCurrency(auction.buyNowPrice)}. Tenés 48hs para completar el pago en MercadoPago.`,
          read: false,
          link: '/notificaciones'
        });
        
        // Cambiar estado de subasta a 'sold'
        const updatedAuctions = auctions.map(a => 
          a.id === auction.id 
            ? { ...a, status: 'sold' as const, winnerId: user!.id }
            : a
        );
        
        // Simular link de pago de MercadoPago
        const mercadopagoLink = `https://www.mercadopago.com.ar/checkout/v1/payment?preference_id=MOCK-${auction.id}-${Date.now()}`;
        
        alert(`🎉 ¡COMPRA EXITOSA!\n\nProducto: ${auction.title}\nMonto: ${formatCurrency(auction.buyNowPrice)}\n\nTenés 48 horas para completar el pago.\n\n📧 Revisá tus notificaciones para ver el ticket de pago.\n\n🔗 Link de pago: ${mercadopagoLink}`);
        
        // Opcional: abrir MercadoPago en nueva pestaña
        // window.open(mercadopagoLink, '_blank');
      }
    }
  };

  const incrementBid = (amount: number) => {
    const current = parseInt(bidAmount) || auction.currentPrice;
    setBidAmount((current + amount).toString());
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem 0' }}>
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
            marginBottom: '1.5rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9375rem'
          }}
        >
          <ChevronLeft size={20} />
          Volver a Subastas
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
          <div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1rem', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={auction.images[selectedImage]} 
                alt={auction.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {auction.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: selectedImage === idx ? '3px solid var(--primary)' : 'none',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    aspectRatio: '1',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <img src={img} alt={`${auction.title} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 style={{ marginBottom: '1rem' }}>{auction.title}</h1>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {auction.status === 'active' ? (
                <span className="badge badge-success">
                  <Gavel size={14} />
                  Subasta Activa
                </span>
              ) : (
                <span className="badge badge-error">Finalizada</span>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <Countdown endTime={auction.endTime} />
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Oferta Actual
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'Poppins' }}>
                  {formatCurrency(auction.currentPrice)}
                </div>
              </div>

              {auction.buyNowPrice && (
                <>
                  <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Precio de Compra Directa
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)', fontFamily: 'Poppins' }}>
                      {formatCurrency(auction.buyNowPrice)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {auction.status === 'active' && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={24} />
                  Realizar Oferta
                </h3>

                {showBidError && (
                  <div style={{ background: 'var(--error)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.9375rem' }}>
                    {showBidError}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Monto de la Oferta
                  </label>
                  <input 
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Ingresa tu oferta"
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: 600 }}
                  />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Las ofertas deben ser múltiplos de $500
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button onClick={() => incrementBid(500)} className="btn btn-outline" style={{ padding: '0.625rem' }}>
                    +$500
                  </button>
                  <button onClick={() => incrementBid(1000)} className="btn btn-outline" style={{ padding: '0.625rem' }}>
                    +$1,000
                  </button>
                  <button onClick={() => incrementBid(5000)} className="btn btn-outline" style={{ padding: '0.625rem' }}>
                    +$5,000
                  </button>
                </div>

                <button onClick={handleBid} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
                  <Gavel size={20} />
                  Ofertar {bidAmount && formatCurrency(parseInt(bidAmount))}
                </button>

                {auction.buyNowPrice && (
                  <button onClick={handleBuyNow} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem', padding: '1rem', fontSize: '1.125rem' }}>
                    <ShoppingCart size={20} />
                    Comprar Ahora por {formatCurrency(auction.buyNowPrice)}
                  </button>
                )}
              </div>
            )}

            {auction.bids.length > 0 && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={24} />
                  Historial de Ofertas ({auction.bids.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {[...auction.bids].reverse().map((bid) => (
                    <div 
                      key={bid.id}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.875rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{bid.username}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          {formatTimeAgo(bid.createdAt)}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatCurrency(bid.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '3rem', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Descripción</h2>
          <p style={{ fontSize: '1.0625rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
            {auction.description}
          </p>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Información Importante</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Las ofertas deben ser múltiplos de $500</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>El ganador tiene 48 horas para realizar el pago</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Si no se completa el pago, la subasta se republica</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                <span>Precio de inicio: {formatCurrency(auction.startPrice)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
