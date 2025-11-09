import { useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useStore } from '../store/useStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { createGoogleProvider, isMobileDevice, processGoogleAuthResult } from '../utils/googleAuthHelper';
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
        const result = await getRedirectResult(auth);
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      const provider = createGoogleProvider();
      const isMobile = isMobileDevice();
      
      // En móvil, usar redirect directamente (más rápido y confiable)
      if (isMobile) {
        setStatusMessage('Redirigiendo a Google...');
        toast.info('Redirigiendo a Google para iniciar sesión', 3000);
        await signInWithRedirect(auth, provider);
        // El redirect result se manejará en App.tsx o en el useEffect de arriba
        return;
      }

      // En desktop, usar popup
      try {
        const result = await signInWithPopup(auth, provider);
        const { fullUser, needsCompleteProfile } = await processGoogleAuthResult(result.user);
        
        setUser(fullUser);

        // Redirigir según si necesita completar perfil
        if (needsCompleteProfile) {
          navigate('/completar-perfil', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (popupError: any) {
        // Si popup falla, intentar con redirect como fallback
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (error: any) {
      console.error('Error con Google Sign-In:', error);
      
      // Mensajes de error más específicos
      let errorMessage = 'Error al iniciar sesión con Google. Intentá nuevamente.';
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Verificá tu internet e intentá nuevamente.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'El popup fue bloqueado. Por favor, permití popups para este sitio.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Solo se puede abrir un popup a la vez. Intentá nuevamente.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage, 5000);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

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

export default GoogleSignIn;
