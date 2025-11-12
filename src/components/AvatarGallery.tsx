import { useState, useRef, useEffect } from 'react';
import { Upload, Image, Palette, Sparkles, Smile, Briefcase, X, Check, Loader, RotateCcw, Zap, Music, Sparkles as SparklesIcon, Shirt, Crown } from 'lucide-react';
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
  const localUrlRef = useRef<string | null>(null);
  
  // Limpiar URLs locales al desmontar el componente
  useEffect(() => {
    return () => {
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
    };
  }, []);
  
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

  // Galería de avatares prediseñados - Todos con estilo Ape NFT (adventurer)
  // Usando DiceBear API con estilo adventurer para todos los avatares
  const avatarGallery = {
    serios: [
      {
        id: 's1',
        name: 'Ejecutivo Profesional',
        description: 'Avatar corporativo formal para perfiles profesionales',
        style: 'ape nft profesional',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Ejecutivo&backgroundColor=2c3e50&size=200`
      },
      {
        id: 's2',
        name: 'Especialista Técnico',
        description: 'Diseño técnico con elementos de especialización',
        style: 'ape nft tecnico',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Tecnico&backgroundColor=34495e&size=200`
      },
      {
        id: 's3',
        name: 'Perfil Corporativo',
        description: 'Avatar neutro para entornos corporativos',
        style: 'ape nft corporativo',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Corporativo&backgroundColor=5d6d7e&size=200`
      },
      {
        id: 's4',
        name: 'Industria Especializada',
        description: 'Silueta profesional con elementos de industria específica',
        style: 'ape nft industrial',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Industria&backgroundColor=1c2833&size=200`
      },
      {
        id: 's5',
        name: 'Seguridad y Confianza',
        description: 'Diseño que transmite seguridad y confiabilidad',
        style: 'ape nft seguro',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Seguro&backgroundColor=1b4f72&size=200`
      }
    ],
    felices: [
      {
        id: 'f1',
        name: 'Sonrisa de Bienvenida',
        description: 'Avatar acogedor para generar buena primera impresión',
        style: 'ape nft alegre',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Sonrisa&backgroundColor=ff6b00&size=200`
      },
      {
        id: 'f2',
        name: 'Comunidad Alegre',
        description: 'Diseño que fomenta sentido de comunidad',
        style: 'ape nft comunitario',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Comunidad&backgroundColor=ffb800&size=200`
      },
      {
        id: 'f3',
        name: 'Herramientas Interactivas',
        description: 'Personaje alegre interactuando con herramientas de plataforma',
        style: 'ape nft interactivo',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Interactivo&backgroundColor=00c853&size=200`
      },
      {
        id: 'f4',
        name: 'Conexión Positiva',
        description: 'Avatar que simboliza conexión y comunicación efectiva',
        style: 'ape nft conectado',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Conexion&backgroundColor=9d4edd&size=200`
      },
      {
        id: 'f5',
        name: 'Energía Vibrante',
        description: 'Diseño lleno de energía y actitud positiva',
        style: 'ape nft energetico',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Energia&backgroundColor=ff006e&size=200`
      }
    ],
    bizarros: [
      {
        id: 'b1',
        name: 'Surrealismo Digital',
        description: 'Avatar onírico con elementos flotantes y colores inesperados',
        style: 'ape nft surreal',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Surreal&backgroundColor=6a0dad&size=200`
      },
      {
        id: 'b2',
        name: 'Steampunk Evolucionado',
        description: 'Fusión steampunk con elementos digitales futuristas',
        style: 'ape nft steampunk',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Steampunk&backgroundColor=8b4513&size=200`
      },
      {
        id: 'b3',
        name: 'Fantasia Tecnológica',
        description: 'Ser fantástico integrado con tecnología avanzada',
        style: 'ape nft fantasia',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Fantasia&backgroundColor=4b0082&size=200`
      },
      {
        id: 'b4',
        name: 'Abstracción Geométrica Viva',
        description: 'Formas geométricas que parecen tener vida propia',
        style: 'ape nft geometrico',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Geometrico&backgroundColor=00d4ff&size=200`
      },
      {
        id: 'b5',
        name: 'Fusión Humano-Robótica',
        description: 'Transición estilizada entre humano y máquina',
        style: 'ape nft cyborg',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Cyborg&backgroundColor=2a2a2a&size=200`
      }
    ],
    cyber: [
      {
        id: 'c1',
        name: 'Cyber Neon Warrior',
        description: 'Guerrero cyberpunk con efectos neon futuristas',
        style: 'ape nft cyber neon',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=CyberNeon&backgroundColor=0a0a0a&size=200`
      },
      {
        id: 'c2',
        name: 'Matrix Hacker',
        description: 'Avatar estilo Matrix con código digital',
        style: 'ape nft matrix',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Matrix&backgroundColor=00ff00&size=200`
      },
      {
        id: 'c3',
        name: 'Cyber Glitch',
        description: 'Efecto glitch digital con colores vibrantes',
        style: 'ape nft glitch',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Glitch&backgroundColor=ff00ff&size=200`
      },
      {
        id: 'c4',
        name: 'Neon Synthwave',
        description: 'Estilo synthwave con paleta de colores retro-futurista',
        style: 'ape nft synthwave',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Synthwave&backgroundColor=ff0080&size=200`
      },
      {
        id: 'c5',
        name: 'Digital Ghost',
        description: 'Avatar etéreo con efectos de partículas digitales',
        style: 'ape nft ghost',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Ghost&backgroundColor=00ffff&size=200`
      },
      {
        id: 'c6',
        name: 'Cyber Samurai',
        description: 'Samurai futurista con elementos tecnológicos',
        style: 'ape nft samurai',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Samurai&backgroundColor=1a1a2e&size=200`
      }
    ],
    punk: [
      {
        id: 'p1',
        name: 'Punk Rock Rebel',
        description: 'Avatar rebelde con estilo punk rock clásico',
        style: 'ape nft punk rock',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=PunkRock&backgroundColor=000000&size=200`
      },
      {
        id: 'p2',
        name: 'Street Punk',
        description: 'Estilo street punk con actitud urbana',
        style: 'ape nft street punk',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=StreetPunk&backgroundColor=1a1a1a&size=200`
      },
      {
        id: 'p3',
        name: 'Punk Attitude',
        description: 'Avatar con actitud punk y colores vibrantes',
        style: 'ape nft attitude',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Attitude&backgroundColor=ff0000&size=200`
      },
      {
        id: 'p4',
        name: 'Alternative Punk',
        description: 'Estilo alternativo punk con elementos únicos',
        style: 'ape nft alternative',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Alternative&backgroundColor=8b008b&size=200`
      },
      {
        id: 'p5',
        name: 'Punk Fashion',
        description: 'Moda punk con accesorios característicos',
        style: 'ape nft fashion',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Fashion&backgroundColor=2d2d2d&size=200`
      }
    ],
    monkey: [
      {
        id: 'm1',
        name: 'Bored Ape Classic',
        description: 'Estilo NFT clásico inspirado en Bored Ape Yacht Club',
        style: 'ape nft classic',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=BoredApe1&backgroundColor=ffd700&size=200`
      },
      {
        id: 'm2',
        name: 'Golden Ape',
        description: 'Ape dorado con estilo premium NFT',
        style: 'ape nft golden',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=GoldenApe&backgroundColor=ffb800&size=200`
      },
      {
        id: 'm3',
        name: 'Cyber Ape',
        description: 'Ape futurista con elementos tecnológicos NFT',
        style: 'ape nft cyber',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=CyberApe&backgroundColor=00d4ff&size=200`
      },
      {
        id: 'm4',
        name: 'Royal Ape',
        description: 'Ape con estilo real y exclusivo NFT',
        style: 'ape nft royal',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=RoyalApe&backgroundColor=9d4edd&size=200`
      },
      {
        id: 'm5',
        name: 'Street Ape',
        description: 'Ape urbano con actitud streetwear NFT',
        style: 'ape nft street',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=StreetApe&backgroundColor=ff1493&size=200`
      },
      {
        id: 'm6',
        name: 'Diamond Ape',
        description: 'Ape exclusivo con estilo diamante NFT',
        style: 'ape nft diamond',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=DiamondApe&backgroundColor=00ffff&size=200`
      }
    ],
    modernos: [
      {
        id: 'mod1',
        name: 'Minimalista Moderno',
        description: 'Diseño minimalista y elegante estilo 2024',
        style: 'ape nft minimalista',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Minimal&backgroundColor=f5f5f5&size=200`
      },
      {
        id: 'mod2',
        name: 'Fashion Forward',
        description: 'Avatar con estilo de moda contemporánea',
        style: 'ape nft fashion',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Fashion&backgroundColor=ffffff&size=200`
      },
      {
        id: 'mod3',
        name: 'Trendy Urban',
        description: 'Estilo urbano trendy y actual',
        style: 'ape nft trendy',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Trendy&backgroundColor=e0e0e0&size=200`
      },
      {
        id: 'mod4',
        name: 'Contemporary Style',
        description: 'Diseño contemporáneo con toques modernos',
        style: 'ape nft contemporary',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Contemporary&backgroundColor=f0f0f0&size=200`
      },
      {
        id: 'mod5',
        name: 'Modern Elegance',
        description: 'Elegancia moderna con líneas limpias',
        style: 'ape nft elegance',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Elegance&backgroundColor=d4d4d4&size=200`
      },
      {
        id: 'mod6',
        name: 'Chic Modern',
        description: 'Estilo chic y sofisticado',
        style: 'ape nft chic',
        imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Chic&backgroundColor=cccccc&size=200`
      }
    ]
  };

  const handleAvatarSelect = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
    if (avatar.imageUrl) {
      // Limpiar URL local anterior si existe (blob URL)
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
      // Usar URL externa de DiceBear (no es local, es una API externa)
      // Esta URL se guardará en Firestore cuando se confirme
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
    let localUrl: string | null = null;

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

      // Crear preview local temporal (solo para mostrar mientras se sube)
      localUrl = URL.createObjectURL(fileToUpload);
      localUrlRef.current = localUrl;
      setPreviewUrl(localUrl);

      // Subir a Firebase Storage (esto guarda en la base de datos)
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const uploadedUrl = await uploadImage(fileToUpload, `avatars/${userId}`);
      
      // Limpiar URL local antes de usar la URL de Firebase
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
        localUrlRef.current = null;
        localUrl = null;
      }
      
      // Usar URL de Firebase (conectada a la base de datos)
      setPreviewUrl(uploadedUrl);
      // onSelect guardará en Firestore a través de handleAvatarSelect en Perfil.tsx
      onSelect(uploadedUrl);
      
      // Limpiar input
      e.target.value = '';
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      alert(`Error al subir imagen: ${error.message}`);
      setPreviewUrl(currentAvatar || null);
    } finally {
      // Limpiar URL local si aún existe
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
      setUploading(false);
    }
  };

  const handleGoogleAvatar = () => {
    const user = auth.currentUser;
    if (user?.photoURL) {
      // Limpiar URL local anterior si existe (blob URL)
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
      // Usar URL de Google (no es local, es una URL externa de Google)
      // onSelect guardará en Firestore a través de handleAvatarSelect en Perfil.tsx
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

    // Convertir canvas a URL para preview (temporal, se reemplazará con URL de Firebase al confirmar)
    canvas.toBlob((blob) => {
      if (blob) {
        // Limpiar URL anterior si existe
        if (localUrlRef.current) {
          URL.revokeObjectURL(localUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        localUrlRef.current = url;
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
      // Si estamos en el editor, convertir canvas a imagen y subir a Firebase
      if (activeTab === 'editor' && canvasRef.current) {
        canvasRef.current.toBlob(async (blob) => {
          if (blob && auth.currentUser) {
            setUploading(true);
            let localUrl: string | null = null;
            try {
              // Crear preview temporal
              localUrl = URL.createObjectURL(blob);
              localUrlRef.current = localUrl;
              setPreviewUrl(localUrl);
              
              // Subir a Firebase Storage (conectado a la base de datos)
              const file = new File([blob], 'avatar.png', { type: 'image/png' });
              const userId = auth.currentUser.uid;
              const uploadedUrl = await uploadImage(file, `avatars/${userId}`);
              
              // Limpiar URL local antes de usar la URL de Firebase
              if (localUrl) {
                URL.revokeObjectURL(localUrl);
                localUrlRef.current = null;
                localUrl = null;
              }
              
              // Usar URL de Firebase (conectada a la base de datos)
              setPreviewUrl(uploadedUrl);
              // onSelect guardará en Firestore a través de handleAvatarSelect en Perfil.tsx
              onSelect(uploadedUrl);
              onClose?.();
            } catch (error: any) {
              console.error('Error al subir avatar del editor:', error);
              alert(`Error al subir avatar: ${error.message}`);
            } finally {
              // Limpiar URL local si aún existe
              if (localUrl) {
                URL.revokeObjectURL(localUrl);
              }
              setUploading(false);
            }
          }
        }, 'image/png');
      } else {
        // Para avatares de la galería (DiceBear) o Google, usar directamente la URL
        // Estas URLs ya son externas (no locales), pero onSelect las guardará en Firestore
        // Limpiar URL local si existe (blob URL)
        if (localUrlRef.current) {
          URL.revokeObjectURL(localUrlRef.current);
          localUrlRef.current = null;
        }
        // onSelect guardará en Firestore a través de handleAvatarSelect en Perfil.tsx
        // handleAvatarSelect actualiza Firestore con updateDoc
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
          {/* Vista previa - Movida arriba para móvil */}
          <div className="avatar-preview-section">
            <h3>Vista Previa</h3>
            <div className="preview-container">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="preview-image" />
              ) : (
                <div className="preview-placeholder">
                  <Image size={32} />
                  <span>Seleccioná un avatar</span>
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
              <Crown size={18} />
              Ape NFT
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
        </div>
      </div>
    </div>
  );
};

export default AvatarGallery;

