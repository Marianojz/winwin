// Sistema de bandeja unificada para admin
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Message, Conversation, Ticket, ContactMessage } from '../types';

export type UnifiedMessageType = 'chat' | 'contact' | 'ticket' | 'help';
export type UnifiedMessagePriority = 'high' | 'medium' | 'low';

export interface UnifiedMessage {
  id: string;
  type: UnifiedMessageType;
  priority: UnifiedMessagePriority;
  userId?: string;
  username: string;
  userEmail?: string;
  userPhone?: string;
  subject?: string;
  content: string;
  createdAt: Date;
  read: boolean;
  status?: 'open' | 'closed' | 'visto' | 'revision' | 'resuelto';
  conversationId?: string;
  ticketNumber?: string;
  // Metadata adicional
  metadata?: {
    relatedAuctionId?: string;
    relatedProductId?: string;
    relatedOrderId?: string;
    adminResponse?: string;
  };
}

// Convertir mensaje de chat a formato unificado
const convertChatMessage = (conversation: Conversation): UnifiedMessage => {
  const userId = conversation.id.replace('admin_', '');
  const priority = (conversation.priority || 'medium') as UnifiedMessagePriority;
  
  return {
    id: `chat_${conversation.id}`,
    type: 'chat',
    priority,
    userId,
    username: conversation.username,
    content: conversation.lastMessage?.content || 'Sin mensajes',
    createdAt: conversation.lastMessage?.createdAt || new Date(),
    read: !conversation.unreadCount || conversation.unreadCount === 0,
    status: conversation.status || 'open',
    conversationId: conversation.id
  };
};

// Convertir ticket a formato unificado
const convertTicket = (ticket: Ticket): UnifiedMessage => {
  // Determinar prioridad basada en tipo y estado
  let priority: UnifiedMessagePriority = 'medium';
  if (ticket.type === 'urgente' || ticket.type === 'problema') {
    priority = 'high';
  } else if (ticket.type === 'consulta' || ticket.type === 'sugerencia') {
    priority = 'low';
  }
  
  return {
    id: `ticket_${ticket.id}`,
    type: 'ticket',
    priority,
    userId: ticket.userId,
    username: ticket.userName,
    userEmail: ticket.userEmail,
    userPhone: ticket.userPhone,
    subject: ticket.subject,
    content: ticket.message,
    createdAt: ticket.createdAt instanceof Date ? ticket.createdAt : new Date(ticket.createdAt),
    read: ticket.status !== 'visto', // Si está en 'visto', significa que fue leído
    status: ticket.status,
    ticketNumber: ticket.ticketNumber,
    metadata: {
      adminResponse: ticket.adminResponse
    }
  };
};

// Convertir mensaje de contacto a formato unificado
const convertContactMessage = (message: ContactMessage): UnifiedMessage => {
  // Los mensajes de contacto suelen ser de prioridad media
  let priority: UnifiedMessagePriority = 'medium';
  const subjectLower = message.subject?.toLowerCase() || '';
  if (subjectLower.includes('urgente') || subjectLower.includes('importante')) {
    priority = 'high';
  }
  
  return {
    id: `contact_${message.id}`,
    type: 'contact',
    priority,
    username: message.name,
    userEmail: message.email,
    userPhone: message.phone,
    subject: message.subject,
    content: message.message,
    createdAt: new Date(message.createdAt),
    read: message.read
  };
};

// Obtener todos los mensajes unificados
export const getUnifiedInbox = (
  conversations: Conversation[],
  tickets: Ticket[],
  contactMessages: ContactMessage[]
): UnifiedMessage[] => {
  const unified: UnifiedMessage[] = [];
  
  // Agregar conversaciones de chat
  conversations.forEach(conv => {
    unified.push(convertChatMessage(conv));
  });
  
  // Agregar tickets
  tickets.forEach(ticket => {
    unified.push(convertTicket(ticket));
  });
  
  // Agregar mensajes de contacto
  contactMessages.forEach(msg => {
    unified.push(convertContactMessage(msg));
  });
  
  // Ordenar por prioridad y fecha
  unified.sort((a, b) => {
    // Primero por prioridad
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Luego por no leídos primero
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    
    // Finalmente por fecha (más recientes primero)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  
  return unified;
};

// Obtener contador de no leídos por tipo
export const getUnreadCountsByType = (unified: UnifiedMessage[]) => {
  return {
    chat: unified.filter(m => m.type === 'chat' && !m.read).length,
    contact: unified.filter(m => m.type === 'contact' && !m.read).length,
    ticket: unified.filter(m => m.type === 'ticket' && !m.read).length,
    total: unified.filter(m => !m.read).length
  };
};

// Obtener contador de no leídos por prioridad
export const getUnreadCountsByPriority = (unified: UnifiedMessage[]) => {
  return {
    high: unified.filter(m => m.priority === 'high' && !m.read).length,
    medium: unified.filter(m => m.priority === 'medium' && !m.read).length,
    low: unified.filter(m => m.priority === 'low' && !m.read).length
  };
};

// Filtrar mensajes unificados
export const filterUnifiedMessages = (
  messages: UnifiedMessage[],
  filters: {
    type?: UnifiedMessageType | 'all';
    priority?: UnifiedMessagePriority | 'all';
    status?: string | 'all';
    search?: string;
    unreadOnly?: boolean;
  }
): UnifiedMessage[] => {
  let filtered = [...messages];
  
  if (filters.type && filters.type !== 'all') {
    filtered = filtered.filter(m => m.type === filters.type);
  }
  
  if (filters.priority && filters.priority !== 'all') {
    filtered = filtered.filter(m => m.priority === filters.priority);
  }
  
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(m => m.status === filters.status);
  }
  
  if (filters.unreadOnly) {
    filtered = filtered.filter(m => !m.read);
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(m => 
      m.username.toLowerCase().includes(searchLower) ||
      m.content.toLowerCase().includes(searchLower) ||
      m.subject?.toLowerCase().includes(searchLower) ||
      m.userEmail?.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
};

// Obtener badge de tipo
export const getTypeBadge = (type: UnifiedMessageType) => {
  const badges = {
    chat: { label: '💬 Chat', color: '#3B82F6' },
    contact: { label: '📧 Contacto', color: '#10B981' },
    ticket: { label: '🎫 Ticket', color: '#F59E0B' },
    help: { label: '❓ Ayuda', color: '#8B5CF6' }
  };
  return badges[type] || badges.chat;
};

// Obtener badge de prioridad
export const getPriorityBadge = (priority: UnifiedMessagePriority) => {
  const badges = {
    high: { label: '🔴 Alta', color: '#EF4444' },
    medium: { label: '🟡 Media', color: '#F59E0B' },
    low: { label: '🟢 Baja', color: '#10B981' }
  };
  return badges[priority] || badges.medium;
};

