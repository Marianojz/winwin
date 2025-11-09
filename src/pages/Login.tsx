import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import GoogleSignIn from '../components/GoogleSignIn';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, syncUserToRealtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';
import { User } from '../types';
import { PASSWORD_INPUT_ATTRIBUTES, EMAIL_INPUT_ATTRIBUTES } from '../utils/passwordManagerOptimization';

// Acceso directo al store para métodos que no están en el hook
const useStoreDirect = useStore;

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validación básica antes de intentar
    if (!email.trim() || !password.trim()) {
      setError('Por favor, completá todos los campos');
      return;
    }

    // Prevenir múltiples submits simultáneos
    if (loading) return;

    setLoading(true);

    try {
      // Limpiar estado previo completamente antes de intentar login
      // Asegurar que el usuario anterior esté completamente deslogueado
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await auth.signOut();
        }
      } catch (signOutErr) {
        // Ignorar errores de signOut si no hay usuario
        console.warn('Error al hacer signOut previo:', signOutErr);
      }

      setUser(null);
      localStorage.removeItem('user');
      
      // Esperar un momento para asegurar que Firebase limpia el estado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Intentar login con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError('Por favor, verificá tu email antes de iniciar sesión. Revisá tu bandeja de entrada.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Esperar un momento para asegurar que Firebase está listo
      await new Promise(resolve => setTimeout(resolve, 300));

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setError('No se encontraron datos del usuario');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      
      // Verificar que el usuario está activo
      if (userData.active === false) {
        setError('Tu cuenta ha sido suspendida. Contactá al administrador.');
        await auth.signOut();
        setLoading(false);
        return;
      }
      
      const fullUser: User = {
        id: user.uid,
        email: user.email!,
        username: userData.username || 'Usuario',
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || user.email?.split('@')[0] || 'U')}&size=200&background=FF6B00&color=fff&bold=true`,
        isAdmin: userData.role === 'admin' || userData.isAdmin === true,
        dni: userData.dni || '',
        phone: userData.phone || '',
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        address: userData.address ? {
          street: userData.address,
          locality: userData.locality,
          province: userData.province,
          location: {
            lat: userData.latitude || 0,
            lng: userData.longitude || 0
          }
        } : undefined
      };

      // Sincronizar isAdmin a Realtime Database para que las reglas funcionen
      await syncUserToRealtimeDb(
        fullUser.id,
        fullUser.isAdmin,
        fullUser.email,
        fullUser.username
      );
      
      // Establecer usuario en múltiples lugares para asegurar sincronización
      setUser(fullUser);
      localStorage.setItem('user', JSON.stringify(fullUser));
      
      // Esperar un momento antes de navegar para asegurar que todo está sincronizado
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Recargar notificaciones si existe el método
      try {
        const { loadUserNotifications } = useStore.getState();
        if (loadUserNotifications) {
          setTimeout(() => {
            loadUserNotifications();
          }, 500);
        }
      } catch (err) {
        console.warn('No se pudo cargar notificaciones:', err);
      }

      // Navegar según rol - con replace para evitar problemas de navegación en móvil
      setTimeout(() => {
        if (fullUser.isAdmin) {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
        // Forzar recarga del estado del usuario después de navegar
        setTimeout(() => {
          const finalUser = useStore.getState().user;
          if (!finalUser || finalUser.id !== fullUser.id) {
            setUser(fullUser);
            localStorage.setItem('user', JSON.stringify(fullUser));
          }
        }, 300);
      }, 100);
    } catch (err: any) {
      console.error('Error en login:', err);
      
      // Limpiar estado en caso de error
      try {
        await auth.signOut();
      } catch (signOutErr) {
        // Ignorar errores de signOut
      }
      setUser(null);
      localStorage.removeItem('user');
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email o contraseña incorrectos');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email o contraseña incorrectos');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intentá más tarde.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de conexión. Verificá tu internet.');
      } else {
        setError('Error al iniciar sesión. Intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1>Iniciar Sesión</h1>
          <p className="auth-subtitle">Bienvenido de vuelta a Clikio</p>

          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}

          <form 
            onSubmit={handleSubmit} 
            className="auth-form"
            id="login-form"
            name="login-form"
            autoComplete="on"
            data-password-manager-friendly="true"
          >
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email username"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                data-lpignore="false"
                data-1p-ignore="false"
                data-bwignore="false"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={18} />
                Contraseña
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ width: '100%', paddingRight: '3rem' }}
                {...PASSWORD_INPUT_ATTRIBUTES.currentPassword}
              />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    opacity: loading ? 0.5 : 1
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              <LogIn size={20} />
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              margin: '1.5rem 0',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <span style={{ fontSize: '0.875rem' }}>O continuar con</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>

            <GoogleSignIn />
          </form>

          <div className="auth-footer">
            <p>¿No tenés cuenta? <Link to="/registro">Registrate aquí</Link></p>
          </div>

          <div className="demo-info">
            <p><strong>Nota:</strong> Ahora el sistema usa Firebase Authentication.</p>
            <p>Debes registrarte y verificar tu email para poder acceder.</p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
        }

        .auth-container {
          width: 100%;
          max-width: 480px;
        }

        .auth-card {
          background: var(--bg-primary);
          border-radius: 1.5rem;
          padding: 3rem;
          box-shadow: 0 20px 60px var(--shadow-lg);
        }

        .auth-card h1 {
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .auth-subtitle {
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }

        .alert-error {
          background: var(--error);
          color: white;
          padding: 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-group input {
          padding: 0.875rem 1.25rem;
          border-radius: 0.75rem;
          font-size: 1rem;
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-block {
          width: 100%;
          margin-top: 0.5rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: 2rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .auth-footer a {
          color: var(--primary);
          font-weight: 600;
        }

        .demo-info {
          margin-top: 2rem;
          padding: 1rem;
          background: var(--bg-tertiary);
          border-radius: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .demo-info p {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
};

export default Login;
