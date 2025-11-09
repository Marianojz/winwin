// Sistema de analytics para anuncios
import { ref, push, get, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

export interface AnnouncementEngagement {
  announcementId: string;
  userId: string;
  action: 'view' | 'click' | 'dismiss' | 'link_click' | 'image_click';
  timestamp: Date;
  metadata?: {
    device?: 'mobile' | 'desktop' | 'tablet';
    userAgent?: string;
    referrer?: string;
  };
}

export interface AnnouncementMetrics {
  announcementId: string;
  title: string;
  totalViews: number;
  totalClicks: number;
  totalDismisses: number;
  totalLinkClicks: number;
  totalImageClicks: number;
  uniqueUsers: number;
  engagementRate: number;
  averageTimeToDismiss?: number;
  createdAt: Date;
  expiresAt?: Date;
}

// Track engagement
export const trackAnnouncementEngagement = async (
  announcementId: string,
  userId: string,
  action: AnnouncementEngagement['action'],
  metadata?: AnnouncementEngagement['metadata']
): Promise<void> => {
  try {
    const engagementRef = ref(realtimeDb, `announcement_engagement/${announcementId}`);
    const engagement: Omit<AnnouncementEngagement, 'timestamp'> & { timestamp: string } = {
      announcementId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    await push(engagementRef, engagement);
  } catch (error) {
    console.error('Error tracking announcement engagement:', error);
  }
};

// Get metrics for an announcement
export const getAnnouncementMetrics = async (announcementId: string): Promise<AnnouncementMetrics | null> => {
  try {
    const engagementRef = ref(realtimeDb, `announcement_engagement/${announcementId}`);
    const snapshot = await get(engagementRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const engagements: AnnouncementEngagement[] = Object.values(snapshot.val()).map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp)
    }));
    
    // Get announcement details
    const announcementRef = ref(realtimeDb, `announcements/${announcementId}`);
    const announcementSnapshot = await get(announcementRef);
    const announcement = announcementSnapshot.val();
    
    if (!announcement) {
      return null;
    }
    
    const uniqueUsers = new Set(engagements.map(e => e.userId)).size;
    const views = engagements.filter(e => e.action === 'view').length;
    const clicks = engagements.filter(e => e.action === 'click').length;
    const dismisses = engagements.filter(e => e.action === 'dismiss').length;
    const linkClicks = engagements.filter(e => e.action === 'link_click').length;
    const imageClicks = engagements.filter(e => e.action === 'image_click').length;
    
    const totalInteractions = clicks + linkClicks + imageClicks;
    const engagementRate = views > 0 ? (totalInteractions / views) * 100 : 0;
    
    return {
      announcementId,
      title: announcement.title,
      totalViews: views,
      totalClicks: clicks,
      totalDismisses: dismisses,
      totalLinkClicks: linkClicks,
      totalImageClicks: imageClicks,
      uniqueUsers,
      engagementRate: Math.round(engagementRate * 100) / 100,
      createdAt: new Date(announcement.createdAt),
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : undefined
    };
  } catch (error) {
    console.error('Error getting announcement metrics:', error);
    return null;
  }
};

// Get all announcements metrics
export const getAllAnnouncementsMetrics = (
  callback: (metrics: AnnouncementMetrics[]) => void
): (() => void) => {
  const announcementsRef = ref(realtimeDb, 'announcements');
  
  const unsubscribe = onValue(announcementsRef, (snapshot) => {
    const announcements: { [key: string]: any } = snapshot.val() || {};
    const announcementIds = Object.keys(announcements);
    
    // Procesar métricas de forma asíncrona pero sin bloquear
    Promise.all(announcementIds.map(id => getAnnouncementMetrics(id)))
      .then(metrics => {
        callback(metrics.filter(Boolean) as AnnouncementMetrics[]);
      })
      .catch(error => {
        console.error('Error getting all announcements metrics:', error);
        callback([]);
      });
  }, (error) => {
    console.error('Error getting all announcements metrics:', error);
    callback([]);
  });
  
  return unsubscribe;
};

// Get top performing announcements
export const getTopAnnouncements = async (limit: number = 10): Promise<AnnouncementMetrics[]> => {
  try {
    const announcementsRef = ref(realtimeDb, 'announcements');
    const snapshot = await get(announcementsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const announcements: { [key: string]: any } = snapshot.val() || {};
    const announcementIds = Object.keys(announcements);
    
    const metricsPromises = announcementIds.map(id => getAnnouncementMetrics(id));
    const metrics = await Promise.all(metricsPromises);
    
    return metrics
      .filter(Boolean)
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, limit) as AnnouncementMetrics[];
  } catch (error) {
    console.error('Error getting top announcements:', error);
    return [];
  }
};

