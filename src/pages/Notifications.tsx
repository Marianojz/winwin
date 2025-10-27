import { useState } from 'react';
import { Bell, Check, Trash2, AlertCircle, Gavel, ShoppingCart, Clock, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const navigate = useNavigate();
  const { user, notifications, markNotificationAsRead, deleteNotification } = useStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={64} color="var(--error)" style={{ marginBottom: '1rem' }} />
          <h2>Acceso Denegado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Debes iniciar sesión para ver tus notificaciones
          </p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  const userNotifications = notifications
    .filter(n => n.userId === user.id)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const filteredNotifications = filter === 'unread' 
    ? userNotifications.filter(n => !n.read)
    : userNotifications;

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'auction_won':
        return <CheckCircle size={24} color="var(--success)" />;
      case 'auction_outbid':
        return <Gavel size={24} color="var(--warning)" />;
      case 'payment_reminder':
        return <Clock size={24} color="var(--error)" />;
      case 'purchase':
        return <ShoppingCart size={24} color="var(--primary)" />;
      default:
        return <Bell size={24} color="var(--primary)" />;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'auction_won':
        return { background: 'var(--success-light)', borderLeft: '4px solid var(--success)' };
      case 'auction_outbid':
        return { background: 'var(--warning-light)', borderLeft: '4px solid var(--warning)' };
      case 'payment_reminder':
        return { background: 'var(--error-light)', borderLeft: '4px solid var(--error)' };
      default:
        return { background: 'var(--bg-secondary)', borderLeft: '4px solid var(--primary)' };
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem 0' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Bell size={32} />
            Notificaciones
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem' }}>
            Mantente al tanto de tus subastas y pedidos
          </p>
        </div>

        {/* Stats y Filtros */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setFilter('all')}
              className="btn"
              style={{
                background: filter === 'all' ? 'var(--primary)' : 'var(--bg-secondary)',
                color: filter === 'all' ? 'white' : 'var(--text-primary)',
                padding: '0.75rem 1.25rem'
              }}
            >
              Todas ({userNotifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className="btn"
              style={{
                background: filter === 'unread' ? 'var(--primary)' : 'var(--bg-secondary)',
                color: filter === 'unread' ? 'white' : 'var(--text-primary)',
                padding: '0.75rem 1.25rem',
                position: 'relative'
              }}
            >
              No leídas ({unreadCount})
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: 'var(--error)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => {
                userNotifications
                  .filter(n => !n.read)
                  .forEach(n => markNotificationAsRead(n.id));
              }}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.25rem' }}
            >
              <Check size={18} />
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Lista de Notificaciones */}
        {filteredNotifications.length === 0 ? (
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '4rem 2rem', 
            borderRadius: '1rem',
            textAlign: 'center'
          }}>
            <Bell size={64} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>
              {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {filter === 'unread' 
                ? '¡Estás al día con todas tus notificaciones!'
                : 'Cuando realices ofertas o compras, verás las notificaciones aquí'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  ...getNotificationStyle(notification.type),
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  position: 'relative',
                  opacity: notification.read ? 0.7 : 1,
                  cursor: notification.link ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  if (!notification.read) {
                    markNotificationAsRead(notification.id);
                  }
                  if (notification.link) {
                    navigate(notification.link);
                  }
                }}
                onMouseEnter={(e) => {
                  if (notification.link) {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0 }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>
                        {notification.title}
                        {!notification.read && (
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            background: 'var(--primary)',
                            borderRadius: '50%',
                            marginLeft: '0.5rem'
                          }} />
                        )}
                      </h4>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                        {formatTimeAgo(notification.createdAt || new Date())}
                      </span>
                    </div>
                    
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {notification.message}
                    </p>

                    {notification.link && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <span style={{ color: 'var(--primary)', fontSize: '0.9375rem', fontWeight: 500 }}>
                          Ver detalles →
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationAsRead(notification.id);
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '0.5rem' }}
                        title="Marcar como leída"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '0.5rem', color: 'var(--error)' }}
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
