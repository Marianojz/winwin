/**
 * Helper para manejar autenticación con Google optimizada para móvil
 */

import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup } from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, syncUserToRealtimeDb } from '../config/firebase';
import { User } from '../types';

/**
 * Detecta si el dispositivo es móvil
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Detectar móvil por user agent (más confiable)
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  
  // Verificar por user agent primero (más confiable)
  const isMobileUA = mobileRegex.test(userAgent.toLowerCase());
  
  // También verificar por tamaño de pantalla como fallback
  const isSmallScreen = window.innerWidth <= 768;
  
  // Priorizar user agent, pero también considerar pantalla pequeña
  return isMobileUA || (isSmallScreen && window.innerWidth < 1024);
};

/**
 * Verifica si sessionStorage está disponible
 */
export const isSessionStorageAvailable = (): boolean => {
  try {
    const test = '__sessionStorage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Crea el provider de Google con configuración optimizada
 */
export const createGoogleProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  // En móvil, no forzar selección de cuenta para acelerar
  if (!isMobileDevice()) {
    provider.setCustomParameters({
      prompt: 'select_account'
    });
  }
  return provider;
};

/**
 * Procesa el resultado de autenticación de Google
 */
export const processGoogleAuthResult = async (user: any): Promise<{ fullUser: User; needsCompleteProfile: boolean }> => {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  let needsCompleteProfile = false;
  let userData: any;

  if (!userDoc.exists()) {
    // Usuario nuevo - crear documento básico en una sola operación
    const newUserData = {
      username: user.displayName || 'Usuario',
      email: user.email!,
      avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&size=200&background=FF6B00&color=fff&bold=true`,
      dni: '',
      address: '',
      locality: '',
      province: '',
      latitude: 0,
      longitude: 0,
      mapAddress: '',
      createdAt: new Date().toISOString(),
      emailVerified: true,
      role: 'user',
      isAdmin: false,
      active: true
    };
    
    await setDoc(userDocRef, newUserData);
    userData = newUserData;
    needsCompleteProfile = true;
  } else {
    // Usuario existente
    userData = userDoc.data();
    
    // Actualizar avatar de Google si está disponible y es diferente (en una sola operación)
    const updates: any = {};
    if (user.photoURL && user.photoURL !== userData.avatar) {
      updates.avatar = user.photoURL;
    }
    
    if (Object.keys(updates).length > 0) {
      await setDoc(userDocRef, { ...userData, ...updates }, { merge: true });
      userData = { ...userData, ...updates };
    }
    
    // Verificar si necesita completar perfil
    if (!userData.dni || !userData.address || userData.latitude === 0) {
      needsCompleteProfile = true;
    }
  }

  // Priorizar siempre el avatar de Google si está disponible
  const googleAvatar = user.photoURL || '';
  const savedAvatar = userData?.avatar || '';
  const finalAvatar = googleAvatar || savedAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || userData?.username || 'U')}&size=200&background=FF6B00&color=fff&bold=true`;
  
  const fullUser: User = {
    id: user.uid,
    email: user.email!,
    username: userData?.username || user.displayName || 'Usuario',
    avatar: finalAvatar,
    isAdmin: userData?.role === 'admin' || userData?.isAdmin === true,
    dni: userData?.dni || '',
    createdAt: userData?.createdAt ? new Date(userData.createdAt) : new Date(),
    address: userData?.address && userData?.latitude ? {
      street: userData.address,
      locality: userData.locality,
      province: userData.province,
      location: {
        lat: userData.latitude || 0,
        lng: userData.longitude || 0
      }
    } : undefined
  };

  // Sincronizar isAdmin a Realtime Database (no esperar, hacer en paralelo)
  syncUserToRealtimeDb(
    fullUser.id,
    fullUser.isAdmin,
    fullUser.email,
    fullUser.username
  ).catch(err => console.warn('Error sincronizando usuario:', err));

  return { fullUser, needsCompleteProfile };
};

