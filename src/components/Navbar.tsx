import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Bell, Home, Store, Gavel, MessageSquare, Shield, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { realtimeDb } from '../config/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState, useRef, useMemo } from 'react';
import { HomeConfig, defaultHomeConfig } from '../types/homeConfig';
import { specialEvents } from '../utils/dateSpecialEvents';
import { getUnreadCount } from '../utils/messages';
import { getUserAvatarUrl, getUserInitial } from '../utils/avatarHelper';
import ThemeToggle from './ThemeToggle';
import AvatarMenu from './AvatarMenu';
import StickerRenderer from './StickerRenderer';
import CategoriesDropdown from './CategoriesDropdown';
import { useIsMobile } from '../hooks/useMediaQuery';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, cart, unreadCount, theme } = useStore();
  const location = useLocation();
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(defaultHomeConfig);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const isMobile = useIsMobile();

  // Usar función helper unificada para obtener avatar desde Firebase
  const avatarUrl = getUserAvatarUrl(user);
  
  // Debug: Log del avatar solo en modo desarrollo - optimizado para evitar logs repetitivos
  const lastLoggedAvatar = useRef<string | null>(null);
  useEffect(() => {
    if (import.meta.env.DEV && user?.id) {
      const avatarKey = `${user.id}-${user.avatar || 'no-avatar'}`;
      if (lastLoggedAvatar.current !== avatarKey) {
        lastLoggedAvatar.current = avatarKey;
        console.log('👤 Avatar del usuario:', {
          userId: user.id,
          username: user.username,
          avatar: user.avatar || 'No hay avatar',
          avatarUrl: avatarUrl,
          tieneAvatar: !!user.avatar,
          esUrlValida: user.avatar?.startsWith('http') || false
        });
      }
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
  
  // Debug: Log de stickers solo en modo desarrollo - optimizado para evitar logs repetitivos
  const lastLoggedStickers = useRef<string>('');
  const stickersKey = useMemo(() => {
    const stickers = homeConfig.siteSettings?.logoStickers || [];
    return JSON.stringify(stickers.map((s: any) => ({ id: s.id, active: s.active, startDate: s.startDate, endDate: s.endDate })));
  }, [homeConfig.siteSettings?.logoStickers]);
  
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    // Solo loggear si los stickers realmente cambiaron
    if (lastLoggedStickers.current === stickersKey) return;
    lastLoggedStickers.current = stickersKey;
    
    const allStickers = homeConfig.siteSettings?.logoStickers || [];
    if (allStickers.length === 0) return;
    
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
  }, [stickersKey]);

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
      small: { width: '100px', height: 'auto' },
      medium: { width: '140px', height: 'auto' },
      large: { width: '180px', height: 'auto' }
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

  // En móvil, solo mostrar navbar superior en la página de inicio
  const showTopNavbar = !isMobile || location.pathname === '/';

  return (
    <>
      {/* Navbar Superior (Desktop) - En móvil solo en inicio */}
      {showTopNavbar && (
      <nav className="navbar" data-page={location.pathname === '/' ? 'home' : 'other'}>
        <div className="navbar-container" style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '0.75rem' : '1.5rem',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: 'hidden',
          overflowY: 'hidden',
          width: '100%',
          justifyContent: isMobile ? 'flex-start' : 'flex-start',
          paddingRight: isMobile ? '0.5rem' : '0',
          boxSizing: 'border-box',
          position: 'relative'
        }}>
          {/* 1. Logo */}
          <Link to="/" className="navbar-logo" style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '0.25rem' : '0.75rem',
            textDecoration: 'none',
            flexShrink: 0,
            minWidth: isMobile ? 'auto' : 'auto',
            marginRight: isMobile ? '0.5rem' : '0'
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
                    height: 'auto',
                    opacity: 0,
                    transition: 'opacity 0.5s ease-in-out',
                    ...(isMobile && {
                      height: '32px',
                      maxWidth: '32px',
                      width: '32px'
                    })
                  }}
                  onError={(e) => {
                    if (import.meta.env.DEV) {
                      console.warn('⚠️ Error cargando logo desde:', getLogoUrl());
                    }
                    setLogoError(true);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onLoad={(e) => {
                    setLogoError(false);
                    // Carga suave del logo
                    (e.target as HTMLImageElement).style.opacity = '1';
                  }}
                />
              ) : (
                null
              )}
              {/* Mostrar stickers activos */}
              {(() => {
                const allStickers = homeConfig.siteSettings?.logoStickers || [];
                const activeStickers = allStickers.filter(sticker => {
                  if (!sticker.active) return false;
                  return true;
                });
                
                const stickersByPosition: Record<string, typeof activeStickers> = {};
                activeStickers.forEach(sticker => {
                  const pos = sticker.position;
                  if (!stickersByPosition[pos]) {
                    stickersByPosition[pos] = [];
                  }
                  stickersByPosition[pos].push(sticker);
                });
                
                return activeStickers.map((sticker, index) => {
                  const samePositionStickers = stickersByPosition[sticker.position] || [];
                  const positionIndex = samePositionStickers.findIndex(s => s.id === sticker.id);
                  const totalInPosition = samePositionStickers.length;
                  
                  return (
                    <StickerRenderer 
                      key={sticker.id} 
                      sticker={sticker}
                      positionIndex={positionIndex}
                      totalInPosition={totalInPosition}
                    />
                  );
                });
              })()}
            </div>
          </Link>

          {/* 2. Menú desplegable de categorías */}
          <div style={{ 
            transform: isMobile ? 'scaleX(1.3)' : 'scale(1)',
            transformOrigin: 'center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 99999,
            marginLeft: isMobile ? '0.75rem' : '0'
          }}>
            <CategoriesDropdown />
          </div>

          {/* 3. Nombre del sitio llamativo */}
          <Link to="/" style={{ 
            textDecoration: 'none',
            flexGrow: isMobile ? 1 : 0,
            flexShrink: 1,
            flexBasis: isMobile ? '0%' : 'auto',
            minWidth: isMobile ? '30px' : '150px',
            maxWidth: isMobile ? 'none' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            marginRight: !isMobile ? 'auto' : '0'
          }}>
            <span className="navbar-logo-text" style={{
              fontSize: isMobile ? '1.125rem' : '2.5rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'block',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: '1.2'
            }}>
              {getSiteName()}
            </span>
          </Link>

          {/* 4. Carrito - Solo visible en desktop */}
          {!isMobile && isAuthenticated && (
            <Link 
              to="/carrito" 
              className="navbar-icon-btn" 
              title="Carrito"
              style={{
                padding: '0.5rem',
                minWidth: '44px',
                maxWidth: '44px',
                flexShrink: 0
              }}
            >
              <ShoppingCart size={24} />
              {cartItemsCount > 0 && (
                <span className="navbar-badge" style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.3rem',
                  minWidth: '16px',
                  lineHeight: '1.2'
                }}>
                  {cartItemsCount}
                </span>
              )}
            </Link>
          )}

          {/* 5. Notificaciones */}
          {!isMobile && isAuthenticated && (
            <Link 
              to="/notificaciones" 
              className="navbar-icon-btn" 
              title="Notificaciones"
              style={{
                padding: '0.5rem',
                minWidth: '44px',
                maxWidth: '44px',
                flexShrink: 0
              }}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="navbar-badge" style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.3rem',
                  minWidth: '16px',
                  lineHeight: '1.2'
                }}>
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* 6. Modos de colores - Reordenado (oculto en móvil) */}
          {!isMobile && (
            <div style={{ 
              transform: 'scale(1)',
              transformOrigin: 'center',
              flexShrink: 0
            }}>
              <ThemeToggle />
            </div>
          )}

          {/* 7. Perfil - Siempre al extremo derecho en desktop */}
          {!isMobile && (
            <>
              {isAuthenticated ? (
                user ? (
                  <div style={{ 
                    flexShrink: 0,
                    marginLeft: 'auto',
                    minWidth: 'fit-content',
                    position: 'relative',
                    zIndex: 99999
                  }}>
                    <AvatarMenu
                      user={user}
                      avatarUrl={avatarUrl}
                      getUserInitial={() => getUserInitial(user)}
                    />
                  </div>
                ) : null
              ) : (
                <Link 
                  to="/login" 
                  className="btn btn-primary" 
                  style={{ 
                    padding: '0.625rem 1.25rem',
                    fontSize: '0.9375rem',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    marginLeft: 'auto'
                  }}
                >
                  Iniciar Sesión
                </Link>
              )}
            </>
          )}

          {/* Notificaciones en móvil - Mantener en móvil */}
          {isMobile && isAuthenticated && (
            <Link 
              to="/notificaciones" 
              className="navbar-icon-btn" 
              title="Notificaciones"
              style={{
                padding: '0.3rem',
                minWidth: '28px',
                maxWidth: '28px',
                flexShrink: 0,
                marginLeft: 'auto',
                position: 'relative',
                zIndex: 10,
                order: 10
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="navbar-badge" style={{
                  fontSize: '0.4rem',
                  padding: '0.1rem 0.15rem',
                  minWidth: '10px',
                  lineHeight: '1'
                }}>
                  {unreadCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </nav>
      )}

      {/* Navbar Inferior (Mobile) - Siempre visible en móvil, incluyendo el panel de admin */}
      {isMobile && (
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
        
        {/* Carrito - Agregado al navbar móvil */}
        {isAuthenticated && (
          <Link 
            to="/carrito" 
            className={`navbar-mobile-item ${isActive('/carrito') ? 'navbar-mobile-item--active' : ''}`}
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={24} />
            {cartItemsCount > 0 && (
              <span className="navbar-badge" style={{
                position: 'absolute',
                top: '0.25rem',
                right: '0.25rem',
                fontSize: '0.65rem',
                padding: '0.15rem 0.3rem',
                minWidth: '16px',
                lineHeight: '1.2'
              }}>
                {cartItemsCount}
              </span>
            )}
            <span>Carrito</span>
          </Link>
        )}
        
        {user?.isAdmin && (
          <Link 
            to="/admin" 
            className={`navbar-mobile-item navbar-mobile-item--admin ${isActive('/admin') ? 'navbar-mobile-item--active' : ''}`}
          >
            <Shield size={24} />
            <span>Admin</span>
          </Link>
        )}

        {/* Perfil - Agregado a la navbar móvil */}
        {isAuthenticated && user ? (
          <div className="navbar-mobile-item navbar-mobile-item--profile">
            <AvatarMenu
              user={user}
              avatarUrl={avatarUrl}
              getUserInitial={() => getUserInitial(user)}
            />
            <span>Perfil</span>
          </div>
        ) : (
          <Link 
            to="/login" 
            className={`navbar-mobile-item ${isActive('/login') ? 'navbar-mobile-item--active' : ''}`}
          >
            <User size={24} />
            <span>Entrar</span>
          </Link>
        )}
      </nav>
      )}
    </>
  );
};

export default Navbar;