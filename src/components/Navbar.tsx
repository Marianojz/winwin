import { Link } from 'react-router-dom';
import { ShoppingCart, Bell, User, Home, Store, Gavel, LogOut, LayoutDashboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, cart, unreadCount, setUser } = useStore();
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleLogout = () => {
    setUser(null);
  };

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

        <div className="navbar-menu">
          <Link to="/" className="navbar-link">
            <Home size={20} />
            <span>Inicio</span>
          </Link>
          <Link to="/subastas" className="navbar-link">
            <Gavel size={20} />
            <span>Subastas</span>
          </Link>
          <Link to="/tienda" className="navbar-link">
            <Store size={20} />
            <span>Tienda</span>
          </Link>
        </div>

        <div className="navbar-actions">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <>
              <Link to="/notificaciones" className="navbar-icon-btn">
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="navbar-badge">{unreadCount}</span>
                )}
              </Link>

              <Link to="/carrito" className="navbar-icon-btn">
                <ShoppingCart size={22} />
                {cartItemsCount > 0 && (
                  <span className="navbar-badge">{cartItemsCount}</span>
                )}
              </Link>

              <div className="navbar-user-menu">
                <button className="navbar-icon-btn">
                  <User size={22} />
                </button>
                <div className="navbar-dropdown">
                  <div className="navbar-dropdown-header">
                    <img src={user?.avatar} alt={user?.username} />
                    <div>
                      <div className="navbar-dropdown-name">{user?.username}</div>
                      <div className="navbar-dropdown-email">{user?.email}</div>
                    </div>
                  </div>
                  <div className="navbar-dropdown-divider" />
                  <Link to="/perfil" className="navbar-dropdown-item">
                    <User size={18} />
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
            <>
              <Link to="/login" className="btn btn-outline">
                Ingresar
              </Link>
              <Link to="/registro" className="btn btn-primary">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
