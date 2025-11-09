import { LogoSticker } from '../types/homeConfig';
import './StickerRenderer.css';

interface StickerRendererProps {
  sticker: LogoSticker;
  parentRef?: React.RefObject<HTMLElement>;
}

const StickerRenderer = ({ sticker, parentRef }: StickerRendererProps) => {
  if (!sticker.active) return null;

  const sizeMap = {
    small: '0.875rem',
    medium: '1.125rem',
    large: '1.5rem'
  };

  const positionMap = {
    'top-left': { top: '-8px', left: '-8px' },
    'top-right': { top: '-8px', right: '-8px' },
    'bottom-left': { bottom: '-8px', left: '-8px' },
    'bottom-right': { bottom: '-8px', right: '-8px' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  };

  const effectClass = sticker.effect || 'none';
  const isSticky = sticker.sticky ?? false;

  return (
    <span
      className={`sticker-renderer ${effectClass} ${isSticky ? 'sticky' : ''}`}
      style={{
        position: isSticky ? 'sticky' : 'absolute',
        fontSize: sizeMap[sticker.size],
        ...positionMap[sticker.position],
        pointerEvents: 'none',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        zIndex: 10,
        lineHeight: 1,
        willChange: 'transform, opacity'
      }}
      title={sticker.tags?.join(', ') || 'Sticker'}
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
  );
};

export default StickerRenderer;

