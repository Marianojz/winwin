import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useStore } from '../store/useStore';
import { mockUser, mockAdminUser } from '../utils/mockData';

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simple demo login
    if (email === 'admin@subastaargenta.com') {
      setUser(mockAdminUser);
      localStorage.setItem('user', JSON.stringify(mockAdminUser));
      navigate('/admin');
    } else if (email && password.length >= 6) {
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      navigate('/');
    } else {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1>Iniciar Sesión</h1>
          <p className="auth-subtitle">Bienvenido de vuelta a Subasta Argenta</p>

          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={18} />
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              <LogIn size={20} />
              Iniciar Sesión
            </button>
          </form>

          <div className="auth-footer">
            <p>¿No tenés cuenta? <Link to="/registro">Registrate aquí</Link></p>
          </div>

          <div className="demo-info">
            <p><strong>Demo:</strong> Usá cualquier email y contraseña (mínimo 6 caracteres)</p>
            <p><strong>Admin:</strong> admin@subastaargenta.com</p>
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

        .btn-block {
          width: 100%;
          margin-top: 0.5rem;
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
