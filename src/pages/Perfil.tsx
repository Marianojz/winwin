import { Mail, MapPin, FileText, Award, ShoppingBag, Gavel, LogOut, Send, MessageSquare, Camera, Settings, LayoutDashboard, TrendingUp, Bell, HelpCircle, Phone, Target, DollarSign, ShoppingCart, Clock, Package, Truck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Order, Shipment, Ticket } from '../types';
import { auth, db } from '../config/firebase';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserConversations, saveMessage, markMessagesAsRead, getUnreadCount, createMessage, watchConversationStatus } from '../utils/messages';
import { Message } from '../types';
import { formatTimeAgo, formatCurrency } from '../utils/helpers';
import { useIsMobile } from '../hooks/useMediaQuery';
import { doc, updateDoc } from 'firebase/firestore';
import { getUserAvatarUrl } from '../utils/avatarHelper';
import AvatarGallery from '../components/AvatarGallery';
import DashboardCompact, { DashboardMetric, QuickAction, DashboardCard } from '../components/DashboardCompact';
import AnnouncementWidget from '../components/AnnouncementWidget';
import { subscribeUserShipments } from '../utils/shipments';
import { getUserTickets } from '../utils/tickets';
import { submitProductReview } from '../utils/reviews';

const Perfil = () => {
  const { user, auctions, orders, unreadCount: globalUnreadCount } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'messages' | 'settings' | 'orders' | 'shipments'>(
    tabParam === 'messages'
      ? 'messages'
      : tabParam === 'settings'
      ? 'settings'
      : tabParam === 'orders'
      ? 'orders'
      : tabParam === 'shipments'
      ? 'shipments'
      : 'dashboard'
  );
  const navigate = useNavigate();
  
  // Actualizar tab cuando cambia el query param
  useEffect(() => {
    if (tabParam === 'messages') {
      setActiveTab('messages');
    } else if (tabParam === 'settings') {
      setActiveTab('settings');
    } else if (tabParam === 'orders') {
      setActiveTab('orders');
    } else if (tabParam === 'shipments') {
      setActiveTab('shipments');
    } else {
      setActiveTab('dashboard');
    }
  }, [tabParam]);

  // Filtrar pedidos del usuario
  const userOrders = useMemo(() => {
    if (!user || !orders) return [];
    return orders.filter((order: Order) => order.userId === user.id)
      .sort((a: Order, b: Order) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA; // Más recientes primero
      });
  }, [user, orders]);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [conversationUnreadCount, setConversationUnreadCount] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'open' | 'closed' | null>(null);
  const [conversationExists, setConversationExists] = useState(false);
  const isMobile = useIsMobile();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
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
        setConversationUnreadCount(count);
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
      setConversationUnreadCount(0);
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

  // Cargar envíos del usuario
  useEffect(() => {
    if (!user?.id) {
      setShipments([]);
      return;
    }

    const unsubscribe = subscribeUserShipments(user.id, (data) => {
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt as any).getTime();
        const dateB = new Date(b.createdAt as any).getTime();
        return dateB - dateA;
      });
      setShipments(sorted);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Cargar tickets del usuario (para resumen)
  useEffect(() => {
    if (!user?.id) {
      setUserTickets([]);
      return;
    }
    const unsubscribe = getUserTickets(user.id, (tickets) => {
      setUserTickets(tickets);
    });
    return () => unsubscribe();
  }, [user?.id]);

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
      label: 'Notificaciones sin leer',
      value: globalUnreadCount,
      icon: <Bell size={20} />,
      trend: globalUnreadCount > 0 ? 'up' : 'neutral',
      trendValue: globalUnreadCount > 0 ? `${globalUnreadCount} nueva${globalUnreadCount > 1 ? 's' : ''}` : undefined
    },
    {
      label: 'Subastas Finalizadas',
      value: myBids.filter(a => a.status === 'ended').length,
      icon: <Clock size={20} />,
      trend: 'neutral'
    }
  ], [myBids, activeBids.length, wonAuctions, globalUnreadCount, totalSpent, totalBids, cart.length, cartTotal]);

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
      variant: globalUnreadCount > 0 ? 'warning' : 'secondary'
    },
    {
      label: 'Mensajes',
      icon: <MessageSquare size={18} />,
      onClick: () => {
        setActiveTab('messages');
        setSearchParams({ tab: 'messages' });
      },
      variant: conversationUnreadCount > 0 ? 'warning' : 'secondary'
    }
  ], [navigate, globalUnreadCount, conversationUnreadCount, setActiveTab, setSearchParams]);

  // Tarjetas del dashboard - memoizar para evitar recreación
  const dashboardCards: DashboardCard[] = useMemo(() => [
    {
      title: 'Resumen rápido',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
          {/* Pedidos activos */}
          <button
            onClick={() => {
              setActiveTab('orders');
              setSearchParams({ tab: 'orders' });
            }}
            style={{
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              background: 'var(--bg-tertiary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShoppingCart size={14} />
              Pedidos activos
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {orders.filter(o => o.status === 'pending_payment' || o.status === 'processing' || o.status === 'preparing' || o.status === 'in_transit' || o.status === 'shipped').length}
            </span>
          </button>

          {/* Envíos en camino */}
          <button
            onClick={() => {
              setActiveTab('shipments');
              setSearchParams({ tab: 'shipments' });
            }}
            style={{
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              background: 'var(--bg-tertiary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={14} />
              Envíos en camino
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {shipments.filter(s => s.status === 'in_transit' || s.status === 'ready_to_ship' || s.status === 'preparing').length}
            </span>
          </button>

          {/* Tickets abiertos */}
          <button
            onClick={() => navigate('/ayuda')}
            style={{
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              background: 'var(--bg-tertiary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} />
              Tickets abiertos
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {userTickets.filter(t => t.status !== 'resuelto').length}
            </span>
          </button>

          {/* Notificaciones sin leer */}
          <button
            onClick={() => navigate('/notificaciones')}
            style={{
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              background: 'var(--bg-tertiary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={14} />
              Notificaciones sin leer
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {globalUnreadCount}
            </span>
          </button>
        </div>
      )
    },
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

      // Sincronizar con Realtime Database para que esté disponible para todos
      const { syncUserToRealtimeDb } = await import('../config/firebase');
      await syncUserToRealtimeDb(
        user.id,
        user.isAdmin || false,
        user.email,
        user.username,
        avatarUrl
      );

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
            {conversationUnreadCount > 0 && (
              <span style={{
                background: 'var(--error)',
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                marginLeft: '0.25rem'
              }}>
                {conversationUnreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('orders');
              setSearchParams({ tab: 'orders' });
            }}
            className="btn"
            style={{
              background: activeTab === 'orders' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: activeTab === 'orders' ? 'white' : 'var(--text-primary)',
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
            <Package size={18} />
            Mis Pedidos
            {userOrders.length > 0 && (
              <span style={{
                background: 'var(--error)',
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                marginLeft: '0.25rem'
              }}>
                {userOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('shipments');
              setSearchParams({ tab: 'shipments' });
            }}
            className="btn"
            style={{
              background: activeTab === 'shipments' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: activeTab === 'shipments' ? 'white' : 'var(--text-primary)',
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
            <Truck size={18} />
            Mis Envíos
            {shipments.length > 0 && (
              <span style={{
                background: 'var(--info)',
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                marginLeft: '0.25rem'
              }}>
                {shipments.length}
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
            {conversationUnreadCount > 0 && (
              <span style={{
                background: 'var(--error)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                {conversationUnreadCount} sin leer
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

      {activeTab === 'orders' && (
        <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1.5rem' }}>
          <h2 style={{ marginBottom: '2rem', fontSize: isMobile ? '1.25rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={28} />
            Mis Pedidos
          </h2>

          {userOrders.length === 0 ? (
            <div style={{ 
              padding: '3rem', 
              textAlign: 'center', 
              background: 'var(--bg-tertiary)', 
              borderRadius: '1rem',
              border: '1px dashed var(--border)'
            }}>
              <Package size={64} color="var(--text-tertiary)" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No tenés pedidos aún</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Cuando realices una compra o ganes una subasta, aparecerán aquí.
              </p>
              <button
                onClick={() => navigate('/tienda')}
                className="btn btn-primary"
                style={{ padding: '0.875rem 1.5rem' }}
              >
                <ShoppingBag size={18} style={{ marginRight: '0.5rem' }} />
                Ir a la Tienda
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {userOrders.map((order: Order) => {
                const getStatusBadge = (status: string) => {
                  const badges: Record<string, { label: string; className: string }> = {
                    'pending_payment': { label: 'Pago Pendiente', className: 'badge-warning' },
                    'paid': { label: 'Pagado', className: 'badge-success' },
                    'shipped': { label: 'Enviado', className: 'badge-info' },
                    'delivered': { label: 'Entregado', className: 'badge-success' },
                    'cancelled': { label: 'Cancelado', className: 'badge-danger' },
                    'expired': { label: 'Expirado', className: 'badge-secondary' }
                  };
                  return badges[status] || { label: status, className: 'badge-secondary' };
                };

                const statusInfo = getStatusBadge(order.status);
                const orderDate = order.createdAt instanceof Date 
                  ? order.createdAt 
                  : new Date(order.createdAt);

                return (
                  <div
                    key={order.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: isMobile ? '1rem' : '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '1rem'
                    }}
                  >
                    {order.productImage && (
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        style={{
                          width: isMobile ? '100%' : '120px',
                          height: isMobile ? '200px' : '120px',
                          objectFit: 'cover',
                          borderRadius: '0.75rem',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                            {order.productName}
                          </h3>
                          {order.orderNumber && (
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              Pedido #{order.orderNumber}
                            </p>
                          )}
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {orderDate.toLocaleDateString('es-AR', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`badge ${statusInfo.className}`} style={{ flexShrink: 0 }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--border)'
                      }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {order.quantity && order.quantity > 1 ? `${order.quantity} unidades` : '1 unidad'}
                          </p>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {formatCurrency(order.amount)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {order.type === 'auction' && (
                          <span style={{ 
                            padding: '0.375rem 0.75rem', 
                            background: 'var(--primary-light)', 
                            color: 'var(--primary)', 
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}>
                            Subasta
                          </span>
                          )}

                          {/* Botón para reseña si está entregado */}
                          {order.status === 'delivered' && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModalOrder(order);
                                setReviewRating(5);
                                setReviewComment('');
                              }}
                              style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--primary)',
                                background: 'transparent',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Dejar reseña
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal simple para reseñas */}
      {reviewModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Dejar reseña</h3>
            <p style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              {reviewModalOrder.productName}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Calificación
              </label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      background: star <= reviewRating ? 'var(--warning)' : 'var(--bg-tertiary)',
                      color: star <= reviewRating ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700
                    }}
                  >
                    {star}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Comentario (opcional)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                placeholder="Contanos qué te pareció el producto..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingReview) {
                    setReviewModalOrder(null);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={async () => {
                  if (!user || !reviewModalOrder) return;
                  try {
                    setIsSubmittingReview(true);
                    await submitProductReview(
                      reviewModalOrder.id,
                      reviewModalOrder.productId,
                      reviewModalOrder.productName,
                      reviewModalOrder.productImage,
                      user.id,
                      user.username,
                      reviewRating,
                      reviewComment.trim()
                    );
                    alert('✅ Gracias por tu reseña');
                    setReviewModalOrder(null);
                  } catch (error: any) {
                    console.error('Error enviando reseña:', error);
                    alert(
                      error?.message ||
                        '❌ Hubo un error al enviar la reseña. Intentá nuevamente.'
                    );
                  } finally {
                    setIsSubmittingReview(false);
                  }
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: isSubmittingReview ? 0.7 : 1
                }}
              >
                {isSubmittingReview ? 'Enviando...' : 'Enviar reseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shipments' && (
        <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1.5rem' }}>
          <h2 style={{ marginBottom: '2rem', fontSize: isMobile ? '1.25rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={28} />
            Mis Envíos
          </h2>

          {shipments.length === 0 ? (
            <div style={{ 
              padding: '3rem', 
              textAlign: 'center', 
              background: 'var(--bg-tertiary)', 
              borderRadius: '1rem',
              border: '1px dashed var(--border)'
            }}>
              <Truck size={64} color="var(--text-tertiary)" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Aún no tenés envíos</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Cuando tus pedidos sean despachados, vas a poder seguirlos desde acá.
              </p>
              <button
                onClick={() => {
                  setActiveTab('orders');
                  setSearchParams({ tab: 'orders' });
                }}
                className="btn btn-primary"
                style={{ padding: '0.875rem 1.5rem' }}
              >
                <Package size={18} style={{ marginRight: '0.5rem' }} />
                Ver mis pedidos
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {shipments.map((s) => {
                const getStatusBadge = (status: string) => {
                  const map: Record<string, { label: string; className: string }> = {
                    pending: { label: 'Pendiente', className: 'badge-warning' },
                    preparing: { label: 'Preparando', className: 'badge-info' },
                    ready_to_ship: { label: 'Listo para enviar', className: 'badge-info' },
                    in_transit: { label: 'En tránsito', className: 'badge-primary' },
                    delayed: { label: 'Con demora', className: 'badge-warning' },
                    delivered: { label: 'Entregado', className: 'badge-success' },
                    returned: { label: 'Devuelto', className: 'badge-secondary' },
                    cancelled: { label: 'Cancelado', className: 'badge-danger' }
                  };
                  return map[status] || { label: status, className: 'badge-secondary' };
                };

                const statusInfo = getStatusBadge(s.status);
                const createdAt = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt as any);

                return (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: isMobile ? '1rem' : '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '1rem'
                    }}
                  >
                    {s.productImage && (
                      <img
                        src={s.productImage}
                        alt={s.productName}
                        style={{
                          width: isMobile ? '100%' : '120px',
                          height: isMobile ? '200px' : '120px',
                          objectFit: 'cover',
                          borderRadius: '0.75rem',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                            {s.productName}
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Pedido #{s.orderId}
                          </p>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {createdAt.toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`badge ${statusInfo.className}`} style={{ flexShrink: 0 }}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: 0 }}>
                          Método:{' '}
                          <strong>
                            {s.deliveryMethod === 'shipping'
                              ? 'Envío a domicilio'
                              : s.deliveryMethod === 'pickup'
                              ? 'Retiro en punto de entrega'
                              : 'Entrega por email'}
                          </strong>
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0' }}>
                          Dirección:{' '}
                          <span>
                            {s.address.street}, {s.address.locality}, {s.address.province}
                          </span>
                        </p>
                      </div>

                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          Tracking:{' '}
                          {s.trackingNumber ? (
                            <strong>{s.trackingNumber}</strong>
                          ) : (
                            <span style={{ fontStyle: 'italic' }}>Aún no disponible</span>
                          )}
                        </p>
                        {s.trackingUrl && (
                          <a
                            href={s.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.875rem',
                              color: 'var(--primary)',
                              textDecoration: 'underline',
                              marginTop: '0.25rem'
                            }}
                          >
                            Ver seguimiento online
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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