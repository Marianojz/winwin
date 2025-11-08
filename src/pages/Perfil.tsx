import { Mail, MapPin, FileText, Award, ShoppingBag, Gavel, LogOut, Send, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { auth } from '../config/firebase';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getUserConversations, getMessages, saveMessage, markMessagesAsRead, getUnreadCount, createMessage } from '../utils/messages';
import { Message } from '../types';
import { formatTimeAgo } from '../utils/helpers';
import { useIsMobile } from '../hooks/useMediaQuery';

const Perfil = () => {
  const { user, auctions } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'profile' | 'messages'>(
    tabParam === 'messages' ? 'messages' : 'profile'
  );
  
  // Actualizar tab cuando cambia el query param
  useEffect(() => {
    if (tabParam === 'messages') {
      setActiveTab('messages');
    }
  }, [tabParam]);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const isMobile = useIsMobile();
  
  // Resetear error de avatar cuando cambia el usuario
  useEffect(() => {
    setAvatarError(false);
  }, [user?.id, user?.avatar]);
  
  useEffect(() => {
    if (user && activeTab === 'messages') {
      const conversationId = `admin_${user.id}`;
      
      // Escuchar mensajes en tiempo real
      const unsubscribeMessages = getUserConversations(user.id, (messages) => {
        setUserMessages(messages);
        // Marcar como leídos cuando se cargan
        markMessagesAsRead(conversationId, user.id);
        
        // Auto-scroll al final cuando hay nuevos mensajes
        setTimeout(() => {
          const container = document.getElementById('messages-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
      });
      
      // Escuchar contador de no leídos en tiempo real
      const unsubscribeUnread = getUnreadCount(user.id, (count) => {
        setUnreadCount(count);
      });
      
      return () => {
        unsubscribeMessages();
        unsubscribeUnread();
      };
    } else {
      setUserMessages([]);
      setUnreadCount(0);
    }
  }, [user, activeTab]);
  
  // Auto-scroll cuando se envía un mensaje
  useEffect(() => {
    if (userMessages.length > 0) {
      setTimeout(() => {
        const container = document.getElementById('messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }, [userMessages.length]);

  if (!user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Debes iniciar sesión</div>;
  }

  const myBids = auctions.filter(a => a.bids.some(b => b.userId === user.id));

  // Usar avatar del usuario (prioriza avatar de Google guardado en Firebase)
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
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: isMobile ? '1.5rem 0' : '3rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px', padding: isMobile ? '0 1rem' : undefined }}>
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
            <div style={{ 
              background: 'var(--bg-secondary)', 
              padding: isMobile ? '1.5rem' : '2rem', 
              borderRadius: '1.5rem', 
              marginBottom: '2rem', 
              display: 'flex', 
              gap: isMobile ? '1rem' : '2rem', 
              alignItems: isMobile ? 'flex-start' : 'center',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
          {!avatarError && avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={user.username} 
              style={{ 
                width: isMobile ? '80px' : '120px', 
                height: isMobile ? '80px' : '120px', 
                borderRadius: '50%', 
                objectFit: 'cover', 
                border: '4px solid var(--primary)',
                flexShrink: 0
              }}
              onError={() => {
                setAvatarError(true);
              }}
              onLoad={() => {
                setAvatarError(false);
              }}
            />
          ) : (
            <div style={{
              width: isMobile ? '80px' : '120px',
              height: isMobile ? '80px' : '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: isMobile ? '2rem' : '3rem',
              border: '4px solid var(--primary)',
              flexShrink: 0
            }}>
              {(user.username || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ marginBottom: '0.5rem', fontSize: isMobile ? '1.25rem' : '1.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{user.username}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Mail size={18} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                <span style={{ wordBreak: 'break-word' }}>{user.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <FileText size={18} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                <span style={{ wordBreak: 'break-word' }}>DNI: {user.dni}</span>
              </div>
              {user.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <MapPin size={18} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  <span style={{ wordBreak: 'break-word' }}>{user.address.street}, {user.address.locality}, {user.address.province}</span>
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
          <div 
            id="messages-container"
            style={{ 
              maxHeight: isMobile ? '400px' : '500px', 
              overflowY: 'auto', 
              marginBottom: '2rem',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              padding: '1rem',
              background: 'var(--bg-tertiary)',
              borderRadius: '0.75rem',
              scrollBehavior: 'smooth'
            }}
          >
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
                        maxWidth: isMobile ? '85%' : '70%',
                        padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                        borderRadius: '1rem',
                        background: isAdmin ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: isAdmin ? 'white' : 'var(--text-primary)',
                        border: `1px solid ${isAdmin ? 'var(--primary)' : 'var(--border)'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word'
                      }}
                    >
                      {isAdmin && (
                        <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 600, marginBottom: '0.25rem', opacity: 0.9 }}>
                          Administrador
                        </div>
                      )}
                      {msg.isAutoGenerated && (
                        <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', opacity: 0.8, marginBottom: '0.25rem', fontStyle: 'italic' }}>
                          Mensaje automático
                        </div>
                      )}
                      <div style={{ 
                        marginBottom: '0.5rem',
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}>{msg.content}</div>
                      <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', opacity: 0.7, textAlign: 'right' }}>
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
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newMessageContent.trim() || !user) return;

              try {
                const message = createMessage(
                  user.id,
                  user.username,
                  'admin',
                  newMessageContent.trim()
                );
                
                // Guardar mensaje en Firebase (se actualizará automáticamente por el listener)
                await saveMessage(message);
                setNewMessageContent('');
                
                // El mensaje aparecerá automáticamente gracias al listener en tiempo real
                console.log('✅ Mensaje enviado correctamente');
              } catch (error) {
                console.error('❌ Error enviando mensaje:', error);
                alert('❌ Error al enviar el mensaje. Por favor, intentá nuevamente.');
              }
            }}
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Escribí tu mensaje:
              </label>
              <textarea
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                placeholder="Escribí tu mensaje al administrador aquí..."
                rows={isMobile ? 2 : 3}
                style={{ 
                  width: '100%',
                  padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem', 
                  borderRadius: '0.75rem', 
                  border: '2px solid var(--border)',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  resize: 'vertical',
                  minHeight: isMobile ? '60px' : '80px',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {newMessageContent.length > 0 && `${newMessageContent.length} caracteres`}
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ 
                padding: '0.875rem 1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                height: 'fit-content',
                whiteSpace: 'nowrap',
                fontWeight: 600
              }}
              disabled={!newMessageContent.trim()}
            >
              <Send size={18} />
              Enviar Mensaje
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