import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Bell, Home, Store, Gavel, LogOut, LayoutDashboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import { auth, realtimeDb } from '../config/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { HomeConfig, defaultHomeConfig } from '../types/homeConfig';
import { specialEvents } from '../utils/dateSpecialEvents';
import ThemeToggle from './ThemeToggle';
import SoundToggle from './SoundToggle';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, cart, unreadCount, setUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(defaultHomeConfig);

  const handleLogout = async () => {
    try {
      await auth.signOut(); // CERRAR SESIÓN EN FIREBASE
      const { clearNotifications } = useStore.getState();
      clearNotifications(); // Limpiar notificaciones
      setUser(null);
      localStorage.removeItem('user');
      console.log('✅ Sesión cerrada correctamente');
      // Redirigir al inicio después de cerrar sesión
      navigate('/', { replace: true });
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      // Limpiar igualmente aunque falle Firebase
      const { clearNotifications } = useStore.getState();
      clearNotifications(); // Limpiar notificaciones
      setUser(null);
      localStorage.removeItem('user');
      // Redirigir al inicio incluso si hay error
      navigate('/', { replace: true });
    }
  };

  // Generar avatar URL con validación robusta
  const getAvatarUrl = () => {
    if (user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' && user.avatar.startsWith('http')) {
      return user.avatar;
    }
    const username = user?.username || user?.email?.split('@')[0] || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=40&background=FF6B00&color=fff&bold=true`;
  };
  const avatarUrl = getAvatarUrl();

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
            siteSettings: data.siteSettings || defaultHomeConfig.siteSettings,
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
  }, []);

  // Los colores se aplican en App.tsx según el tema activo
  // No necesitamos aplicar colores aquí ya que App.tsx maneja todo

  // Obtener logo con fallback
  const getLogoUrl = () => {
    const url = homeConfig.siteSettings?.logoUrl || defaultHomeConfig.siteSettings.logoUrl;
    // Si la URL existe pero es del proyecto antiguo o está vacía, retornar null para mostrar placeholder
    if (!url || url.includes('subasta-argenta-474019')) {
      return null;
    }
    return url;
  };

  // Estado para manejar errores de carga del logo
  const [logoError, setLogoError] = useState(false);

  // Obtener nombre del sitio con fallback
  const getSiteName = () => {
    return homeConfig.siteSettings?.siteName || defaultHomeConfig.siteSettings.siteName;
  };

  // Determinar si el enlace está activo para el navbar móvil
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Navbar Superior (Desktop) */}
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(getLogoUrl() && !logoError) ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                  src={getLogoUrl()} 
                  alt={getSiteName()}
                  className="navbar-logo-img"
                  onError={(e) => {
                    console.warn('⚠️ Error cargando logo desde:', getLogoUrl());
                    setLogoError(true);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onLoad={() => {
                    setLogoError(false);
                  }}
                />
                {/* Mostrar stickers activos */}
                {(homeConfig.siteSettings?.logoStickers || [])
                  .filter(sticker => {
                    if (!sticker.active) return false;
                    // Si tiene fechas, verificar que estemos en el rango
                    if (sticker.startDate && sticker.endDate) {
                      const now = new Date();
                      const start = new Date(sticker.startDate);
                      const end = new Date(sticker.endDate);
                      return now >= start && now <= end;
                    }
                    return true;
                  })
                  .map(sticker => {
                    const sizeMap = { small: '0.875rem', medium: '1.125rem', large: '1.5rem' };
                    const positionMap = {
                      'top-left': { top: '-8px', left: '-8px' },
                      'top-right': { top: '-8px', right: '-8px' },
                      'bottom-left': { bottom: '-8px', left: '-8px' },
                      'bottom-right': { bottom: '-8px', right: '-8px' },
                      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
                    };
                    return (
                      <span
                        key={sticker.id}
                        style={{
                          position: 'absolute',
                          fontSize: sizeMap[sticker.size],
                          ...positionMap[sticker.position],
                          pointerEvents: 'none',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                          zIndex: 10,
                          lineHeight: 1,
                          animation: 'bounce 2s infinite'
                        }}
                        title={specialEvents.find(e => e.type === sticker.type)?.name || 'Sticker'}
                      >
                        {sticker.emoji}
                      </span>
                    );
                  })}
              </div>
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
            <ThemeToggle />
            <SoundToggle />
            
            {isAuthenticated ? (
              <>
                <Link to="/carrito" className="navbar-icon-btn" title="Carrito">
                  <ShoppingCart size={20} />
                  {cartItemsCount > 0 && <span className="navbar-badge">{cartItemsCount}</span>}
                </Link>
                
                <Link to="/notificaciones" className="navbar-icon-btn" title="Notificaciones">
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="navbar-badge">{unreadCount}</span>}
                </Link>

                <div className="navbar-user-menu">
                  <button className="navbar-icon-btn" title="Mi cuenta">
                    <img 
                      src={avatarUrl}
                      alt={user?.username}
                      className="navbar-avatar-img"
                    />
                  </button>
                  <div className="navbar-dropdown">
                    <div className="navbar-dropdown-header">
                      <img src={avatarUrl} alt={user?.username} />
                      <div>
                        <div className="navbar-dropdown-name">{user?.username}</div>
                        <div className="navbar-dropdown-email">{user?.email}</div>
                      </div>
                    </div>
                    <div className="navbar-dropdown-divider" />
                    <Link to="/perfil" className="navbar-dropdown-item">
                      <Home size={18} />
                      Mi Perfil
                    </Link>
                    {user?.isAdmin && (
                      <Link to="/admin" className="navbar-dropdown-item">
                        <LayoutDashboard size={18} />
                        Panel Admin
                      </Link>
                    )}
                    <button onClick={handleLogout} className="navbar-dropdown-item">
                      <LogOut size={18} />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Iniciar Sesión
              </Link>
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