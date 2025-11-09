/**
 * Helper unificado para obtener el avatar del usuario
 * Siempre prioriza Firebase como fuente de verdad
 */

import { User } from '../types';

/**
 * Obtiene la URL del avatar del usuario
 * Prioridad: 1. Avatar de Google (si está disponible), 2. Avatar guardado en Firebase, 3. Avatar generado
 */
export const getUserAvatarUrl = (user: User | null): string => {
  if (!user) {
    return `https://ui-avatars.com/api/?name=U&size=200&background=FF6B00&color=fff&bold=true`;
  }

  // Si hay avatar guardado en Firebase (puede ser de Google o personalizado) y es una URL válida
  if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' && user.avatar.startsWith('http')) {
    return user.avatar;
  }

  // Fallback: generar avatar con iniciales
  const username = user.username || user.email?.split('@')[0] || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=FF6B00&color=fff&bold=true`;
};

/**
 * Obtiene la inicial del usuario para avatares de fallback
 */
export const getUserInitial = (user: User | null): string => {
  if (!user) return 'U';
  return (user.username || user.email || 'U')[0].toUpperCase();
};

