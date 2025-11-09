// Sistema de métricas de tiempo de respuesta para chat
import { ref, get as firebaseGet, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Message, Conversation } from '../types';

export interface ResponseTimeMetric {
  conversationId: string;
  userId: string;
  username: string;
  firstMessageAt: Date;
  firstAdminResponseAt: Date | null;
  responseTime: number | null; // en minutos
  averageResponseTime: number | null; // promedio de todas las respuestas
  totalMessages: number;
  adminMessages: number;
  userMessages: number;
  status: 'open' | 'closed';
  lastMessageAt: Date;
}

export interface ChatMetrics {
  totalConversations: number;
  openConversations: number;
  closedConversations: number;
  averageResponseTime: number; // en minutos
  averageFirstResponseTime: number; // tiempo hasta primera respuesta
  totalMessages: number;
  conversationsByStatus: {
    open: number;
    closed: number;
  };
  conversationsByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  responseTimeDistribution: {
    under5min: number;
    under15min: number;
    under30min: number;
    over30min: number;
  };
}

// Calcular tiempo de respuesta para una conversación
export const calculateResponseTime = async (conversationId: string): Promise<ResponseTimeMetric | null> => {
  try {
    const messagesRef = ref(realtimeDb, `messages/${conversationId}`);
    const snapshot = await firebaseGet(messagesRef);
    
    if (!snapshot.exists()) return null;
    
    const messagesData = snapshot.val();
    const messages: Message[] = Object.values(messagesData).map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt)
    })).sort((a: Message, b: Message) => a.createdAt.getTime() - b.createdAt.getTime());
    
    if (messages.length === 0) return null;
    
    const firstMessage = messages[0];
    const userId = firstMessage.fromUserId === 'admin' ? firstMessage.toUserId : firstMessage.fromUserId;
    const username = firstMessage.fromUsername;
    
    // Encontrar primera respuesta del admin
    const firstAdminMessage = messages.find(m => m.fromUserId === 'admin');
    const firstAdminResponseAt = firstAdminMessage ? firstAdminMessage.createdAt : null;
    
    // Calcular tiempo de primera respuesta
    const responseTime = firstAdminResponseAt 
      ? Math.round((firstAdminResponseAt.getTime() - firstMessage.createdAt.getTime()) / (1000 * 60))
      : null;
    
    // Calcular promedio de tiempo de respuesta
    const adminMessages = messages.filter(m => m.fromUserId === 'admin');
    const userMessages = messages.filter(m => m.fromUserId !== 'admin');
    
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];
      
      // Si el mensaje actual es del usuario y el siguiente es del admin, calcular tiempo
      if (current.fromUserId !== 'admin' && next.fromUserId === 'admin') {
        const timeDiff = (next.createdAt.getTime() - current.createdAt.getTime()) / (1000 * 60);
        totalResponseTime += timeDiff;
        responseCount++;
      }
    }
    
    const averageResponseTime = responseCount > 0 
      ? Math.round(totalResponseTime / responseCount)
      : null;
    
    // Obtener estado de la conversación
    const conversationRef = ref(realtimeDb, `conversations/${conversationId}`);
    const conversationSnapshot = await firebaseGet(conversationRef);
    const conversationData = conversationSnapshot.exists() ? conversationSnapshot.val() : null;
    const status = conversationData?.status || 'open';
    
    return {
      conversationId,
      userId,
      username,
      firstMessageAt: firstMessage.createdAt,
      firstAdminResponseAt,
      responseTime,
      averageResponseTime,
      totalMessages: messages.length,
      adminMessages: adminMessages.length,
      userMessages: userMessages.length,
      status: status as 'open' | 'closed',
      lastMessageAt: messages[messages.length - 1].createdAt
    };
  } catch (error) {
    console.error('Error calculando tiempo de respuesta:', error);
    return null;
  }
};

// Obtener métricas generales del chat
export const getChatMetrics = async (): Promise<ChatMetrics> => {
  try {
    const conversationsRef = ref(realtimeDb, 'conversations');
    const conversationsSnapshot = await firebaseGet(conversationsRef);
    
    if (!conversationsSnapshot.exists()) {
      return {
        totalConversations: 0,
        openConversations: 0,
        closedConversations: 0,
        averageResponseTime: 0,
        averageFirstResponseTime: 0,
        totalMessages: 0,
        conversationsByStatus: { open: 0, closed: 0 },
        conversationsByPriority: { high: 0, medium: 0, low: 0 },
        responseTimeDistribution: { under5min: 0, under15min: 0, under30min: 0, over30min: 0 }
      };
    }
    
    const conversationsData = conversationsSnapshot.val();
    const conversationIds = Object.keys(conversationsData);
    
    let totalResponseTime = 0;
    let totalFirstResponseTime = 0;
    let responseTimeCount = 0;
    let firstResponseTimeCount = 0;
    let totalMessages = 0;
    
    const conversationsByStatus = { open: 0, closed: 0 };
    const conversationsByPriority = { high: 0, medium: 0, low: 0 };
    const responseTimeDistribution = { under5min: 0, under15min: 0, under30min: 0, over30min: 0 };
    
    // Calcular métricas para cada conversación
    for (const conversationId of conversationIds) {
      const conversation = conversationsData[conversationId];
      const status = conversation?.status || 'open';
      const priority = conversation?.priority || 'medium';
      
      conversationsByStatus[status as 'open' | 'closed']++;
      conversationsByPriority[priority as 'high' | 'medium' | 'low']++;
      
      const metric = await calculateResponseTime(conversationId);
      if (metric) {
        totalMessages += metric.totalMessages;
        
        if (metric.averageResponseTime !== null) {
          totalResponseTime += metric.averageResponseTime;
          responseTimeCount++;
          
          // Distribución de tiempos
          if (metric.averageResponseTime < 5) {
            responseTimeDistribution.under5min++;
          } else if (metric.averageResponseTime < 15) {
            responseTimeDistribution.under15min++;
          } else if (metric.averageResponseTime < 30) {
            responseTimeDistribution.under30min++;
          } else {
            responseTimeDistribution.over30min++;
          }
        }
        
        if (metric.responseTime !== null) {
          totalFirstResponseTime += metric.responseTime;
          firstResponseTimeCount++;
        }
      }
    }
    
    return {
      totalConversations: conversationIds.length,
      openConversations: conversationsByStatus.open,
      closedConversations: conversationsByStatus.closed,
      averageResponseTime: responseTimeCount > 0 
        ? Math.round(totalResponseTime / responseTimeCount)
        : 0,
      averageFirstResponseTime: firstResponseTimeCount > 0
        ? Math.round(totalFirstResponseTime / firstResponseTimeCount)
        : 0,
      totalMessages,
      conversationsByStatus,
      conversationsByPriority,
      responseTimeDistribution
    };
  } catch (error) {
    console.error('Error obteniendo métricas de chat:', error);
    return {
      totalConversations: 0,
      openConversations: 0,
      closedConversations: 0,
      averageResponseTime: 0,
      averageFirstResponseTime: 0,
      totalMessages: 0,
      conversationsByStatus: { open: 0, closed: 0 },
      conversationsByPriority: { high: 0, medium: 0, low: 0 },
      responseTimeDistribution: { under5min: 0, under15min: 0, under30min: 0, over30min: 0 }
    };
  }
};

// Escuchar métricas en tiempo real
export const watchChatMetrics = (callback: (metrics: ChatMetrics) => void): (() => void) => {
  let timeoutId: NodeJS.Timeout;
  
  const updateMetrics = async () => {
    const metrics = await getChatMetrics();
    callback(metrics);
  };
  
  // Actualizar inmediatamente
  updateMetrics();
  
  // Actualizar cada 30 segundos
  timeoutId = setInterval(updateMetrics, 30000);
  
  return () => {
    if (timeoutId) {
      clearInterval(timeoutId);
    }
  };
};

