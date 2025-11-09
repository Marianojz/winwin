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

          {/* Título */}
          <h2 className="modal-title">
            Verifica tu email para activar tu cuenta
          </h2>

          {/* Mensaje principal */}
          <p className="modal-message">
            Te enviamos un email de verificación a:
          </p>
          <p className="modal-email">
            <strong>{userEmail}</strong>
          </p>

          {/* Advertencia sobre spam */}
          <div className="modal-warning">
            <AlertCircle size={18} />
            <span>Revisá tu bandeja de entrada y carpeta de spam</span>
          </div>

          {/* Instrucciones */}
          <div className="modal-instructions">
            <p>Para activar tu cuenta:</p>
            <ol>
              <li>Abrí el email que te enviamos</li>
              <li>Hacé clic en el botón <strong>"Confirmar mi cuenta"</strong></li>
              <li>O copiá y pegá el enlace en tu navegador</li>
            </ol>
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
            <p>
              <strong>¿No recibiste el email?</strong>
            </p>
            <ul>
              <li>Verificá que el email sea correcto</li>
              <li>Revisá la carpeta de spam o correo no deseado</li>
              <li>Esperá unos minutos (puede tardar hasta 5 minutos)</li>
              <li>El enlace expira en 24 horas</li>
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

