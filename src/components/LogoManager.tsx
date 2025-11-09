import { useState, useRef, useEffect } from 'react';
import { Upload, X, Eye, Settings, Image as ImageIcon, CheckCircle, AlertCircle, Save, Camera } from 'lucide-react';
import { uploadImage } from '../utils/imageUpload';
import { useIsMobile } from '../hooks/useMediaQuery';
import './LogoManager.css';

export type LogoSize = 'small' | 'medium' | 'large';
export type LogoPosition = 'left' | 'center' | 'right';

interface LogoConfig {
  url: string;
  size: LogoSize;
  position: LogoPosition;
  opacity: number;
  hoverEffect: boolean;
}

interface LogoManagerProps {
  currentLogoUrl?: string;
  currentLogoConfig?: Partial<LogoConfig>;
  onLogoChange: (url: string) => void;
  onConfigChange?: (config: Partial<LogoConfig>) => void;
  theme?: 'light' | 'dark' | 'experimental';
}

const LOGO_SIZES = {
  small: { width: '120px', height: 'auto' },
  medium: { width: '200px', height: 'auto' },
  large: { width: '300px', height: 'auto' }
};

const LogoManager = ({ 
  currentLogoUrl = '', 
  currentLogoConfig,
  onLogoChange, 
  onConfigChange,
  theme = 'light'
}: LogoManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<LogoConfig>({
    url: currentLogoUrl,
    size: currentLogoConfig?.size || 'medium',
    position: currentLogoConfig?.position || 'left',
    opacity: currentLogoConfig?.opacity !== undefined ? currentLogoConfig.opacity : 1,
    hoverEffect: currentLogoConfig?.hoverEffect !== undefined ? currentLogoConfig.hoverEffect : true
  });

  // Actualizar configuración cuando cambie desde Firebase
  useEffect(() => {
    if (currentLogoConfig) {
      setConfig(prev => ({
        ...prev,
        ...currentLogoConfig,
        url: currentLogoUrl || prev.url
      }));
    }
  }, [currentLogoConfig, currentLogoUrl]);
  const [showPreview, setShowPreview] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Validar formato de archivo
  const validateFile = (file: File): boolean => {
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'];
    const validExtensions = ['.svg', '.png', '.jpg', '.jpeg'];
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    // Validar formato
    const isValidFormat = validTypes.includes(fileType) || validExtensions.includes(fileExtension);
    
    if (!isValidFormat) {
      setError(`Formato no válido. Solo se permiten: SVG, PNG o JPG. Formato detectado: ${fileExtension || fileType || 'desconocido'}`);
      return false;
    }

    // Validar tamaño (máximo 2MB para logos)
    if (file.size > 2 * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es 2MB`);
      return false;
    }

    return true;
  };

  // Manejar selección de archivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!validateFile(file)) {
      e.target.value = '';
      return;
    }

    // Crear preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      setConfig(prev => ({ ...prev, url: result }));
    };
    reader.readAsDataURL(file);

    // Subir a Firebase
    setUploading(true);
    try {
      const uploadedUrl = await uploadImage(file, 'logo');
      setConfig(prev => ({ ...prev, url: uploadedUrl }));
      onLogoChange(uploadedUrl);
      setPreview(null); // Limpiar preview local
      setError(null);
    } catch (err: any) {
      console.error('Error subiendo logo:', err);
      setError(err.message || 'Error al subir el logo');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Actualizar configuración
  const updateConfig = (updates: Partial<LogoConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setHasChanges(true);
    onConfigChange?.(updates);
  };

  // Guardar cambios
  const handleSave = () => {
    if (config.url) {
      onLogoChange(config.url);
      setHasChanges(false);
      if (isMobile) {
        alert('✅ Configuración guardada');
      }
    }
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

      if (!validateFile(file)) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
        setConfig(prev => ({ ...prev, url: result }));
        setHasChanges(true);
      };
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        const uploadedUrl = await uploadImage(file, 'logo');
        setConfig(prev => ({ ...prev, url: uploadedUrl }));
        onLogoChange(uploadedUrl);
        setPreview(null);
        setError(null);
      } catch (err: any) {
        console.error('Error subiendo logo:', err);
        setError(err.message || 'Error al subir el logo');
        setPreview(null);
      } finally {
        setUploading(false);
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Eliminar logo
  const handleRemoveLogo = () => {
    if (window.confirm('¿Eliminar el logo actual?')) {
      setConfig(prev => ({ ...prev, url: '' }));
      onLogoChange('');
      setPreview(null);
    }
  };

  const displayUrl = preview || config.url;
  const hasLogo = !!displayUrl;

  return (
    <div className={`logo-manager ${isMobile ? 'logo-manager-mobile' : ''}`}>
      {/* Preview Sticky Header (Mobile) */}
      {isMobile && hasLogo && showPreview && (
        <div className="logo-manager-mobile-preview-header">
          <div className={`logo-manager-header-preview theme-${theme}`}>
            <div 
              className="logo-manager-header-content"
              style={{ justifyContent: config.position === 'left' ? 'flex-start' : config.position === 'center' ? 'center' : 'flex-end' }}
            >
              {hasLogo && (
                <img
                  src={displayUrl}
                  alt="Logo preview"
                  className={`logo-manager-preview-logo ${config.hoverEffect ? 'with-hover' : ''}`}
                  style={{
                    width: LOGO_SIZES[config.size].width,
                    height: LOGO_SIZES[config.size].height,
                    opacity: config.opacity
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sección de Upload */}
      <div className="logo-manager-upload">
        <label className="logo-manager-label">
          <ImageIcon size={18} />
          Logo del Sitio
        </label>
        
        <div 
          ref={dropZoneRef}
          className={`logo-manager-upload-area ${isDragging ? 'dragging' : ''} ${isMobile ? 'mobile-drag-zone' : ''}`}
        >
          {hasLogo ? (
            <div className="logo-manager-preview-container">
              <img 
                src={displayUrl} 
                alt="Logo preview" 
                className="logo-manager-preview-img"
                onError={() => setError('Error al cargar la imagen')}
              />
              <button
                type="button"
                className="logo-manager-remove-btn"
                onClick={handleRemoveLogo}
                title="Eliminar logo"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="logo-manager-empty">
              <ImageIcon size={48} />
              <p>No hay logo cargado</p>
              <p className="logo-manager-hint">
                Formatos soportados: <strong>SVG</strong>, <strong>PNG</strong>, <strong>JPG</strong>
              </p>
              <p className="logo-manager-hint" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Tamaño máximo: 2MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
            onChange={handleFileSelect}
            className="logo-manager-input"
            id="logo-upload"
            disabled={uploading}
          />
          
          <label 
            htmlFor="logo-upload" 
            className={`logo-manager-upload-btn ${uploading ? 'uploading' : ''}`}
          >
            {uploading ? (
              <>
                <div className="logo-manager-spinner" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload size={18} />
                {hasLogo ? 'Cambiar Logo' : 'Subir Logo'}
              </>
            )}
          </label>

          {error && (
            <div className="logo-manager-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Configuración */}
      {hasLogo && (
        <div className="logo-manager-config">
          <div className="logo-manager-config-header">
            <Settings size={18} />
            <span>Configuración</span>
            <button
              type="button"
              className="logo-manager-toggle"
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'Ocultar preview' : 'Mostrar preview'}
            >
              <Eye size={16} />
            </button>
          </div>

          <div className="logo-manager-controls">
            {/* Tamaño */}
            <div className="logo-manager-control">
              <label>
                Tamaño Predefinido
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                  (3 opciones disponibles)
                </span>
              </label>
              <div className={`logo-manager-radio-group ${isMobile ? 'mobile-size-buttons' : ''}`}>
                {(['small', 'medium', 'large'] as LogoSize[]).map(size => {
                  const sizeLabels = {
                    small: 'Pequeño',
                    medium: 'Mediano',
                    large: 'Grande'
                  };
                  const sizeIcons = {
                    small: '📏',
                    medium: '📐',
                    large: '📊'
                  };
                  return (
                    <label key={size} className={`logo-manager-radio ${isMobile ? 'mobile-size-button' : ''} ${config.size === size ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="logo-size"
                        value={size}
                        checked={config.size === size}
                        onChange={() => updateConfig({ size })}
                      />
                      <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', marginBottom: '0.25rem' }}>
                        {sizeIcons[size]}
                      </span>
                      <span style={{ fontWeight: config.size === size ? 600 : 500 }}>
                        {sizeLabels[size]}
                      </span>
                      <span className="logo-manager-size-hint">
                        {LOGO_SIZES[size].width}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Posición */}
            <div className="logo-manager-control">
              <label>
                Posicionamiento Flexible
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                  (3 opciones disponibles)
                </span>
              </label>
              <div className="logo-manager-radio-group">
                {(['left', 'center', 'right'] as LogoPosition[]).map(position => {
                  const positionLabels = {
                    left: 'Izquierda',
                    center: 'Centro',
                    right: 'Derecha'
                  };
                  const positionIcons = {
                    left: '⬅️',
                    center: '↔️',
                    right: '➡️'
                  };
                  return (
                    <label key={position} className={`logo-manager-radio ${config.position === position ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="logo-position"
                        value={position}
                        checked={config.position === position}
                        onChange={() => updateConfig({ position })}
                      />
                      <span style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                        {positionIcons[position]}
                      </span>
                      <span style={{ fontWeight: config.position === position ? 600 : 500 }}>
                        {positionLabels[position]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Opacidad */}
            <div className="logo-manager-control">
              <label>
                Opacidad: {Math.round(config.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.opacity}
                onChange={(e) => updateConfig({ opacity: parseFloat(e.target.value) })}
                className="logo-manager-slider"
              />
            </div>

            {/* Efecto Hover */}
            <div className="logo-manager-control">
              <label className="logo-manager-switch">
                <input
                  type="checkbox"
                  checked={config.hoverEffect}
                  onChange={(e) => updateConfig({ hoverEffect: e.target.checked })}
                />
                <span>Efecto hover (escala al pasar el mouse)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Vista Previa en Header Simulado (Desktop) */}
      {!isMobile && hasLogo && showPreview && (
        <div className="logo-manager-preview-section">
          <div className="logo-manager-preview-label">
            <Eye size={16} />
            Vista Previa en Tiempo Real
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
              (se actualiza automáticamente)
            </span>
          </div>
          <div className={`logo-manager-header-preview theme-${theme}`}>
            <div 
              className="logo-manager-header-content"
              style={{ justifyContent: config.position === 'left' ? 'flex-start' : config.position === 'center' ? 'center' : 'flex-end' }}
            >
              {hasLogo && (
                <img
                  src={displayUrl}
                  alt="Logo preview"
                  className={`logo-manager-preview-logo ${config.hoverEffect ? 'with-hover' : ''}`}
                  style={{
                    width: LOGO_SIZES[config.size].width,
                    height: LOGO_SIZES[config.size].height,
                    opacity: config.opacity,
                    transition: 'all 0.3s ease'
                  }}
                />
              )}
            </div>
          </div>
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.75rem', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              Tamaño: <strong>{config.size === 'small' ? 'Pequeño' : config.size === 'medium' ? 'Mediano' : 'Grande'}</strong> ({LOGO_SIZES[config.size].width})
            </span>
            <span>
              Posición: <strong>{config.position === 'left' ? 'Izquierda' : config.position === 'center' ? 'Centro' : 'Derecha'}</strong>
            </span>
            <span>
              Opacidad: <strong>{Math.round(config.opacity * 100)}%</strong>
            </span>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile) */}
      {isMobile && hasLogo && hasChanges && (
        <button
          className="logo-manager-fab"
          onClick={handleSave}
          title="Guardar cambios"
        >
          <Save size={24} />
        </button>
      )}
    </div>
  );
};

export default LogoManager;

