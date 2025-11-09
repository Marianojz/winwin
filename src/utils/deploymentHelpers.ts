// Utilidades para deployment y rollback
import { ref, get, set } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

export interface DeploymentVersion {
  version: string;
  timestamp: string;
  description: string;
  changes: string[];
  rollbackData?: {
    firebaseRules?: string;
    componentVersions?: { [key: string]: string };
  };
}

const VERSION_KEY = 'deployment_version';
const BACKUP_KEY_PREFIX = 'backup_';

// Guardar versión actual
export const saveDeploymentVersion = (version: DeploymentVersion): void => {
  try {
    const versionData = {
      ...version,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(VERSION_KEY, JSON.stringify(versionData));
  } catch (error) {
    console.warn('Error guardando versión de deployment:', error);
  }
};

// Obtener versión actual
export const getCurrentVersion = (): DeploymentVersion | null => {
  try {
    const versionData = localStorage.getItem(VERSION_KEY);
    if (!versionData) return null;
    return JSON.parse(versionData);
  } catch (error) {
    console.warn('Error leyendo versión de deployment:', error);
    return null;
  }
};

// Backup de reglas Firebase
export const backupFirebaseRules = async (rules: string): Promise<string> => {
  try {
    const backupId = `rules_${Date.now()}`;
    const backupKey = `${BACKUP_KEY_PREFIX}${backupId}`;
    const backupData = {
      type: 'firebase_rules',
      content: rules,
      timestamp: new Date().toISOString(),
      version: getCurrentVersion()?.version || 'unknown'
    };
    
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    return backupId;
  } catch (error) {
    console.error('Error haciendo backup de reglas:', error);
    throw error;
  }
};

// Restaurar reglas Firebase desde backup
export const restoreFirebaseRules = (backupId: string): string | null => {
  try {
    const backupKey = `${BACKUP_KEY_PREFIX}${backupId}`;
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) return null;
    
    const backup = JSON.parse(backupData);
    if (backup.type !== 'firebase_rules') return null;
    
    return backup.content;
  } catch (error) {
    console.error('Error restaurando reglas:', error);
    return null;
  }
};

// Listar backups disponibles
export const listBackups = (): Array<{ id: string; type: string; timestamp: string; version: string }> => {
  try {
    const backups: Array<{ id: string; type: string; timestamp: string; version: string }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        try {
          const backupData = JSON.parse(localStorage.getItem(key) || '{}');
          const backupId = key.replace(BACKUP_KEY_PREFIX, '');
          backups.push({
            id: backupId,
            type: backupData.type || 'unknown',
            timestamp: backupData.timestamp || '',
            version: backupData.version || 'unknown'
          });
        } catch (e) {
          // Ignorar errores de parsing
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error('Error listando backups:', error);
    return [];
  }
};

// Limpiar backups antiguos (más de X días)
export const cleanOldBackups = (daysToKeep: number = 30): number => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let cleaned = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        try {
          const backupData = JSON.parse(localStorage.getItem(key) || '{}');
          const backupDate = new Date(backupData.timestamp);
          if (backupDate < cutoffDate) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch (e) {
          // Ignorar errores
        }
      }
    }
    
    return cleaned;
  } catch (error) {
    console.error('Error limpiando backups:', error);
    return 0;
  }
};

// Verificar compatibilidad de versión
export const checkVersionCompatibility = (requiredVersion: string): boolean => {
  const current = getCurrentVersion();
  if (!current) return false;
  
  // Comparación simple de versiones (semver)
  const parseVersion = (v: string) => v.split('.').map(Number);
  const currentV = parseVersion(current.version);
  const requiredV = parseVersion(requiredVersion);
  
  for (let i = 0; i < Math.max(currentV.length, requiredV.length); i++) {
    const curr = currentV[i] || 0;
    const req = requiredV[i] || 0;
    if (curr < req) return false;
    if (curr > req) return true;
  }
  
  return true;
};

