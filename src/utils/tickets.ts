import { ref, push, set, get, onValue, off, update, query, orderByChild, equalTo } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Ticket, TicketStatus, ContactMessage } from '../types';
import { addNotification } from '../store/useStore';

// Generar número único de ticket con fecha y hora
export const generateTicketNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  // Formato: TKT-YYYYMMDD-HHMMSS-XXX
  return `TKT-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
};

// Crear nuevo ticket
export const createTicket = async (ticketData: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Ticket> => {
  try {
    const ticketsRef = ref(realtimeDb, 'tickets');
    const newTicketRef = push(ticketsRef);
    const ticketId = newTicketRef.key!;
    
    const ticketNumber = generateTicketNumber();
    const now = new Date().toISOString();
    
    const ticket: Ticket = {
      id: ticketId,
      ticketNumber,
      ...ticketData,
      status: 'visto',
      createdAt: now,
      updatedAt: now
    };
    
    await set(newTicketRef, ticket);
    
    console.log(`✅ Ticket creado: ${ticketNumber}`);
    return ticket;
  } catch (error) {
    console.error('❌ Error creando ticket:', error);
    throw error;
  }
};

// Obtener todos los tickets (admin)
export const getAllTickets = (callback: (tickets: Ticket[]) => void): (() => void) => {
  const ticketsRef = ref(realtimeDb, 'tickets');
  
  const unsubscribe = onValue(ticketsRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data) {
      callback([]);
      return;
    }
    
    const tickets: Ticket[] = Object.values(data).map((ticket: any) => ({
      ...ticket,
      createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
      updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(),
      resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : undefined
    }));
    
    // Ordenar por fecha de creación (más recientes primero)
    tickets.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    callback(tickets);
  }, (error) => {
    console.error('Error cargando tickets:', error);
    callback([]);
  });
  
  return () => off(ticketsRef, 'value', unsubscribe);
};

// Obtener tickets de un usuario específico
export const getUserTickets = (userId: string, callback: (tickets: Ticket[]) => void): (() => void) => {
  const ticketsRef = query(ref(realtimeDb, 'tickets'), orderByChild('userId'), equalTo(userId));
  
  const unsubscribe = onValue(ticketsRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data) {
      callback([]);
      return;
    }
    
    const tickets: Ticket[] = Object.values(data).map((ticket: any) => ({
      ...ticket,
      createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
      updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(),
      resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : undefined
    }));
    
    tickets.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    callback(tickets);
  }, (error) => {
    console.error('Error cargando tickets del usuario:', error);
    callback([]);
  });
  
  return () => off(ticketsRef, 'value', unsubscribe);
};

// Actualizar estado de ticket (admin)
export const updateTicketStatus = async (
  ticketId: string,
  status: TicketStatus,
  adminId: string,
  adminName: string,
  adminResponse?: string
): Promise<void> => {
  try {
    const ticketRef = ref(realtimeDb, `tickets/${ticketId}`);
    const ticketSnapshot = await get(ticketRef);
    
    if (!ticketSnapshot.exists()) {
      throw new Error('Ticket no encontrado');
    }
    
    const ticket = ticketSnapshot.val() as Ticket;
    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
      adminId,
      adminName
    };
    
    if (adminResponse) {
      updates.adminResponse = adminResponse;
    }
    
    if (status === 'resuelto' && !ticket.resolvedAt) {
      updates.resolvedAt = new Date().toISOString();
    }
    
    await update(ticketRef, updates);
    
    // Enviar notificación al usuario si tiene userId
    if (ticket.userId) {
      let notificationMessage = '';
      switch (status) {
        case 'visto':
          notificationMessage = `Tu ticket ${ticket.ticketNumber} ha sido visto por nuestro equipo.`;
          break;
        case 'revision':
          notificationMessage = `Tu ticket ${ticket.ticketNumber} está en revisión. Te contactaremos pronto.`;
          break;
        case 'resuelto':
          notificationMessage = `Tu ticket ${ticket.ticketNumber} ha sido resuelto.${adminResponse ? ' Revisa la respuesta en el Centro de Ayuda.' : ''}`;
          break;
      }
      
      // Nota: addNotification requiere el store, así que lo haremos desde el componente
      console.log(`📧 Notificación pendiente para usuario ${ticket.userId}: ${notificationMessage}`);
    }
    
    console.log(`✅ Ticket ${ticket.ticketNumber} actualizado a estado: ${status}`);
  } catch (error) {
    console.error('❌ Error actualizando ticket:', error);
    throw error;
  }
};

// Crear mensaje de contacto
export const createContactMessage = async (messageData: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>): Promise<ContactMessage> => {
  try {
    const messagesRef = ref(realtimeDb, 'contactMessages');
    const newMessageRef = push(messagesRef);
    const messageId = newMessageRef.key!;
    
    const message: ContactMessage = {
      id: messageId,
      ...messageData,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    await set(newMessageRef, message);
    
    console.log(`✅ Mensaje de contacto creado: ${messageId}`);
    return message;
  } catch (error) {
    console.error('❌ Error creando mensaje de contacto:', error);
    throw error;
  }
};

// Obtener todos los mensajes de contacto (admin)
export const getAllContactMessages = (callback: (messages: ContactMessage[]) => void): (() => void) => {
  const messagesRef = ref(realtimeDb, 'contactMessages');
  
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data) {
      callback([]);
      return;
    }
    
    const messages: ContactMessage[] = Object.values(data).map((msg: any) => ({
      ...msg,
      createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      readAt: msg.readAt ? new Date(msg.readAt) : undefined
    }));
    
    messages.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    callback(messages);
  }, (error) => {
    console.error('Error cargando mensajes de contacto:', error);
    callback([]);
  });
  
  return () => off(messagesRef, 'value', unsubscribe);
};

// Marcar mensaje de contacto como leído
export const markContactMessageAsRead = async (messageId: string, adminResponse?: string): Promise<void> => {
  try {
    const messageRef = ref(realtimeDb, `contactMessages/${messageId}`);
    const updates: any = {
      read: true,
      readAt: new Date().toISOString()
    };
    
    if (adminResponse) {
      updates.adminResponse = adminResponse;
    }
    
    await update(messageRef, updates);
    console.log(`✅ Mensaje de contacto marcado como leído: ${messageId}`);
  } catch (error) {
    console.error('❌ Error marcando mensaje como leído:', error);
    throw error;
  }
};

