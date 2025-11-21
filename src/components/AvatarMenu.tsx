import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Settings, MessageSquare, LogOut, X, Loader, LayoutDashboard, Volume2, VolumeX, Sun, Moon, Sparkles } from 'lucide-react';
import { auth } from '../config/firebase';
import { useStore } from '../store/useStore';
import { getUnreadCount } from '../utils/messages';
import { soundManager } from '../utils/sounds';
import './AvatarMenu.css';

interface AvatarMenuProps {
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    isAdmin?: boolean;
  };
  avatarUrl: string;
  getUserInitial: () => string;
  onLogout?: () => void;
}

type MenuState = 'closed' | 'open' | 'navigating';

const AvatarMenu = ({ user, avatarUrl, getUserInitial, onLogout }: AvatarMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, theme, toggleTheme } = useStore();
  const [menuState, setMenuState] = useState<MenuState>('closed');
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0, bottom: undefined as number | undefined });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calcular posición del menú cuando se abre o cambia el scroll/ventana
  useEffect(() => {
    const updatePosition = () => {
      if (menuState === 'open' && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // Detectar si está en navbar móvil (verificar si el padre tiene la clase navbar-mobile-item--profile)
        const parentElement = buttonRef.current.closest('.navbar-mobile-item--profile');
        const isInMobileNavbar = !!parentElement;
        
        if (isInMobileNavbar) {
          // En navbar móvil: abrir hacia arriba
          // Calcular la distancia desde el bottom de la ventana hasta el top del botón
          const distanceFromBottom = window.innerHeight - rect.top;
          const menuHeight = 300; // Altura aproximada del menú
          setMenuPosition({
            top: undefined,
            bottom: distanceFromBottom + 12, // Espacio desde el bottom del botón
            right: window.innerWidth - rect.right - window.scrollX
          });
        } else {
          // En navbar superior: abrir hacia abajo (comportamiento normal)
          setMenuPosition({
            top: rect.bottom + window.scrollY + 12,
            bottom: undefined,
            right: window.innerWidth - rect.right - window.scrollX
          });
        }
      }
    };

    if (menuState === 'open') {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [menuState]);

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

  // Cargar preferencia de sonido desde Firebase
  useEffect(() => {
    const loadPreference = async () => {
      if (user) {
        try {
          const { loadUserPreferences } = await import('../utils/userPreferences');
          const preferences = await loadUserPreferences(user.id);
          if (preferences.soundEnabled !== undefined) {
            const isEnabled = preferences.soundEnabled;
            setSoundEnabled(isEnabled);
            if (isEnabled) {
              soundManager.enable();
            } else {
              soundManager.disable();
            }
          }
        } catch (error) {
          console.error('❌ Error cargando preferencia de sonido:', error);
        }
      }
    };

    loadPreference();
  }, [user]);

  const toggleSound = async () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    
    // Guardar en Firebase si hay usuario
    if (user) {
      try {
        const { updateUserPreference } = await import('../utils/userPreferences');
        await updateUserPreference(user.id, 'soundEnabled', newState);
      } catch (error) {
        console.error('❌ Error guardando preferencia de sonido:', error);
      }
    }
    
    if (newState) {
      soundManager.enable();
    } else {
      soundManager.disable();
    }
  };

  const getThemeIcon = () => {
    if (theme === 'light') {
      return Sun;
    } else if (theme === 'dark') {
      return Moon;
    } else {
      return Sparkles;
    }
  };

  const getThemeLabel = () => {
    if (theme === 'light') {
      return 'Tema: Modo Claro';
    } else if (theme === 'dark') {
      return 'Tema: Modo Oscuro';
    } else {
      return 'Tema: Modo Experimental';
    }
  };

  const getNextThemeLabel = () => {
    if (theme === 'light') {
      return 'Cambiar a Oscuro';
    } else if (theme === 'dark') {
      return 'Cambiar a Experimental';
    } else {
      return 'Cambiar a Claro';
    }
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        if (menuState === 'open') {
          closeMenu();
        }
      }
    };

    if (menuState === 'open') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuState]);

  // Cerrar menú cuando cambia la ruta (navegación exitosa)
  useEffect(() => {
    if (menuState === 'navigating' && navigatingTo) {
      // Verificar si estamos en la ruta objetivo
      if (location.pathname === navigatingTo) {
        // Esperar un momento para la transición fadeOut
        setTimeout(() => {
          closeMenu();
          setNavigatingTo(null);
        }, 200);
      }
    }
  }, [location.pathname, menuState, navigatingTo]);

  const toggleMenu = () => {
    if (menuState === 'open') {
      closeMenu();
    } else {
      setMenuState('open');
    }
  };

  const closeMenu = () => {
    setMenuState('closed');
    setNavigatingTo(null);
  };

  const handleNavigation = (path: string) => {
    if (menuState === 'navigating') return; // Prevenir múltiples navegaciones

    setNavigatingTo(path);
    setMenuState('navigating');

    // FadeOut antes de navegar
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  const handleLogout = async () => {
    if (menuState === 'navigating') return;

    setMenuState('navigating');
    setNavigatingTo('/');

    try {
      await auth.signOut();
      const { clearNotifications } = useStore.getState();
      clearNotifications();
      setUser(null);
      
      // FadeOut antes de redirigir
      setTimeout(() => {
        navigate('/', { replace: true });
        closeMenu();
      }, 200);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Limpiar igualmente aunque falle
      setUser(null);
      navigate('/', { replace: true });
      closeMenu();
    }
  };

  // Generar menuItems dinámicamente para que se actualicen cuando cambien theme o soundEnabled
  const menuItems = useMemo(() => {
    const items = [
      {
        label: 'Perfil',
        icon: User,
        path: '/perfil',
        onClick: () => handleNavigation('/perfil')
      },
      {
        label: 'Configuración',
        icon: Settings,
        path: '/perfil?tab=settings',
        onClick: () => handleNavigation('/perfil?tab=settings')
      },
      {
        label: 'Mensajes',
        icon: MessageSquare,
        path: '/perfil?tab=messages',
        onClick: () => handleNavigation('/perfil?tab=messages'),
        badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined
      },
      {
        label: getThemeLabel(),
        icon: getThemeIcon(),
        path: null,
        onClick: toggleTheme,
        isToggle: true,
        toggleLabel: getNextThemeLabel()
      },
      {
        label: soundEnabled ? 'Sonidos: Activados' : 'Sonidos: Desactivados',
        icon: soundEnabled ? Volume2 : VolumeX,
        path: null,
        onClick: toggleSound,
        isToggle: true
      },
      {
        label: 'Cerrar Sesión',
        icon: LogOut,
        path: null,
        onClick: handleLogout,
        variant: 'danger' as const
      }
    ];

    // Agregar Panel Admin si es admin (después de Perfil)
    if (user.isAdmin) {
      items.splice(1, 0, {
        label: 'Panel Admin',
        icon: LayoutDashboard,
        path: '/admin',
        onClick: () => handleNavigation('/admin')
      });
    }

    return items;
  }, [theme, soundEnabled, unreadMessagesCount, user.isAdmin]);

  const overlayPortal = menuState === 'open' ? (
    <div
      className="avatar-menu-overlay"
      onClick={closeMenu}
    />
  ) : null;

  const menuPortal = menuState !== 'closed' ? (
    <div
      ref={menuRef}
      className={`avatar-menu ${menuState}`}
      data-state={menuState}
      style={{
        position: 'fixed',
        ...(menuPosition.bottom !== undefined 
          ? { bottom: `${menuPosition.bottom}px`, top: 'auto' }
          : { top: `${menuPosition.top}px`, bottom: 'auto' }
        ),
        ...(menuPosition.bottom !== undefined
          ? { left: '50%', right: 'auto', transform: 'translateX(-50%)' }
          : { right: `${menuPosition.right}px`, left: 'auto' }
        ),
        zIndex: 99999
      }}
    >
        {/* Header */}
        <div className="avatar-menu-header">
          <div className="avatar-menu-header-avatar">
            {avatarUrl && avatarUrl.startsWith('http') ? (
              <>
                <img
                  src={avatarUrl}
                  alt={user.username}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                  onLoad={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'block';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'none';
                  }}
                />
                <div className="avatar-menu-header-fallback" style={{ display: 'none' }}>
                  {getUserInitial()}
                </div>
              </>
            ) : (
              <div className="avatar-menu-header-fallback" style={{ display: 'flex' }}>
                {getUserInitial()}
              </div>
            )}
          </div>
          <div className="avatar-menu-header-info">
            <div className="avatar-menu-name">{user.username}</div>
            <div className="avatar-menu-email">{user.email}</div>
          </div>
          <button
            className="avatar-menu-close"
            onClick={closeMenu}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div className="avatar-menu-divider" />

        {/* Items */}
        <div className="avatar-menu-items">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            // Determinar si el item está activo basado en la ruta actual
            const isActive = item.path && (() => {
              const currentPath = location.pathname;
              const currentSearch = location.search;
              const itemPath = item.path.split('?')[0];
              const itemSearch = item.path.includes('?') ? item.path.split('?')[1] : null;
              
              // Si el path coincide
              if (currentPath === itemPath) {
                // Si el item tiene query params, verificar que coincidan
                if (itemSearch) {
                  const itemParams = new URLSearchParams(itemSearch);
                  const currentParams = new URLSearchParams(currentSearch);
                  // Verificar que todos los params del item estén presentes en la ruta actual
                  for (const [key, value] of itemParams.entries()) {
                    if (currentParams.get(key) !== value) {
                      return false;
                    }
                  }
                  return true;
                }
                // Si el item no tiene query params y estamos en la ruta base, está activo
                return !currentSearch || currentPath === '/perfil';
              }
              return false;
            })();
            return (
              <button
                key={index}
                className={`avatar-menu-item ${item.variant || ''} ${menuState === 'navigating' && !item.isToggle ? 'navigating' : ''} ${isActive ? 'active' : ''}`}
                onClick={item.onClick}
                disabled={menuState === 'navigating' && !item.isToggle}
              >
                {menuState === 'navigating' && navigatingTo === item.path ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    <span>Navegando...</span>
                  </>
                ) : (
                  <>
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="avatar-menu-badge">{item.badge}</span>
                    )}
                    {item.isToggle && (
                      <span style={{ 
                        marginLeft: 'auto', 
                        fontSize: '0.75rem', 
                        color: item.toggleLabel ? 'var(--primary)' : (soundEnabled ? 'var(--success)' : 'var(--text-secondary)'),
                        fontWeight: 600
                      }}>
                        {item.toggleLabel || (soundEnabled ? 'ON' : 'OFF')}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div className="avatar-menu-container">
      <button
        ref={buttonRef}
        className="avatar-menu-trigger"
        onClick={toggleMenu}
        aria-label="Menú de usuario"
        aria-expanded={menuState === 'open'}
      >
        {avatarUrl && avatarUrl.startsWith('http') ? (
          <>
            <img
              src={avatarUrl}
              alt={user.username}
              className="avatar-menu-avatar"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'block';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'none';
              }}
            />
            <div className="avatar-menu-fallback" style={{ display: 'none' }}>
              {getUserInitial()}
            </div>
          </>
        ) : (
          <div className="avatar-menu-fallback" style={{ display: 'flex' }}>
            {getUserInitial()}
          </div>
        )}
      </button>

      {overlayPortal && createPortal(overlayPortal, document.body)}
      {menuPortal && createPortal(menuPortal, document.body)}
    </div>
  );
};

export default AvatarMenu;

