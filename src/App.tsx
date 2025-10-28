import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Terminos from './pages/Terminos';
import Preguntas from './pages/Preguntas';
import Navbar from './components/Navbar';
import AuctionManager from './utils/AuctionManager';
import OrderManager from './utils/OrderManager';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Subastas from './pages/Subastas';
import AuctionDetail from './pages/AuctionDetail';
import ProductDetail from './pages/ProductDetail';
import Tienda from './pages/Tienda';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Cleanup from './pages/Cleanup';
import Carrito from './pages/Carrito';
import Notificaciones from './pages/Notificaciones';
import Perfil from './pages/Perfil';
import AdminPanel from './pages/AdminPanel';
import Notifications from './pages/Notifications';
import CompletarPerfil from './pages/CompletarPerfil';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <AuctionManager />
        <OrderManager />
        <ScrollToTop />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/subastas" element={<Subastas />} />
            <Route path="/subastas/:id" element={<AuctionDetail />} />
            <Route path="/tienda" element={<Tienda />} />
            <Route path="/producto/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/cleanup" element={<Cleanup />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/terminos" element={<Terminos />} />
            <Route path="/preguntas" element={<Preguntas />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/notificaciones" element={<Notifications />} />
            <Route path="/completar-perfil" element={<CompletarPerfil />} />
          </Routes>
        </main>
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-section">
                <h3>Subasta Argenta</h3>
                <p>La plataforma líder de subastas y ventas online en Argentina</p>
              </div>
              <div className="footer-section">
                <h4>Enlaces</h4>
                <ul>
                  <li><a href="/subastas">Subastas</a></li>
                  <li><a href="/tienda">Tienda</a></li>
                  <li><a href="/terminos">Términos y Condiciones</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Soporte</h4>
                <ul>
                  <li><a href="/ayuda">Centro de Ayuda</a></li>
                  <li><a href="/contacto">Contacto</a></li>
                  <li><a href="/preguntas">Preguntas Frecuentes</a></li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2025 Subasta Argenta. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
