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
    <Link to={`/subastas/${auction.id}`} className="auction-card">
      const AuctionCard = ({ auction }: AuctionCardProps) => {
  const navigate = useNavigate();

  return (
    <div 
      className={`auction-card ${auction.featured ? 'featured-auction' : ''} ${auction.isFlash ? 'flash-auction' : ''}`}
      style={{
        ...(auction.featured && {
          border: '3px solid var(--primary)',
          boxShadow: '0 8px 24px rgba(255, 107, 0, 0.3)',
          transform: 'scale(1.02)'
        }),
        ...(auction.isFlash && {
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(255, 107, 0, 0.1) 100%)',
          animation: 'pulse-border 2s infinite'
        })
      }}
          </div>
        )}
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

        <button className="btn btn-primary auction-card-btn">
          Ver Detalles y Ofertar
        </button>
      </div>
    </Link>
  );
};

export default AuctionCard;
