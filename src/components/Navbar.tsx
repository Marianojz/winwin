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
  <div className="navbar-actions">
    <Link to="/carrito" className="navbar-icon">
      <ShoppingCart size={20} />
      {cartItemsCount > 0 && <span className="badge">{cartItemsCount}</span>}
    </Link>
    
    <Link to="/notificaciones" className="navbar-icon">
      <Bell size={20} />
      {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
    </Link>

    <div className="navbar-user-menu">
      <Link to="/perfil" className="navbar-avatar">
        <img 
          src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'U')}&size=40&background=FF6B00&color=fff&bold=true`}
          alt={user?.username}
          className="avatar-img"
        />
        <span>{user?.username}</span>
      </Link>
      
      {user?.isAdmin && (
        <Link to="/admin" className="navbar-link">
          <LayoutDashboard size={18} />
          Admin
        </Link>
      )}
      
      <button onClick={handleLogout} className="navbar-link logout-btn">
        <LogOut size={18} />
        Salir
      </button>
    </div>
  </div>
) : (
  <Link to="/login" className="btn btn-primary">
    Iniciar Sesión
  </Link>
)}
    </nav>
  );
};

export default Navbar;
