import { useEffect, useState } from 'react';
import { useSyncFirebase } from './hooks/useSyncFirebase';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from './config/firebase';
import { HomeConfig, defaultHomeConfig } from './types/homeConfig';
import { useStore } from './store/useStore';
import Terminos from './pages/Terminos';
import Preguntas from './pages/Preguntas';
import Navbar from './components/Navbar';
import AuctionManager from './utils/AuctionManager';
import OrderManager from './utils/OrderManager';
import DataCleanupManager from './utils/DataCleanupManager';
// BotManager desactivado - Los bots ahora funcionan desde Cloud Functions (24/7)
// import BotManager from './utils/BotManager';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Subastas from './pages/Subastas';
import AuctionDetail from './pages/AuctionDetail';
import ProductDetail from './pages/ProductDetail';
import Tienda from './pages/Tienda';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Carrito from './pages/Carrito';
import Notificaciones from './pages/Notificaciones';
import Perfil from './pages/Perfil';
import AdminPanel from './pages/AdminPanel';
import CompletarPerfil from './pages/CompletarPerfil';
import ToastContainer from './components/ToastContainer';

function App() {
  useSyncFirebase();
  const { user, loadUserNotifications, theme } = useStore();
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(defaultHomeConfig);

  // Función para aplicar colores según el modo activo
  const applyThemeColors = (config: HomeConfig, currentTheme: string) => {
    const root = document.documentElement;
    let colors;
    
    // Priorizar themeColorSets si existe, sino usar themeColors (legacy)
    if (config.themeColorSets) {
      if (currentTheme === 'light') {
        colors = config.themeColorSets.light;
      } else if (currentTheme === 'dark') {
        colors = config.themeColorSets.dark;
      } else {
        colors = config.themeColorSets.experimental;
      }
    } else if (config.themeColors) {
      colors = config.themeColors;
    } else {
      return;
    }

    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-hover', colors.primaryHover);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--bg-primary', colors.background);
    root.style.setProperty('--bg-secondary', colors.backgroundSecondary);
    root.style.setProperty('--bg-tertiary', colors.backgroundTertiary);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--error', colors.error);
    root.style.setProperty('--info', colors.info);
  };

  // Cargar homeConfig y aplicar colores globalmente
  useEffect(() => {
    try {
      const homeConfigRef = ref(realtimeDb, 'homeConfig');
      const unsubscribe = onValue(homeConfigRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const config = {
            ...defaultHomeConfig,
            ...data,
            siteSettings: data.siteSettings || defaultHomeConfig.siteSettings,
            themeColors: data.themeColors || defaultHomeConfig.themeColors,
            themeColorSets: data.themeColorSets || defaultHomeConfig.themeColorSets
          };
          setHomeConfig(config);
          applyThemeColors(config, theme);
        }
      }, (error) => {
        console.error('Error cargando homeConfig en App:', error);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Error configurando listener de homeConfig en App:', error);
    }
  }, [theme]);

  // Aplicar colores cuando cambia el tema
  useEffect(() => {
    applyThemeColors(homeConfig, theme);
  }, [theme, homeConfig]);
  
  // Cargar notificaciones cuando la app inicia y hay un usuario logueado
  // NOTA: Se carga una sola vez al iniciar, las páginas individuales pueden recargar si es necesario
  useEffect(() => {
    if (user && loadUserNotifications) {
      // Pequeño delay para asegurar que el store esté inicializado
      const timer = setTimeout(() => {
        console.log('🔄 Cargando notificaciones al iniciar app para usuario:', user.username);
        loadUserNotifications();
      }, 1000); // Aumentado para evitar conflictos con otros componentes
      
      return () => clearTimeout(timer);
    }
  }, [user?.id]); // Ejecutar solo cuando el usuario cambie
  
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="app">
        <Navbar />
        <AuctionManager />
        <OrderManager />
        <DataCleanupManager />
        {/* BotManager desactivado - Los bots ahora funcionan desde Cloud Functions (24/7) */}
        {/* <BotManager /> */}
        <ScrollToTop />
        <ToastContainer />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/subastas" element={<Subastas />} />
            <Route path="/subastas/:id" element={<AuctionDetail />} />
            <Route path="/tienda" element={<Tienda />} />
            <Route path="/producto/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/terminos" element={<Terminos />} />
            <Route path="/preguntas" element={<Preguntas />} />
            <Route path="/admin" element={<AdminPanel />} />
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
