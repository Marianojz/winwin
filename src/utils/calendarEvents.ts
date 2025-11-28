import { ref, get, set, remove, onValue, off, query, orderByChild, startAt, endAt } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { CalendarEvent, CalendarEventType, Auction, Order } from '../types';
import { generateUlid } from './helpers';

const CALENDAR_EVENTS_PATH = 'calendarEvents';

/**
 * Obtiene todos los eventos del calendario
 */
export const getAllCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const eventsRef = ref(realtimeDb, CALENDAR_EVENTS_PATH);
    const snapshot = await get(eventsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const eventsData = snapshot.val();
    return Object.values(eventsData).map((event: any) => ({
      ...event,
      startDate: event.startDate ? new Date(event.startDate) : new Date(),
      endDate: event.endDate ? new Date(event.endDate) : undefined,
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
      updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date()
    })) as CalendarEvent[];
  } catch (error) {
    console.error('Error obteniendo eventos del calendario:', error);
    return [];
  }
};

/**
 * Obtiene eventos en un rango de fechas
 */
export const getCalendarEventsByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  try {
    const eventsRef = ref(realtimeDb, CALENDAR_EVENTS_PATH);
    const snapshot = await get(eventsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const eventsData = snapshot.val();
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    return Object.values(eventsData)
      .map((event: any) => ({
        ...event,
        startDate: event.startDate ? new Date(event.startDate) : new Date(),
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
        updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date()
      }))
      .filter((event: CalendarEvent) => {
        const eventStart = event.startDate instanceof Date 
          ? event.startDate.getTime() 
          : new Date(event.startDate).getTime();
        const eventEnd = event.endDate 
          ? (event.endDate instanceof Date 
              ? event.endDate.getTime() 
              : new Date(event.endDate).getTime())
          : eventStart;
        
        // El evento se superpone con el rango si:
        // - Comienza antes del final del rango Y
        // - Termina después del inicio del rango
        return eventStart <= endTimestamp && eventEnd >= startTimestamp;
      }) as CalendarEvent[];
  } catch (error) {
    console.error('Error obteniendo eventos por rango de fechas:', error);
    return [];
  }
};

/**
 * Crea un nuevo evento del calendario
 */
export const createCalendarEvent = async (
  event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CalendarEvent> => {
  try {
    const eventId = generateUlid();
    const now = new Date();
    
    const newEvent: CalendarEvent = {
      ...event,
      id: eventId,
      startDate: event.startDate instanceof Date ? event.startDate : new Date(event.startDate),
      endDate: event.endDate 
        ? (event.endDate instanceof Date ? event.endDate : new Date(event.endDate))
        : undefined,
      createdAt: now,
      updatedAt: now
    };
    
    const eventRef = ref(realtimeDb, `${CALENDAR_EVENTS_PATH}/${eventId}`);
    
    // Preparar datos para Firebase (sin valores undefined)
    const firebaseData: any = {
      id: newEvent.id,
      title: newEvent.title,
      type: newEvent.type,
      startDate: newEvent.startDate.toISOString(),
      createdAt: newEvent.createdAt.toISOString(),
      updatedAt: newEvent.updatedAt.toISOString()
    };
    
    // Solo incluir endDate si existe
    if (newEvent.endDate) {
      firebaseData.endDate = newEvent.endDate.toISOString();
    }
    
    // Incluir campos opcionales solo si existen
    if (newEvent.description) {
      firebaseData.description = newEvent.description;
    }
    if (newEvent.color) {
      firebaseData.color = newEvent.color;
    }
    if (newEvent.isAutomatic !== undefined) {
      firebaseData.isAutomatic = newEvent.isAutomatic;
    }
    if (newEvent.relatedAuctionId) {
      firebaseData.relatedAuctionId = newEvent.relatedAuctionId;
    }
    if (newEvent.relatedOrderId) {
      firebaseData.relatedOrderId = newEvent.relatedOrderId;
    }
    if (newEvent.relatedProductId) {
      firebaseData.relatedProductId = newEvent.relatedProductId;
    }
    if (newEvent.createdBy) {
      firebaseData.createdBy = newEvent.createdBy;
    }
    
    await set(eventRef, firebaseData);
    
    return newEvent;
  } catch (error) {
    console.error('Error creando evento del calendario:', error);
    throw error;
  }
};

/**
 * Actualiza un evento del calendario
 */
export const updateCalendarEvent = async (
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'isAutomatic'>>
): Promise<void> => {
  try {
    const eventRef = ref(realtimeDb, `${CALENDAR_EVENTS_PATH}/${eventId}`);
    const snapshot = await get(eventRef);
    
    if (!snapshot.exists()) {
      throw new Error('Evento no encontrado');
    }
    
    const existingEvent = snapshot.val() as CalendarEvent;
    
    // No permitir editar eventos automáticos
    if (existingEvent.isAutomatic) {
      throw new Error('No se puede editar un evento automático');
    }
    
    // Preparar datos actualizados sin valores undefined
    const updatedData: any = {
      updatedAt: new Date().toISOString()
    };
    
    // Convertir fechas a ISO string si existen
    if (updates.startDate !== undefined) {
      updatedData.startDate = updates.startDate instanceof Date 
        ? updates.startDate.toISOString() 
        : new Date(updates.startDate).toISOString();
    }
    
    if (updates.endDate !== undefined) {
      updatedData.endDate = updates.endDate 
        ? (updates.endDate instanceof Date 
            ? updates.endDate.toISOString() 
            : new Date(updates.endDate).toISOString())
        : null;
    }
    
    // Incluir otros campos solo si están definidos y no son undefined
    if (updates.title !== undefined) {
      updatedData.title = updates.title;
    }
    if (updates.description !== undefined) {
      updatedData.description = updates.description;
    }
    if (updates.type !== undefined) {
      updatedData.type = updates.type;
    }
    if (updates.color !== undefined) {
      updatedData.color = updates.color;
    }
    if (updates.relatedAuctionId !== undefined) {
      updatedData.relatedAuctionId = updates.relatedAuctionId;
    }
    if (updates.relatedOrderId !== undefined) {
      updatedData.relatedOrderId = updates.relatedOrderId;
    }
    if (updates.relatedProductId !== undefined) {
      updatedData.relatedProductId = updates.relatedProductId;
    }
    if (updates.createdBy !== undefined) {
      updatedData.createdBy = updates.createdBy;
    }
    
    // Combinar con evento existente y actualizar
    const finalData: any = {
      ...existingEvent,
      ...updatedData
    };
    
    // Limpiar cualquier valor undefined que pueda haber quedado
    Object.keys(finalData).forEach(key => {
      if (finalData[key] === undefined) {
        delete finalData[key];
      }
    });
    
    await set(eventRef, finalData);
  } catch (error) {
    console.error('Error actualizando evento del calendario:', error);
    throw error;
  }
};

/**
 * Elimina un evento del calendario
 */
export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  try {
    const eventRef = ref(realtimeDb, `${CALENDAR_EVENTS_PATH}/${eventId}`);
    const snapshot = await get(eventRef);
    
    if (!snapshot.exists()) {
      throw new Error('Evento no encontrado');
    }
    
    const existingEvent = snapshot.val() as CalendarEvent;
    
    // No permitir eliminar eventos automáticos
    if (existingEvent.isAutomatic) {
      throw new Error('No se puede eliminar un evento automático');
    }
    
    await remove(eventRef);
  } catch (error) {
    console.error('Error eliminando evento del calendario:', error);
    throw error;
  }
};

/**
 * Sincroniza eventos automáticos desde subastas
 */
export const syncAuctionEvents = async (auctions: Auction[]): Promise<void> => {
  try {
    const existingEvents = await getAllCalendarEvents();
    const automaticAuctionEvents = existingEvents.filter(
      e => e.isAutomatic && (e.type === 'auction_start' || e.type === 'auction_end')
    );
    
    const newEvents: CalendarEvent[] = [];
    
    for (const auction of auctions) {
      const startDate = auction.startTime instanceof Date 
        ? auction.startTime 
        : new Date(auction.startTime);
      const endDate = auction.endTime instanceof Date 
        ? auction.endTime 
        : new Date(auction.endTime);
      
      // Evento de inicio de subasta
      const startEventId = `auction_start_${auction.id}`;
      const existingStartEvent = automaticAuctionEvents.find(
        e => e.relatedAuctionId === auction.id && e.type === 'auction_start'
      );
      
      if (!existingStartEvent) {
        newEvents.push({
          id: startEventId,
          title: `Inicio: ${auction.title}`,
          description: `Subasta inicia: ${auction.title}`,
          type: 'auction_start',
          startDate: startDate,
          color: '#10b981', // Verde
          isAutomatic: true,
          relatedAuctionId: auction.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Evento de finalización de subasta
      const endEventId = `auction_end_${auction.id}`;
      const existingEndEvent = automaticAuctionEvents.find(
        e => e.relatedAuctionId === auction.id && e.type === 'auction_end'
      );
      
      if (!existingEndEvent) {
        newEvents.push({
          id: endEventId,
          title: `Finaliza: ${auction.title}`,
          description: `Subasta finaliza: ${auction.title}`,
          type: 'auction_end',
          startDate: endDate,
          color: '#ef4444', // Rojo
          isAutomatic: true,
          relatedAuctionId: auction.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // Crear nuevos eventos
    for (const event of newEvents) {
      try {
        await createCalendarEvent(event);
      } catch (error) {
        console.error(`Error creando evento automático ${event.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sincronizando eventos de subastas:', error);
  }
};

/**
 * Sincroniza eventos automáticos desde pedidos
 */
export const syncOrderEvents = async (orders: Order[]): Promise<void> => {
  try {
    const existingEvents = await getAllCalendarEvents();
    const automaticOrderEvents = existingEvents.filter(
      e => e.isAutomatic && e.type === 'order_delivery'
    );
    
    const newEvents: CalendarEvent[] = [];
    
    for (const order of orders) {
      // Solo crear eventos para pedidos con fecha de entrega estimada
      if (order.deliveredAt || order.status === 'delivered' || order.status === 'cancelled') {
        continue;
      }
      
      // Estimar fecha de entrega (7 días después de la fecha de envío o creación)
      const baseDate = order.shippedAt 
        ? (order.shippedAt instanceof Date ? order.shippedAt : new Date(order.shippedAt))
        : (order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt));
      
      const estimatedDeliveryDate = new Date(baseDate);
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);
      
      const eventId = `order_delivery_${order.id}`;
      const existingEvent = automaticOrderEvents.find(
        e => e.relatedOrderId === order.id
      );
      
      if (!existingEvent) {
        newEvents.push({
          id: eventId,
          title: `Entrega estimada: ${order.productName}`,
          description: `Pedido #${order.orderNumber || order.id}`,
          type: 'order_delivery',
          startDate: estimatedDeliveryDate,
          color: '#3b82f6', // Azul
          isAutomatic: true,
          relatedOrderId: order.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // Crear nuevos eventos
    for (const event of newEvents) {
      try {
        await createCalendarEvent(event);
      } catch (error) {
        console.error(`Error creando evento automático ${event.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sincronizando eventos de pedidos:', error);
  }
};

/**
 * Suscribe a cambios en eventos del calendario
 */
export const subscribeToCalendarEvents = (
  callback: (events: CalendarEvent[]) => void
): (() => void) => {
  const eventsRef = ref(realtimeDb, CALENDAR_EVENTS_PATH);
  
  const unsubscribe = onValue(eventsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const eventsData = snapshot.val();
    const events = Object.values(eventsData).map((event: any) => ({
      ...event,
      startDate: event.startDate ? new Date(event.startDate) : new Date(),
      endDate: event.endDate ? new Date(event.endDate) : undefined,
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
      updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date()
    })) as CalendarEvent[];
    
    callback(events);
  });
  
  return () => off(eventsRef);
};

