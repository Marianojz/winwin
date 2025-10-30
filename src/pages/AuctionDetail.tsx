import { soundManager } from '../utils/sounds';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gavel, User, Clock, ShoppingCart, AlertCircle, TrendingUp, ChevronLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';
import { launchConfettiFromTop } from '../utils/celebrations';
import Countdown from '../components/Countdown';

const AuctionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auctions, user, isAuthenticated, addBid, addNotification } = useStore();
  
  const auction = auctions.find(a => a.id === id);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBidError, setShowBidError] = useState('');
  const [isRecentlyEnded, setIsRecentlyEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

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

  addBid(auction.id, amount, user!.id, user!.username);
  soundManager.playBid();

    
    // Verificar si es la oferta ganadora
    const isWinningBid = auction.buyNowPrice && amount >= auction.buyNowPrice;

    if (isWinningBid) {
      addNotification({
        userId: user!.id,
        type: 'auction_won',
        title: '¡Ganaste la subasta!',
        message: `Ganaste "${auction.title}" por ${formatCurrency(amount)}. Tenés 48hs para pagar.`,
        read: false,
        link: '/notificaciones'
      });
      launchConfettiFromTop(3500);
      alert(`🎉 ¡GANASTE LA SUBASTA!\n\nProducto: ${auction.title}\nMonto final: ${formatCurrency(amount)}\n\nTenés 48 horas para completar el pago.\nRevisá tus notificaciones para ver el ticket de pago.`);
    } else {
      addNotification({
        userId: user!.id,
        type: 'auction_outbid',
        title: 'Oferta realizada',
        message: `Ofertaste ${formatCurrency(amount)} en "${auction.title}"`,
        read: false
      });
      alert(`✅ Oferta realizada con éxito!\n\nMonto: ${formatCurrency(amount)}\n\nSos el mejor postor actual.`);
    }

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
      const confirm = window.confirm(
        `¿Confirmas la compra directa por ${formatCurrency(auction.buyNowPrice)}?\n\nSerás redirigido a MercadoPago para completar el pago.`
      );
      
      if (confirm) {
        addNotification({
          userId: user!.id,
          type: 'auction_won',
          title: '¡Compra realizada con éxito!',
          message: `Compraste "${auction.title}" por ${formatCurrency(auction.buyNowPrice)}. Tenés 48hs para completar el pago en MercadoPago.`,
          read: false,
          link: '/notificaciones'
        });
        launchConfettiFromTop(3500);
        
        const mercadopagoLink = `https://www.mercadopago.com.ar/checkout/v1/payment?preference_id=MOCK-${auction.id}-${Date.now()}`;
        
        alert(`🎉 ¡COMPRA EXITOSA!\n\nProducto: ${auction.title}\nMonto: ${formatCurrency(auction.buyNowPrice)}\n\nTenés 48 horas para completar el pago.\n\n📧 Revisá tus notificaciones para ver el ticket de pago.\n\n🔗 Link de pago: ${mercadopagoLink}`);
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
                    border: selectedImage === idx ? '3px solid var(--primary)' : '3px solid transparent',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    aspectRatio: '1'
                  }}
                >
                  <img src={img} alt={`${auction.title} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{auction.title}</h1>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
  <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>💰 Precio Actual de la Subasta</div>
  <div style={{ 
    fontSize: '3.5rem', 
    fontWeight: 800, 
    color: 'var(--primary)',
    textShadow: '0 2px 4px rgba(255, 107, 0, 0.2)',
    letterSpacing: '-1px'
  }}>
    {formatCurrency(auction.currentPrice)}
  </div>
</div>

              {auction.buyNowPrice && isActive && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Precio de Compra Directa</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(auction.buyNowPrice)}</div>
                </div>
              )}

              {/* RECUADRO EXPLICATIVO - MEJORA 2 */}
{isActive && (
  <div style={{ 
    marginTop: '1rem',
    padding: '1rem', 
    background: 'var(--bg-tertiary)',
    border: '2px solid var(--primary)',
    borderRadius: '0.75rem',
    fontSize: '0.875rem'
  }}>
    <h4 style={{ 
      fontSize: '1rem', 
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      📖 ¿Cómo funciona?
    </h4>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div>• Ofertá en múltiplos de $500</div>
      <div>• Debe superar: {formatCurrency(auction.currentPrice)}</div>
      <div>• Ganá ofertando más que otros</div>
      {auction.buyNowPrice && (
        <div>• O comprá directo por {formatCurrency(auction.buyNowPrice)}</div>
      )}
    </div>
  </div>
)}
                {/* Mejorar panel de estado según ACTIVA o FINALIZADA */}
{isActive ? (
  <div
    style={{
      padding: '1.5rem 1rem',
      background: lessThanOneMinute ? '#ffa726' : 'var(--bg-tertiary)',
      borderRadius: '0.75rem',
      boxShadow: lessThanOneMinute
        ? '0 0 25px 3px #FFA50080, 0 0 8px #ff5722' : '0 2px 8px #0001',
      border: lessThanOneMinute ? '2px solid #e65100' : '2px solid var(--primary)',
      color: lessThanOneMinute ? '#fff' : 'var(--text-primary)',
      marginBottom: '1.25rem',
      position: 'relative',
      textAlign: 'center',
      transition: 'all .33s cubic-bezier(.6,-0.01,0,1.01)'
    }}
  >
    <div
      style={{
        marginBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        animation: lessThanTenSeconds ? 'shake 0.5s infinite alternate' : undefined
      }}
    >
      <Clock size={28} style={{ color: lessThanOneMinute ? '#fff7a7' : 'var(--primary)', transition: 'color .33s' }} />
      <span
        style={{
          fontWeight: 'bold',
          fontSize: lessThanOneMinute ? '2.2rem' : '1.6rem',
          color: lessThanOneMinute ? '#fff' : 'var(--primary)',
          letterSpacing: '1.5px',
          transition: 'color .3s',
          animation: lessThanOneMinute ? 'blinker 1s steps(2) infinite' : undefined
        }}
      >
        <Countdown endTime={auction.endTime} />
      </span>
    </div>
    <div style={{fontSize: '1.05rem', fontWeight: 500}}>{lessThanOneMinute ? '¡Poco tiempo! ¡No te quedes afuera!' : 'Subasta Activa'}</div>
    <style>
      {`
        @keyframes blinker { 50% { opacity: 0.5; }}
        @keyframes shake {
          0% { transform: translateX(0); }
          40% { transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          100% { transform: translateX(0); }
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
              <>
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Realizar Oferta</h3>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Ingresa tu oferta"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '2px solid var(--border)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button onClick={() => incrementBid(500)} className="btn btn-secondary" style={{ flex: 1 }}>+$500</button>
                    <button onClick={() => incrementBid(1000)} className="btn btn-secondary" style={{ flex: 1 }}>+$1.000</button>
                    <button onClick={() => incrementBid(5000)} className="btn btn-secondary" style={{ flex: 1 }}>+$5.000</button>
                  </div>

                  {showBidError && (
                    <div style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                      {showBidError}
                    </div>
                  )}

                  <button onClick={handleBid} className="btn btn-primary" style={{ width: '100%', marginBottom: '0.75rem' }}>
                    <Gavel size={20} />
                    Realizar Oferta
                  </button>

                  {auction.buyNowPrice && (
                    <button onClick={handleBuyNow} className="btn btn-success" style={{ width: '100%' }}>
                      <ShoppingCart size={20} />
                      Comprar Ahora por {formatCurrency(auction.buyNowPrice)}
                    </button>
                  )}
                </div>
              </>
            ) : (
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
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} />
                  Últimas Ofertas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {lastThreeBids.map((bid) => (
                    <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} />
                        <span>{bid.username}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {formatTimeAgo(bid.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
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
                <span>Precio de inicio: {formatCurrency(auction.startingPrice ?? auction.currentPrice)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
