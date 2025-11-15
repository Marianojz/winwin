/**
 * Sistema de tracking para clicks y búsquedas
 * Registra todas las acciones de usuario con fecha e ID único
 */

import { ref, push, query, orderByKey, limitToLast, onValue, off, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { actionLogger } from './actionLogger';

export interface ClickTracking {
  id: string;
  entityType: 'product' | 'auction';
  entityId: string;
  entityName: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
}

export interface SearchTracking {
  id: string;
  query: string;
  userId?: string;
  userName?: string;
  results: number;
  timestamp: Date;
}

class TrackingSystem {
  private clicks: ClickTracking[] = [];
  private searches: SearchTracking[] = [];
  private readonly MAX_TRACKED = 5000; // Máximo de registros en memoria
  private clicksUnsubscribe: (() => void) | null = null;
  private searchesUnsubscribe: (() => void) | null = null;

  constructor() {
    this.loadClicks();
    this.loadSearches();
  }

  private loadClicks() {
    try {
      const clicksRef = query(ref(realtimeDb, 'tracking_clicks'), orderByKey(), limitToLast(this.MAX_TRACKED));
      
      this.clicksUnsubscribe = onValue(clicksRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          this.clicks = [];
          return;
        }
        
        this.clicks = Object.values(data).map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp)
        })).sort((a: ClickTracking, b: ClickTracking) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ).slice(0, this.MAX_TRACKED);
        
        console.log(`✅ Cargados ${this.clicks.length} clicks desde Firebase`);
      }, (error) => {
        console.error('Error cargando clicks desde Firebase:', error);
        this.clicks = [];
      });
    } catch (error) {
      console.error('Error configurando listener de clicks:', error);
      this.clicks = [];
    }
  }

  private loadSearches() {
    try {
      const searchesRef = query(ref(realtimeDb, 'tracking_searches'), orderByKey(), limitToLast(this.MAX_TRACKED));
      
      this.searchesUnsubscribe = onValue(searchesRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          this.searches = [];
          return;
        }
        
        this.searches = Object.values(data).map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        })).sort((a: SearchTracking, b: SearchTracking) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ).slice(0, this.MAX_TRACKED);
        
        console.log(`✅ Cargadas ${this.searches.length} búsquedas desde Firebase`);
      }, (error) => {
        console.error('Error cargando búsquedas desde Firebase:', error);
        this.searches = [];
      });
    } catch (error) {
      console.error('Error configurando listener de búsquedas:', error);
      this.searches = [];
    }
  }

  /**
   * Registra un click en un producto o subasta
   */
  async trackClick(entityType: 'product' | 'auction', entityId: string, entityName: string, userId?: string, userName?: string): Promise<string> {
    const click: ClickTracking = {
      id: `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      entityName,
      userId,
      userName,
      timestamp: new Date()
    };

    try {
      // Guardar en Firebase
      const clicksRef = ref(realtimeDb, 'tracking_clicks');
      await push(clicksRef, {
        ...click,
        timestamp: click.timestamp.toISOString()
      });
      
      // Actualización optimista local
      this.clicks.unshift(click);
      if (this.clicks.length > this.MAX_TRACKED) {
        this.clicks = this.clicks.slice(0, this.MAX_TRACKED);
      }

      // También registrar en actionLogger
      await actionLogger.log(
        `Click en ${entityType === 'product' ? 'producto' : 'subasta'}: ${entityName}`,
        entityType === 'product' ? 'product' : 'auction',
        { userId, userName, entityId, details: { entityName } }
      );
    } catch (error) {
      console.error('❌ Error guardando click en Firebase:', error);
      // Fallback: guardar solo localmente si falla Firebase
      this.clicks.unshift(click);
      if (this.clicks.length > this.MAX_TRACKED) {
        this.clicks = this.clicks.slice(0, this.MAX_TRACKED);
      }
    }

    return click.id;
  }

  /**
   * Registra una búsqueda
   */
  async trackSearch(query: string, results: number, userId?: string, userName?: string): Promise<string> {
    const search: SearchTracking = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      userId,
      userName,
      results,
      timestamp: new Date()
    };

    try {
      // Guardar en Firebase
      const searchesRef = ref(realtimeDb, 'tracking_searches');
      await push(searchesRef, {
        ...search,
        timestamp: search.timestamp.toISOString()
      });
      
      // Actualización optimista local
      this.searches.unshift(search);
      if (this.searches.length > this.MAX_TRACKED) {
        this.searches = this.searches.slice(0, this.MAX_TRACKED);
      }

      // También registrar en actionLogger
      await actionLogger.log(
        `Búsqueda: "${query}" (${results} resultados)`,
        'system',
        { userId, userName, details: { query, results } }
      );
    } catch (error) {
      console.error('❌ Error guardando búsqueda en Firebase:', error);
      // Fallback: guardar solo localmente si falla Firebase
      this.searches.unshift(search);
      if (this.searches.length > this.MAX_TRACKED) {
        this.searches = this.searches.slice(0, this.MAX_TRACKED);
      }
    }

    return search.id;
  }

  /**
   * Obtiene los productos/subastas más cliqueados
   */
  getMostClicked(limit: number = 10): Array<{ id: string; name: string; type: 'product' | 'auction'; clicks: number }> {
    const counts: Record<string, { id: string; name: string; type: 'product' | 'auction'; clicks: number }> = {};

    this.clicks.forEach(click => {
      const key = `${click.entityType}_${click.entityId}`;
      if (!counts[key]) {
        counts[key] = {
          id: click.entityId,
          name: click.entityName,
          type: click.entityType,
          clicks: 0
        };
      }
      counts[key].clicks++;
    });

    return Object.values(counts)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }

  /**
   * Obtiene los términos más buscados
   */
  getMostSearched(limit: number = 10): Array<{ query: string; count: number; avgResults: number }> {
    const counts: Record<string, { count: number; totalResults: number }> = {};

    this.searches.forEach(search => {
      const normalizedQuery = search.query.toLowerCase().trim();
      if (!counts[normalizedQuery]) {
        counts[normalizedQuery] = { count: 0, totalResults: 0 };
      }
      counts[normalizedQuery].count++;
      counts[normalizedQuery].totalResults += search.results;
    });

    return Object.entries(counts)
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgResults: Math.round(data.totalResults / data.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Obtiene estadísticas de tracking
   */
  getStats() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentClicks = this.clicks.filter(c => c.timestamp >= last30Days);
    const recentSearches = this.searches.filter(s => s.timestamp >= last30Days);

    return {
      totalClicks: this.clicks.length,
      totalSearches: this.searches.length,
      clicksLast30Days: recentClicks.length,
      searchesLast30Days: recentSearches.length,
      uniqueUsersClicks: new Set(this.clicks.map(c => c.userId).filter(Boolean)).size,
      uniqueUsersSearches: new Set(this.searches.map(s => s.userId).filter(Boolean)).size
    };
  }

  /**
   * Limpia registros antiguos (más de X días)
   */
  cleanOldRecords(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldClicksCount = this.clicks.length;
    this.clicks = this.clicks.filter(c => c.timestamp >= cutoffDate);
    const clicksRemoved = oldClicksCount - this.clicks.length;

    const oldSearchesCount = this.searches.length;
    this.searches = this.searches.filter(s => s.timestamp >= cutoffDate);
    const searchesRemoved = oldSearchesCount - this.searches.length;

    if (clicksRemoved > 0 || searchesRemoved > 0) {
      // Los datos se guardan automáticamente en Firebase a través de los listeners
      console.log(`🧹 Tracking: ${clicksRemoved} clicks y ${searchesRemoved} búsquedas antiguas eliminadas`);
    }

    return { clicksRemoved, searchesRemoved };
  }

  /**
   * Limpia todos los clicks de Firebase y localmente
   */
  async clearClicks(): Promise<void> {
    try {
      // Limpiar estado local primero para actualización inmediata
      this.clicks = [];
      
      // Eliminar de Firebase
      const clicksRef = ref(realtimeDb, 'tracking_clicks');
      await remove(clicksRef);
      
      // Esperar un momento para que Firebase procese y el listener se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Todos los clicks eliminados de Firebase');
    } catch (error) {
      console.error('❌ Error eliminando clicks de Firebase:', error);
      throw error;
    }
  }

  /**
   * Limpia todas las búsquedas de Firebase y localmente
   */
  async clearSearches(): Promise<void> {
    try {
      // Limpiar estado local primero para actualización inmediata
      this.searches = [];
      
      // Eliminar de Firebase
      const searchesRef = ref(realtimeDb, 'tracking_searches');
      await remove(searchesRef);
      
      // Esperar un momento para que Firebase procese y el listener se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Todas las búsquedas eliminadas de Firebase');
    } catch (error) {
      console.error('❌ Error eliminando búsquedas de Firebase:', error);
      throw error;
    }
  }

  /**
   * Limpia todos los registros
   */
  clearAll() {
    // Desconectar listeners
    if (this.clicksUnsubscribe) {
      const clicksRef = ref(realtimeDb, 'tracking_clicks');
      off(clicksRef);
      this.clicksUnsubscribe = null;
    }
    if (this.searchesUnsubscribe) {
      const searchesRef = ref(realtimeDb, 'tracking_searches');
      off(searchesRef);
      this.searchesUnsubscribe = null;
    }
    this.clicks = [];
    this.searches = [];
  }
}

export const trackingSystem = new TrackingSystem();

// Helper functions para uso fácil
export const trackProductClick = async (productId: string, productName: string, userId?: string, userName?: string) => {
  return await trackingSystem.trackClick('product', productId, productName, userId, userName);
};

export const trackAuctionClick = async (auctionId: string, auctionTitle: string, userId?: string, userName?: string) => {
  return await trackingSystem.trackClick('auction', auctionId, auctionTitle, userId, userName);
};

export const trackSearch = async (query: string, results: number, userId?: string, userName?: string) => {
  return await trackingSystem.trackSearch(query, results, userId, userName);
};

