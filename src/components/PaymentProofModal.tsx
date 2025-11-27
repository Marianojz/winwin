import { useState } from 'react';
import { X, Upload, Copy, CheckCircle2, Building2, User, CreditCard, FileText, XCircle } from 'lucide-react';
import { Order } from '../types';
import { BankAccount } from '../utils/bankAccounts';
import { formatCurrency } from '../utils/helpers';
import { uploadImage } from '../utils/imageUpload';
import { createPaymentForOrder } from '../utils/payments';
import { cancelOrder, canCancelOrder } from '../utils/orderCancellation';
import { useStore } from '../store/useStore';

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  bankAccount: BankAccount;
  onSuccess?: () => void;
}

const PaymentProofModal = ({ isOpen, onClose, order, bankAccount, onSuccess }: PaymentProofModalProps) => {
  const { user } = useStore();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > 5 * 1024 * 1024) {
      setError('El comprobante debe pesar menos de 5MB.');
      return;
    }

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato no válido. Usá JPG, PNG o WEBP.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Subir imagen a Firebase Storage
      const proofUrl = await uploadImage(file, `paymentProofs/${order.id}`);

      // Crear registro de pago con aprobación automática
      await createPaymentForOrder(order, proofUrl, {
        autoApprove: true
      });

      setUploaded(true);
      
      // Llamar callback de éxito si existe
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error subiendo comprobante:', err);
      setError(err.message || 'No se pudo subir el comprobante. Intentá nuevamente.');
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copiado al portapapeles`);
  };

  const handleSkip = () => {
    if (window.confirm(
      '¿Estás seguro de que querés subir el comprobante después?\n\n' +
      'Podés subirlo desde "Mi Cuenta → Mis pedidos" en cualquier momento.\n\n' +
      'Recordá que tenés 48 horas para completar el pago.'
    )) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploaded) {
          handleSkip();
        }
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderRadius: '1.5rem',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        {!uploaded && (
          <button
            onClick={handleSkip}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={24} />
          </button>
        )}

        {/* Estado de éxito */}
        {uploaded ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={64} color="var(--success)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--success)' }}>
              ¡Comprobante subido exitosamente!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              El pago fue marcado como aprobado automáticamente. Tu pedido está siendo procesado.
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              Cerrando en 2 segundos...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
                Completá tu pago
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Subí el comprobante de transferencia para acelerar la aprobación
              </p>
            </div>

            {/* Resumen de la orden */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FileText size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Resumen del pedido</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Producto:</span>
                  <span style={{ fontWeight: 600 }}>{order.productName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cantidad:</span>
                  <span style={{ fontWeight: 600 }}>{order.quantity} unidad{order.quantity !== 1 ? 'es' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>Total a transferir:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(order.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Datos bancarios */}
            <div
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CreditCard size={20} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Datos para la transferencia</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} />
                  <span style={{ flex: 1 }}>{bankAccount.bankName}</span>
                  <button
                    onClick={() => copyToClipboard(bankAccount.bankName, 'Banco')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'white',
                      fontSize: '0.75rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} />
                  <span style={{ flex: 1 }}>{bankAccount.holderName}</span>
                  <button
                    onClick={() => copyToClipboard(bankAccount.holderName, 'Titular')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'white',
                      fontSize: '0.75rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <CreditCard size={16} />
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 600 }}>
                    {bankAccount.cbu}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankAccount.cbu, 'CBU')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'white',
                      fontSize: '0.75rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
                {bankAccount.alias && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Alias:</span>
                    <span style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600 }}>
                      {bankAccount.alias}
                    </span>
                    <button
                      onClick={() => copyToClipboard(bankAccount.alias!, 'Alias')}
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        borderRadius: '0.375rem',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: 'white',
                        fontSize: '0.75rem',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Upload de comprobante */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="proof-upload"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  border: '2px dashed var(--border)',
                  borderRadius: '1rem',
                  cursor: uploading ? 'wait' : 'pointer',
                  background: uploading ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }
                }}
              >
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                {uploading ? (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          border: '4px solid var(--border)',
                          borderTopColor: 'var(--primary)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          margin: '0 auto'
                        }}
                      />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Subiendo comprobante...
                    </p>
                  </>
                ) : (
                  <>
                    <Upload size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      Subí el comprobante de transferencia
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      JPG, PNG o WEBP (máx. 5MB)
                    </p>
                  </>
                )}
              </label>
              {error && (
                <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  {error}
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Botón de cancelar pedido */}
              {canCancelOrder(order) && (
                <button
                  onClick={async () => {
                    const orderDisplay = order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`;
                    const confirm = window.confirm(
                      `¿Estás seguro de que querés cancelar el pedido ${orderDisplay}?\n\n` +
                        `Producto: ${order.productName}\n` +
                        `Monto: ${formatCurrency(order.amount)}\n\n` +
                        `Si el pedido ya tiene stock reservado, se devolverá al inventario.`
                    );
                    
                    if (!confirm) return;

                    setCancelling(true);
                    try {
                      const result = await cancelOrder(order, {
                        userId: user?.id,
                        userName: user?.username,
                        reason: 'Cancelado por el usuario antes de completar el pago'
                      });

                      if (result.success) {
                        alert('✅ Pedido cancelado correctamente');
                        onClose();
                        // Recargar la página para actualizar el estado
                        window.location.reload();
                      } else {
                        alert(`❌ ${result.message}`);
                        setCancelling(false);
                      }
                    } catch (error: any) {
                      console.error('Error cancelando pedido:', error);
                      alert(`❌ Error al cancelar el pedido: ${error.message || 'Error desconocido'}`);
                      setCancelling(false);
                    }
                  }}
                  disabled={cancelling || uploading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--danger)',
                    borderRadius: '0.75rem',
                    color: 'var(--danger)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: cancelling || uploading ? 'not-allowed' : 'pointer',
                    opacity: cancelling || uploading ? 0.5 : 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!cancelling && !uploading) {
                      e.currentTarget.style.background = 'var(--danger)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!cancelling && !uploading) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--danger)';
                    }
                  }}
                >
                  <XCircle size={16} />
                  {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
                </button>
              )}

              {/* Botón de omitir */}
              <button
                onClick={handleSkip}
                disabled={cancelling || uploading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  cursor: cancelling || uploading ? 'not-allowed' : 'pointer',
                  opacity: cancelling || uploading ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!cancelling && !uploading) {
                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cancelling && !uploading) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                Subir comprobante después
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '1rem' }}>
              Podés subir el comprobante desde "Mi Cuenta → Mis pedidos" en cualquier momento
            </p>
          </>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PaymentProofModal;

