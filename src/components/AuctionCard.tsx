import { Link } from 'react-router-dom';
import { Gavel, DollarSign, Users } from 'lucide-react';
import { Auction } from '../types';
import { formatCurrency, maskUsername } from '../utils/helpers';
import Countdown from './Countdown';
import './AuctionCard.css';
import { trackAuctionClick } from '../utils/tracking';
import { useStore } from '../store/useStore';
import { getStickerById } from '../utils/stickers';
import AuctionTypeBanner from './AuctionTypeBanner';

interface AuctionCardProps {
  auction: Auction;
}

const AuctionCard = ({ auction }: AuctionCardProps) => {
  const { user } = useStore();
  const lastThreeBids = auction.bids.slice(-3).reverse();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Registrar click en el tracking system
    trackAuctionClick(auction.id, auction.title, user?.id, user?.username);
    if (!isActive) {
      e.preventDefault();
    }
  };

  // Función para determinar si la subasta debe mostrarse después de finalizada
  const shouldShowAfterEnd = () => {
    if (auction.status !== 'ended' && auction.status !== 'sold') {
      return false;
    }
    
    if (!auction.endTime) return false;
    
    const endTime = new Date(auction.endTime).getTime();
    const now = new Date().getTime();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutos en milisegundos
    
    return (now - endTime) <= thirtyMinutes;
  };

  // Determinar el estado de visualización
  const isActive = auction.status === 'active';
  const isRecentlyEnded = shouldShowAfterEnd();
  const isHidden = (auction.status === 'ended' || auction.status === 'sold') && !isRecentlyEnded;
  const isMystery = auction.isMystery && isActive; // Solo ocultar si es misteriosa y está activa

  // Función para verificar si hay stock disponible para compra directa
  const hasStockForBuyNow = (auction: Auction) => {
    if (!auction) return false;
    
    // Si tiene bundles y unitsPerBundle, verificar stock por bultos
    if (auction.bundles !== undefined && auction.unitsPerBundle !== undefined && auction.unitsPerBundle > 0) {
      if (auction.sellOnlyByBundle) {
        // Si solo se vende por bulto, necesita al menos 1 bulto
        return auction.bundles > 0;
      } else {
        // Si se puede vender por unidades, calcular stock total
        const totalStock = auction.bundles * auction.unitsPerBundle;
        return totalStock > 0;
      }
    }
    
    // Si no tiene bundles/unitsPerBundle definidos, asumimos que hay stock
    // (comportamiento por defecto para mantener compatibilidad)
    return true;
  };

  // Verificar stock disponible para compra directa
  const canShowBuyNow = auction.buyNowPrice && isActive && hasStockForBuyNow(auction);

  // Si la subasta está oculta, no renderizar nada
  if (isHidden) {
    return null;
  }

  return (
    <Link 
      to={isActive ? `/subastas/${auction.id}` : '#'} 
      className={`auction-card hover-lift fade-in ${auction.featured ? 'featured-auction' : ''} ${auction.isFlash ? 'flash-auction' : ''}`}
      onClick={handleClick}
      style={{
        animationDelay: `${Math.random() * 0.2}s`,
        ...(auction.featured && {
          border: 'none',
          boxShadow: '0 2px 12px var(--shadow)',
        }),
        ...(auction.isFlash && {
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(255, 107, 0, 0.1) 100%)',
        }),
        ...(!isActive && {
          opacity: 0.8,
          filter: 'grayscale(0.3)',
        })
      }}
    >
      <div className="auction-card-image">
        <AuctionTypeBanner auction={auction} size="small" position="top-left" />
        {isMystery ? (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
              animation: 'shimmer 2s linear infinite'
            }} />
            <div style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              color: 'white',
              padding: '2rem'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎁</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>SUBASTA MISTERIOSA</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>Se revelará al finalizar</div>
            </div>
          </div>
        ) : (
          <img src={auction.images[0]} alt={auction.title} loading="lazy" />
        )}

        {/* Stickers de subasta destacada - Solo iconos pequeños en esquinas */}
        {auction.featured && isActive && (
          <>
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              left: '0.5rem',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255, 215, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: '0 2px 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.4)',
              zIndex: 20,
              backdropFilter: 'blur(6px)',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              ⭐
            </div>
            <div style={{
              position: 'absolute',
              bottom: '0.5rem',
              right: '0.5rem',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255, 107, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: '0 2px 10px rgba(255, 107, 0, 0.8), 0 0 20px rgba(255, 107, 0, 0.4)',
              zIndex: 20,
              backdropFilter: 'blur(6px)',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              animation: 'pulse 2s ease-in-out infinite 1s'
            }}>
              🔥
            </div>
          </>
        )}

        <div style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 10
        }}>
          {/* Stickers/Emojis - Ocultar si es destacada */}
          {auction.stickers && auction.stickers.length > 0 && !auction.featured && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {auction.stickers.map((stickerId) => {
                const sticker = getStickerById(stickerId);
                if (!sticker) return null;
                return (
                  <div
                    key={stickerId}
                    style={{
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: '#fff',
                      padding: '0.375rem 0.625rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{sticker.icon}</span>
                    <span>{sticker.label.split(' ')[1] || sticker.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Mostrar si está finalizada recientemente */}
          {isRecentlyEnded && (
            <div style={{
              background: '#666',
              color: '#fff',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              ⏰ FINALIZADA
            </div>
          )}
          
          {auction.status === 'sold' && isRecentlyEnded && (
            <div style={{
              background: '#28a745',
              color: '#fff',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              ✅ VENDIDA
            </div>
          )}
          
          {auction.isFlash && isActive && (
            <div style={{
              background: 'linear-gradient(135deg, #FF4444, #FF6B00)',
              color: '#fff',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: '0 4px 12px rgba(255, 68, 68, 0.5)',
              animation: 'flash-pulse 1s infinite'
            }}>
              ⚡ RELÁMPAGO
            </div>
          )}
          
          {isActive && !auction.featured && !auction.isFlash && (
            <div className="auction-card-badge badge-success">
              <Gavel size={14} />
              Activa
            </div>
          )}
        </div>

        {canShowBuyNow && (
          <div className="auction-card-buynow">
            <DollarSign size={16} />
            Compra Directa
          </div>
        )}
      </div>

      <div className="auction-card-content">
        {isMystery ? (
          <>
            <h3 className="auction-card-title" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700
            }}>
              🎁 Subasta Misteriosa
            </h3>
            <p className="auction-card-description" style={{ 
              fontStyle: 'italic',
              color: 'var(--text-secondary)'
            }}>
              El nombre y la imagen se revelarán cuando finalice la subasta. ¡Puja y descubre qué es!
            </p>
          </>
        ) : (
          <>
            <h3 className="auction-card-title">{auction.title}</h3>
            <p className="auction-card-description">{auction.description}</p>
          </>
        )}

        <div className="auction-card-price">
          <div className="price-current">
            <span className="price-label">Oferta Actual</span>
            <span className="price-value">{formatCurrency(auction.currentPrice)}</span>
          </div>
        </div>

        {isActive ? (
          <div className="auction-card-countdown">
            <Countdown endTime={auction.endTime} />
          </div>
        ) : isRecentlyEnded && (
          <div className="auction-card-countdown" style={{ color: '#666', textAlign: 'center' }}>
            <div style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600,
              padding: '0.5rem',
              background: '#f5f5f5',
              borderRadius: '0.5rem'
            }}>
              ⏰ Subasta finalizada recientemente
            </div>
          </div>
        )}

        {lastThreeBids.length > 0 && (
          <div className="auction-card-bids">
            <div className="bids-header">
              <Users size={16} />
              <span>Últimas ofertas</span>
            </div>
            <div className="bids-list">
              {lastThreeBids.map((bid) => (
                <div key={bid.id} className="bid-item">
                  <span className="bid-username">{maskUsername(bid.username)}</span>
                  <span className="bid-amount">{formatCurrency(bid.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isActive ? (
          <button className="btn btn-primary auction-card-btn">
            Ver Detalles y Ofertar
          </button>
        ) : (
          <button 
            className="btn btn-secondary auction-card-btn" 
            style={{ 
              background: '#666', 
              cursor: 'not-allowed',
              opacity: 0.7 
            }}
            disabled
          >
            {isRecentlyEnded ? 'Subasta Finalizada' : 'No Disponible'}
          </button>
        )}
      </div>
    </Link>
  );
};

export default AuctionCard;
