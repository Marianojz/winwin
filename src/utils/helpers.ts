import { formatDistanceToNow, format, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { Rating } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatTimeAgo = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
};

export const formatDate = (date: Date): string => {
  return format(date, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
};

export const formatCountdown = (endTime: Date): { days: number; hours: number; minutes: number; seconds: number; isExpired: boolean } => {
  const now = new Date();
  const diff = differenceInSeconds(endTime, now);
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  
  const days = Math.floor(diff / (24 * 60 * 60));
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((diff % (60 * 60)) / 60);
  const seconds = diff % 60;
  
  return { days, hours, minutes, seconds, isExpired: false };
};

export const getTimeRemaining = (endTime: Date): string => {
  const { days, hours, minutes, isExpired } = formatCountdown(endTime);
  
  if (isExpired) return 'Finalizada';
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Enmascara el nombre de usuario mostrando solo las primeras 3 letras por privacidad
 * @param username - Nombre de usuario completo
 * @returns Nombre enmascarado (ej: "Mariano" -> "Mar***")
 */
export const maskUsername = (username: string): string => {
  if (!username || username.length === 0) return '***';
  if (username.length <= 3) return username;
  return username.slice(0, 3) + '***';
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una mayúscula' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una minúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' };
  }
  return { valid: true };
};

export const generateId = (): string => {
  // Mantener compatibilidad donde se use, pero basado en ULID para unicidad y orden
  return generateUlid();
};

export const calculateAverageRating = (ratings: Rating[]): number => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

// ULID helpers (base32 Crockford)
const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const encodeTime = (time: number, length: number): string => {
  let str = '';
  for (let i = length - 1; i >= 0; i--) {
    const mod = time % 32;
    str = ULID_ALPHABET[mod] + str;
    time = (time - mod) / 32;
  }
  return str;
};

const encodeRandom = (length: number): string => {
  let str = '';
  const cryptoObj = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? crypto : null;
  for (let i = 0; i < length; i++) {
    let randomValue: number;
    if (cryptoObj) {
      const arr = new Uint8Array(1);
      cryptoObj.getRandomValues(arr);
      randomValue = arr[0] % 32;
    } else {
      randomValue = Math.floor(Math.random() * 32);
    }
    str += ULID_ALPHABET[randomValue];
  }
  return str;
};

export const generateUlid = (): string => {
  const time = Date.now();
  const timePart = encodeTime(time, 10); // 48 bits de tiempo
  const randomPart = encodeRandom(16); // 80 bits de aleatorio
  return timePart + randomPart;
};
