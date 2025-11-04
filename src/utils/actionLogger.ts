// Sistema de log de acciones con fecha, acción, ID único
import { ref, push, get as firebaseGet, query, orderByKey, limitToLast, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

export interface ActionLog {
  id: string;
  action: string;
  userId?: string;
  userName?: string;
  entityType: 'auction' | 'product' | 'order' | 'user' | 'system' | 'admin';
  entityId?: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

class ActionLogger {
  private logs: ActionLog[] = [];
  private readonly MAX_LOGS = 1000; // Mantener últimos 1000 logs
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const logsRef = query(ref(realtimeDb, 'action_logs'), orderByKey(), limitToLast(this.MAX_LOGS));
      
      // Escuchar cambios en tiempo real
      this.unsubscribe = onValue(logsRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          this.logs = [];
          return;
        }
        
        // Convertir objeto Firebase a array y ordenar por timestamp
        this.logs = Object.values(data).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        })).sort((a: ActionLog, b: ActionLog) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        
        console.log(`✅ Cargados ${this.logs.length} logs de acciones desde Firebase`);
      }, (error) => {
        console.error('Error cargando logs desde Firebase:', error);
        this.logs = [];
      });
    } catch (error) {
      console.error('Error configurando listener de logs:', error);
      this.logs = [];
    }
  }

  async log(action: string, entityType: ActionLog['entityType'], options: {
    userId?: string;
    userName?: string;
    entityId?: string;
    details?: Record<string, any>;
  } = {}): Promise<string> {
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const log: ActionLog = {
      id: logId,
      action,
      entityType,
      timestamp: new Date(),
      ...options
    };

    try {
      // Guardar en Firebase Realtime Database
      const logsRef = ref(realtimeDb, 'action_logs');
      await push(logsRef, {
        ...log,
        timestamp: log.timestamp.toISOString()
      });
      
      // Actualización optimista local
      this.logs.unshift(log);
      if (this.logs.length > this.MAX_LOGS) {
        this.logs = this.logs.slice(0, this.MAX_LOGS);
      }
      
      console.log(`📝 [${entityType.toUpperCase()}] ${action}`, log);
    } catch (error) {
      console.error('❌ Error guardando log en Firebase:', error);
      // Fallback: guardar solo localmente si falla Firebase
      this.logs.unshift(log);
      if (this.logs.length > this.MAX_LOGS) {
        this.logs = this.logs.slice(0, this.MAX_LOGS);
      }
    }
    
    return logId;
  }

  getLogs(filter?: {
    entityType?: ActionLog['entityType'];
    userId?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): ActionLog[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.entityType) {
        filtered = filtered.filter(log => log.entityType === filter.entityType);
      }
      if (filter.userId) {
        filtered = filtered.filter(log => log.userId === filter.userId);
      }
      if (filter.entityId) {
        filtered = filtered.filter(log => log.entityId === filter.entityId);
      }
      if (filter.action) {
        filtered = filtered.filter(log => log.action.includes(filter.action));
      }
      if (filter.startDate) {
        filtered = filtered.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter(log => log.timestamp <= filter.endDate!);
      }
    }

    return filtered;
  }

  clearLogs() {
    // Desconectar listener
    if (this.unsubscribe) {
      const logsRef = ref(realtimeDb, 'action_logs');
      off(logsRef);
      this.unsubscribe = null;
    }
    this.logs = [];
  }

  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
      recent: this.logs.slice(0, 100)
    };

    this.logs.forEach(log => {
      stats.byType[log.entityType] = (stats.byType[log.entityType] || 0) + 1;
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    });

    return stats;
  }
}

// Singleton instance
export const actionLogger = new ActionLogger();

// Helper functions
export const logAuctionAction = async (action: string, auctionId: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return await actionLogger.log(action, 'auction', { userId, userName, entityId: auctionId, details });
};

export const logProductAction = async (action: string, productId: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return await actionLogger.log(action, 'product', { userId, userName, entityId: productId, details });
};

export const logOrderAction = async (action: string, orderId: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return await actionLogger.log(action, 'order', { userId, userName, entityId: orderId, details });
};

export const logUserAction = async (action: string, userId: string, userName?: string, details?: Record<string, any>) => {
  return await actionLogger.log(action, 'user', { userId, userName, entityId: userId, details });
};

export const logSystemAction = async (action: string, details?: Record<string, any>) => {
  return await actionLogger.log(action, 'system', { details });
};

export const logAdminAction = async (action: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return await actionLogger.log(action, 'admin', { userId, userName, details });
};

