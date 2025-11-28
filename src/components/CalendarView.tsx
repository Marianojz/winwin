import React, { useState, useEffect, useMemo } from 'react';
import { CalendarEvent, CalendarEventType } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Gavel,
  ShoppingCart,
  Megaphone,
  Package,
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { useIsMobile } from '../hooks/useMediaQuery';
import {
  getAllCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  subscribeToCalendarEvents
} from '../utils/calendarEvents';

interface CalendarViewProps {
  auctions?: any[];
  orders?: any[];
}

const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  auction_start: '#10b981', // Verde
  auction_end: '#ef4444', // Rojo
  purchase: '#3b82f6', // Azul
  campaign: '#f59e0b', // Amarillo/Naranja
  event: '#8b5cf6', // Púrpura
  order_delivery: '#06b6d4', // Cyan
  campaign_start: '#f59e0b',
  campaign_end: '#ef4444'
};

const EVENT_TYPE_ICONS: Record<CalendarEventType, React.ElementType> = {
  auction_start: Gavel,
  auction_end: Gavel,
  purchase: ShoppingCart,
  campaign: Megaphone,
  event: CalendarIcon,
  order_delivery: Package,
  campaign_start: Megaphone,
  campaign_end: Megaphone
};

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  auction_start: 'Inicio Subasta',
  auction_end: 'Finalización Subasta',
  purchase: 'Compra',
  campaign: 'Campaña',
  event: 'Evento',
  order_delivery: 'Entrega Pedido',
  campaign_start: 'Inicio Campaña',
  campaign_end: 'Fin Campaña'
};

const CalendarView: React.FC<CalendarViewProps> = ({ auctions = [], orders = [] }) => {
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [loading, setLoading] = useState(false);
  
  // Formulario de evento
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    type: 'event' as CalendarEventType,
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '',
    endTime: '',
    color: '#8b5cf6'
  });

  // Cargar eventos
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const allEvents = await getAllCalendarEvents();
        setEvents(allEvents);
      } catch (error) {
        console.error('Error cargando eventos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    // Suscribirse a cambios en tiempo real
    const unsubscribe = subscribeToCalendarEvents((newEvents) => {
      setEvents(newEvents);
    });

    return () => unsubscribe();
  }, []);

  // Navegación del calendario
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Obtener días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Obtener eventos para una fecha específica
  const getEventsForDate = (date: Date | null): CalendarEvent[] => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = event.startDate instanceof Date 
        ? event.startDate 
        : new Date(event.startDate);
      const eventStartStr = eventStart.toISOString().split('T')[0];
      
      if (event.endDate) {
        const eventEnd = event.endDate instanceof Date 
          ? event.endDate 
          : new Date(event.endDate);
        const eventEndStr = eventEnd.toISOString().split('T')[0];
        return dateStr >= eventStartStr && dateStr <= eventEndStr;
      }
      
      return eventStartStr === dateStr;
    });
  };

  // Abrir modal para crear evento
  const handleCreateEvent = (date?: Date) => {
    const targetDate = date || selectedDate || new Date();
    setEventForm({
      title: '',
      description: '',
      type: 'event',
      startDate: targetDate.toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      endDate: '',
      endTime: '',
      color: '#8b5cf6'
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  // Abrir modal para editar evento
  const handleEditEvent = (event: CalendarEvent) => {
    if (event.isAutomatic) {
      alert('Este evento es automático y no se puede editar');
      return;
    }
    
    const startDate = event.startDate instanceof Date 
      ? event.startDate 
      : new Date(event.startDate);
    const endDate = event.endDate 
      ? (event.endDate instanceof Date ? event.endDate : new Date(event.endDate))
      : null;
    
    setEventForm({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate ? endDate.toISOString().split('T')[0] : '',
      endTime: endDate ? endDate.toTimeString().slice(0, 5) : '',
      color: event.color || EVENT_TYPE_COLORS[event.type]
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  // Guardar evento
  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      alert('El título es requerido');
      return;
    }

    try {
      setLoading(true);
      
      const startDateTime = new Date(`${eventForm.startDate}T${eventForm.startTime}`);
      const endDateTime = eventForm.endDate && eventForm.endTime
        ? new Date(`${eventForm.endDate}T${eventForm.endTime}`)
        : undefined;

      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, {
          title: eventForm.title,
          description: eventForm.description,
          type: eventForm.type,
          startDate: startDateTime,
          endDate: endDateTime,
          color: eventForm.color
        });
      } else {
        await createCalendarEvent({
          title: eventForm.title,
          description: eventForm.description,
          type: eventForm.type,
          startDate: startDateTime,
          endDate: endDateTime,
          color: eventForm.color,
          isAutomatic: false
        });
      }

      setShowEventModal(false);
      setEditingEvent(null);
    } catch (error: any) {
      console.error('Error guardando evento:', error);
      alert(error.message || 'Error al guardar el evento');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar evento
  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (event.isAutomatic) {
      alert('Este evento es automático y no se puede eliminar');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el evento "${event.title}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteCalendarEvent(event.id);
    } catch (error: any) {
      console.error('Error eliminando evento:', error);
      alert(error.message || 'Error al eliminar el evento');
    } finally {
      setLoading(false);
    }
  };

  // Eventos ordenados por fecha (para vista de lista)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      const dateB = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '1rem',
      padding: isMobile ? '1rem' : '1.5rem',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
            Calendario de Eventos
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'month' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'month' ? 'white' : 'var(--text-primary)',
                border: `1px solid ${viewMode === 'month' ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--text-primary)',
                border: `1px solid ${viewMode === 'list' ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              Lista
            </button>
          </div>
        </div>
        <button
          onClick={() => handleCreateEvent()}
          style={{
            padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={isMobile ? 16 : 18} />
          {!isMobile && 'Nuevo Evento'}
        </button>
      </div>

      {viewMode === 'month' ? (
        /* Vista de Calendario Mensual */
        <div>
          {/* Navegación del mes */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <button
              onClick={goToPreviousMonth}
              style={{
                padding: '0.5rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.25rem', textTransform: 'capitalize' }}>
              {monthName}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={goToToday}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Hoy
              </button>
              <button
                onClick={goToNextMonth}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Grid del calendario */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.5rem',
            width: '100%',
            overflow: 'hidden'
          }}>
            {/* Días de la semana */}
            {weekDays.map(day => (
              <div
                key={day}
                style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: 'var(--text-secondary)'
                }}
              >
                {day}
              </div>
            ))}

            {/* Días del mes */}
            {days.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (day) {
                      setSelectedDate(day);
                      if (dayEvents.length > 0 || !isMobile) {
                        // En móvil, solo abrir modal si hay eventos
                        if (!isMobile || dayEvents.length > 0) {
                          handleCreateEvent(day);
                        }
                      }
                    }
                  }}
                  style={{
                    minHeight: isMobile ? '60px' : '100px',
                    maxHeight: isMobile ? '60px' : '100px',
                    padding: '0.5rem',
                    background: isToday 
                      ? 'rgba(255, 165, 0, 0.1)' 
                      : isSelected
                      ? 'rgba(255, 165, 0, 0.2)'
                      : 'var(--bg-tertiary)',
                    border: `1px solid ${isToday ? 'var(--warning)' : 'var(--border)'}`,
                    borderRadius: '0.5rem',
                    cursor: day ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%'
                  }}
                >
                  {day && (
                    <>
                      <div style={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? 'var(--warning)' : 'var(--text-primary)'
                      }}>
                        {day.getDate()}
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.125rem',
                        flex: 1,
                        overflow: 'hidden',
                        minWidth: 0,
                        width: '100%'
                      }}>
                        {dayEvents.slice(0, isMobile ? 1 : 3).map((event, eventIndex) => {
                          const Icon = EVENT_TYPE_ICONS[event.type];
                          // Truncar título para mantener proporciones
                          const maxTitleLength = isMobile ? 15 : 25;
                          const truncatedTitle = event.title.length > maxTitleLength
                            ? event.title.substring(0, maxTitleLength) + '...'
                            : event.title;
                          
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                              style={{
                                background: event.color || EVENT_TYPE_COLORS[event.type],
                                color: 'white',
                                padding: '0.125rem 0.25rem',
                                borderRadius: '0.25rem',
                                fontSize: isMobile ? '0.625rem' : '0.7rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                                maxWidth: '100%',
                                flexShrink: 1
                              }}
                              title={event.title}
                            >
                              <Icon size={isMobile ? 10 : 12} style={{ flexShrink: 0 }} />
                              {!isMobile && (
                                <span style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                  flex: 1
                                }}>
                                  {truncatedTitle}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {dayEvents.length > (isMobile ? 1 : 3) && (
                          <div style={{
                            fontSize: '0.625rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 600
                          }}>
                            +{dayEvents.length - (isMobile ? 1 : 3)} más
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Vista de Lista */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sortedEvents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'var(--text-secondary)'
            }}>
              <CalendarIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No hay eventos programados</p>
            </div>
          ) : (
            sortedEvents.map(event => {
              const startDate = event.startDate instanceof Date 
                ? event.startDate 
                : new Date(event.startDate);
              const endDate = event.endDate 
                ? (event.endDate instanceof Date ? event.endDate : new Date(event.endDate))
                : null;
              const Icon = EVENT_TYPE_ICONS[event.type];
              
              return (
                <div
                  key={event.id}
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: `2px solid ${event.color || EVENT_TYPE_COLORS[event.type]}`,
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{
                    width: '4px',
                    background: event.color || EVENT_TYPE_COLORS[event.type],
                    borderRadius: '2px',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <Icon size={18} color={event.color || EVENT_TYPE_COLORS[event.type]} style={{ flexShrink: 0 }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}>
                        {event.title}
                      </h3>
                      {event.isAutomatic && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.125rem 0.5rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: '0.25rem',
                          color: 'var(--text-secondary)'
                        }}>
                          Automático
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p style={{
                        margin: 0,
                        marginBottom: '0.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4'
                      }}>
                        {event.description}
                      </p>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      flexWrap: 'wrap'
                    }}>
                      <Clock size={14} />
                      <span>
                        {startDate.toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {endDate && (
                        <>
                          <span>→</span>
                          <span>
                            {endDate.toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)'
                    }}>
                      {EVENT_TYPE_LABELS[event.type]}
                    </div>
                  </div>
                  {!event.isAutomatic && (
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexShrink: 0
                    }}>
                      <button
                        onClick={() => handleEditEvent(event)}
                        style={{
                          padding: '0.5rem',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          color: 'var(--text-primary)'
                        }}
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        style={{
                          padding: '0.5rem',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          color: 'var(--error)'
                        }}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Crear/Editar Evento */}
      {showEventModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '1rem',
            padding: isMobile ? '1rem' : '1.5rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                }}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Nombre del evento"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  Descripción
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Descripción del evento (opcional)"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    Tipo
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => {
                      const newType = e.target.value as CalendarEventType;
                      setEventForm({
                        ...eventForm,
                        type: newType,
                        color: EVENT_TYPE_COLORS[newType]
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    Color
                  </label>
                  <input
                    type="color"
                    value={eventForm.color}
                    onChange={(e) => setEventForm({ ...eventForm, color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    Fecha Fin (opcional)
                  </label>
                  <input
                    type="date"
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    Hora Fin (opcional)
                  </label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    disabled={!eventForm.endDate}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: eventForm.endDate ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      opacity: eventForm.endDate ? 1 : 0.5,
                      cursor: eventForm.endDate ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                marginTop: '1rem'
              }}>
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--primary)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    color: 'white',
                    fontWeight: 600,
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Guardando...' : editingEvent ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;

