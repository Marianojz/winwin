import { useState, useRef, useEffect } from 'react';
import { Upload, Image, Palette, Sparkles, Smile, Briefcase, X, Check, Loader, RotateCcw, Zap, Music, Sparkles as SparklesIcon, Shirt } from 'lucide-react';
import { uploadImage } from '../utils/imageUpload';
import { auth } from '../config/firebase';
import { compressAvatar, supportsWebP } from '../utils/imageCompression';
import './AvatarGallery.css';

export interface AvatarOption {
  id: string;
  name: string;
  description: string;
  style: string;
  imageUrl?: string; // URL de imagen prediseñada o generada
}

interface AvatarGalleryProps {
  currentAvatar?: string;
  onSelect: (avatarUrl: string) => void;
  onClose?: () => void;
}

const AvatarGallery = ({ currentAvatar, onSelect, onClose }: AvatarGalleryProps) => {
  const [activeTab, setActiveTab] = useState<'serios' | 'felices' | 'bizarros' | 'cyber' | 'punk' | 'monkey' | 'modernos' | 'upload' | 'google' | 'editor'>('serios');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null);
  
  // Editor de avatares - estados
  const [editorConfig, setEditorConfig] = useState({
    backgroundColor: '#FF6B00',
    textColor: '#FFFFFF',
    shape: 'circle' as 'circle' | 'square' | 'rounded',
    borderWidth: 4,
    borderColor: '#FF6B00',
    fontSize: 0.5,
    bold: true
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Obtener iniciales del usuario si está disponible
  const getUserInitials = () => {
    const user = auth.currentUser;
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };
  
  const [editorInitials, setEditorInitials] = useState(getUserInitials());

  // Galería de avatares prediseñados (15 total: 5 serios, 5 felices, 5 bizarros)
  // Usando DiceBear API para avatares ilustrados en lugar de solo letras
  const avatarGallery = {
    serios: [
      {
        id: 's1',
        name: 'Ejecutivo Profesional',
        description: 'Avatar corporativo formal para perfiles profesionales',
        style: 'minimalista profesional',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Ejecutivo&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&size=200`
      },
      {
        id: 's2',
        name: 'Especialista Técnico',
        description: 'Diseño técnico con elementos de especialización',
        style: 'tecnológico serio',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Tecnico&backgroundColor=0044aa&size=200`
      },
      {
        id: 's3',
        name: 'Perfil Corporativo',
        description: 'Avatar neutro para entornos corporativos',
        style: 'corporativo neutro',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Corporativo&backgroundColor=666666&size=200`
      },
      {
        id: 's4',
        name: 'Industria Especializada',
        description: 'Silueta profesional con elementos de industria específica',
        style: 'industrial profesional',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Industria&backgroundColor=2c2c2c&size=200`
      },
      {
        id: 's5',
        name: 'Seguridad y Confianza',
        description: 'Diseño que transmite seguridad y confiabilidad',
        style: 'seguro confiable',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Seguro&backgroundColor=1a5f1a&size=200`
      }
    ],
    felices: [
      {
        id: 'f1',
        name: 'Sonrisa de Bienvenida',
        description: 'Avatar acogedor para generar buena primera impresión',
        style: 'amigable acogedor',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Sonrisa&backgroundColor=ff6b00&size=200`
      },
      {
        id: 'f2',
        name: 'Comunidad Alegre',
        description: 'Diseño que fomenta sentido de comunidad',
        style: 'comunitario alegre',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Comunidad&backgroundColor=ffb800&size=200`
      },
      {
        id: 'f3',
        name: 'Herramientas Interactivas',
        description: 'Personaje alegre interactuando con herramientas de plataforma',
        style: 'interactivo positivo',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Interactivo&backgroundColor=00c853&size=200`
      },
      {
        id: 'f4',
        name: 'Conexión Positiva',
        description: 'Avatar que simboliza conexión y comunicación efectiva',
        style: 'conectado comunicativo',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Conexion&backgroundColor=9d4edd&size=200`
      },
      {
        id: 'f5',
        name: 'Energía Vibrante',
        description: 'Diseño lleno de energía y actitud positiva',
        style: 'energético vibrante',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Energia&backgroundColor=ff006e&size=200`
      }
    ],
    bizarros: [
      {
        id: 'b1',
        name: 'Surrealismo Digital',
        description: 'Avatar onírico con elementos flotantes y colores inesperados',
        style: 'surrealista digital',
        imageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=Surreal&backgroundColor=6a0dad&size=200`
      },
      {
        id: 'b2',
        name: 'Steampunk Evolucionado',
        description: 'Fusión steampunk con elementos digitales futuristas',
        style: 'steampunk futurista',
        imageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=Steampunk&backgroundColor=8b4513&size=200`
      },
      {
        id: 'b3',
        name: 'Fantasia Tecnológica',
        description: 'Ser fantástico integrado con tecnología avanzada',
        style: 'fantasia tecnológica',
        imageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=Fantasia&backgroundColor=4b0082&size=200`
      },
      {
        id: 'b4',
        name: 'Abstracción Geométrica Viva',
        description: 'Formas geométricas que parecen tener vida propia',
        style: 'geométrico animado',
        imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=Geometrico&backgroundColor=00d4ff&size=200`
      },
      {
        id: 'b5',
        name: 'Fusión Humano-Robótica',
        description: 'Transición estilizada entre humano y máquina',
        style: 'cyborg estilizado',
        imageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=Cyborg&backgroundColor=2a2a2a&size=200`
      }
    ],
    cyber: [
      {
        id: 'c1',
        name: 'Cyber Neon Warrior',
        description: 'Guerrero cyberpunk con efectos neon futuristas',
        style: 'cyber neon',
        imageUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=CyberNeon&backgroundColor=0a0a0a&size=200`
      },
      {
        id: 'c2',
        name: 'Matrix Hacker',
        description: 'Avatar estilo Matrix con código digital',
        style: 'matrix hacker',
        imageUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Matrix&backgroundColor=00ff00&size=200`
      },
      {
        id: 'c3',
        name: 'Cyber Glitch',
        description: 'Efecto glitch digital con colores vibrantes',
        style: 'glitch digital',
        imageUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Glitch&backgroundColor=ff00ff&size=200`
      },
      {
        id: 'c4',
        name: 'Neon Synthwave',
        description: 'Estilo synthwave con paleta de colores retro-futurista',
        style: 'synthwave neon',
        imageUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Synthwave&backgroundColor=ff0080&size=200`
      },
      {
        id: 'c5',
        name: 'Digital Ghost',
        description: 'Avatar etéreo con efectos de partículas digitales',
        style: 'ghost digital',
        imageUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Ghost&backgroundColor=00ffff&size=200`
      },
      {
        id: 'c6',
        name: 'Cyber Samurai',
        description: 'Samurai futurista con elementos tecnológicos',
        style: 'cyber samurai',
        imageUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Samurai&backgroundColor=1a1a2e&size=200`
      }
    ],
    punk: [
      {
        id: 'p1',
        name: 'Punk Rock Rebel',
        description: 'Avatar rebelde con estilo punk rock clásico',
        style: 'punk rock',
        imageUrl: `https://api.dicebear.com/7.x/personas/svg?seed=PunkRock&backgroundColor=000000&size=200`
      },
      {
        id: 'p2',
        name: 'Street Punk',
        description: 'Estilo street punk con actitud urbana',
        style: 'street punk',
        imageUrl: `https://api.dicebear.com/7.x/personas/svg?seed=StreetPunk&backgroundColor=1a1a1a&size=200`
      },
      {
        id: 'p3',
        name: 'Punk Attitude',
        description: 'Avatar con actitud punk y colores vibrantes',
        style: 'punk attitude',
        imageUrl: `https://api.dicebear.com/7.x/personas/svg?seed=Attitude&backgroundColor=ff0000&size=200`
      },
      {
        id: 'p4',
        name: 'Alternative Punk',
        description: 'Estilo alternativo punk con elementos únicos',
        style: 'alternative punk',
        imageUrl: `https://api.dicebear.com/7.x/personas/svg?seed=Alternative&backgroundColor=8b008b&size=200`
      },
      {
        id: 'p5',
        name: 'Punk Fashion',
        description: 'Moda punk con accesorios característicos',
        style: 'punk fashion',
        imageUrl: `https://api.dicebear.com/7.x/personas/svg?seed=Fashion&backgroundColor=2d2d2d&size=200`
      }
    ],
    monkey: [
      {
        id: 'm1',
        name: 'Cool Monkey',
        description: 'Mono con estilo moderno y actitud cool',
        style: 'cool monkey',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=MonkeyCool&backgroundColor=ff6b00&size=200`
      },
      {
        id: 'm2',
        name: 'Cyber Monkey',
        description: 'Mono futurista con elementos tecnológicos',
        style: 'cyber monkey',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=CyberMonkey&backgroundColor=00d4ff&size=200`
      },
      {
        id: 'm3',
        name: 'Funky Monkey',
        description: 'Mono con estilo funky y colores vibrantes',
        style: 'funky monkey',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=FunkyMonkey&backgroundColor=ff00ff&size=200`
      },
      {
        id: 'm4',
        name: 'Street Monkey',
        description: 'Mono urbano con estilo street',
        style: 'street monkey',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=StreetMonkey&backgroundColor=9d4edd&size=200`
      },
      {
        id: 'm5',
        name: 'Monkey Business',
        description: 'Mono divertido con personalidad única',
        style: 'monkey business',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Business&backgroundColor=ffb800&size=200`
      }
    ],
    modernos: [
      {
        id: 'mod1',
        name: 'Minimalista Moderno',
        description: 'Diseño minimalista y elegante estilo 2024',
        style: 'minimalista',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Minimal&backgroundColor=f5f5f5&size=200`
      },
      {
        id: 'mod2',
        name: 'Fashion Forward',
        description: 'Avatar con estilo de moda contemporánea',
        style: 'fashion forward',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Fashion&backgroundColor=ffffff&size=200`
      },
      {
        id: 'mod3',
        name: 'Trendy Urban',
        description: 'Estilo urbano trendy y actual',
        style: 'trendy urban',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Trendy&backgroundColor=e0e0e0&size=200`
      },
      {
        id: 'mod4',
        name: 'Contemporary Style',
        description: 'Diseño contemporáneo con toques modernos',
        style: 'contemporary',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Contemporary&backgroundColor=f0f0f0&size=200`
      },
      {
        id: 'mod5',
        name: 'Modern Elegance',
        description: 'Elegancia moderna con líneas limpias',
        style: 'modern elegance',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Elegance&backgroundColor=d4d4d4&size=200`
      },
      {
        id: 'mod6',
        name: 'Chic Modern',
        description: 'Estilo chic y sofisticado',
        style: 'chic modern',
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Chic&backgroundColor=cccccc&size=200`
      }
    ]
  };

  const handleAvatarSelect = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
    if (avatar.imageUrl) {
      setPreviewUrl(avatar.imageUrl);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validar tamaño (máximo 2MB para avatares)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe pesar menos de 2MB');
      return;
    }

    setUploading(true);

    try {
      // Comprimir imagen a WebP si es soportado
      let fileToUpload = file;
      if (supportsWebP()) {
        try {
          const compressedBlob = await compressAvatar(file);
          fileToUpload = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webp'), {
            type: 'image/webp',
            lastModified: Date.now()
          });
        } catch (compressionError) {
          console.warn('Error comprimiendo imagen, usando original:', compressionError);
        }
      }

      // Crear preview local
      const localUrl = URL.createObjectURL(fileToUpload);
      setPreviewUrl(localUrl);

      // Subir a Firebase Storage
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const uploadedUrl = await uploadImage(fileToUpload, `avatars/${userId}`);
      setPreviewUrl(uploadedUrl);
      onSelect(uploadedUrl);
      
      // Limpiar input
      e.target.value = '';
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      alert(`Error al subir imagen: ${error.message}`);
      setPreviewUrl(currentAvatar || null);
    } finally {
      setUploading(false);
    }
  };

  const handleGoogleAvatar = () => {
    const user = auth.currentUser;
    if (user?.photoURL) {
      setPreviewUrl(user.photoURL);
      onSelect(user.photoURL);
    } else {
      alert('No hay foto de Google Account asociada');
    }
  };

  // Generar preview del editor
  const generateEditorPreview = (initials: string = editorInitials, config = editorConfig) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    const center = size / 2;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, size, size);

    // Dibujar forma de fondo
    ctx.fillStyle = config.backgroundColor;
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = config.borderWidth;

    if (config.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(center, center, center - config.borderWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      if (config.borderWidth > 0) {
        ctx.stroke();
      }
    } else if (config.shape === 'rounded') {
      const radius = 20;
      const x = config.borderWidth / 2;
      const y = config.borderWidth / 2;
      const width = size - config.borderWidth;
      const height = size - config.borderWidth;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      if (config.borderWidth > 0) {
        ctx.stroke();
      }
    } else {
      ctx.fillRect(config.borderWidth / 2, config.borderWidth / 2, size - config.borderWidth, size - config.borderWidth);
      if (config.borderWidth > 0) {
        ctx.strokeRect(config.borderWidth / 2, config.borderWidth / 2, size - config.borderWidth, size - config.borderWidth);
      }
    }

    // Dibujar texto
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.bold ? 'bold' : 'normal'} ${size * config.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, center, center);

    // Convertir canvas a URL para preview
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    }, 'image/png');
  };

  // Inicializar preview del editor cuando se activa el tab
  useEffect(() => {
    if (activeTab === 'editor' && canvasRef.current) {
      generateEditorPreview(editorInitials, editorConfig);
    }
  }, [activeTab]);

  const handleConfirm = () => {
    if (previewUrl) {
      // Si estamos en el editor, convertir canvas a imagen y subir
      if (activeTab === 'editor' && canvasRef.current) {
        canvasRef.current.toBlob(async (blob) => {
          if (blob && auth.currentUser) {
            setUploading(true);
            try {
              const file = new File([blob], 'avatar.png', { type: 'image/png' });
              const userId = auth.currentUser.uid;
              const uploadedUrl = await uploadImage(file, `avatars/${userId}`);
              setPreviewUrl(uploadedUrl);
              onSelect(uploadedUrl);
              onClose?.();
            } catch (error: any) {
              console.error('Error al subir avatar del editor:', error);
              alert(`Error al subir avatar: ${error.message}`);
            } finally {
              setUploading(false);
            }
          }
        }, 'image/png');
      } else {
        onSelect(previewUrl);
        onClose?.();
      }
    }
  };

  const currentAvatars = avatarGallery[activeTab] || [];

  return (
    <div className="avatar-gallery-overlay" onClick={onClose}>
      <div className="avatar-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-gallery-header">
          <h2>Seleccionar Avatar</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="avatar-gallery-content">
          {/* Tabs */}
          <div className="avatar-tabs">
            <button
              className={`tab ${activeTab === 'serios' ? 'active' : ''}`}
              onClick={() => setActiveTab('serios')}
            >
              <Briefcase size={18} />
              Serios
            </button>
            <button
              className={`tab ${activeTab === 'felices' ? 'active' : ''}`}
              onClick={() => setActiveTab('felices')}
            >
              <Smile size={18} />
              Felices
            </button>
            <button
              className={`tab ${activeTab === 'bizarros' ? 'active' : ''}`}
              onClick={() => setActiveTab('bizarros')}
            >
              <Sparkles size={18} />
              Bizarros
            </button>
            <button
              className={`tab ${activeTab === 'cyber' ? 'active' : ''}`}
              onClick={() => setActiveTab('cyber')}
            >
              <Zap size={18} />
              Cyber
            </button>
            <button
              className={`tab ${activeTab === 'punk' ? 'active' : ''}`}
              onClick={() => setActiveTab('punk')}
            >
              <Music size={18} />
              Punk
            </button>
            <button
              className={`tab ${activeTab === 'monkey' ? 'active' : ''}`}
              onClick={() => setActiveTab('monkey')}
            >
              <SparklesIcon size={18} />
              Monkey
            </button>
            <button
              className={`tab ${activeTab === 'modernos' ? 'active' : ''}`}
              onClick={() => setActiveTab('modernos')}
            >
              <Shirt size={18} />
              Modernos
            </button>
            <button
              className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={18} />
              Subir
            </button>
            <button
              className={`tab ${activeTab === 'google' ? 'active' : ''}`}
              onClick={() => setActiveTab('google')}
            >
              <Image size={18} />
              Google
            </button>
            <button
              className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Palette size={18} />
              Editor
            </button>
          </div>

          {/* Contenido según tab activo */}
          <div className="avatar-gallery-body">
            {activeTab !== 'upload' && activeTab !== 'google' && activeTab !== 'editor' && (
              <div className="avatar-grid">
                {currentAvatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    className={`avatar-card ${selectedAvatar?.id === avatar.id ? 'selected' : ''}`}
                    onClick={() => handleAvatarSelect(avatar)}
                  >
                    <div className="avatar-preview">
                      {avatar.imageUrl ? (
                        <img src={avatar.imageUrl} alt={avatar.name} />
                      ) : (
                        <div className="avatar-placeholder">{avatar.name[0]}</div>
                      )}
                    </div>
                    <div className="avatar-info">
                      <h4>{avatar.name}</h4>
                      <p>{avatar.description}</p>
                      <span className="avatar-style">{avatar.style}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="upload-section">
                <div className="upload-area">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" className="upload-label">
                    {uploading ? (
                      <>
                        <Loader className="animate-spin" size={32} />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={32} />
                        <span>Hacé clic para subir una imagen</span>
                        <small>Máximo 2MB - JPG, PNG, WEBP</small>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'google' && (
              <div className="google-section">
                {auth.currentUser?.photoURL ? (
                  <div className="google-avatar-preview">
                    <img src={auth.currentUser.photoURL} alt="Google Avatar" />
                    <button className="btn-primary" onClick={handleGoogleAvatar}>
                      Usar foto de Google
                    </button>
                  </div>
                ) : (
                  <div className="no-google-avatar">
                    <Image size={48} />
                    <p>No hay foto de Google Account asociada</p>
                    <small>Iniciá sesión con Google para usar tu foto de perfil</small>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="editor-section">
                <div className="editor-controls">
                  <div className="editor-control-group">
                    <label>Iniciales</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={editorInitials}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().slice(0, 2);
                        setEditorInitials(value || 'U');
                        generateEditorPreview(value || 'U');
                      }}
                      placeholder="TU"
                      className="editor-input"
                    />
                  </div>

                  <div className="editor-control-group">
                    <label>Color de Fondo</label>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        value={editorConfig.backgroundColor}
                        onChange={(e) => {
                          const newConfig = { ...editorConfig, backgroundColor: e.target.value };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={editorConfig.backgroundColor}
                        onChange={(e) => {
                          const newConfig = { ...editorConfig, backgroundColor: e.target.value };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                        className="color-input"
                        placeholder="#FF6B00"
                      />
                    </div>
                  </div>

                  <div className="editor-control-group">
                    <label>Color de Texto</label>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        value={editorConfig.textColor}
                        onChange={(e) => {
                          const newConfig = { ...editorConfig, textColor: e.target.value };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={editorConfig.textColor}
                        onChange={(e) => {
                          const newConfig = { ...editorConfig, textColor: e.target.value };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                        className="color-input"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <div className="editor-control-group">
                    <label>Forma</label>
                    <div className="shape-selector">
                      <button
                        className={`shape-btn ${editorConfig.shape === 'circle' ? 'active' : ''}`}
                        onClick={() => {
                          const newConfig = { ...editorConfig, shape: 'circle' as const };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                      >
                        ⭕
                      </button>
                      <button
                        className={`shape-btn ${editorConfig.shape === 'rounded' ? 'active' : ''}`}
                        onClick={() => {
                          const newConfig = { ...editorConfig, shape: 'rounded' as const };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                      >
                        ▢
                      </button>
                      <button
                        className={`shape-btn ${editorConfig.shape === 'square' ? 'active' : ''}`}
                        onClick={() => {
                          const newConfig = { ...editorConfig, shape: 'square' as const };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                      >
                        ■
                      </button>
                    </div>
                  </div>

                  <div className="editor-control-group">
                    <label>Borde</label>
                    <div className="border-controls">
                      <input
                        type="range"
                        min="0"
                        max="8"
                        value={editorConfig.borderWidth}
                        onChange={(e) => {
                          const newConfig = { ...editorConfig, borderWidth: parseInt(e.target.value) };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                        className="range-input"
                      />
                      <span className="range-value">{editorConfig.borderWidth}px</span>
                      <input
                        type="color"
                        value={editorConfig.borderColor}
                        onChange={(e) => {
                          const newConfig = { ...editorConfig, borderColor: e.target.value };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                        className="color-picker-small"
                      />
                    </div>
                  </div>

                  <div className="editor-control-group">
                    <label>Tamaño de Fuente</label>
                    <input
                      type="range"
                      min="0.3"
                      max="0.8"
                      step="0.1"
                      value={editorConfig.fontSize}
                      onChange={(e) => {
                        const newConfig = { ...editorConfig, fontSize: parseFloat(e.target.value) };
                        setEditorConfig(newConfig);
                        generateEditorPreview(editorInitials, newConfig);
                      }}
                      className="range-input"
                    />
                    <span className="range-value">{(editorConfig.fontSize * 100).toFixed(0)}%</span>
                  </div>

                  <div className="editor-control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorConfig.bold}
                        onChange={(e) => {
                          const newConfig = { ...editorConfig, bold: e.target.checked };
                          setEditorConfig(newConfig);
                          generateEditorPreview(editorInitials, newConfig);
                        }}
                      />
                      <span>Texto en Negrita</span>
                    </label>
                  </div>

                  <button
                    className="btn-reset"
                    onClick={() => {
                      const defaultConfig = {
                        backgroundColor: '#FF6B00',
                        textColor: '#FFFFFF',
                        shape: 'circle' as const,
                        borderWidth: 4,
                        borderColor: '#FF6B00',
                        fontSize: 0.5,
                        bold: true
                      };
                      setEditorConfig(defaultConfig);
                      setEditorInitials('U');
                      generateEditorPreview('U', defaultConfig);
                    }}
                  >
                    <RotateCcw size={16} />
                    Resetear
                  </button>
                </div>

                <div className="editor-preview-container">
                  <canvas
                    ref={canvasRef}
                    width={200}
                    height={200}
                    className="editor-canvas"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vista previa */}
          <div className="avatar-preview-section">
            <h3>Vista Previa</h3>
            <div className="preview-container">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="preview-image" />
              ) : (
                <div className="preview-placeholder">
                  <Image size={48} />
                  <span>Seleccioná un avatar para ver la vista previa</span>
                </div>
              )}
            </div>
            <button
              className="btn-confirm"
              onClick={handleConfirm}
              disabled={!previewUrl || uploading}
            >
              {uploading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Subiendo...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Confirmar Avatar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarGallery;

