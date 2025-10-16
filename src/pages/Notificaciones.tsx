import { Bell, CheckCircle, TrendingUp, ShoppingBag, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatTimeAgo } from '../utils/helpers';

const Notificaciones = () => {
  const { notifications, markAsRead } = useStore();

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
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 0' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>
          <Bell size={36} style={{ display: 'inline', marginRight: '0.75rem' }} />
          Notificaciones
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => markAsRead(notif.id)}
              style={{ 
                background: notif.read ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', 
                padding: '1.5rem', 
                borderRadius: '1rem',
                borderLeft: notif.read ? 'none' : '4px solid var(--primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.75rem' }}>
                  {getIcon(notif.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.375rem' }}>{notif.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{notif.message}</p>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
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
