import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { useSyncFirebase } from './hooks/useSyncFirebase';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { realtimeDb, auth } from './config/firebase';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { generateMultipleFavicons, updateAllFavicons, updateFavicon } from './utils/imageOptimizer';
import { HomeConfig, defaultHomeConfig } from './types/homeConfig';
import { useStore } from './store/useStore';
import { processGoogleAuthResult } from './utils/googleAuthHelper';
import { toast } from './utils/toast';
import Navbar from './components/Navbar';
import AuctionManager from './utils/AuctionManager';
import OrderManager from './utils/OrderManager';
import DataCleanupManager from './utils/DataCleanupManager';
import BotManager from './utils/BotManager';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/LoadingSpinner';
import Hreflang from './components/Hreflang';
import { cleanExpiredCache } from './utils/geolocationCache';
import { preventZoomOnInput, restoreViewport } from './utils/mobileOptimizations';
import { initializeLocalStorageCleanup } from './utils/localStorageCleaner';
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
import Blog from './pages/Blog';
import BlogArticle from './pages/BlogArticle';
import ComoFunciona from './pages/ComoFunciona';
import CategoriaPage from './pages/CategoriaPage';
import MisFavoritos from './pages/MisFavoritos';
import NotFound from './pages/NotFound';

// Componente Footer condicional
const Footer = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  if (isHomePage) {
    // Footer completo en página principal
    return (
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
    );
  } else {
    // Footer minimalista en otras páginas
    return (
      <footer className="footer" style={{ padding: '1.5rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            © 2025 Clikio. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    );
  }
};

// Componente interno para manejar redirect result (debe estar dentro de Router)
function RedirectHandler() {
  const { setUser, user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCheckedRedirect, setHasCheckedRedirect] = useState(false);
  const lastCheckedPathRef = useRef<string>('');
  const redirectCheckCountRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const handleRedirectResult = async () => {
      // Evitar procesar múltiples veces
      if (isProcessing) {
        return;
      }

      if (!mounted) return;

      // Solo loggear si es la primera vez o si cambió la ruta significativamente
      const shouldLog = redirectCheckCountRef.current === 0 || 
                        lastCheckedPathRef.current !== location.pathname ||
                        location.search || location.hash;
      
      // Log eliminado para reducir ruido en consola
      if (shouldLog) {
        lastCheckedPathRef.current = location.pathname;
        redirectCheckCountRef.current++;
      }

      try {
        let result;
        try {
          result = await getRedirectResult(auth);
        } catch (redirectError: any) {
          // Manejar error específico de missing initial state
          if (redirectError.message?.includes('missing initial state') || 
              redirectError.message?.includes('sessionStorage') ||
              redirectError.message?.includes('storage-partitioned')) {
            console.warn('⚠️ [MÓVIL] Error de sessionStorage al procesar redirect, limpiando estado...');
            toast.warning('Problema con el navegador. Por favor, intentá iniciar sesión nuevamente.', 5000);
            
            // Limpiar cualquier estado de autenticación pendiente
            try {
              await auth.signOut();
            } catch (e) {
              // Ignorar errores de signOut
            }
            
            // Navegar a login con mensaje claro
            if (mounted) {
              navigate('/login', { replace: true, state: { 
                error: 'Problema con el navegador. El sistema usará un método alternativo automáticamente. Por favor, intentá iniciar sesión nuevamente.' 
              } });
            }
            return;
          }
          throw redirectError;
        }
        
        if (!mounted) return;
        
        if (result && result.user) {
          setIsProcessing(true);
          // Log eliminado para reducir ruido en consola
          toast.info('Procesando tu cuenta...', 2000);
          
          try {
            const { fullUser, needsCompleteProfile } = await processGoogleAuthResult(result.user);
            
            if (!mounted) return;
            
            // Log eliminado para reducir ruido en consola
            
            setUser(fullUser);
            toast.success('¡Inicio de sesión exitoso!', 2000);

            // Esperar un momento para asegurar que el estado se actualiza
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!mounted) return;

            // Redirigir según si necesita completar perfil
            if (needsCompleteProfile) {
              // Log eliminado para reducir ruido en consola
              navigate('/completar-perfil', { replace: true });
            } else {
              // Redirigir según rol
              if (fullUser.isAdmin) {
                // Log eliminado para reducir ruido en consola
                navigate('/admin', { replace: true });
              } else {
                // Log eliminado para reducir ruido en consola
                navigate('/', { replace: true });
              }
            }
          } catch (processError: any) {
            console.error('❌ [MÓVIL] Error procesando usuario:', processError);
            const errorMsg = 'Error al procesar tu cuenta. Por favor, intentá nuevamente.';
            toast.error(errorMsg, 5000);
            if (mounted) {
              navigate('/login', { replace: true, state: { error: errorMsg } });
            }
          } finally {
            if (mounted) {
              setIsProcessing(false);
            }
          }
        } else {
          // Log eliminado para reducir ruido en consola
        }
      } catch (error: any) {
        console.error('❌ [MÓVIL] Error procesando redirect result:', error);
        if (mounted) {
          setIsProcessing(false);
        }
        
        // No mostrar error si el usuario no viene de un redirect
        if (error.code !== 'auth/no-auth-event' && error.code !== 'auth/popup-closed-by-user') {
          console.warn('⚠️ [MÓVIL] Error en redirect de Google:', error.message);
          // Solo navegar a login si es un error real
          if (error.code && !error.code.includes('no-auth') && mounted) {
            navigate('/login', { replace: true, state: { error: 'Error al iniciar sesión con Google' } });
          }
        }
      }
    };

    // En móvil, verificar inmediatamente y también después de un delay
    // Esto asegura que se capture el redirect incluso si hay problemas de timing
    if (!hasCheckedRedirect) {
      handleRedirectResult();
      setHasCheckedRedirect(true);
    }
    
    // También verificar después de un delay por si acaso
    timeoutId = setTimeout(() => {
      if (mounted && !isProcessing) {
        handleRedirectResult();
      }
    }, 1500);

    // También escuchar cambios en la ubicación (útil cuando vuelve del redirect)
    const handleLocationChange = () => {
      if (mounted && !isProcessing && !hasCheckedRedirect) {
        setTimeout(() => {
          handleRedirectResult();
        }, 300);
      }
    };

    // Verificar cuando cambia la ruta (útil después de redirect)
    handleLocationChange();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [setUser, navigate, isProcessing, hasCheckedRedirect, location.pathname]);

  // Listener adicional para auth state changes en móvil (backup)
  const lastAuthStateRef = useRef<string>('');
  const authStateChangeCountRef = useRef<number>(0);
  
  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;
      
      // Crear un hash del estado actual para comparar
      const currentState = `${firebaseUser?.uid || 'none'}-${user?.id || 'none'}-${location.pathname}`;
      
      // Solo loggear si el estado realmente cambió
      const shouldLog = lastAuthStateRef.current !== currentState;
      lastAuthStateRef.current = currentState;
      
      if (shouldLog && import.meta.env.DEV) {
        authStateChangeCountRef.current++;
        // Solo loggear los primeros cambios o cambios significativos
        if (authStateChangeCountRef.current <= 5 || firebaseUser?.uid !== user?.id) {
          console.log('🔍 [MÓVIL BACKUP] Auth state changed:', { 
            hasFirebaseUser: !!firebaseUser, 
            firebaseUserId: firebaseUser?.uid,
            hasStoreUser: !!user,
            storeUserId: user?.id,
            pathname: location.pathname,
            isProcessing 
          });
        }
      }
      
      // Si hay un usuario autenticado pero no está en el store, y estamos en login
      // podría ser que venga de un redirect que no se procesó
      if (firebaseUser && !user && location.pathname === '/login') {
        // Log eliminado para reducir ruido en consola
        
        // Intentar procesar el redirect result
        try {
          let result;
          try {
            result = await getRedirectResult(auth);
          } catch (redirectError: any) {
            // Manejar error específico de missing initial state
            if (redirectError.message?.includes('missing initial state') || 
                redirectError.message?.includes('sessionStorage') ||
                redirectError.message?.includes('storage-partitioned')) {
              console.warn('⚠️ [MÓVIL BACKUP] Error de sessionStorage al procesar redirect');
              toast.error('Problema con el navegador. Por favor, intentá iniciar sesión nuevamente.', 5000);
              
              // Limpiar estado
              try {
                await auth.signOut();
              } catch (e) {
                // Ignorar
              }
              
              if (mounted) {
                navigate('/login', { replace: true, state: { 
                  error: 'Problema con el navegador. Por favor, intentá iniciar sesión nuevamente usando el botón de Google.' 
                } });
              }
              return;
            }
            throw redirectError;
          }
          
          if (result && result.user && !isProcessing) {
            // Log eliminado para reducir ruido en consola
            setIsProcessing(true);
            toast.info('Procesando tu cuenta...', 2000);
            
            try {
              const { fullUser, needsCompleteProfile } = await processGoogleAuthResult(result.user);
              setUser(fullUser);
              toast.success('¡Inicio de sesión exitoso!', 2000);
              
              if (needsCompleteProfile) {
                navigate('/completar-perfil', { replace: true });
              } else if (fullUser.isAdmin) {
                navigate('/admin', { replace: true });
              } else {
                navigate('/', { replace: true });
              }
            } catch (err: any) {
              console.error('❌ [MÓVIL BACKUP] Error procesando:', err);
              toast.error('Error al procesar tu cuenta', 5000);
            } finally {
              setIsProcessing(false);
            }
          } else if (firebaseUser && !isProcessing) {
            // Si no hay redirect result pero hay usuario autenticado, verificar si ya está procesado
            // Esto puede pasar cuando el redirect se perdió pero el usuario está autenticado
            const currentUser = useStore.getState().user;
            
            // Si el usuario ya está en el store, no procesar de nuevo
            if (currentUser && currentUser.id === firebaseUser.uid) {
              // Log eliminado para reducir ruido en consola
              return;
            }
            
            // Log eliminado para reducir ruido en consola
            
            // Esperar un momento para asegurar que no hay otro proceso en curso
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Verificar nuevamente si ya se procesó (doble verificación)
            const currentUserAfterDelay = useStore.getState().user;
            if (currentUserAfterDelay && currentUserAfterDelay.id === firebaseUser.uid) {
              // Log eliminado para reducir ruido en consola
              return;
            }
            
            setIsProcessing(true);
            toast.info('Procesando tu cuenta...', 2000);
            
            try {
              const { fullUser, needsCompleteProfile } = await processGoogleAuthResult(firebaseUser);
              
              if (!mounted) return;
              
              // Verificar una vez más antes de actualizar
              const finalCheck = useStore.getState().user;
              if (finalCheck && finalCheck.id === firebaseUser.uid) {
                // Log eliminado para reducir ruido en consola
                setIsProcessing(false);
                return;
              }
              
              // Log eliminado para reducir ruido en consola
              
              setUser(fullUser);
              toast.success('¡Inicio de sesión exitoso!', 2000);
              
              // Esperar un momento para asegurar que el estado se actualiza
              await new Promise(resolve => setTimeout(resolve, 300));
              
              if (!mounted) return;
              
              if (needsCompleteProfile) {
                navigate('/completar-perfil', { replace: true });
              } else if (fullUser.isAdmin) {
                navigate('/admin', { replace: true });
              } else {
                navigate('/', { replace: true });
              }
            } catch (err: any) {
              console.error('❌ [MÓVIL BACKUP] Error procesando usuario:', err);
              toast.error('Error al procesar tu cuenta', 5000);
            } finally {
              if (mounted) {
                setIsProcessing(false);
              }
            }
          }
        } catch (err) {
          // Ignorar errores de no-auth-event
          if (err.code !== 'auth/no-auth-event') {
            console.warn('⚠️ [MÓVIL BACKUP] Error:', err);
          }
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user, location.pathname, isProcessing, setUser, navigate]);

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
import ChatWidget from './components/ChatWidget';

function App() {
  useSyncFirebase();
  const { user, loadUserNotifications, theme, loadBots } = useStore();
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
          
          // Actualizar favicon si existe en la configuración
          // Nota: No intentamos generar favicons desde Firebase Storage por problemas de CORS
          // Los favicons se generan automáticamente cuando se sube un logo nuevo
          if (config.siteSettings?.logoConfig?.faviconUrl) {
            // Si ya hay un favicon guardado (data URL), usarlo
            if (config.siteSettings.logoConfig.faviconUrl.startsWith('data:')) {
              updateFavicon(config.siteSettings.logoConfig.faviconUrl);
            }
          }
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
      // Verificar si se acaba de hacer un reset del sistema
      const resetTimestamp = localStorage.getItem('_systemResetTimestamp');
      const resetTime = resetTimestamp ? parseInt(resetTimestamp, 10) : 0;
      const timeSinceReset = Date.now() - resetTime;
      const wasRecentReset = resetTime > 0 && timeSinceReset < 10000; // Menos de 10 segundos desde el reset
      
      // Si fue un reset reciente, esperar más tiempo y limpiar el flag
      const delay = wasRecentReset ? 5000 : 1000; // 5 segundos después de reset, 1 segundo normal
      
      const timer = setTimeout(() => {
        // Limpiar el flag de reset si existe
        if (wasRecentReset) {
          localStorage.removeItem('_systemResetTimestamp');
          console.log('🧹 Flag de reset limpiado, cargando notificaciones después del reset...');
        } else {
          console.log('🔄 Cargando notificaciones al iniciar app para usuario:', user.username);
        }
        loadUserNotifications();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [user?.id]); // Ejecutar solo cuando el usuario cambie

  // Limpiar cache de geolocalización expirado al iniciar
  useEffect(() => {
    cleanExpiredCache();
  }, []);

  // Ref para evitar limpiezas duplicadas para el mismo usuario
  const lastCleanupUserIdRef = useRef<string | undefined>(undefined);

  // Limpiar datos específicos del usuario cuando cambia el usuario
  // NOTA: main.tsx ejecuta una limpieza general al inicio, esta es específica por usuario
  useEffect(() => {
    if (user?.id && lastCleanupUserIdRef.current !== user.id) {
      lastCleanupUserIdRef.current = user.id;
      console.log(`🧹 Limpiando datos obsoletos de localStorage para usuario: ${user.id}`);
      initializeLocalStorageCleanup(user.id);
    }
  }, [user?.id]); // Ejecutar cuando cambie el usuario

  // Cargar bots automáticamente al iniciar la app (sin importar si hay usuario logueado)
  useEffect(() => {
    if (loadBots) {
      // Log eliminado - funcionalidad oculta del admin
      loadBots();
    }
  }, [loadBots]);

  // Configurar viewport para móviles
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      preventZoomOnInput();
      return () => restoreViewport();
    }
  }, []);
  
  return (
    <Router 
      basename={import.meta.env.BASE_URL}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="app">
        <RedirectHandler />
        <Hreflang />
        <Navbar />
        <AuctionManager />
        <OrderManager />
        <DataCleanupManager />
        {/* BotManager - Ejecuta bots automáticamente (funciona sin usuario logueado) */}
        <BotManager />
        <ScrollToTop />
        <ToastContainer />
        <ChatWidget />
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
                  {window.innerWidth <= 768 ? <RegistroMobile /> : <Registro />}
                </Suspense>
              } 
            />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/mis-favoritos" element={<MisFavoritos />} />
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
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={
              <Suspense fallback={<LoadingSpinner size="md" text="Cargando artículo..." />}>
                <BlogArticle />
              </Suspense>
            } />
            <Route path="/como-funciona" element={
              <Suspense fallback={<LoadingSpinner size="md" text="Cargando..." />}>
                <ComoFunciona />
              </Suspense>
            } />
            <Route path="/categoria/:categoriaId" element={<CategoriaPage />} />
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
            {/* Ruta catch-all para 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
