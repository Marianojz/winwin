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
      <div className="auction-card-image">
        <img src={auction.images[0]} alt={auction.title} loading="lazy" />
        {auction.status === 'active' && (
          <div className="auction-card-badge badge-success">
            <Gavel size={14} />
            Activa
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
