// Utilidades para gestionar anuncios en Firebase
import { ref, push, set, get, onValue, off, query, orderByChild, limitToLast, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Announcement, UserAnnouncement, AnnouncementStatus } from '../types/announcements';

// Validar datos de anuncio
const validateAnnouncement = (announcement: any): boolean => {
  if (!announcement.title || typeof announcement.title !== 'string' || announcement.title.trim().length === 0) {
    throw new Error('El título es requerido');
  }
  if (!announcement.content || typeof announcement.content !== 'string' || announcement.content.trim().length === 0) {
    throw new Error('El contenido es requerido');
  }
  if (!['text', 'image', 'urgent', 'promotional'].includes(announcement.type)) {
    throw new Error('Tipo de anuncio inválido');
  }
  if (!['low', 'medium', 'high'].includes(announcement.priority)) {
    throw new Error('Prioridad inválida');
  }
  return true;
};

// Función para eliminar propiedades undefined recursivamente (Firebase no las acepta)
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)).filter(item => item !== null && item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefined(value);
        }
      }
    }
    return cleaned;
  }
  return obj;
};

// Guardar anuncio
export const createAnnouncement = async (
  announcement: Omit<Announcement, 'id' | 'createdAt' | 'status' | 'createdBy'>,
  createdBy: string
): Promise<string> => {
  try {
    // Validar datos
    validateAnnouncement(announcement);
    
    const announcementsRef = ref(realtimeDb, 'announcements');
    const newAnnouncementRef = push(announcementsRef);
    
    const announcementData = {
      ...announcement,
      id: newAnnouncementRef.key!,
      createdAt: new Date().toISOString(),
      createdBy,
      status: announcement.scheduledAt && new Date(announcement.scheduledAt) > new Date() 
        ? 'draft' 
        : 'active' as AnnouncementStatus
    };
    
    // Eliminar valores undefined antes de guardar en Firebase
    const cleanedData = removeUndefined(announcementData);
    
    await set(newAnnouncementRef, cleanedData);
    
    // Si es inmediato, distribuir a usuarios
    if (!announcement.scheduledAt || new Date(announcement.scheduledAt) <= new Date()) {
      await distributeAnnouncementToUsers(newAnnouncementRef.key!, announcement.targetUsers);
    }
    
    // Limpiar cache de todos los usuarios afectados
    if (announcement.targetUsers === 'all_users') {
      // Limpiar todo el cache (se regenerará al cargar)
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('announcements_cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Error limpiando cache:', e);
      }
    }
    
    return newAnnouncementRef.key!;
  } catch (error) {
    console.error('Error creando anuncio:', error);
    throw error;
  }
};

// Distribuir anuncio a usuarios
const distributeAnnouncementToUsers = async (
  announcementId: string,
  targetUsers: string | string[]
): Promise<void> => {
  try {
    if (targetUsers === 'all_users') {
      // Para todos los usuarios, se distribuirá cuando cada usuario cargue su dashboard
      // No hacemos nada aquí, se maneja en getUserAnnouncements
      return;
    }
    
    if (Array.isArray(targetUsers)) {
      // Distribuir a usuarios específicos
      const promises = targetUsers.map(userId => {
        const userAnnouncementRef = ref(realtimeDb, `user_announcements/${userId}/${announcementId}`);
        return set(userAnnouncementRef, {
          read: false,
          dismissed: false,
          receivedAt: new Date().toISOString()
        });
      });
      await Promise.all(promises);
    }
  } catch (error) {
    console.error('Error distribuyendo anuncio:', error);
  }
};

// Obtener todos los anuncios (admin)
export const getAllAnnouncements = (
  callback: (announcements: Announcement[]) => void
): (() => void) => {
  const announcementsRef = ref(realtimeDb, 'announcements');
  
  const unsubscribe = onValue(announcementsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    
    const announcements: Announcement[] = Object.values(data).map((ann: any) => ({
      ...ann,
      createdAt: new Date(ann.createdAt),
      expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : undefined,
      scheduledAt: ann.scheduledAt ? new Date(ann.scheduledAt) : undefined
    })).sort((a: Announcement, b: Announcement) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    callback(announcements);
  }, (error) => {
    console.error('Error obteniendo anuncios:', error);
    callback([]);
  });
  
  return unsubscribe;
};

// Obtener anuncios del usuario
export const getUserAnnouncements = async (userId: string): Promise<Announcement[]> => {
  try {
    const userAnnouncementsRef = ref(realtimeDb, `user_announcements/${userId}`);
    const userAnnouncementsSnapshot = await get(userAnnouncementsRef);
    
    const userAnnouncements: { [key: string]: UserAnnouncement } = userAnnouncementsSnapshot.val() || {};
    const nowDate = new Date();
    
    // Filtrar anuncios descartados - NUNCA volver a mostrar anuncios cerrados por el usuario
    const announcementIds = Object.keys(userAnnouncements).filter(id => {
      const userAnn = userAnnouncements[id];
      // Si el anuncio fue descartado, excluirlo permanentemente
      if (userAnn.dismissed) return false;
      // Solo incluir anuncios no descartados
      return true;
    });
    
    // Obtener anuncios activos para todos los usuarios
    const allAnnouncementsRef = ref(realtimeDb, 'announcements');
    const allAnnouncementsSnapshot = await get(allAnnouncementsRef);
    const allAnnouncements: { [key: string]: any } = allAnnouncementsSnapshot.val() || {};
    
    // Filtrar anuncios activos y no expirados, excluyendo los que el usuario ha descartado
    const activeAnnouncements = Object.values(allAnnouncements)
      .filter((ann: any) => {
        if (ann.status !== 'active') return false;
        if (ann.expiresAt && new Date(ann.expiresAt) < nowDate) return false;
        
        // Verificar si el usuario descartó este anuncio - si lo descartó, excluirlo
        const userAnn = userAnnouncements[ann.id];
        if (userAnn && userAnn.dismissed) return false;
        
        if (ann.targetUsers === 'all_users') return true;
        if (Array.isArray(ann.targetUsers)) {
          return ann.targetUsers.includes(userId);
        }
        return false;
      })
      .map((ann: any) => ({
        ...ann,
        createdAt: new Date(ann.createdAt),
        expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : undefined,
        scheduledAt: ann.scheduledAt ? new Date(ann.scheduledAt) : undefined
      })) as Announcement[];
    
    // Combinar anuncios específicos del usuario y anuncios globales
    const userSpecificAnnouncements = await Promise.all(
      announcementIds.map(async (id) => {
        const annRef = ref(realtimeDb, `announcements/${id}`);
        const annSnapshot = await get(annRef);
        if (!annSnapshot.exists()) return null;
        
        const ann = annSnapshot.val();
        return {
          ...ann,
          createdAt: new Date(ann.createdAt),
          expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : undefined,
          scheduledAt: ann.scheduledAt ? new Date(ann.scheduledAt) : undefined
        } as Announcement;
      })
    );
    
    const allUserAnnouncements = [
      ...activeAnnouncements,
      ...userSpecificAnnouncements.filter(Boolean) as Announcement[]
    ];
    
    // Eliminar duplicados y ordenar por prioridad y fecha
    const uniqueAnnouncements = Array.from(
      new Map(allUserAnnouncements.map(ann => [ann.id, ann])).values()
    ).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return uniqueAnnouncements.slice(0, 3); // Máximo 3 anuncios
  } catch (error) {
    console.error('Error obteniendo anuncios del usuario:', error);
    return [];
  }
};

// Marcar anuncio como leído
export const markAnnouncementAsRead = async (
  userId: string,
  announcementId: string
): Promise<void> => {
  try {
    const userAnnouncementRef = ref(realtimeDb, `user_announcements/${userId}/${announcementId}`);
    const snapshot = await get(userAnnouncementRef);
    
    if (snapshot.exists()) {
      await set(userAnnouncementRef, {
        ...snapshot.val(),
        read: true,
        interactedAt: new Date().toISOString()
      });
    } else {
      // Crear entrada si no existe
      await set(userAnnouncementRef, {
        read: true,
        dismissed: false,
        receivedAt: new Date().toISOString(),
        interactedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error marcando anuncio como leído:', error);
  }
};

// Descartar anuncio - una vez descartado, nunca volverá a aparecer para ese usuario
export const dismissAnnouncement = async (
  userId: string,
  announcementId: string
): Promise<void> => {
  try {
    const userAnnouncementRef = ref(realtimeDb, `user_announcements/${userId}/${announcementId}`);
    const snapshot = await get(userAnnouncementRef);
    
    if (snapshot.exists()) {
      await set(userAnnouncementRef, {
        ...snapshot.val(),
        dismissed: true,
        dismissedAt: new Date().toISOString(),
        interactedAt: new Date().toISOString()
      });
    } else {
      // Crear entrada nueva marcando como descartado permanentemente
      await set(userAnnouncementRef, {
        read: false,
        dismissed: true,
        receivedAt: new Date().toISOString(),
        dismissedAt: new Date().toISOString(),
        interactedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error descartando anuncio:', error);
  }
};

// Actualizar anuncio
export const updateAnnouncement = async (
  announcementId: string,
  updates: Partial<Announcement>
): Promise<void> => {
  try {
    const announcementRef = ref(realtimeDb, `announcements/${announcementId}`);
    const snapshot = await get(announcementRef);
    
    if (!snapshot.exists()) {
      throw new Error('Anuncio no encontrado');
    }
    
    const currentData = snapshot.val();
    const updatedData = {
      ...currentData,
      ...updates,
      id: announcementId // Asegurar que el ID no cambie
    };
    
    await set(announcementRef, updatedData);
  } catch (error) {
    console.error('Error actualizando anuncio:', error);
    throw error;
  }
};

// Eliminar anuncio
export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
  try {
    const announcementRef = ref(realtimeDb, `announcements/${announcementId}`);
    await remove(announcementRef);
    
    // También eliminar de user_announcements (opcional, puede dejarse para historial)
  } catch (error) {
    console.error('Error eliminando anuncio:', error);
    throw error;
  }
};

// Obtener contador de anuncios no leídos
export const getUnreadAnnouncementsCount = async (userId: string): Promise<number> => {
  try {
    const announcements = await getUserAnnouncements(userId);
    const userAnnouncementsRef = ref(realtimeDb, `user_announcements/${userId}`);
    const snapshot = await get(userAnnouncementsRef);
    const userAnnouncements: { [key: string]: UserAnnouncement } = snapshot.val() || {};
    
    return announcements.filter(ann => {
      const userAnn = userAnnouncements[ann.id];
      return !userAnn || !userAnn.read;
    }).length;
  } catch (error) {
    console.error('Error obteniendo contador de no leídos:', error);
    return 0;
  }
};

// Cache offline para anuncios
const CACHE_KEY_PREFIX = 'announcements_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

export const cacheAnnouncements = (userId: string, announcements: Announcement[]): void => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cacheData = {
      announcements,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error guardando cache de anuncios:', error);
  }
};

export const getCachedAnnouncements = (userId: string): Announcement[] | null => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar expiración
    if (now - cacheData.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Convertir fechas de string a Date
    return cacheData.announcements.map((ann: any) => ({
      ...ann,
      createdAt: new Date(ann.createdAt),
      expiresAt: ann.expiresAt ? new Date(ann.expiresAt) : undefined,
      scheduledAt: ann.scheduledAt ? new Date(ann.scheduledAt) : undefined
    }));
  } catch (error) {
    console.warn('Error leyendo cache de anuncios:', error);
    return null;
  }
};

export const clearAnnouncementsCache = (userId: string): void => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn('Error limpiando cache de anuncios:', error);
  }
};

