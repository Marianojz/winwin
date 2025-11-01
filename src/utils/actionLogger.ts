// Sistema de log de acciones con fecha, acción, ID único
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
  private readonly STORAGE_KEY = 'action_logs';
  private readonly MAX_LOGS = 1000; // Mantener últimos 1000 logs

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.logs = parsed.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        })).sort((a: ActionLog, b: ActionLog) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
      }
    } catch (error) {
      console.error('Error cargando logs:', error);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      // Mantener solo los últimos MAX_LOGS
      if (this.logs.length > this.MAX_LOGS) {
        this.logs = this.logs.slice(0, this.MAX_LOGS);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Error guardando logs:', error);
    }
  }

  log(action: string, entityType: ActionLog['entityType'], options: {
    userId?: string;
    userName?: string;
    entityId?: string;
    details?: Record<string, any>;
  } = {}): string {
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const log: ActionLog = {
      id: logId,
      action,
      entityType,
      timestamp: new Date(),
      ...options
    };

    this.logs.unshift(log); // Agregar al inicio
    this.saveLogs();

    console.log(`📝 [${entityType.toUpperCase()}] ${action}`, log);
    
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
    this.logs = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  clearOldLogs(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    this.saveLogs();
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
export const logAuctionAction = (action: string, auctionId: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return actionLogger.log(action, 'auction', { userId, userName, entityId: auctionId, details });
};

export const logProductAction = (action: string, productId: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return actionLogger.log(action, 'product', { userId, userName, entityId: productId, details });
};

export const logOrderAction = (action: string, orderId: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return actionLogger.log(action, 'order', { userId, userName, entityId: orderId, details });
};

export const logUserAction = (action: string, userId: string, userName?: string, details?: Record<string, any>) => {
  return actionLogger.log(action, 'user', { userId, userName, entityId: userId, details });
};

export const logSystemAction = (action: string, details?: Record<string, any>) => {
  return actionLogger.log(action, 'system', { details });
};

export const logAdminAction = (action: string, userId?: string, userName?: string, details?: Record<string, any>) => {
  return actionLogger.log(action, 'admin', { userId, userName, details });
};

