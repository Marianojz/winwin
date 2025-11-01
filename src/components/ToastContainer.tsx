import React, { useEffect, useState } from 'react';
import { toastManager, Toast } from '../utils/toast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: 'var(--success)',
    error: 'var(--error)',
    warning: 'var(--warning)',
    info: 'var(--primary)'
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '400px',
      width: '100%',
      padding: '0 1rem'
    }}>
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className="toast fade-in-up"
            style={{
              background: 'var(--bg-secondary)',
              borderLeft: `4px solid ${colors[toast.type]}`,
              borderRadius: '0.5rem',
              padding: '1rem 1.25rem',
              boxShadow: '0 4px 12px var(--shadow-lg)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <Icon size={20} color={colors[toast.type]} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              {toast.message}
            </div>
            <button
              onClick={() => toastManager.remove(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-secondary)',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
      
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          div[style*="position: fixed"][style*="bottom"] {
            bottom: 5rem !important;
            right: 0.5rem !important;
            left: 0.5rem !important;
            max-width: none !important;
            width: calc(100% - 1rem) !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;

