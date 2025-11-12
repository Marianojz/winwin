import { Mail, MapPin, FileText, Award, ShoppingBag, Gavel, LogOut, Send, MessageSquare, Camera, Settings, LayoutDashboard, TrendingUp, Bell, HelpCircle, Phone, Target, DollarSign, ShoppingCart, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { auth, db } from '../config/firebase';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserConversations, getMessages, saveMessage, markMessagesAsRead, getUnreadCount, createMessage, watchConversationStatus } from '../utils/messages';
import { Message } from '../types';
import { formatTimeAgo, formatCurrency } from '../utils/helpers';
import { useIsMobile } from '../hooks/useMediaQuery';
import { doc, updateDoc } from 'firebase/firestore';
import { getUserAvatarUrl } from '../utils/avatarHelper';
import AvatarGallery from '../components/AvatarGallery';
import DashboardCompact, { DashboardMetric, QuickAction, DashboardCard } from '../components/DashboardCompact';
import AnnouncementWidget from '../components/AnnouncementWidget';

const Perfil = () => {
  const { user, auctions } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'messages' | 'settings'>(
    tabParam === 'messages' ? 'messages' : tabParam === 'settings' ? 'settings' : 'dashboard'
  );
  const navigate = useNavigate();
  
  // Actualizar tab cuando cambia el query param
  useEffect(() => {
    if (tabParam === 'messages') {
      setActiveTab('messages');
    } else if (tabParam === 'settings') {
      setActiveTab('settings');
    } else {
      setActiveTab('dashboard');
    }
  }, [tabParam]);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'open' | 'closed' | null>(null);
  const [conversationExists, setConversationExists] = useState(false);
  const isMobile = useIsMobile();
  
  const conversationId = user ? `admin_${user.id}` : null;
  
  // Resetear error de avatar cuando cambia el usuario
  useEffect(() => {
    setAvatarError(false);
  }, [user?.id, user?.avatar]);
  
  useEffect(() => {
    if (user && activeTab === 'messages' && conversationId) {
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
      
      // Escuchar estado de conversación
      const unsubscribeStatus = watchConversationStatus(conversationId, (status, exists) => {
        setConversationStatus(status);
        setConversationExists(exists);
      });
      
      return () => {
        unsubscribeMessages();
        unsubscribeUnread();
        unsubscribeStatus();
      };
    } else {
      setUserMessages([]);
      setUnreadCount(0);
      setConversationStatus(null);
      setConversationExists(false);
    }
  }, [user, activeTab, conversationId]);
  
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

  // Memoizar cálculos costosos para evitar re-renders innecesarios
  // IMPORTANTE: Estos hooks deben ejecutarse SIEMPRE, antes de cualquier return
  const myBids = useMemo(() => 
    user ? auctions.filter(a => a.bids.some(b => b.userId === user.id)) : [], 
    [auctions, user?.id]
  );
  const wonAuctions = useMemo(() => 
    user ? auctions.filter(a => 
      a.status === 'ended' && 
      a.bids.length > 0 && 
      a.bids[a.bids.length - 1].userId === user.id
    ) : [], 
    [auctions, user?.id]
  );
  const activeBids = useMemo(() => 
    myBids.filter(a => a.status === 'active'), 
    [myBids]
  );

  // Usar función helper unificada para obtener avatar desde Firebase
  const avatarUrl = user ? getUserAvatarUrl(user) : '';

  // Calcular métricas adicionales
  const totalSpent = useMemo(() => {
    return wonAuctions.reduce((total, auction) => {
      const userBid = auction.bids.find(b => b.userId === user?.id);
      return total + (userBid?.amount || 0);
    }, 0);
  }, [wonAuctions, user?.id]);

  const totalBids = useMemo(() => {
    return myBids.reduce((total, auction) => {
      return total + auction.bids.filter(b => b.userId === user?.id).length;
    }, 0);
  }, [myBids, user?.id]);

  const { cart, cartTotal } = useStore();

  // Preparar métricas para el dashboard - memoizar para evitar recálculos
  const dashboardMetrics: DashboardMetric[] = useMemo(() => [
    {
      label: 'Subastas Participadas',
      value: myBids.length,
      icon: <Gavel size={20} />,
      trend: myBids.length > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Ofertas Activas',
      value: activeBids.length,
      icon: <TrendingUp size={20} />,
      trend: activeBids.length > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Subastas Ganadas',
      value: wonAuctions.length,
      icon: <Award size={20} />,
      trend: wonAuctions.length > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Ofertas Totales',
      value: totalBids,
      icon: <Target size={20} />,
      trend: totalBids > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Total Gastado',
      value: formatCurrency(totalSpent),
      icon: <DollarSign size={20} />,
      trend: totalSpent > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Items en Carrito',
      value: cart.length,
      icon: <ShoppingCart size={20} />,
      trend: cart.length > 0 ? 'up' : 'neutral',
      trendValue: cart.length > 0 ? formatCurrency(cartTotal) : undefined
    },
    {
      label: 'Mensajes Sin Leer',
      value: unreadCount,
      icon: <Bell size={20} />,
      trend: unreadCount > 0 ? 'up' : 'neutral',
      trendValue: unreadCount > 0 ? `${unreadCount} nuevo${unreadCount > 1 ? 's' : ''}` : undefined
    },
    {
      label: 'Subastas Finalizadas',
      value: myBids.filter(a => a.status === 'ended').length,
      icon: <Clock size={20} />,
      trend: 'neutral'
    }
  ], [myBids, activeBids.length, wonAuctions, unreadCount, totalSpent, totalBids, cart.length, cartTotal]);

  // Acciones rápidas - memoizar para evitar recreación en cada render
  const quickActions: QuickAction[] = useMemo(() => [
    {
      label: 'Ver Subastas',
      icon: <Gavel size={18} />,
      onClick: () => navigate('/subastas'),
      variant: 'primary'
    },
    {
      label: 'Ir a Tienda',
      icon: <ShoppingBag size={18} />,
      onClick: () => navigate('/tienda'),
      variant: 'primary'
    },
    {
      label: 'Notificaciones',
      icon: <Bell size={18} />,
      onClick: () => navigate('/notificaciones'),
      variant: unreadCount > 0 ? 'warning' : 'secondary'
    },
    {
      label: 'Mensajes',
      icon: <MessageSquare size={18} />,
      onClick: () => {
        setActiveTab('messages');
        setSearchParams({ tab: 'messages' });
      },
      variant: unreadCount > 0 ? 'warning' : 'secondary'
    }
  ], [navigate, unreadCount, setActiveTab, setSearchParams]);

  // Tarjetas del dashboard - memoizar para evitar recreación
  const dashboardCards: DashboardCard[] = useMemo(() => [
    {
      title: 'Resumen de Cuenta',
      content: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Estado:</span>
            <strong style={{ color: 'var(--success)' }}>Activo</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Miembro desde:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }) : 'Reciente'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Email verificado:</span>
            <strong style={{ color: (user as any)?.emailVerified ? 'var(--success)' : 'var(--warning)' }}>
              {(user as any)?.emailVerified ? '✓ Sí' : '✗ No'}
            </strong>
          </div>
        </div>
      )
    },
    {
      title: 'Actividad Reciente',
      content: (
        <div>
          {myBids.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myBids.slice(0, 3).map(auction => (
                <div key={auction.id} style={{ 
                  padding: '0.75rem', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {auction.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ${auction.bids.find(b => b.userId === user?.id)?.amount.toLocaleString() || '0'}
                    </div>
                  </div>
                  <span className={`badge ${auction.status === 'active' ? 'badge-success' : 'badge-secondary'}`} style={{ flexShrink: 0 }}>
                    {auction.status === 'active' ? 'Activa' : 'Finalizada'}
                  </span>
                </div>
              ))}
              {myBids.length > 3 && (
                <div style={{ textAlign: 'center', paddingTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  +{myBids.length - 3} más
                </div>
              )}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', fontSize: '0.9rem' }}>
              No hay actividad reciente
            </p>
          )}
        </div>
      )
    },
    {
      title: 'Recuadro Especial',
      content: (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          borderRadius: '0.75rem',
          color: 'white'
        }}>
          <Award size={48} style={{ marginBottom: '1rem', opacity: 0.9 }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>Espacio Reservado</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
            Este espacio está reservado para contenido especial pendiente de definir.
          </p>
        </div>
      ),
      className: 'special-card'
    }
  ], [myBids, user]);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      const { clearNotifications } = useStore.getState();
      clearNotifications(); // Limpiar notificaciones
      useStore.getState().setUser(null);
      // Redirigir al inicio usando navigate
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Limpiar igualmente aunque falle
      useStore.getState().setUser(null);
      window.location.href = '/';
    }
  }, []);

  const handleAvatarSelect = useCallback(async (avatarUrl: string) => {
    if (!user) return;

    setUpdatingAvatar(true);
    try {
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', user.id), {
        avatar: avatarUrl
      });

      // Actualizar en el store - Firebase es la fuente de verdad
      const { setUser } = useStore.getState();
      setUser({
        ...user,
        avatar: avatarUrl
      });

      setShowAvatarGallery(false);
    } catch (error) {
      console.error('Error al actualizar avatar:', error);
      alert('Error al actualizar el avatar. Intentá nuevamente.');
    } finally {
      setUpdatingAvatar(false);
    }
  }, [user]);

  // Early return DESPUÉS de todos los hooks (regla de hooks de React)
  if (!user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Debes iniciar sesión</div>;
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', padding: isMobile ? '1.5rem 0' : '3rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px', padding: isMobile ? '0 1rem' : undefined }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSearchParams({ tab: 'dashboard' });
            }}
            className="btn"
            style={{
              background: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: activeTab === 'dashboard' ? 'white' : 'var(--text-primary)',
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
            <LayoutDashboard size={18} />
            Mi Perfil
          </button>
          <button
            onClick={() => {
              setActiveTab('messages');
              setSearchParams({ tab: 'messages' });
            }}
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
          <button
            onClick={() => {
              setActiveTab('settings');
              setSearchParams({ tab: 'settings' });
            }}
            className="btn"
            style={{
              background: activeTab === 'settings' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: activeTab === 'settings' ? 'white' : 'var(--text-primary)',
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
            <Settings size={18} />
            Configuración
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div style={{ marginBottom: '2rem' }}>
            {/* Widget de Anuncios */}
            <div style={{ marginBottom: '2rem' }}>
              <AnnouncementWidget />
            </div>

            {/* Información del Perfil */}
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
              <div style={{ position: 'relative', flexShrink: 0 }}>
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
                <button
                  onClick={() => setShowAvatarGallery(true)}
                  className="btn btn-primary"
                  style={{
                    position: 'absolute',
                    bottom: isMobile ? '-4px' : '0',
                    right: isMobile ? '-4px' : '0',
                    width: isMobile ? '32px' : '44px',
                    height: isMobile ? '32px' : '44px',
                    borderRadius: '50%',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isMobile ? '2px solid var(--bg-secondary)' : '3px solid var(--bg-secondary)',
                    background: 'var(--primary)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    }
                  }}
                  onTouchStart={(e) => {
                    if (isMobile) {
                      e.currentTarget.style.transform = 'scale(0.95)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (isMobile) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                  title="Editar foto de perfil"
                  disabled={updatingAvatar}
                >
                  <Camera size={isMobile ? 16 : 22} />
                </button>
              </div>
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

            {/* Dashboard Compact con métricas y acciones */}
            <DashboardCompact
              metrics={dashboardMetrics}
              quickActions={quickActions}
              cards={dashboardCards}
            />

            {/* Ofertas Recientes */}
            <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.25rem' : '2rem', borderRadius: '1rem', marginTop: '2rem' }}>
              <h2 style={{ marginBottom: isMobile ? '1rem' : '1.5rem', fontSize: isMobile ? '1.125rem' : '1.5rem' }}>Mis Ofertas Recientes</h2>
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
            <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.25rem' : '2rem', borderRadius: '1rem', marginTop: isMobile ? '1.5rem' : '2rem' }}>
              <h2 style={{ marginBottom: isMobile ? '0.75rem' : '1rem', fontSize: isMobile ? '1.125rem' : '1.5rem' }}>Cerrar Sesión</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '1rem' : '1.5rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Cerrar tu sesión te desconectará de la plataforma de forma segura.
              </p>
              <button 
                onClick={handleLogout}
                className="btn btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: isMobile ? '100%' : 'auto', padding: isMobile ? '0.875rem 1.25rem' : undefined }}
              >
                <LogOut size={isMobile ? 16 : 18} />
                Cerrar Sesión
              </button>
            </div>
          </div>
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

          {/* Botones de Contacto y Centro de Ayuda */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
            gap: '1rem', 
            marginBottom: '2rem' 
          }}>
            <button
              onClick={() => navigate('/contacto')}
              className="btn btn-primary"
              style={{
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                fontWeight: 600,
                fontSize: isMobile ? '0.875rem' : '1rem',
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                border: 'none',
                borderRadius: '0.75rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              <Phone size={20} />
              Contacto
            </button>
            <button
              onClick={() => navigate('/ayuda')}
              className="btn btn-secondary"
              style={{
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                fontWeight: 600,
                fontSize: isMobile ? '0.875rem' : '1rem',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: '0.75rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
            >
              <HelpCircle size={20} />
              Centro de Ayuda
            </button>
          </div>

          {/* Input para enviar mensaje - Solo si hay mensajes del admin y la conversación está abierta */}
          {(() => {
            // Verificar si hay al menos un mensaje del admin
            const hasAdminMessages = userMessages.some(msg => msg.fromUserId === 'admin');
            const shouldShowForm = conversationExists && conversationStatus === 'open' && hasAdminMessages;
            
            if (shouldShowForm) {
              return (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newMessageContent.trim() || !user || !conversationExists || conversationStatus !== 'open') {
                        return;
                      }

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
                      <textarea
                        value={newMessageContent}
                        onChange={(e) => setNewMessageContent(e.target.value)}
                        placeholder="Respondé al administrador aquí..."
                        rows={isMobile ? 4 : 5}
                        disabled={conversationStatus !== 'open'}
                        style={{ 
                          width: '100%',
                          padding: isMobile ? '1rem 1.25rem' : '1.125rem 1.5rem', 
                          borderRadius: '0.75rem', 
                          border: '2px solid var(--border)',
                          fontSize: isMobile ? '0.9375rem' : '1rem',
                          background: conversationStatus === 'open' ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          resize: 'vertical',
                          minHeight: isMobile ? '120px' : '150px',
                          fontFamily: 'inherit',
                          opacity: conversationStatus === 'open' ? 1 : 0.6,
                          cursor: conversationStatus === 'open' ? 'text' : 'not-allowed',
                          lineHeight: '1.5'
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
                        padding: isMobile ? '1rem 1.25rem' : '1.125rem 1.5rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        height: 'fit-content',
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}
                      disabled={!newMessageContent.trim() || conversationStatus !== 'open'}
                    >
                      <Send size={isMobile ? 16 : 18} />
                      {isMobile ? 'Enviar' : 'Enviar Mensaje'}
                    </button>
                  </form>

                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--info-light)', borderRadius: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    💡 <strong>Tip:</strong> Cuando ganás una subasta o realizás una compra, te enviamos automáticamente un mensaje. Podés responder aquí para coordinar el pago y entrega.
                  </div>
                </>
              );
            }
            
            if (!conversationExists) {
              return (
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 600 }}>
                    💬 Esperando que el administrador inicie la conversación
                  </p>
                  <p style={{ margin: '0.75rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Solo el administrador puede iniciar conversaciones. Podés usar el botón de <strong>Contacto</strong> para solicitar ayuda.
                  </p>
                </div>
              );
            }
            
            if (conversationStatus === 'closed') {
              return (
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    ⚠️ Esta conversación está cerrada. Solo podés leer los mensajes anteriores.
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    El administrador puede reabrir la conversación cuando sea necesario.
                  </p>
                </div>
              );
            }
            
            // Si la conversación existe y está abierta pero no hay mensajes del admin
            if (conversationExists && conversationStatus === 'open' && !hasAdminMessages) {
              return (
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 600 }}>
                    💬 Esperando el primer mensaje del administrador
                  </p>
                  <p style={{ margin: '0.75rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Podrás responder cuando el administrador te envíe un mensaje.
                  </p>
                </div>
              );
            }
            
            return null;
          })()}
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1.5rem' }}>
          <h2 style={{ marginBottom: '2rem', fontSize: isMobile ? '1.25rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={28} />
            Configuración
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Sección de Preferencias */}
            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', color: 'var(--text-primary)' }}>Preferencias</h3>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Aquí podrás configurar tus preferencias de cuenta en el futuro.
                </p>
                <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
                    🚧 Funcionalidad en desarrollo
                  </p>
                </div>
              </div>
            </div>

            {/* Sección de Privacidad */}
            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', color: 'var(--text-primary)' }}>Privacidad</h3>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Configura cómo otros usuarios pueden ver tu información.
                </p>
                <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
                    🚧 Funcionalidad en desarrollo
                  </p>
                </div>
              </div>
            </div>

            {/* Sección de Notificaciones */}
            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', color: 'var(--text-primary)' }}>Notificaciones</h3>
              <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Controla qué notificaciones recibes.
                </p>
                <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
                    🚧 Funcionalidad en desarrollo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Galería de Avatares */}
      {showAvatarGallery && (
        <AvatarGallery
          currentAvatar={user.avatar}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarGallery(false)}
        />
      )}
      </div>
    </div>
  );
};

export default Perfil;