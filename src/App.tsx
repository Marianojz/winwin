import { useEffect, useState, Suspense, lazy } from 'react';
import { useSyncFirebase } from './hooks/useSyncFirebase';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { realtimeDb, auth } from './config/firebase';
import { getRedirectResult } from 'firebase/auth';
import { HomeConfig, defaultHomeConfig } from './types/homeConfig';
import { useStore } from './store/useStore';
import { processGoogleAuthResult } from './utils/googleAuthHelper';
import Navbar from './components/Navbar';
import AuctionManager from './utils/AuctionManager';
import OrderManager from './utils/OrderManager';
import DataCleanupManager from './utils/DataCleanupManager';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/LoadingSpinner';
import { cleanExpiredCache } from './utils/geolocationCache';
import { preventZoomOnInput, restoreViewport } from './utils/mobileOptimizations';
import Home from './pages/Home';
import Subastas from './pages/Subastas';
import AuctionDetail from './pages/AuctionDetail';
import ProductDetail from './pages/ProductDetail';
import Tienda from './pages/Tienda';
import Login from './pages/Login';
import Carrito from './pages/Carrito';
import Notificaciones from './pages/Notificaciones';
import Perfil from './pages/Perfil';
import AdminPanel from './pages/AdminPanel';

// Componente interno para manejar redirect result (debe estar dentro de Router)
function RedirectHandler() {
  const { setUser } = useStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleRedirectResult = async () => {
      // Evitar procesar múltiples veces
      if (isProcessing) {
        console.log('⏳ Ya se está procesando un redirect...');
        return;
      }

      try {
        console.log('🔍 Verificando redirect result...');
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          setIsProcessing(true);
          console.log('✅ Google Sign-In redirect exitoso, procesando usuario...', result.user.uid);
          
          try {
            const { fullUser, needsCompleteProfile } = await processGoogleAuthResult(result.user);
            
            console.log('👤 Usuario procesado:', {
              id: fullUser.id,
              email: fullUser.email,
              isAdmin: fullUser.isAdmin,
              needsCompleteProfile
            });
            
            setUser(fullUser);

            // Esperar un momento para asegurar que el estado se actualiza
            await new Promise(resolve => setTimeout(resolve, 300));

            // Redirigir según si necesita completar perfil
            if (needsCompleteProfile) {
              console.log('📝 Redirigiendo a completar perfil...');
              navigate('/completar-perfil', { replace: true });
            } else {
              // Redirigir según rol
              if (fullUser.isAdmin) {
                console.log('👑 Redirigiendo a admin...');
                navigate('/admin', { replace: true });
              } else {
                console.log('🏠 Redirigiendo a home...');
                navigate('/', { replace: true });
              }
            }
          } catch (processError: any) {
            console.error('❌ Error procesando usuario:', processError);
            navigate('/login', { replace: true, state: { error: 'Error al procesar tu cuenta. Por favor, intentá nuevamente.' } });
          } finally {
            setIsProcessing(false);
          }
        } else {
          console.log('ℹ️ No hay redirect result pendiente');
        }
      } catch (error: any) {
        console.error('❌ Error procesando redirect result:', error);
        setIsProcessing(false);
        
        // No mostrar error si el usuario no viene de un redirect
        if (error.code !== 'auth/no-auth-event' && error.code !== 'auth/popup-closed-by-user') {
          console.warn('⚠️ Error en redirect de Google:', error.message);
          // Solo navegar a login si es un error real
          if (error.code && !error.code.includes('no-auth')) {
            navigate('/login', { replace: true, state: { error: 'Error al iniciar sesión con Google' } });
          }
        }
      }
    };

    // Esperar un momento antes de verificar el redirect para asegurar que Firebase está listo
    const timeoutId = setTimeout(() => {
      handleRedirectResult();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [setUser, navigate, isProcessing]);

  return null;
}

// Lazy loading de componentes de registro
const Registro = lazy(() => import('./pages/Registro'));
const RegistroMobile = lazy(() => import('./pages/RegistroMobile'));
const CompletarPerfil = lazy(() => import('./pages/CompletarPerfil'));
const CompletarPerfilGoogle = lazy(() => import('./pages/CompletarPerfilGoogle'));
const Terminos = lazy(() => import('./pages/Terminos'));
const Preguntas = lazy(() => import('./pages/Preguntas'));
const Ayuda = lazy(() => import('./pages/Ayuda'));
const Contacto = lazy(() => import('./pages/Contacto'));
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
            siteSettings: {
              ...(data.siteSettings || defaultHomeConfig.siteSettings),
              logoStickers: data.siteSettings?.logoStickers || defaultHomeConfig.siteSettings.logoStickers || []
            },
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

  // Limpiar cache de geolocalización expirado al iniciar
  useEffect(() => {
    cleanExpiredCache();
  }, []);

  // Configurar viewport para móviles
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      preventZoomOnInput();
      return () => restoreViewport();
    }
  }, []);
  
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="app">
        <RedirectHandler />
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
            <Route 
              path="/registro" 
              element={
                <Suspense fallback={<LoadingSpinner size="lg" text="Cargando registro..." />}>
                  <Registro />
                </Suspense>
              } 
            />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route 
              path="/terminos" 
              element={
                <Suspense fallback={<LoadingSpinner size="md" text="Cargando..." />}>
                  <Terminos />
                </Suspense>
              } 
            />
            <Route 
              path="/preguntas" 
              element={
                <Suspense fallback={<LoadingSpinner size="md" text="Cargando..." />}>
                  <Preguntas />
                </Suspense>
              } 
            />
            <Route 
              path="/ayuda" 
              element={
                <Suspense fallback={<LoadingSpinner size="md" text="Cargando..." />}>
                  <Ayuda />
                </Suspense>
              } 
            />
            <Route 
              path="/contacto" 
              element={
                <Suspense fallback={<LoadingSpinner size="md" text="Cargando..." />}>
                  <Contacto />
                </Suspense>
              } 
            />
            <Route path="/admin" element={<AdminPanel />} />
            <Route 
              path="/completar-perfil" 
              element={
                <Suspense fallback={<LoadingSpinner size="lg" text="Cargando..." />}>
                  <CompletarPerfil />
                </Suspense>
              } 
            />
            <Route 
              path="/completar-perfil-google" 
              element={
                <Suspense fallback={<LoadingSpinner size="lg" text="Cargando..." />}>
                  <CompletarPerfilGoogle />
                </Suspense>
              } 
            />
          </Routes>
        </main>
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-section">
                <h3>Clikio</h3>
                <p>La plataforma líder de subastas y ventas online en Argentina</p>
              </div>
              <div className="footer-section">
                <h4>Enlaces</h4>
                <ul>
                  <li><Link to="/subastas">Subastas</Link></li>
                  <li><Link to="/tienda">Tienda</Link></li>
                  <li><Link to="/terminos">Términos y Condiciones</Link></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Soporte</h4>
                <ul>
                  <li><Link to="/ayuda">Centro de Ayuda</Link></li>
                  <li><Link to="/contacto">Contacto</Link></li>
                  <li><Link to="/preguntas">Preguntas Frecuentes</Link></li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2025 Clikio. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
