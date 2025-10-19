// Función para generar avatar basado en email
export const getAvatarUrl = (email: string, username: string = '', size: number = 200): string => {
  if (!email) {
    // Avatar por defecto con iniciales del username
    const initial = username ? username[0].toUpperCase() : 'U';
    return `https://ui-avatars.com/api/?name=${initial}&size=${size}&background=FF6B00&color=fff&bold=true`;
  }

  // Usar Gravatar con fallback a ui-avatars
  const emailHash = simpleHash(email.trim().toLowerCase());
  const fallbackName = username || email.split('@')[0];
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&size=${size}&background=FF6B00&color=fff&bold=true`;
  
  return `https://www.gravatar.com/avatar/${emailHash}?s=${size}&d=${encodeURIComponent(fallbackUrl)}`;
};

// Hash simple para generar ID consistente del email
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}
