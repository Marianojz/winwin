/**
 * Utilidad para limpiar datos antiguos de localStorage que pueden causar conflictos con Firebase
 * 
 * Este script elimina datos obsoletos que ya no se usan porque ahora todo se guarda en Firebase:
 * - Notificaciones (ahora solo en Firebase Realtime Database)
 * - Subastas (ahora solo en Firebase)
 * - Productos (ahora solo en Firebase)
 * - Pedidos (ahora solo en Firebase)
 * - Bots (ahora solo en Firebase)
 * 
 * Se mantienen solo las claves necesarias para la aplicación:
 * - theme (preferencia del usuario)
 * - soundEnabled (preferencia del usuario)
 * - Cache de geolocalización (temporal)
 * - Quick replies (preferencia del usuario)
 * - Message templates (preferencia del usuario)
 * - Deployment helpers (versión, backups)
 */

/**
 * Lista de claves de localStorage que deben eliminarse porque ahora usan Firebase
 */
const FIREBASE_MIGRATED_KEYS = [
  // Notificaciones (ahora en Firebase Realtime Database)
  'notifications',
  // Subastas (ahora en Firebase)
  'auctions',
  // Productos (ahora en Firebase)
  'products',
  // Pedidos (ahora en Firebase)
  'orders',
  // Bots (ahora en Firebase)
  'bots',
  // Carrito (se maneja en estado, no necesita persistencia)
  'cart',
  // Timestamps de actividad limpiada (obsoleto)
  'clearedActivityTimestamp',
];

/**
 * Patrones de claves que deben eliminarse (con prefijos/sufijos dinámicos)
 */
const FIREBASE_MIGRATED_PATTERNS = [
  /^notifications_/, // notifications_${userId}
  /^clearedActivityTimestamp_/, // clearedActivityTimestamp_${userId}
];

/**
 * Claves que DEBEN MANTENERSE (no eliminar)
 */
const PRESERVE_KEYS = [
  'theme',
  'soundEnabled',
  'celebratedWins', // Cache de celebraciones de victorias
  'QUICK_REPLIES_STORAGE_KEY',
  'MESSAGE_TEMPLATES_STORAGE_KEY',
  'VERSION_KEY',
  'DEPLOYMENT_BACKUP_PREFIX',
];

/**
 * Prefijos de claves que deben mantenerse
 */
const PRESERVE_PREFIXES = [
  'geolocation_cache_', // Cache de geolocalización
  'deployment_backup_', // Backups de deployment
  'announcement_cache_', // Cache de anuncios
];

/**
 * Limpia todas las claves obsoletas de localStorage que pueden causar conflictos con Firebase
 * 
 * @param userId - ID del usuario actual (opcional, para limpiar claves específicas del usuario)
 * @returns Objeto con estadísticas de la limpieza
 */
export const cleanObsoleteLocalStorage = (userId?: string): {
  removed: number;
  preserved: number;
  removedKeys: string[];
  preservedKeys: string[];
} => {
  const removedKeys: string[] = [];
  const preservedKeys: string[] = [];
  
  try {
    // Obtener todas las claves de localStorage
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    console.log(`🔍 Revisando ${allKeys.length} claves en localStorage...`);
    
    // Procesar cada clave
    for (const key of allKeys) {
      let shouldRemove = false;
      let reason = '';
      
      // Verificar si es una clave que debe preservarse
      if (PRESERVE_KEYS.includes(key)) {
        preservedKeys.push(key);
        continue;
      }
      
      // Verificar si coincide con un prefijo que debe preservarse
      if (PRESERVE_PREFIXES.some(prefix => key.startsWith(prefix))) {
        preservedKeys.push(key);
        continue;
      }
      
      // Verificar si es una clave específica que debe eliminarse
      if (FIREBASE_MIGRATED_KEYS.includes(key)) {
        shouldRemove = true;
        reason = `Clave migrada a Firebase: ${key}`;
      }
      
      // Verificar si coincide con un patrón que debe eliminarse
      if (!shouldRemove) {
        for (const pattern of FIREBASE_MIGRATED_PATTERNS) {
          if (pattern.test(key)) {
            shouldRemove = true;
            reason = `Patrón migrado a Firebase: ${key}`;
            break;
          }
        }
      }
      
      // Si debe eliminarse, hacerlo
      if (shouldRemove) {
        try {
          localStorage.removeItem(key);
          removedKeys.push(key);
          console.log(`🗑️ Eliminada: ${key} (${reason})`);
        } catch (error) {
          console.error(`❌ Error eliminando ${key}:`, error);
        }
      } else {
        preservedKeys.push(key);
      }
    }
    
    console.log(`✅ Limpieza completada:`);
    console.log(`   - ${removedKeys.length} claves eliminadas`);
    console.log(`   - ${preservedKeys.length} claves preservadas`);
    
    return {
      removed: removedKeys.length,
      preserved: preservedKeys.length,
      removedKeys,
      preservedKeys
    };
  } catch (error) {
    console.error('❌ Error durante la limpieza de localStorage:', error);
    return {
      removed: removedKeys.length,
      preserved: preservedKeys.length,
      removedKeys,
      preservedKeys
    };
  }
};

/**
 * Limpia datos específicos de un usuario de localStorage
 * 
 * @param userId - ID del usuario
 */
export const cleanUserLocalStorage = (userId: string): void => {
  if (!userId) return;
  
  const userSpecificKeys = [
    `notifications_${userId}`,
    `clearedActivityTimestamp_${userId}`,
  ];
  
  let removed = 0;
  for (const key of userSpecificKeys) {
    if (localStorage.getItem(key)) {
      try {
        localStorage.removeItem(key);
        removed++;
        console.log(`🗑️ Eliminada clave de usuario: ${key}`);
      } catch (error) {
        console.error(`❌ Error eliminando ${key}:`, error);
      }
    }
  }
  
  if (removed > 0) {
    console.log(`✅ Limpieza de datos del usuario ${userId}: ${removed} claves eliminadas`);
  }
};

/**
 * Verifica si hay datos obsoletos en localStorage sin eliminarlos
 * 
 * @returns Lista de claves obsoletas encontradas
 */
export const detectObsoleteLocalStorage = (): string[] => {
  const obsoleteKeys: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Verificar si es una clave que debe preservarse
      if (PRESERVE_KEYS.includes(key)) continue;
      if (PRESERVE_PREFIXES.some(prefix => key.startsWith(prefix))) continue;
      
      // Verificar si es obsoleta
      if (FIREBASE_MIGRATED_KEYS.includes(key)) {
        obsoleteKeys.push(key);
        continue;
      }
      
      // Verificar patrones
      for (const pattern of FIREBASE_MIGRATED_PATTERNS) {
        if (pattern.test(key)) {
          obsoleteKeys.push(key);
          break;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error detectando claves obsoletas:', error);
  }
  
  return obsoleteKeys;
};

/**
 * Ejecuta limpieza completa al iniciar la aplicación
 * Se puede llamar desde App.tsx o main.tsx
 */
export const initializeLocalStorageCleanup = (userId?: string): void => {
  console.log('🧹 Iniciando limpieza de localStorage obsoleto...');
  
  // Limpiar datos obsoletos generales
  const result = cleanObsoleteLocalStorage(userId);
  
  // Limpiar datos específicos del usuario si se proporciona
  if (userId) {
    cleanUserLocalStorage(userId);
  }
  
  if (result.removed > 0) {
    console.log(`✅ Limpieza completada: ${result.removed} claves obsoletas eliminadas`);
  } else {
    console.log('✅ No se encontraron datos obsoletos en localStorage');
  }
};

