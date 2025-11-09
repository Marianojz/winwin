import { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { createGoogleProvider, isMobileDevice, processGoogleAuthResult } from '../utils/googleAuthHelper';
import { Loader } from 'lucide-react';

const GoogleSignIn = () => {
  const { setUser } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = createGoogleProvider();
      const isMobile = isMobileDevice();
      
      // En móvil, usar redirect directamente (más rápido y confiable)
      if (isMobile) {
        await signInWithRedirect(auth, provider);
        // El redirect result se manejará en App.tsx
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
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
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default GoogleSignIn;
