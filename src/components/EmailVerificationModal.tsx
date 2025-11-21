import { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, RefreshCw, X, Clock } from 'lucide-react';
import { sendEmailVerification, User } from 'firebase/auth';
import './EmailVerificationModal.css';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userEmail: string;
  platformName?: string;
}

const EmailVerificationModal = ({
  isOpen,
  onClose,
  user,
  userEmail,
  platformName = 'Clikio'
}: EmailVerificationModalProps) => {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  // Contador de 60 segundos
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!user || resendCooldown > 0) return;

    setResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: false
      });
      
      setResendSuccess(true);
      setResendCooldown(60); // 60 segundos de cooldown
      
      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error: any) {
      console.error('Error al reenviar email:', error);
      setResendError('Error al reenviar el email. Intentá nuevamente.');
    } finally {
      setResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="email-verification-overlay" onClick={onClose}>
      <div className="email-verification-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="modal-close-btn" 
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <div className="modal-content">
          {/* Icono principal */}
          <div className="modal-icon">
            <Mail size={48} />
          </div>

          {/* Título prominente con bienvenida */}
          <h2 className="modal-title">
            ¡Bienvenido a {platformName}!
          </h2>

          {/* Mensaje de bienvenida */}
          <div className="modal-welcome">
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Tu cuenta ha sido creada exitosamente. Para continuar, necesitamos verificar tu email.
            </p>
          </div>

          {/* Mensaje principal */}
          <p className="modal-message">
            Te enviamos un email de verificación a:
          </p>
          <p className="modal-email">
            <strong>{userEmail}</strong>
          </p>
          
          {/* Mensaje destacado sobre spam */}
          <div className="modal-highlight" style={{ 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '2px solid rgba(255, 193, 7, 0.3)',
            padding: '1rem',
            borderRadius: '0.75rem',
            margin: '1rem 0'
          }}>
            <AlertCircle size={20} style={{ color: 'var(--warning, #ffc107)' }} />
            <div style={{ flex: 1, marginLeft: '0.75rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                ⚠️ Importante: Revisá tu carpeta de spam
              </strong>
              <span style={{ fontSize: '0.9rem' }}>
                El email puede llegar a tu carpeta de correo no deseado o spam. Asegurate de revisarla también.
              </span>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="modal-instructions">
            <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Para activar tu cuenta, seguí estos pasos:</p>
            <ol style={{ textAlign: 'left', paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Abrí el email que te enviamos a <strong>{userEmail}</strong></li>
              <li style={{ marginBottom: '0.5rem' }}>Revisá también tu carpeta de <strong>spam o correo no deseado</strong></li>
              <li style={{ marginBottom: '0.5rem' }}>Hacé clic en el botón <strong>"Verificar email"</strong> o en el enlace de confirmación</li>
              <li style={{ marginBottom: '0.5rem' }}>Una vez verificado, serás redirigido automáticamente y podrás iniciar sesión</li>
            </ol>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>Esperá la confirmación del email antes de intentar iniciar sesión.</strong> Sin la verificación, no podrás acceder a tu cuenta.
            </p>
          </div>

          {/* Botón de reenvío */}
          <div className="resend-section">
            {resendSuccess && (
              <div className="alert alert-success-inline">
                <CheckCircle size={16} />
                <span>Email reenviado exitosamente</span>
              </div>
            )}

            {resendError && (
              <div className="alert alert-error-inline">
                <AlertCircle size={16} />
                <span>{resendError}</span>
              </div>
            )}

            <button
              className="btn-resend"
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || resending || !user}
            >
              {resending ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Reenviando...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock size={18} />
                  Reenviar en {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Reenviar email de verificación
                </>
              )}
            </button>
          </div>

          {/* Información adicional */}
          <div className="modal-info">
            <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
              ¿No recibiste el email?
            </p>
            <ul style={{ textAlign: 'left', paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Verificá que el email <strong>{userEmail}</strong> sea correcto</li>
              <li style={{ marginBottom: '0.5rem' }}><strong>Revisá la carpeta de spam o correo no deseado</strong> (es muy común que llegue ahí)</li>
              <li style={{ marginBottom: '0.5rem' }}>Esperá unos minutos (puede tardar entre 2 a 5 minutos en llegar)</li>
              <li style={{ marginBottom: '0.5rem' }}>El enlace de verificación expira en 24 horas</li>
              <li style={{ marginBottom: '0.5rem' }}>Si pasaron más de 10 minutos, usá el botón de reenvío abajo</li>
            </ul>
          </div>

          {/* Botón de cerrar */}
          <button
            className="btn-close-modal"
            onClick={onClose}
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;

