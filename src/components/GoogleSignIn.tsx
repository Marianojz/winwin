import { useState, useEffect, useCallback, memo } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useStore } from '../store/useStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { createGoogleProvider, isMobileDevice, isSessionStorageAvailable, processGoogleAuthResult } from '../utils/googleAuthHelper';
import { Loader, AlertCircle } from 'lucide-react';
import { toast } from '../utils/toast';

const GoogleSignIn = () => {
  const { setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Verificar si hay un redirect pendiente al montar el componente
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        let result;
        try {
          result = await getRedirectResult(auth);
        } catch (redirectError: any) {
          // Manejar error específico de missing initial state
          if (redirectError.message?.includes('missing initial state') || 
              redirectError.message?.includes('sessionStorage') ||
              redirectError.message?.includes('storage-partitioned')) {
            console.warn('⚠️ Error de sessionStorage al procesar redirect en GoogleSignIn');
            setError('Problema con el navegador. El sistema usará un método alternativo. Por favor, intentá iniciar sesión nuevamente.');
            toast.error('Problema detectado. El sistema usará método alternativo automáticamente.', 5000);
            
            // Limpiar estado
            try {
              await auth.signOut();
            } catch (e) {
              // Ignorar
            }
            return;
          }
          throw redirectError;
        }
        
        if (result && result.user) {
          setStatusMessage('Procesando tu cuenta...');
          setLoading(true);
          
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
            console.error('Error procesando redirect:', err);
            setError('Error al procesar tu cuenta. Por favor, intentá nuevamente.');
            toast.error('Error al iniciar sesión', 5000);
            setLoading(false);
          }
        }
      } catch (err: any) {
        // Ignorar errores de no-auth-event
        if (err.code !== 'auth/no-auth-event') {
          console.warn('Error verificando redirect:', err);
        }
      }
    };

    // Solo verificar si estamos en la página de login
    if (location.pathname === '/login') {
      checkRedirect();
    }
  }, [location.pathname, setUser, navigate]);

  const handleGoogleSignIn = useCallback(async () => {
    // Prevenir múltiples intentos simultáneos
    if (loading) {
      if (import.meta.env.DEV) {
        console.log('⚠️ [GOOGLE SIGN-IN] Ya hay un intento en proceso, ignorando...');
      }
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log('🖱️ [GOOGLE SIGN-IN] Botón clickeado, iniciando proceso...');
    }
    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      const provider = createGoogleProvider();
      const isMobile = isMobileDevice();
      
      if (import.meta.env.DEV) {
        console.log('🔐 [GOOGLE SIGN-IN] Iniciando proceso...', { 
          isMobile,
          authDomain: auth.app.options.authDomain,
          currentUser: auth.currentUser?.uid
        });
      }
      
      // En móvil, usar popup directamente (más confiable que redirect)
      // Redirect se pierde en muchos navegadores móviles
      if (isMobile) {
        if (import.meta.env.DEV) {
          console.log('📱 [GOOGLE SIGN-IN] Móvil detectado, usando popup directamente');
        }
        setStatusMessage('Abriendo ventana de Google...');
        toast.info('Abriendo ventana de Google', 3000);
        // Continuar con popup (no usar redirect en móvil)
      } else {
        if (import.meta.env.DEV) {
          console.log('💻 [GOOGLE SIGN-IN] Desktop detectado, usando popup');
        }
      }

      // En desktop o si redirect falló, usar popup
      if (import.meta.env.DEV) {
        console.log('🪟 [GOOGLE SIGN-IN] Intentando con popup...');
      }
      try {
        const result = await signInWithPopup(auth, provider);
        if (import.meta.env.DEV) {
          console.log('✅ [GOOGLE SIGN-IN] Popup exitoso, procesando usuario...', result.user.uid);
        }
        
        const { fullUser, needsCompleteProfile } = await processGoogleAuthResult(result.user);
        
        if (import.meta.env.DEV) {
          console.log('👤 [GOOGLE SIGN-IN] Usuario procesado:', {
            id: fullUser.id,
            email: fullUser.email,
            isAdmin: fullUser.isAdmin,
            needsCompleteProfile
          });
        }
        
        setUser(fullUser);
        toast.success('¡Inicio de sesión exitoso!', 2000);

        // Redirigir según si necesita completar perfil
        if (needsCompleteProfile) {
          if (import.meta.env.DEV) {
            console.log('📝 [GOOGLE SIGN-IN] Redirigiendo a completar perfil...');
          }
          navigate('/completar-perfil', { replace: true });
        } else if (fullUser.isAdmin) {
          if (import.meta.env.DEV) {
            console.log('👑 [GOOGLE SIGN-IN] Redirigiendo a admin...');
          }
          navigate('/admin', { replace: true });
        } else {
          if (import.meta.env.DEV) {
            console.log('🏠 [GOOGLE SIGN-IN] Redirigiendo a home...');
          }
          navigate('/', { replace: true });
        }
      } catch (popupError: any) {
        // Si popup falla, intentar con redirect como último recurso
        const isPopupBlocked = popupError.code === 'auth/popup-blocked' || 
                              popupError.code === 'auth/popup-closed-by-user' ||
                              popupError.message?.includes('Cross-Origin-Opener-Policy') ||
                              popupError.message?.includes('window.closed');
        
        // Solo intentar redirect si el popup fue bloqueado y sessionStorage está disponible
        if (isPopupBlocked && isSessionStorageAvailable()) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ [GOOGLE SIGN-IN] Popup bloqueado, intentando redirect como último recurso...');
          }
          setStatusMessage('Redirigiendo a Google...');
          toast.info('Redirigiendo a Google', 3000);
          try {
            await signInWithRedirect(auth, provider);
            return;
          } catch (redirectError: any) {
            // Si redirect también falla, lanzar el error original
            if (import.meta.env.DEV) {
              console.error('❌ [GOOGLE SIGN-IN] Redirect también falló:', redirectError);
            }
            throw popupError;
          }
        }
        throw popupError;
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error con Google Sign-In:', error);
      }
      
      // Manejar error específico de sessionStorage/missing initial state
      if (error.message?.includes('missing initial state') || 
          error.message?.includes('sessionStorage') ||
          error.message?.includes('storage-partitioned')) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Error de sessionStorage detectado, intentando con popup...');
        }
        setStatusMessage('Intentando método alternativo...');
        toast.warning('Problema con almacenamiento, usando método alternativo', 3000);
        
        // Intentar con popup como último recurso
        try {
          const provider = createGoogleProvider();
          const result = await signInWithPopup(auth, provider);
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
          return; // Salir exitosamente
        } catch (popupError: any) {
          // Si popup también falla, mostrar error
          if (import.meta.env.DEV) {
            console.error('Popup también falló:', popupError);
          }
          error = popupError; // Continuar con el manejo de error normal
        }
      }
      
      // Mensajes de error más específicos
      let errorMessage = 'Error al iniciar sesión con Google. Intentá nuevamente.';
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Verificá tu internet e intentá nuevamente.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'El popup fue bloqueado. Por favor, permití popups para este sitio.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Solo se puede abrir un popup a la vez. Intentá nuevamente.';
      } else if (error.message?.includes('missing initial state')) {
        errorMessage = 'Problema con el navegador. Intentá cerrar y abrir la pestaña nuevamente.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage, 5000);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  }, [loading, setUser, navigate]);

  return (
    <div style={{ width: '100%' }}>
      {statusMessage && (
        <div style={{
          marginBottom: '0.75rem',
          padding: '0.75rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--primary)',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          textAlign: 'center',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <Loader size={16} className="animate-spin" />
          {statusMessage}
        </div>
      )}
      <button
        onClick={handleGoogleSignIn}
        type="button"
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.875rem',
          background: loading ? 'var(--bg-tertiary)' : 'white',
          color: '#333',
          border: '2px solid var(--border)',
          borderRadius: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.7 : 1
        }}
        onMouseOver={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseOut={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {loading ? (
          <>
            <Loader size={20} className="animate-spin" />
            <span>Conectando con Google...</span>
          </>
        ) : (
          <>
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              style={{ width: '20px', height: '20px' }}
            />
            Continuar con Google
          </>
        )}
      </button>
      {error && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'var(--error)',
          color: 'white',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </div>
  );
};

// Memoizar componente para evitar re-renders innecesarios
export default memo(GoogleSignIn);
