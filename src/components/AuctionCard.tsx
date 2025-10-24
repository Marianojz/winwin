import { Link } from 'react-router-dom';
import { Gavel, DollarSign, Users } from 'lucide-react';
import { Auction } from '../types';
import { formatCurrency } from '../utils/helpers';
import Countdown from './Countdown';
import './AuctionCard.css';

interface AuctionCardProps {
  auction: Auction;
}

const AuctionCard = ({ auction }: AuctionCardProps) => {
  const lastThreeBids = auction.bids.slice(-3).reverse();

  return (
    <Link 
      to={`/subastas/${auction.id}`} 
      className={`auction-card ${auction.featured ? 'featured-auction' : ''} ${auction.isFlash ? 'flash-auction' : ''}`}
      style={{
        ...(auction.featured && {
          border: '3px solid var(--primary)',
          boxShadow: '0 8px 24px rgba(255, 107, 0, 0.3)',
        }),
        ...(auction.isFlash && {
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(255, 107, 0, 0.1) 100%)',
        })
      }}
    >
      <div className="auction-card-image">
        <img src={auction.images[0]} alt={auction.title} loading="lazy" />

        <div style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 10
        }}>
          {/* Mostrar si está finalizada */}
          {auction.status === 'ended' && (
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
          
          {auction.status === 'sold' && (
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

          {auction.featured && auction.status === 'active' && (
            <div style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#000',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: '0 4px 12px rgba(255, 215, 0, 0.5)',
              animation: 'shine 3s infinite'
            }}>
              ⭐ DESTACADA
            </div>
          )}
          
          {auction.isFlash && auction.status === 'active' && (
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
          
          {auction.status === 'active' && !auction.featured && !auction.isFlash && (
            <div className="auction-card-badge badge-success">
              <Gavel size={14} />
              Activa
            </div>
          )}
        </div>

        {auction.buyNowPrice && (
          <div className="auction-card-buynow">
            <DollarSign size={16} />
            Compra Directa
          </div>
        )}
      </div>

      <div className="auction-card-content">
        <h3 className="auction-card-title">{auction.title}</h3>
        <p className="auction-card-description">{auction.description}</p>

        <div className="auction-card-price">
          <div className="price-current">
            <span className="price-label">Oferta Actual</span>
            <span className="price-value">{formatCurrency(auction.currentPrice)}</span>
          </div>
          {auction.buyNowPrice && (
            <div className="price-buynow">
              <span className="price-label">Compra Ya</span>
              <span className="price-value">{formatCurrency(auction.buyNowPrice)}</span>
            </div>
          )}
        </div>

        <div className="auction-card-countdown">
          <Countdown endTime={auction.endTime} />
        </div>

        {lastThreeBids.length > 0 && (
          <div className="auction-card-bids">
            <div className="bids-header">
              <Users size={16} />
              <span>Últimas ofertas</span>
            </div>
            <div className="bids-list">
              {lastThreeBids.map((bid) => (
                <div key={bid.id} className="bid-item">
                  <span className="bid-username">{bid.username}</span>
                  <span className="bid-amount">{formatCurrency(bid.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {auction.status === 'active' ? (
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
    Subasta Finalizada
  </button>
)}
      </div>
    </Link>
  );
};

export default AuctionCard;
