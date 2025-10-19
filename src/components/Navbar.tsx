import { Link } from 'react-router-dom';
import { ShoppingCart, Bell, Home, Store, Gavel, LogOut, LayoutDashboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, cart, unreadCount, setUser } = useStore();
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Generar avatar URL
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'U')}&size=40&background=FF6B00&color=fff&bold=true`;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/subasta-argenta-474019.firebasestorage.app/o/imagenes%20utiles%2Flogo3.png?alt=media&token=bc5bab5c-0ccd-49e0-932b-2cee25a93b7d" 
            alt="Subasta Argenta"
            className="navbar-logo-img"
          />
          <span className="navbar-logo-text">Subasta Argenta</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="navbar-link">
            <Home size={18} />
            Inicio
          </Link>
          <Link to="/subastas" className="navbar-link">
            <Gavel size={18} />
            Subastas
          </Link>
          <Link to="/tienda" className="navbar-link">
            <Store size={18} />
            Tienda
          </Link>
        </div>

        <div className="navbar-actions">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <>
              <Link to="/carrito" className="navbar-icon">
                <ShoppingCart size={20} />
                {cartItemsCount > 0 && <span className="badge">{cartItemsCount}</span>}
              </Link>
              
              <Link to="/notificaciones" className="navbar-icon">
                <Bell size={20} />
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </Link>

              <Link to="/perfil" className="navbar-icon navbar-user">
                <img 
                  src={avatarUrl}
                  alt={user?.username}
                  className="navbar-avatar-img"
                />
                <span className="navbar-username">{user?.username}</span>
              </Link>
              
              {user?.isAdmin && (
                <Link to="/admin" className="navbar-link">
                  <LayoutDashboard size={18} />
                  Admin
                </Link>
              )}
              
              <button onClick={handleLogout} className="navbar-link navbar-logout">
                <LogOut size={18} />
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
