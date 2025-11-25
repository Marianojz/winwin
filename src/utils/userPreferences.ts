/**
 * Sistema de preferencias de usuario en Firebase
 * Todas las preferencias del usuario se guardan en Firebase Realtime Database
 * en la ruta: userPreferences/{userId}
 */

import { ref, set, get, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Theme } from '../types';

export interface UserPreferences {
  theme?: Theme;
  soundEnabled?: boolean;
  quickReplies?: any[];
  messageTemplates?: any[];
  celebratedWins?: string[];
  lastUpdated?: string;
}

/**
 * Cargar preferencias del usuario desde Firebase
 */
export const loadUserPreferences = async (userId: string): Promise<UserPreferences> => {
  try {
    const prefsRef = ref(realtimeDb, `userPreferences/${userId}`);
    const snapshot = await get(prefsRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserPreferences;
    }
    
    return {};
  } catch (error: any) {
    // Si es un error de permisos, no es crítico - simplemente retornar objeto vacío
    if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('permission')) {
      console.warn('⚠️ No se pueden cargar preferencias (permisos). Esto es normal si las reglas aún no se han actualizado.');
      return {};
    }
    console.error('❌ Error cargando preferencias de usuario:', error);
    return {};
  }
};

/**
 * Guardar preferencias del usuario en Firebase
 */
export const saveUserPreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> => {
  try {
    const prefsRef = ref(realtimeDb, `userPreferences/${userId}`);
    const currentPrefs = await loadUserPreferences(userId);
    
    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      ...preferences,
      lastUpdated: new Date().toISOString()
    };
    
    await set(prefsRef, updatedPrefs);
    console.log('✅ Preferencias guardadas en Firebase para usuario:', userId);
  } catch (error) {
    console.error('❌ Error guardando preferencias de usuario:', error);
    throw error;
  }
};

/**
 * Actualizar una preferencia específica
 */
export const updateUserPreference = async <K extends keyof UserPreferences>(
  userId: string,
  key: K,
  value: UserPreferences[K]
): Promise<void> => {
  try {
    const prefsRef = ref(realtimeDb, `userPreferences/${userId}/${key}`);
    await set(prefsRef, value);
    
    // Actualizar lastUpdated
    const lastUpdatedRef = ref(realtimeDb, `userPreferences/${userId}/lastUpdated`);
    await set(lastUpdatedRef, new Date().toISOString());
    
    console.log(`✅ Preferencia "${key}" actualizada en Firebase para usuario:`, userId);
  } catch (error: any) {
    // Si es un error de permisos, loguear pero no lanzar error crítico
    if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('permission')) {
      console.warn(`⚠️ No se puede actualizar preferencia "${key}" (permisos). Verifica que las reglas de Firebase estén actualizadas.`);
      // No lanzar error para no interrumpir el flujo
      return;
    }
    console.error(`❌ Error actualizando preferencia "${key}":`, error);
    throw error;
  }
};

/**
 * Suscribirse a cambios en las preferencias del usuario
 */
export const subscribeToUserPreferences = (
  userId: string,
  callback: (preferences: UserPreferences) => void
): (() => void) => {
  const prefsRef = ref(realtimeDb, `userPreferences/${userId}`);
  
  const unsubscribe = onValue(prefsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as UserPreferences);
    } else {
      callback({});
    }
  }, (error) => {
    console.error('❌ Error en listener de preferencias:', error);
  });
  
  // Retornar función para desuscribirse
  return () => {
    off(prefsRef);
  };
};

/**
 * Migrar preferencias desde localStorage a Firebase (una sola vez)
 */
export const migratePreferencesFromLocalStorage = async (userId: string): Promise<void> => {
  try {
    const currentPrefs = await loadUserPreferences(userId);
    
    // Solo migrar si no hay preferencias en Firebase
    if (Object.keys(currentPrefs).length === 0) {
      const preferencesToMigrate: Partial<UserPreferences> = {};
      
      // Migrar theme
      const theme = localStorage.getItem('theme') as Theme;
      if (theme) {
        preferencesToMigrate.theme = theme;
      }
      
      // Migrar soundEnabled
      const soundEnabled = localStorage.getItem('soundEnabled');
      if (soundEnabled !== null) {
        preferencesToMigrate.soundEnabled = soundEnabled === 'true';
      }
      
      // Migrar quickReplies
      const quickReplies = localStorage.getItem('quick_replies');
      if (quickReplies) {
        try {
          preferencesToMigrate.quickReplies = JSON.parse(quickReplies);
        } catch (e) {
          console.warn('Error parseando quickReplies:', e);
        }
      }
      
      // Migrar messageTemplates
      const messageTemplates = localStorage.getItem('message_templates');
      if (messageTemplates) {
        try {
          preferencesToMigrate.messageTemplates = JSON.parse(messageTemplates);
        } catch (e) {
          console.warn('Error parseando messageTemplates:', e);
        }
      }
      
      // Migrar celebratedWins
      const celebratedWins = localStorage.getItem('celebratedWins');
      if (celebratedWins) {
        try {
          preferencesToMigrate.celebratedWins = JSON.parse(celebratedWins);
        } catch (e) {
          console.warn('Error parseando celebratedWins:', e);
        }
      }
      
      // Guardar en Firebase si hay algo que migrar
      if (Object.keys(preferencesToMigrate).length > 0) {
        await saveUserPreferences(userId, preferencesToMigrate);
        console.log('✅ Preferencias migradas desde localStorage a Firebase');
      }
    }
  } catch (error) {
    console.error('❌ Error migrando preferencias:', error);
  }
};

