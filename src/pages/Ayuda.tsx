import { useState, useEffect } from 'react';
import { HelpCircle, Send, CheckCircle, AlertCircle, FileText, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { createTicket, getUserTickets } from '../utils/tickets';
import { Ticket, TicketType, TicketStatus } from '../types';
import { formatTimeAgo } from '../utils/helpers';
import { useIsMobile } from '../hooks/useMediaQuery';

const Ayuda = () => {
  const { user } = useStore();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'create' | 'my-tickets'>('create');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  
  const [formData, setFormData] = useState({
    type: 'consulta' as TicketType,
    subject: '',
    message: '',
    phone: user?.phone || ''
  });

  // Cargar tickets del usuario si está logueado
  useEffect(() => {
    if (user && activeTab === 'my-tickets') {
      const unsubscribe = getUserTickets(user.id, (tickets) => {
        setUserTickets(tickets);
      });
      
      return () => unsubscribe();
    }
  }, [user, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.subject.trim() || !formData.message.trim()) {
      setError('Por favor, completá todos los campos obligatorios.');
      setLoading(false);
      return;
    }

    if (!user) {
      setError('Debés iniciar sesión para crear un ticket.');
      setLoading(false);
      return;
    }

    try {
      await createTicket({
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        userPhone: formData.phone || undefined,
        type: formData.type,
        subject: formData.subject.trim(),
        message: formData.message.trim()
      });

      setSuccess('✅ Ticket creado exitosamente. Te contactaremos pronto.');
      setFormData({
        type: 'consulta',
        subject: '',
        message: '',
        phone: user.phone || ''
      });
      
      // Cambiar a la pestaña de mis tickets después de 2 segundos
      setTimeout(() => {
        setActiveTab('my-tickets');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('Error creando ticket:', err);
      setError('Error al crear el ticket. Por favor, intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'visto':
        return '#3B82F6'; // azul
      case 'revision':
        return '#F59E0B'; // amarillo
      case 'resuelto':
        return '#10B981'; // verde
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: TicketStatus) => {
    switch (status) {
      case 'visto':
        return 'Visto';
      case 'revision':
        return 'En Revisión';
      case 'resuelto':
        return 'Resuelto';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: TicketType) => {
    const labels: Record<TicketType, string> = {
      consulta: 'Consulta',
      problema: 'Problema',
      reembolso: 'Reembolso',
      tecnico: 'Técnico',
      otro: 'Otro'
    };
    return labels[type] || type;
  };

  return (
    <div style={{ minHeight: '100vh', padding: isMobile ? '1.5rem 0' : '2rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px', padding: isMobile ? '0 1rem' : '0' }}>
        {/* Encabezado */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: isMobile ? '2rem' : '3rem',
          background: 'var(--bg-secondary)',
          padding: isMobile ? '1.5rem' : '2rem',
          borderRadius: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '1rem',
            color: 'var(--primary)' 
          }}>
            <HelpCircle size={isMobile ? 36 : 48} />
          </div>
          <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', marginBottom: '0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            Centro de Ayuda
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '1rem' : '1.125rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            Creá un ticket y nuestro equipo te ayudará a resolver tu consulta
          </p>
        </div>

        {/* Tabs */}
        {user && (
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? '0.5rem' : '1rem', 
            marginBottom: isMobile ? '1.5rem' : '2rem',
            borderBottom: '2px solid var(--bg-tertiary)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <button
              onClick={() => setActiveTab('create')}
              style={{
                padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'create' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'create' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'create' ? 600 : 400,
                fontSize: isMobile ? '0.875rem' : '1rem',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <MessageSquare size={isMobile ? 16 : 18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Crear Ticket
            </button>
            <button
              onClick={() => setActiveTab('my-tickets')}
              style={{
                padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'my-tickets' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'my-tickets' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'my-tickets' ? 600 : 400,
                fontSize: isMobile ? '0.875rem' : '1rem',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <FileText size={isMobile ? 16 : 18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Mis Tickets ({userTickets.length})
            </button>
          </div>
        )}

        {/* Contenido según tab activo */}
        {activeTab === 'create' ? (
          <>
            {!user ? (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '2rem',
                borderRadius: '1rem',
                textAlign: 'center'
              }}>
                <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '1rem' }}>Iniciá sesión para crear un ticket</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Necesitás estar registrado para crear tickets de soporte
                </p>
                <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  Iniciar Sesión
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{
                background: 'var(--bg-secondary)',
                padding: isMobile ? '1.5rem' : '2rem',
                borderRadius: '1rem',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                {error && (
                  <div style={{
                    background: '#FEE2E2',
                    color: '#DC2626',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                {success && (
                  <div style={{
                    background: '#D1FAE5',
                    color: '#059669',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle size={20} />
                    {success}
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Tipo de consulta <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--bg-tertiary)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="consulta">Consulta General</option>
                    <option value="problema">Problema con Pedido</option>
                    <option value="reembolso">Solicitud de Reembolso</option>
                    <option value="tecnico">Problema Técnico</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Asunto <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ej: Problema con mi pedido #12345"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--bg-tertiary)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Teléfono de contacto
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="11 5610 1104"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--bg-tertiary)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Mensaje <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describí tu consulta o problema en detalle..."
                    required
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--bg-tertiary)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? (
                    <>⏳ Enviando...</>
                  ) : (
                    <>
                      <Send size={18} />
                      Crear Ticket
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '1rem'
          }}>
            {userTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <FileText size={64} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No tenés tickets aún</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Creá tu primer ticket para recibir ayuda
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn btn-primary"
                >
                  Crear Ticket
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {userTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--bg-tertiary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '1.125rem' }}>{ticket.ticketNumber}</strong>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '1rem',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              background: getStatusColor(ticket.status) + '20',
                              color: getStatusColor(ticket.status)
                            }}
                          >
                            {getStatusLabel(ticket.status)}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {getTypeLabel(ticket.type)} • {formatTimeAgo(new Date(ticket.createdAt))}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem' }}>{ticket.subject}</strong>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ticket.message}</p>
                    </div>

                    {ticket.adminResponse && (
                      <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginTop: '1rem',
                        borderLeft: '3px solid var(--primary)'
                      }}>
                        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                          Respuesta del equipo:
                        </strong>
                        <p style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {ticket.adminResponse}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ayuda;

