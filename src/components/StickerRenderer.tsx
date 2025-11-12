import { LogoSticker } from '../types/homeConfig';
import './StickerRenderer.css';

interface StickerRendererProps {
  sticker: LogoSticker;
  parentRef?: React.RefObject<HTMLElement>;
  positionIndex?: number; // Índice dentro del grupo de la misma posición
  totalInPosition?: number; // Total de stickers en la misma posición
}

const StickerRenderer = ({ sticker, parentRef, positionIndex = 0, totalInPosition = 1 }: StickerRendererProps) => {
  if (!sticker.active) return null;

  const sizeMap = {
    small: '0.875rem',
    medium: '1.125rem',
    large: '1.5rem'
  };

  // Calcular offset para evitar que se encimen
  const getOffset = (position: string, index: number, total: number) => {
    if (total === 1) return { x: 0, y: 0 };
    
    // Espaciado entre stickers (en píxeles)
    const spacing = 20;
    // Calcular offset basado en el índice (distribuir alrededor del punto base)
    const offset = (index - (total - 1) / 2) * spacing;
    
    switch (position) {
      case 'top-left':
        return { x: offset, y: offset * 0.5 };
      case 'top-right':
        return { x: -offset, y: offset * 0.5 };
      case 'bottom-left':
        return { x: offset, y: -offset * 0.5 };
      case 'bottom-right':
        return { x: -offset, y: -offset * 0.5 };
      case 'center':
        // Para el centro, distribuir en círculo
        const angle = (index / total) * Math.PI * 2;
        const radius = spacing * 0.8;
        return { 
          x: Math.cos(angle) * radius, 
          y: Math.sin(angle) * radius 
        };
      default:
        return { x: 0, y: 0 };
    }
  };

  const offset = getOffset(sticker.position, positionIndex, totalInPosition);
  
  const getBasePosition = (position: string) => {
    const basePositions: Record<string, React.CSSProperties> = {
      'top-left': { top: '-8px', left: '-8px' },
      'top-right': { top: '-8px', right: '-8px' },
      'bottom-left': { bottom: '-8px', left: '-8px' },
      'bottom-right': { bottom: '-8px', right: '-8px' },
      'center': { top: '50%', left: '50%' }
    };
    
    return basePositions[position] || basePositions['top-right'];
  };

  const effectClass = sticker.effect || 'none';
  const isSticky = sticker.sticky ?? false;
  const basePosition = getBasePosition(sticker.position);

  // Calcular transform con offset
  const getTransform = () => {
    if (sticker.position === 'center') {
      return `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`;
    }
    return `translate(${offset.x}px, ${offset.y}px)`;
  };

  return (
    <span
      className={`sticker-renderer-wrapper ${isSticky ? 'sticky' : ''}`}
      style={{
        ...basePosition,
        transform: getTransform(),
        pointerEvents: 'none',
        zIndex: 10 + positionIndex, // Z-index incremental para que no se solapen
        display: 'inline-block',
        lineHeight: 1
      }}
      title={sticker.tags?.join(', ') || 'Sticker'}
    >
      <span
        className={`sticker-renderer ${effectClass} ${isSticky ? 'sticky' : ''}`}
        style={{
          fontSize: sizeMap[sticker.size],
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          willChange: 'transform, opacity',
          display: 'inline-block'
        }}
      >
        {sticker.customImageUrl ? (
          <img
            src={sticker.customImageUrl}
            alt="Custom sticker"
            style={{
              width: sizeMap[sticker.size],
              height: sizeMap[sticker.size],
              objectFit: 'contain'
            }}
          />
        ) : (
          sticker.emoji
        )}
      </span>
    </span>
  );
};

export default StickerRenderer;

