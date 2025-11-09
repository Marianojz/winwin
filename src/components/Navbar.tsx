import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Bell, Home, Store, Gavel, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { realtimeDb } from '../config/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { HomeConfig, defaultHomeConfig } from '../types/homeConfig';
import { specialEvents } from '../utils/dateSpecialEvents';
import { getUnreadCount } from '../utils/messages';
import { getUserAvatarUrl, getUserInitial } from '../utils/avatarHelper';
import ThemeToggle from './ThemeToggle';
import SoundToggle from './SoundToggle';
import AvatarMenu from './AvatarMenu';
import StickerRenderer from './StickerRenderer';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, cart, unreadCount, theme } = useStore();
  const location = useLocation();
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(defaultHomeConfig);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Usar función helper unificada para obtener avatar desde Firebase
  const avatarUrl = getUserAvatarUrl(user);
  
  // Debug: Log del avatar solo cuando cambia
  useEffect(() => {
    if (user?.id) {
      console.log('👤 Avatar del usuario:', {
        userId: user.id,
        username: user.username,
        avatar: user.avatar || 'No hay avatar',
        avatarUrl: avatarUrl,
        tieneAvatar: !!user.avatar,
        esUrlValida: user.avatar?.startsWith('http') || false
      });
    }
  }, [user?.id, user?.avatar, avatarUrl]);

  // Cargar homeConfig desde Firebase para obtener logo y colores
  useEffect(() => {
    try {
      const homeConfigRef = ref(realtimeDb, 'homeConfig');
      const unsubscribe = onValue(homeConfigRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setHomeConfig({
            ...defaultHomeConfig,
            ...data,
            siteSettings: {
              ...(data.siteSettings || defaultHomeConfig.siteSettings),
              logoStickers: data.siteSettings?.logoStickers || defaultHomeConfig.siteSettings.logoStickers || []
            },
            themeColors: data.themeColors || defaultHomeConfig.themeColors
          });
        }
      }, (error) => {
        console.error('Error cargando homeConfig en Navbar:', error);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Error configurando listener de homeConfig en Navbar:', error);
    }
  }, [theme]); // Agregar theme como dependencia para recargar cuando cambie
  
  // Debug: Log de stickers solo cuando cambian (evitar spam)
  useEffect(() => {
    const allStickers = homeConfig.siteSettings?.logoStickers || [];
    if (allStickers.length > 0) {
      const activeStickers = allStickers.filter((s: any) => s.active);
      const now = new Date();
      
      // Log detallado solo una vez cuando cambian los stickers
      allStickers.forEach((s: any, index: number) => {
        const start = s.startDate ? new Date(s.startDate) : null;
        const end = s.endDate ? new Date(s.endDate) : null;
        const enRango = start && end ? (now >= start && now <= end) : true;
        const motivoNoActivo = !s.active 
          ? '❌ active: false' 
          : (start && end && !enRango 
            ? `❌ Fuera de rango (${start.toLocaleDateString()} - ${end.toLocaleDateString()})` 
            : '✅ OK');
        
        console.log(`🎨 Sticker ${index + 1}/${allStickers.length}:`, {
          id: s.id,
          tipo: s.type,
          emoji: s.emoji,
          activo: s.active ? '✅ SÍ' : '❌ NO',
          posición: s.position,
          tamaño: s.size,
          fechaInicio: s.startDate || 'Sin fecha',
          fechaFin: s.endDate || 'Sin fecha',
          enRango: enRango ? '✅ SÍ' : '❌ NO',
          motivoNoActivo: motivoNoActivo,
          fechaActual: now.toISOString()
        });
      });
      console.log(`📊 Resumen: ${activeStickers.length} de ${allStickers.length} stickers activos`);
    }
  }, [homeConfig.siteSettings?.logoStickers]); // Solo cuando cambian los stickers

  // Los colores se aplican en App.tsx según el tema activo
  // No necesitamos aplicar colores aquí ya que App.tsx maneja todo

  // Obtener logo según el tema activo
  const getLogoUrl = () => {
    const siteSettings = homeConfig.siteSettings || defaultHomeConfig.siteSettings;
    
    // Priorizar logos por tema si existen
    if (siteSettings.logoUrls) {
      const themeLogo = siteSettings.logoUrls[theme as 'light' | 'dark' | 'experimental'];
      if (themeLogo && !themeLogo.includes('subasta-argenta-474019')) {
        return themeLogo;
      }
    }
    
    // Fallback al logo único (legacy)
    const url = siteSettings.logoUrl || defaultHomeConfig.siteSettings.logoUrl;
    // Si la URL existe pero es del proyecto antiguo o está vacía, retornar null para mostrar placeholder
    if (!url || url.includes('subasta-argenta-474019')) {
      return null;
    }
    return url;
  };

  // Estado para manejar errores de carga del logo
  const [logoError, setLogoError] = useState(false);
  
  // Cargar contador de mensajes no leídos
  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }
    
    try {
      const unsubscribe = getUnreadCount(user.id, (count) => {
        setUnreadMessagesCount(count);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Error cargando contador de mensajes:', error);
    }
  }, [user?.id]);

  // Obtener nombre del sitio con fallback
  const getSiteName = () => {
    return homeConfig.siteSettings?.siteName || defaultHomeConfig.siteSettings.siteName;
  };

  // Obtener configuración del logo
  const getLogoConfig = () => {
    const logoConfig = homeConfig.siteSettings?.logoConfig || {};
    const LOGO_SIZES = {
      small: { width: '120px', height: 'auto' },
      medium: { width: '200px', height: 'auto' },
      large: { width: '300px', height: 'auto' }
    };
    
    const size = logoConfig.size || 'medium';
    const position = logoConfig.position || 'left';
    const opacity = logoConfig.opacity !== undefined ? logoConfig.opacity : 1;
    const hoverEffect = logoConfig.hoverEffect !== undefined ? logoConfig.hoverEffect : true;
    
    return {
      sizeStyles: LOGO_SIZES[size],
      position,
      opacity,
      hoverEffect,
      className: hoverEffect ? 'navbar-logo-hover' : ''
    };
  };

  const logoConfig = getLogoConfig();

  // Determinar si el enlace está activo para el navbar móvil
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Navbar Superior (Desktop) */}
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo" style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            justifyContent: logoConfig.position === 'center' ? 'center' : 
                           logoConfig.position === 'right' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{ 
              position: 'relative', 
              display: 'inline-block',
              opacity: logoConfig.opacity,
              transition: 'opacity 0.3s ease'
            }}>
              {(getLogoUrl() && !logoError) ? (
                <img 
                  src={getLogoUrl()} 
                  alt={getSiteName()}
                  className={`navbar-logo-img ${logoConfig.className}`}
                  style={{
                    ...logoConfig.sizeStyles,
                    maxWidth: '100%',
                    height: 'auto'
                  }}
                  onError={(e) => {
                    console.warn('⚠️ Error cargando logo desde:', getLogoUrl());
                    setLogoError(true);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onLoad={() => {
                    setLogoError(false);
                  }}
                />
              ) : (
                // Logo placeholder temporal mientras se sube el logo real
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563EB, #06B6D4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  flexShrink: 0
                }} title="Logo de Clikio">
                  C
                </div>
              )}
              {/* Mostrar stickers activos - SIEMPRE visible si están activos */}
              {(() => {
                const allStickers = homeConfig.siteSettings?.logoStickers || [];
                const activeStickers = allStickers.filter(sticker => {
                  // Si está marcado como activo, mostrarlo siempre (ignorar fechas para testing)
                  // Las fechas solo son informativas, no restrictivas cuando active: true
                  if (!sticker.active) return false;
                  
                  // Opcional: Si quieres que las fechas sean restrictivas, descomenta esto:
                  // if (sticker.startDate && sticker.endDate) {
                  //   const now = new Date();
                  //   const start = new Date(sticker.startDate);
                  //   const end = new Date(sticker.endDate);
                  //   return now >= start && now <= end;
                  // }
                  
                  return true; // Si está activo, mostrarlo siempre
                });
                
                // Debug: Log para verificar stickers (solo una vez cuando cambian)
                // Los logs se movieron a un useEffect para evitar spam
                
                return activeStickers.map(sticker => (
                  <StickerRenderer key={sticker.id} sticker={sticker} />
                ));
              })()}
            </div>
            <span className="navbar-logo-text">{getSiteName()}</span>
          </Link>

          <div className="navbar-menu">
            <Link to="/" className="navbar-link" title="Inicio">
              <Home size={20} />
            </Link>
            <Link to="/subastas" className="navbar-link" title="Subastas">
              <Gavel size={20} />
            </Link>
            <Link to="/tienda" className="navbar-link" title="Tienda">
              <Store size={20} />
            </Link>
          </div>

          <div className="navbar-actions">
            {isAuthenticated ? (
              <>
                {/* Acciones principales del usuario */}
                <Link to="/carrito" className="navbar-icon-btn" title="Carrito">
                  <ShoppingCart size={20} />
                  {cartItemsCount > 0 && <span className="navbar-badge">{cartItemsCount}</span>}
                </Link>
                
                <Link to="/notificaciones" className="navbar-icon-btn" title="Notificaciones">
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="navbar-badge">{unreadCount}</span>}
                </Link>
                
                <Link to="/perfil?tab=messages" className="navbar-icon-btn" title="Mensajería">
                  <MessageSquare size={20} />
                  {unreadMessagesCount > 0 && <span className="navbar-badge">{unreadMessagesCount}</span>}
                </Link>

                {/* Separador visual */}
                <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.25rem' }} />

                {/* Configuración */}
                <ThemeToggle />
                <SoundToggle />

                {/* Avatar del usuario */}
                {user && (
                  <AvatarMenu
                    user={user}
                    avatarUrl={avatarUrl}
                    getUserInitial={() => getUserInitial(user)}
                  />
                )}
              </>
            ) : (
              <>
                {/* Configuración para usuarios no autenticados */}
                <ThemeToggle />
                <SoundToggle />
                
                {/* Botón de login */}
                <Link to="/login" className="btn btn-primary">
                  Iniciar Sesión
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Navbar Inferior (Mobile) - ¡ESTE ES EL NUEVO! */}
      <nav className="navbar-mobile">
        <Link 
          to="/" 
          className={`navbar-mobile-item ${isActive('/') ? 'navbar-mobile-item--active' : ''}`}
        >
          <Home size={24} />
          <span>Inicio</span>
        </Link>
        
        <Link 
          to="/subastas" 
          className={`navbar-mobile-item ${isActive('/subastas') ? 'navbar-mobile-item--active' : ''}`}
        >
          <Gavel size={24} />
          <span>Subastas</span>
        </Link>
        
        <Link 
          to="/tienda" 
          className={`navbar-mobile-item ${isActive('/tienda') ? 'navbar-mobile-item--active' : ''}`}
        >
          <Store size={24} />
          <span>Tienda</span>
        </Link>
      </nav>
    </>
  );
};

export default Navbar;