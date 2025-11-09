import { useState, useRef, useEffect } from 'react';
import { Search, Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { STICKER_LIBRARY, searchStickers, getAllTags, StickerItem } from '../utils/stickerLibrary';
import { LogoSticker, StickerEffect, StickerPosition, StickerSize } from '../types/homeConfig';
import { uploadImage } from '../utils/imageUpload';
import { useDebounce } from '../hooks/useDebounce';
import './StickerLibrary.css';

interface StickerLibraryProps {
  onSelect: (sticker: LogoSticker) => void;
  onClose: () => void;
}

const StickerLibrary = ({ onSelect, onClose }: StickerLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Debounce para búsqueda (300ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const allTags = getAllTags();
  const filteredStickers = selectedTag
    ? STICKER_LIBRARY.filter(s => s.tags.includes(selectedTag))
    : debouncedSearchQuery
    ? searchStickers(debouncedSearchQuery)
    : STICKER_LIBRARY;

  const handleStickerSelect = (sticker: StickerItem) => {
    const newSticker: LogoSticker = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      emoji: sticker.emoji,
      position: 'top-right',
      size: 'medium',
      active: true,
      effect: 'floating',
      tags: sticker.tags
    };
    onSelect(newSticker);
  };

  // Validar archivo
  const validateFile = (file: File): boolean => {
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'];
    const validExtensions = ['.svg', '.png', '.jpg', '.jpeg'];
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    const isValidFormat = validTypes.includes(fileType) || validExtensions.includes(fileExtension);
    
    if (!isValidFormat) {
      alert(`Formato no válido. Solo se permiten: SVG, PNG o JPG. Formato detectado: ${fileExtension || fileType || 'desconocido'}`);
      return false;
    }

    if (file.size > 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es 1MB`);
      return false;
    }

    return true;
  };

  const handleFileUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const url = await uploadImage(file, 'stickers');
      setPreview(url);
      
      const newSticker: LogoSticker = {
        id: `sticker-custom-${Date.now()}`,
        type: 'custom',
        emoji: '', // No hay emoji para custom
        position: 'top-right',
        size: 'medium',
        active: true,
        effect: 'floating',
        customImageUrl: url,
        tags: ['personalizado']
      };
      onSelect(newSticker);
      setPreview(null);
    } catch (error: any) {
      console.error('Error subiendo sticker:', error);
      alert('Error al subir el sticker: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  // Drag & Drop handlers
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer?.files[0];
      if (!file) return;
      await handleFileUpload(file);
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sticker-library-overlay" onClick={onClose}>
      <div className="sticker-library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sticker-library-header">
          <h2>Librería de Stickers</h2>
          <button className="sticker-library-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="sticker-library-controls">
          <div className="sticker-library-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por tags o keywords..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedTag(null);
              }}
            />
            {debouncedSearchQuery && debouncedSearchQuery !== searchQuery && (
              <span className="sticker-library-search-loading">Buscando...</span>
            )}
          </div>

          {/* Tags */}
          <div className="sticker-library-tags">
            {allTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                className={`sticker-library-tag ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTag(selectedTag === tag ? null : tag);
                  setSearchQuery('');
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Upload personalizado con Drag & Drop */}
          <div 
            ref={dropZoneRef}
            className={`sticker-library-upload ${isDragging ? 'dragging' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              onChange={handleFileInputChange}
              className="sticker-library-file-input"
              id="sticker-upload"
              disabled={uploading}
            />
            <label htmlFor="sticker-upload" className="sticker-library-upload-btn">
              {uploading ? (
                <>
                  <div className="sticker-library-spinner" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Subir Sticker Personalizado
                </>
              )}
            </label>
            <p className="sticker-library-upload-hint">
              {isDragging ? 'Soltá el archivo aquí' : 'Arrastrá y soltá un archivo aquí o hacé clic para seleccionar'}
            </p>
            <p className="sticker-library-upload-formats">
              Formatos: SVG, PNG, JPG (máx. 1MB)
            </p>
          </div>
        </div>

        {/* Grid de Stickers */}
        <div className="sticker-library-grid">
          {filteredStickers.length === 0 ? (
            <div className="sticker-library-empty">
              <p>No se encontraron stickers</p>
              <p className="sticker-library-empty-hint">Intentá con otros términos de búsqueda</p>
            </div>
          ) : (
            filteredStickers.map((sticker, index) => (
              <button
                key={sticker.id}
                className="sticker-library-item"
                onClick={() => handleStickerSelect(sticker)}
                title={sticker.tags.join(', ')}
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
              >
                <span className="sticker-library-emoji">{sticker.emoji}</span>
                <div className="sticker-library-item-tags">
                  {sticker.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="sticker-library-item-tag">{tag}</span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="sticker-library-footer">
          <p>{filteredStickers.length} stickers disponibles</p>
        </div>
      </div>
    </div>
  );
};

export default StickerLibrary;

