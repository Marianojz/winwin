import { Mail, MapPin, FileText, Award, ShoppingBag, Gavel, LogOut, Send, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { auth } from '../config/firebase';
import { useState, useEffect } from 'react';
import { getUserConversations, getMessages, saveMessage, markMessagesAsRead, getUnreadCount, createMessage } from '../utils/messages';
import { Message } from '../types';
import { formatTimeAgo } from '../utils/helpers';
import { useIsMobile } from '../hooks/useMediaQuery';

const Perfil = () => {
  const { user, auctions } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'messages'>('profile');
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (user) {
      const conversationId = `admin_${user.id}`;
      const messages = getUserConversations(user.id);
      setUserMessages(messages);
      setUnreadCount(getUnreadCount(user.id));
      markMessagesAsRead(conversationId, user.id);
      
      // Actualizar cada 5 segundos
      const interval = setInterval(() => {
        const updated = getUserConversations(user.id);
        setUserMessages(updated);
        setUnreadCount(getUnreadCount(user.id));
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  if (!user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Debes iniciar sesión</div>;
  }

  const myBids = auctions.filter(a => a.bids.some(b => b.userId === user.id));

  // Generar avatar URL (Gravatar con fallback a ui-avatars)
  const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&size=200&background=FF6B00&color=fff&bold=true`;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      const { clearNotifications } = useStore.getState();
      clearNotifications(); // Limpiar notificaciones
      useStore.getState().setUser(null);
      localStorage.removeItem('user');
      // Redirigir al inicio usando navigate
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Limpiar igualmente aunque falle
      useStore.getState().setUser(null);
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: '3rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className="btn"
            style={{
              background: activeTab === 'profile' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: activeTab === 'profile' ? 'white' : 'var(--text-primary)',
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FileText size={18} />
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className="btn"
            style={{
              background: activeTab === 'messages' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: activeTab === 'messages' ? 'white' : 'var(--text-primary)',
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              position: 'relative'
            }}
          >
            <MessageSquare size={18} />
            Mensajes
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--error)',
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                marginLeft: '0.25rem'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'profile' && (
          <>
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <img 
            src={avatarUrl} 
            alt={user.username} 
            style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '4px solid var(--primary)' 
            }} 
          />
          <div style={{ flex: 1 }}>
            <h1 style={{ marginBottom: '0.5rem' }}>{user.username}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={18} />
                <span>{user.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} />
                <span>DNI: {user.dni}</span>
              </div>
              {user.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} />
                  <span>{user.address.street}, {user.address.locality}, {user.address.province}</span>
                </div>
              )}
            </div>
          </div>
          {user.isAdmin && (
            <div style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', borderRadius: '0.75rem', fontWeight: 600 }}>
              <Award size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Administrador
            </div>
          )}
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
          gap: isMobile ? '1rem' : '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
            <Gavel size={32} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{myBids.length}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Subastas Participadas</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
            <ShoppingBag size={32} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>0</div>
            <div style={{ color: 'var(--text-secondary)' }}>Compras Realizadas</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
            <Award size={32} color="var(--warning)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.25rem' }}>0</div>
            <div style={{ color: 'var(--text-secondary)' }}>Subastas Ganadas</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>Mis Ofertas Recientes</h2>
          {myBids.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myBids.map(auction => (
                <div key={auction.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4>{auction.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Mi oferta: ${auction.bids.find(b => b.userId === user.id)?.amount.toLocaleString()}
                    </p>
                  </div>
                  <span className="badge badge-success">Activa</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No has participado en ninguna subasta aún
            </p>
          )}
        </div>

        {/* Sección de Cerrar Sesión */}
        <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1rem', marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>Cerrar Sesión</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Cerrar tu sesión te desconectará de la plataforma de forma segura.
          </p>
          <button 
            onClick={handleLogout}
            className="btn btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
          </>
        )}
      
      {activeTab === 'messages' && (
        <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={28} />
              Mensajes con Administrador
            </h2>
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--error)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                {unreadCount} sin leer
              </span>
            )}
          </div>

          {/* Lista de mensajes */}
          <div style={{ 
            maxHeight: isMobile ? '400px' : '500px', 
            overflowY: 'auto', 
            marginBottom: '2rem',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '0.75rem'
          }}>
            {userMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No hay mensajes aún. Escribí un mensaje para contactar al administrador.</p>
              </div>
            ) : (
              userMessages.map(msg => {
                const isAdmin = msg.fromUserId === 'admin';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isAdmin ? 'flex-start' : 'flex-end',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '0.875rem 1.25rem',
                        borderRadius: '1rem',
                        background: isAdmin ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: isAdmin ? 'white' : 'var(--text-primary)',
                        border: `1px solid ${isAdmin ? 'var(--primary)' : 'var(--border)'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {isAdmin && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', opacity: 0.9 }}>
                          Administrador
                        </div>
                      )}
                      {msg.isAutoGenerated && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem', fontStyle: 'italic' }}>
                          Mensaje automático
                        </div>
                      )}
                      <div style={{ marginBottom: '0.5rem' }}>{msg.content}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'right' }}>
                        {new Date(msg.createdAt).toLocaleString('es-AR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input para enviar mensaje */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newMessageContent.trim() || !user) return;

              const message = createMessage(
                user.id,
                user.username,
                'admin',
                newMessageContent.trim()
              );
              
              saveMessage(message);
              setUserMessages([...userMessages, message]);
              setNewMessageContent('');
              setUnreadCount(getUnreadCount(user.id));
            }}
            style={{ display: 'flex', gap: '0.75rem' }}
          >
            <input
              type="text"
              value={newMessageContent}
              onChange={(e) => setNewMessageContent(e.target.value)}
              placeholder="Escribí un mensaje al administrador..."
              style={{ 
                flex: 1, 
                padding: '0.875rem 1.25rem', 
                borderRadius: '0.75rem', 
                border: '1px solid var(--border)',
                fontSize: '0.9375rem',
                background: 'var(--bg-tertiary)'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              disabled={!newMessageContent.trim()}
            >
              <Send size={18} />
              Enviar
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--info-light)', borderRadius: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            💡 <strong>Tip:</strong> Cuando ganás una subasta o realizás una compra, te enviamos automáticamente un mensaje. Podés responder aquí para coordinar el pago y entrega.
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Perfil;