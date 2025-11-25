import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, HelpCircle, Mail, Minimize2, Maximize2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { 
  getUserConversations, 
  saveMessage, 
  createMessage,
  watchConversationStatus,
  startConversation,
  markMessagesAsRead
} from '../utils/messages';
import { Message } from '../types';
import { formatTimeAgo } from '../utils/helpers';
import './ChatWidget.css';

interface ChatWidgetProps {
  onContactClick?: () => void;
  onHelpCenterClick?: () => void;
}

const ChatWidget = ({ onContactClick, onHelpCenterClick }: ChatWidgetProps) => {
  const { user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'open' | 'closed' | null>(null);
  const [conversationExists, setConversationExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversationId = user ? `admin_${user.id}` : null;

  // Cargar mensajes y estado de conversación
  useEffect(() => {
    if (!user || !conversationId) return;

    setLoading(true);
    
    // Cargar mensajes
    const unsubscribeMessages = getUserConversations(user.id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    // Escuchar estado de conversación
    const unsubscribeStatus = watchConversationStatus(conversationId, (status, exists) => {
      setConversationStatus(status);
      setConversationExists(exists);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [user, conversationId]);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Marcar mensajes como leídos cuando se abre el widget
  useEffect(() => {
    if (isOpen && !isMinimized && user && conversationId) {
      // Marcar todos los mensajes no leídos como leídos cuando se abre el chat
      markMessagesAsRead(conversationId, user.id);
    }
  }, [isOpen, isMinimized, user, conversationId]);

  // NO iniciar conversación automáticamente - solo el admin puede iniciarla
  // El usuario solo puede responder si la conversación ya existe y está abierta

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Los administradores no pueden enviar mensajes a través de este widget
    if (user?.isAdmin) {
      alert('⚠️ Los administradores no pueden enviar mensajes a través de este widget. Usá el panel de administración para gestionar conversaciones.');
      return;
    }
    
    if (!user || !conversationId || !newMessage.trim() || sending || !conversationExists || conversationStatus !== 'open') {
      if (!conversationExists) {
        alert('⚠️ No podés enviar mensajes hasta que el administrador inicie la conversación.');
      }
      return;
    }

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const message = createMessage(
        user.id,
        user.username,
        'admin',
        messageText
      );
      
      await saveMessage(message);
      
      // NO iniciar conversación - solo el admin puede hacerlo
      // Si la conversación está cerrada, el usuario no puede enviar mensajes
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar el mensaje. Intentá nuevamente.');
      setNewMessage(messageText); // Restaurar mensaje
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const unreadCount = messages.filter(m => m.toUserId === user?.id && !m.read).length;

  if (!user || isHidden) return null;

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <div className="chat-widget-button-wrapper">
          <button
            className={`chat-widget-button ${unreadCount > 0 ? 'has-messages' : ''}`}
            onClick={() => setIsOpen(true)}
            aria-label="Abrir chat"
          >
            <MessageSquare size={24} />
            {unreadCount > 0 && (
              <span className="chat-widget-badge">{unreadCount}</span>
            )}
          </button>
          <button
            className="chat-widget-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsHidden(true);
            }}
            aria-label="Cerrar chat widget"
            title="Cerrar"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Widget de chat */}
      {isOpen && (
        <div className={`chat-widget-container ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <MessageSquare size={20} />
              <div>
                <div className="chat-widget-title">Soporte</div>
                <div className="chat-widget-status">
                  {!conversationExists ? (
                    <span className="status-waiting">● Esperando inicio de conversación</span>
                  ) : conversationStatus === 'open' ? (
                    <span className="status-open">● En línea</span>
                  ) : (
                    <span className="status-closed">● Conversación cerrada</span>
                  )}
                </div>
              </div>
            </div>
            <div className="chat-widget-header-actions">
              <button
                className="chat-widget-icon-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
              <button
                className="chat-widget-icon-btn chat-widget-close-header-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                aria-label="Cerrar chat"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Botones de acción rápida */}
              <div className="chat-widget-actions" style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <button
                  className="chat-widget-action-btn"
                  onClick={() => {
                    setIsOpen(false);
                    if (onContactClick) {
                      onContactClick();
                    } else {
                      window.location.href = '/contacto';
                    }
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <Mail size={16} />
                  Contacto
                </button>
                <button
                  className="chat-widget-action-btn"
                  onClick={() => {
                    setIsOpen(false);
                    if (onHelpCenterClick) {
                      onHelpCenterClick();
                    } else {
                      window.location.href = '/ayuda';
                    }
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <HelpCircle size={16} />
                  Centro de Ayuda
                </button>
              </div>

              {/* Mensajes */}
              <div className="chat-widget-messages">
                {loading && messages.length === 0 ? (
                  <div className="chat-widget-loading">Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-widget-empty">
                    <MessageSquare size={48} />
                    <p>No hay mensajes aún</p>
                    <p className="chat-widget-empty-hint">Escribí un mensaje para iniciar la conversación</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromUser = msg.fromUserId === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`chat-widget-message ${isFromUser ? 'from-user' : 'from-admin'}`}
                      >
                        <div className="chat-widget-message-content">
                          {!isFromUser && (
                            <div className="chat-widget-message-sender">
                              {msg.fromUsername}
                            </div>
                          )}
                          <div className="chat-widget-message-text">{msg.content}</div>
                          <div className="chat-widget-message-time">
                            {formatTimeAgo(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensaje */}
              {user?.isAdmin ? (
                <div className="chat-widget-closed-notice">
                  <p>⚠️ Los administradores no pueden enviar mensajes a través de este widget. Usá el panel de administración para gestionar conversaciones.</p>
                </div>
              ) : conversationExists && conversationStatus === 'open' ? (
                <form className="chat-widget-input-container" onSubmit={handleSendMessage}>
                  <textarea
                    ref={inputRef}
                    className="chat-widget-input"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Respondé al administrador..."
                    rows={1}
                    disabled={sending || !conversationExists || conversationStatus !== 'open'}
                  />
                  <button
                    type="submit"
                    className="chat-widget-send-btn"
                    disabled={!newMessage.trim() || sending || !conversationExists || conversationStatus !== 'open'}
                    aria-label="Enviar mensaje"
                  >
                    <Send size={18} />
                  </button>
                </form>
              ) : !conversationExists ? (
                <div className="chat-widget-closed-notice">
                  <p>💬 Esperando que el administrador inicie la conversación. Solo el administrador puede iniciar conversaciones. Podés usar el botón de <strong>Contacto</strong> para solicitar ayuda.</p>
                </div>
              ) : (
                <div className="chat-widget-closed-notice">
                  <p>⚠️ Esta conversación está cerrada. Solo podés leer los mensajes anteriores. El administrador puede reabrir la conversación cuando sea necesario.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;

