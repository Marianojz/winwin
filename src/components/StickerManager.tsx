import { useState, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Settings, X, ZoomIn } from 'lucide-react';
import { LogoSticker, StickerEffect, StickerPosition, StickerSize } from '../types/homeConfig';
import StickerLibrary from './StickerLibrary';
import { useIsMobile } from '../hooks/useMediaQuery';
import './StickerManager.css';

interface StickerManagerProps {
  stickers: LogoSticker[];
  onStickersChange: (stickers: LogoSticker[]) => void;
}

const StickerManager = ({ stickers, onStickersChange }: StickerManagerProps) => {
  const [showLibrary, setShowLibrary] = useState(false);
  const [editingSticker, setEditingSticker] = useState<LogoSticker | null>(null);
  const [previewSticker, setPreviewSticker] = useState<LogoSticker | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isMobile = useIsMobile();

  const handleAddSticker = (newSticker: LogoSticker) => {
    onStickersChange([...stickers, newSticker]);
    setShowLibrary(false);
  };

  const handleUpdateSticker = (id: string, updates: Partial<LogoSticker>) => {
    onStickersChange(
      stickers.map(s => s.id === id ? { ...s, ...updates } : s)
    );
    setEditingSticker(null);
  };

  const handleDeleteSticker = (id: string) => {
    if (window.confirm('¿Eliminar este sticker?')) {
      onStickersChange(stickers.filter(s => s.id !== id));
    }
  };

  const handleToggleActive = (id: string) => {
    handleUpdateSticker(id, { active: !stickers.find(s => s.id === id)?.active });
  };

  // Swipe to delete handlers
  const handleTouchStart = (e: React.TouchEvent, stickerId: string) => {
    if (!isMobile) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
    
    // Long press timer
    const timer = setTimeout(() => {
      setIsDragging(true);
      // Aquí podrías activar modo drag si lo implementas
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent, stickerId: string) => {
    if (!isMobile || !touchStartRef.current) return;
    
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    
    // Si el movimiento horizontal es mayor que el vertical, es un swipe
    if (Math.abs(deltaX) > 50 && deltaY < 30) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      if (deltaX < -50) {
        setSwipedId(stickerId);
      } else if (deltaX > 50) {
        setSwipedId(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsDragging(false);
  };

  // Pinch to zoom en preview
  const handlePreviewZoom = (e: React.WheelEvent) => {
    if (!isMobile && previewSticker) {
      e.preventDefault();
      // Zoom con rueda del mouse en desktop
    }
  };

  return (
    <div className="sticker-manager">
      <div className="sticker-manager-header">
        <h3>Stickers del Logo</h3>
        <button
          className="sticker-manager-add-btn"
          onClick={() => setShowLibrary(true)}
        >
          <Plus size={18} />
          Agregar Sticker
        </button>
      </div>

      {/* Lista de Stickers */}
      <div className={`sticker-manager-list ${isMobile ? 'sticker-manager-grid-mobile' : ''}`}>
        {stickers.length === 0 ? (
          <div className="sticker-manager-empty">
            <p>No hay stickers configurados</p>
            <p className="sticker-manager-empty-hint">Agregá stickers para decorar el logo</p>
          </div>
        ) : (
          stickers.map(sticker => (
            <div 
              key={sticker.id} 
              className={`sticker-manager-item ${isMobile ? 'sticker-manager-card-mobile' : ''} ${swipedId === sticker.id ? 'swiped' : ''}`}
              onTouchStart={(e) => handleTouchStart(e, sticker.id)}
              onTouchMove={(e) => handleTouchMove(e, sticker.id)}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="sticker-manager-item-preview"
                onClick={() => isMobile && setPreviewSticker(sticker)}
                style={{ cursor: isMobile ? 'pointer' : 'default' }}
              >
                {sticker.customImageUrl ? (
                  <img
                    src={sticker.customImageUrl}
                    alt="Custom sticker"
                    style={{ width: isMobile ? '48px' : '32px', height: isMobile ? '48px' : '32px', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: isMobile ? '2rem' : '1.5rem' }}>{sticker.emoji}</span>
                )}
              </div>

              <div className="sticker-manager-item-info">
                <div className="sticker-manager-item-main">
                  <span className="sticker-manager-item-emoji">
                    {sticker.customImageUrl ? '🖼️' : sticker.emoji}
                  </span>
                  <div>
                    <div className="sticker-manager-item-tags">
                      {sticker.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="sticker-manager-tag">{tag}</span>
                      ))}
                    </div>
                    <div className="sticker-manager-item-meta">
                      {sticker.position} • {sticker.size} • {sticker.effect || 'none'}
                    </div>
                  </div>
                </div>

                {editingSticker?.id === sticker.id ? (
                  <div className={`sticker-manager-edit-form ${isMobile ? 'sticker-manager-edit-form-mobile' : ''}`}>
                    {/* Preview del sticker en modo edición */}
                    {isMobile && (
                      <div className="sticker-manager-edit-preview">
                        {editingSticker.customImageUrl ? (
                          <img
                            src={editingSticker.customImageUrl}
                            alt="Sticker preview"
                            style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '3rem', lineHeight: '1' }}>{editingSticker.emoji}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Posición */}
                    <div className="sticker-manager-form-group">
                      <label className="sticker-manager-form-label">Posición</label>
                      <select
                        value={editingSticker.position}
                        onChange={(e) => setEditingSticker({
                          ...editingSticker,
                          position: e.target.value as StickerPosition
                        })}
                        className="sticker-manager-select"
                      >
                        <option value="top-left">Arriba Izquierda</option>
                        <option value="top-right">Arriba Derecha</option>
                        <option value="bottom-left">Abajo Izquierda</option>
                        <option value="bottom-right">Abajo Derecha</option>
                        <option value="center">Centro</option>
                      </select>
                    </div>

                    {/* Tamaño */}
                    <div className="sticker-manager-form-group">
                      <label className="sticker-manager-form-label">Tamaño</label>
                      <select
                        value={editingSticker.size}
                        onChange={(e) => setEditingSticker({
                          ...editingSticker,
                          size: e.target.value as StickerSize
                        })}
                        className="sticker-manager-select"
                      >
                        <option value="small">Pequeño</option>
                        <option value="medium">Mediano</option>
                        <option value="large">Grande</option>
                      </select>
                    </div>

                    {/* Efecto */}
                    <div className="sticker-manager-form-group">
                      <label className="sticker-manager-form-label">Efecto</label>
                      <select
                        value={editingSticker.effect || 'none'}
                        onChange={(e) => setEditingSticker({
                          ...editingSticker,
                          effect: e.target.value as StickerEffect
                        })}
                        className="sticker-manager-select"
                      >
                        <option value="none">Sin efecto</option>
                        <option value="floating">Floating</option>
                        <option value="pulse">Pulse</option>
                        <option value="fadeInOut">Fade In/Out</option>
                        <option value="bounce">Bounce</option>
                        <option value="slideIn">Slide In</option>
                      </select>
                    </div>

                    {/* Sticky */}
                    <label className="sticker-manager-checkbox">
                      <input
                        type="checkbox"
                        checked={editingSticker.sticky || false}
                        onChange={(e) => setEditingSticker({
                          ...editingSticker,
                          sticky: e.target.checked
                        })}
                      />
                      <span>Sticky en scroll</span>
                    </label>

                    <div className="sticker-manager-edit-actions">
                      <button
                        className="sticker-manager-save-btn"
                        onClick={() => handleUpdateSticker(editingSticker.id, editingSticker)}
                      >
                        Guardar
                      </button>
                      <button
                        className="sticker-manager-cancel-btn"
                        onClick={() => setEditingSticker(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`sticker-manager-item-actions ${isMobile ? 'mobile-actions' : ''}`}>
                      {!isMobile && (
                        <>
                          <button
                            className="sticker-manager-action-btn"
                            onClick={() => handleToggleActive(sticker.id)}
                            title={sticker.active ? 'Desactivar' : 'Activar'}
                          >
                            {sticker.active ? '✓' : '○'}
                          </button>
                          <button
                            className="sticker-manager-action-btn"
                            onClick={() => setEditingSticker(sticker)}
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="sticker-manager-action-btn danger"
                            onClick={() => handleDeleteSticker(sticker.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {isMobile && (
                        <>
                          <button
                            className="sticker-manager-action-btn"
                            onClick={() => setPreviewSticker(sticker)}
                            title="Vista previa"
                          >
                            <ZoomIn size={18} />
                          </button>
                          <button
                            className="sticker-manager-action-btn"
                            onClick={() => setEditingSticker(sticker)}
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                        </>
                      )}
                    </div>
                    {isMobile && swipedId === sticker.id && (
                      <div className="sticker-manager-swipe-delete">
                        <button
                          className="sticker-manager-swipe-delete-btn"
                          onClick={() => {
                            handleDeleteSticker(sticker.id);
                            setSwipedId(null);
                          }}
                        >
                          <Trash2 size={20} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Librería Modal */}
      {showLibrary && (
        <StickerLibrary
          onSelect={handleAddSticker}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* Preview Modal Full-Screen (Mobile) */}
      {isMobile && previewSticker && (
        <div 
          className="sticker-manager-preview-modal"
          onClick={() => setPreviewSticker(null)}
        >
          <div className="sticker-manager-preview-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="sticker-manager-preview-close"
              onClick={() => setPreviewSticker(null)}
            >
              <X size={24} />
            </button>
            <div className="sticker-manager-preview-display">
              {previewSticker.customImageUrl ? (
                <img
                  src={previewSticker.customImageUrl}
                  alt="Sticker preview"
                  className="sticker-manager-preview-img"
                />
              ) : (
                <span className="sticker-manager-preview-emoji">{previewSticker.emoji}</span>
              )}
            </div>
            <div className="sticker-manager-preview-info">
              <p><strong>Posición:</strong> {previewSticker.position}</p>
              <p><strong>Tamaño:</strong> {previewSticker.size}</p>
              <p><strong>Efecto:</strong> {previewSticker.effect || 'none'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerManager;

