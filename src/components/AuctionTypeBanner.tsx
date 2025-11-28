import React from 'react';
import { Auction } from '../types';

interface AuctionTypeBannerProps {
  auction: Auction;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

const AuctionTypeBanner: React.FC<AuctionTypeBannerProps> = ({ 
  auction, 
  size = 'medium',
  position = 'top-left'
}) => {
  // Determinar el tipo de subasta
  const getAuctionType = (): 'normal' | 'featured' | 'flash' | 'combo' | 'nocturnal' | 'special' => {
    if (auction.auctionType) {
      return auction.auctionType;
    }
    // Fallback a lógica anterior
    if (auction.featured) return 'featured';
    if (auction.isFlash) return 'flash';
    return 'normal';
  };

  const auctionType = getAuctionType();

  // Configuración por tipo
  const typeConfig = {
    normal: {
      label: 'Normal',
      icon: '🔨',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#667eea',
      show: false // Las normales no muestran banner
    },
    featured: {
      label: 'Destacada',
      icon: '⭐',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#f5576c',
      show: true
    },
    flash: {
      label: 'Relámpago',
      icon: '⚡',
      gradient: 'linear-gradient(135deg, #FF4444 0%, #FF6B00 100%)',
      color: '#FF6B00',
      show: true
    },
    combo: {
      label: 'Combo',
      icon: '📦',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#4facfe',
      show: true
    },
    nocturnal: {
      label: 'Nocturna',
      icon: '🌙',
      gradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      color: '#2c3e50',
      show: true
    },
    special: {
      label: 'Especial',
      icon: '🎁',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      color: '#fa709a',
      show: true
    }
  };

  const config = typeConfig[auctionType];

  // No mostrar banner para subastas normales
  if (!config.show) {
    return null;
  }

  // Tamaños
  const sizeStyles = {
    small: {
      fontSize: '0.75rem',
      padding: '0.375rem 0.75rem',
      iconSize: '0.875rem'
    },
    medium: {
      fontSize: '0.875rem',
      padding: '0.5rem 1rem',
      iconSize: '1rem'
    },
    large: {
      fontSize: '1rem',
      padding: '0.75rem 1.25rem',
      iconSize: '1.25rem'
    }
  };

  const sizeStyle = sizeStyles[size];

  // Posiciones
  const positionStyles = {
    'top-left': { top: '0.75rem', left: '0.75rem' },
    'top-right': { top: '0.75rem', right: '0.75rem' },
    'bottom-left': { bottom: '0.75rem', left: '0.75rem' },
    'bottom-right': { bottom: '0.75rem', right: '0.75rem' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  };

  const positionStyle = positionStyles[position];

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyle,
        background: config.gradient,
        color: 'white',
        padding: sizeStyle.padding,
        borderRadius: '0.5rem',
        fontSize: sizeStyle.fontSize,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 20,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(6px)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        animation: auctionType === 'flash' ? 'flash-pulse 1s infinite' : undefined
      }}
      className="auction-type-banner"
    >
      <span style={{ fontSize: sizeStyle.iconSize }}>{config.icon}</span>
      <span>{config.label}</span>
      <style>
        {`
          @keyframes flash-pulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 0, 0, 0.2);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 6px 16px rgba(255, 68, 68, 0.5), 0 0 30px rgba(255, 107, 0, 0.4);
            }
          }
        `}
      </style>
    </div>
  );
};

export default AuctionTypeBanner;

