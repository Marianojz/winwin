/**
 * Sistema de tracking para clicks y búsquedas
 * Registra todas las acciones de usuario con fecha e ID único
 */

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
  private readonly CLICKS_KEY = 'tracking_clicks';
  private readonly SEARCHES_KEY = 'tracking_searches';
  private readonly MAX_TRACKED = 5000; // Máximo de registros en memoria

  constructor() {
    this.loadClicks();
    this.loadSearches();
  }

  private loadClicks() {
    try {
      const saved = localStorage.getItem(this.CLICKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.clicks = parsed.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp)
        })).sort((a: ClickTracking, b: ClickTracking) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ).slice(0, this.MAX_TRACKED);
      }
    } catch (error) {
      console.error('Error cargando clicks:', error);
      this.clicks = [];
    }
  }

  private loadSearches() {
    try {
      const saved = localStorage.getItem(this.SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.searches = parsed.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        })).sort((a: SearchTracking, b: SearchTracking) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ).slice(0, this.MAX_TRACKED);
      }
    } catch (error) {
      console.error('Error cargando búsquedas:', error);
      this.searches = [];
    }
  }

  private saveClicks() {
    try {
      localStorage.setItem(this.CLICKS_KEY, JSON.stringify(this.clicks.slice(0, this.MAX_TRACKED)));
    } catch (error) {
      console.error('Error guardando clicks:', error);
    }
  }

  private saveSearches() {
    try {
      localStorage.setItem(this.SEARCHES_KEY, JSON.stringify(this.searches.slice(0, this.MAX_TRACKED)));
    } catch (error) {
      console.error('Error guardando búsquedas:', error);
    }
  }

  /**
   * Registra un click en un producto o subasta
   */
  trackClick(entityType: 'product' | 'auction', entityId: string, entityName: string, userId?: string, userName?: string) {
    const click: ClickTracking = {
      id: `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      entityName,
      userId,
      userName,
      timestamp: new Date()
    };

    this.clicks.unshift(click);
    if (this.clicks.length > this.MAX_TRACKED) {
      this.clicks = this.clicks.slice(0, this.MAX_TRACKED);
    }
    this.saveClicks();

    // También registrar en actionLogger
    actionLogger.log(
      `Click en ${entityType === 'product' ? 'producto' : 'subasta'}: ${entityName}`,
      entityType === 'product' ? 'product' : 'auction',
      { userId, userName, entityId, details: { entityName } }
    );

    return click.id;
  }

  /**
   * Registra una búsqueda
   */
  trackSearch(query: string, results: number, userId?: string, userName?: string) {
    const search: SearchTracking = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      userId,
      userName,
      results,
      timestamp: new Date()
    };

    this.searches.unshift(search);
    if (this.searches.length > this.MAX_TRACKED) {
      this.searches = this.searches.slice(0, this.MAX_TRACKED);
    }
    this.saveSearches();

    // También registrar en actionLogger
    actionLogger.log(
      `Búsqueda: "${query}" (${results} resultados)`,
      'system',
      { userId, userName, details: { query, results } }
    );

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
      this.saveClicks();
      this.saveSearches();
      console.log(`🧹 Tracking: ${clicksRemoved} clicks y ${searchesRemoved} búsquedas antiguas eliminadas`);
    }

    return { clicksRemoved, searchesRemoved };
  }

  /**
   * Limpia todos los registros
   */
  clearAll() {
    this.clicks = [];
    this.searches = [];
    localStorage.removeItem(this.CLICKS_KEY);
    localStorage.removeItem(this.SEARCHES_KEY);
  }
}

export const trackingSystem = new TrackingSystem();

// Helper functions para uso fácil
export const trackProductClick = (productId: string, productName: string, userId?: string, userName?: string) => {
  return trackingSystem.trackClick('product', productId, productName, userId, userName);
};

export const trackAuctionClick = (auctionId: string, auctionTitle: string, userId?: string, userName?: string) => {
  return trackingSystem.trackClick('auction', auctionId, auctionTitle, userId, userName);
};

export const trackSearch = (query: string, results: number, userId?: string, userName?: string) => {
  return trackingSystem.trackSearch(query, results, userId, userName);
};

