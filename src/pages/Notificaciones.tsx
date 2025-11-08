import React from 'react';
import { Bell, CheckCircle, TrendingUp, ShoppingBag, Clock, CheckCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatTimeAgo } from '../utils/helpers';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';

const Notificaciones = () => {
  const { user, notifications, markAsRead, markAllAsRead, loadUserNotifications, unreadCount } = useStore();
  const isMobile = useIsMobile();

  // Cargar notificaciones cuando se monta el componente (SIEMPRE antes de cualquier return)
  React.useEffect(() => {
    if (user && loadUserNotifications) {
      loadUserNotifications();
    }
  }, [user?.id]); // Solo dependencia del user.id para evitar llamadas múltiples

  // Si no hay usuario logueado, redirigir al login (DESPUÉS de los hooks)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'auction_won': return <CheckCircle size={20} color="var(--success)" />;
      case 'auction_outbid': return <TrendingUp size={20} color="var(--warning)" />;
      case 'purchase': return <ShoppingBag size={20} color="var(--primary)" />;
      case 'payment_reminder': return <Clock size={20} color="var(--error)" />;
      default: return <Bell size={20} />;
    }
  };

  if (notifications.length === 0) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Bell size={80} color="var(--text-tertiary)" style={{ margin: '0 auto 1.5rem' }} />
          <h2>No tenés notificaciones</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Te notificaremos sobre subastas y compras</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: isMobile ? '1.5rem 0' : '3rem 0' }}>
      <div className="container" style={{ maxWidth: '800px', padding: isMobile ? '0 1rem' : '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '1.5rem' : '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem' }}>
            <Bell size={isMobile ? 28 : 36} style={{ display: 'inline', marginRight: '0.75rem' }} />
            Notificaciones
            {unreadCount > 0 && (
              <span style={{ 
                marginLeft: isMobile ? '0.5rem' : '1rem', 
                background: 'var(--error)', 
                color: 'white', 
                padding: isMobile ? '0.2rem 0.5rem' : '0.25rem 0.75rem', 
                borderRadius: '1rem', 
                fontSize: isMobile ? '0.75rem' : '0.875rem', 
                fontWeight: 600 
              }}>
                {unreadCount} sin leer
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`¿Marcar las ${unreadCount} notificaciones como leídas?`)) {
                  markAllAsRead();
                }
              }}
              className="btn btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.75rem 1.5rem'
              }}
            >
              <CheckCheck size={18} />
              Marcar todo como leído
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map((notif, index) => (
            <div 
              key={`${notif.id}-${index}-${notif.createdAt?.getTime() || Date.now()}`} 
              onClick={() => {
                // Solo marcar como leída si NO está leída
                if (!notif.read) {
                  markAsRead(notif.id);
                }
              }}
              style={{ 
                background: notif.read ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', 
                padding: isMobile ? '1rem' : '1.5rem', 
                borderRadius: '1rem',
                borderLeft: notif.read ? 'none' : '4px solid var(--primary)',
                cursor: notif.read ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '0.75rem' : '1rem' }}>
                <div style={{ padding: isMobile ? '0.5rem' : '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.75rem', flexShrink: 0 }}>
                  {getIcon(notif.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', marginBottom: '0.375rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{notif.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word', fontSize: isMobile ? '0.875rem' : '1rem' }}>{notif.message}</p>
                  <span style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: 'var(--text-tertiary)' }}>
                    {formatTimeAgo(notif.createdAt)}
                  </span>
                </div>
                {!notif.read && (
                  <div style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '50%' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notificaciones;
