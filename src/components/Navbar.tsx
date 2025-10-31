import { Link } from 'react-router-dom';
import { ShoppingCart, Bell, Home, Store, Gavel, LogOut, LayoutDashboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, cart, unreadCount, setUser } = useStore();
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  import { auth } from '../config/firebase'; // AGREGAR ESTE IMPORT

const handleLogout = async () => {
  try {
    await auth.signOut(); // CERRAR SESIÓN EN FIREBASE
    setUser(null);
    localStorage.removeItem('user');
    console.log('✅ Sesión cerrada correctamente');
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    // Limpiar igualmente aunque falle Firebase
    setUser(null);
    localStorage.removeItem('user');
  }
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
  );
};

export default Navbar;
