import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, Package } from 'lucide-react';

interface PaymentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayNow: () => void;
  onPayOnDelivery: () => void;
  productName: string;
  totalAmount: number;
  shippingCost: number;
}

const PaymentOptionsModal = ({
  isOpen,
  onClose,
  onPayNow,
  onPayOnDelivery,
  productName,
  totalAmount,
  shippingCost
}: PaymentOptionsModalProps) => {
  const totalWithShipping = totalAmount + shippingCost;

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99998, // Debajo del AvatarMenu (99999) pero por encima de otros elementos
        padding: '1rem',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.5rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
          Selecciona tu método de pago
        </h2>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Producto: <strong style={{ color: 'var(--text-primary)' }}>{productName}</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Subtotal: <strong style={{ color: 'var(--text-primary)' }}>${totalAmount.toLocaleString('es-AR')}</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Costo de envío: <strong style={{ color: 'var(--text-primary)' }}>${shippingCost.toLocaleString('es-AR')}</strong>
          </div>
          <div style={{ 
            fontSize: '1.125rem', 
            fontWeight: 700, 
            color: 'var(--primary)',
            paddingTop: '0.75rem',
            borderTop: '2px solid var(--border)'
          }}>
            Total: ${totalWithShipping.toLocaleString('es-AR')}
          </div>
        </div>

        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 167, 38, 0.1)', 
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--warning)'
        }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--warning)', fontWeight: 600 }}>
            ⚠️ Importante: El costo de envío se agregará al total final
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPayNow();
            }}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1.125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 0, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.3)';
            }}
          >
            <CreditCard size={24} />
            Pagar Ahora con MercadoPago
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPayOnDelivery();
            }}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '2px solid var(--primary)',
              borderRadius: '0.75rem',
              fontSize: '1.125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-secondary)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Package size={24} />
            Pagar al Recibir
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PaymentOptionsModal;

