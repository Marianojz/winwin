// Sistema de plantillas de respuestas rápidas para chat
// TODO: Guardado en Firebase userPreferences/{userId}/quickReplies
export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: 'greeting' | 'support' | 'closing' | 'custom';
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Plantillas por defecto
const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: 'qr-greeting-1',
    title: 'Saludo Inicial',
    content: '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
    category: 'greeting',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'qr-greeting-2',
    title: 'Bienvenida',
    content: '¡Bienvenido/a! Gracias por contactarnos. Estoy aquí para ayudarte.',
    category: 'greeting',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'qr-support-1',
    title: 'Revisando',
    content: 'Déjame revisar tu consulta y te respondo en breve. ⏳',
    category: 'support',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'qr-support-2',
    title: 'Información Pendiente',
    content: 'Necesito un poco más de información para poder ayudarte mejor. ¿Podrías darme más detalles?',
    category: 'support',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'qr-support-3',
    title: 'Procesando',
    content: 'Estoy procesando tu solicitud. Te avisaré cuando esté listo. ✅',
    category: 'support',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'qr-closing-1',
    title: 'Cierre Amigable',
    content: '¡Perfecto! Si necesitás algo más, no dudes en contactarnos. ¡Que tengas un excelente día! 😊',
    category: 'closing',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'qr-closing-2',
    title: 'Cierre Formal',
    content: 'Gracias por contactarnos. Si tenés alguna otra consulta, estamos a tu disposición.',
    category: 'closing',
    active: true,
    createdAt: new Date()
  }
];

// Cargar plantillas desde Firebase
export const loadQuickReplies = async (userId: string): Promise<QuickReply[]> => {
  try {
    const { loadUserPreferences } = await import('./userPreferences');
    const preferences = await loadUserPreferences(userId);
    
    if (preferences.quickReplies && Array.isArray(preferences.quickReplies) && preferences.quickReplies.length > 0) {
      return preferences.quickReplies.map((qr: any) => ({
        ...qr,
        createdAt: new Date(qr.createdAt),
        updatedAt: qr.updatedAt ? new Date(qr.updatedAt) : undefined
      }));
    }
    
    // Si no hay datos guardados, usar defaults y guardarlos
    await saveQuickReplies(userId, DEFAULT_QUICK_REPLIES);
    return DEFAULT_QUICK_REPLIES;
  } catch (error) {
    console.error('❌ Error cargando quick replies:', error);
    return DEFAULT_QUICK_REPLIES;
  }
};

// Guardar plantillas en Firebase
export const saveQuickReplies = async (userId: string, replies: QuickReply[]): Promise<void> => {
  try {
    const { updateUserPreference } = await import('./userPreferences');
    await updateUserPreference(userId, 'quickReplies', replies);
  } catch (error) {
    console.error('❌ Error guardando quick replies:', error);
    throw error;
  }
};

// Agregar nueva plantilla
export const addQuickReply = async (userId: string, reply: Omit<QuickReply, 'id' | 'createdAt'>): Promise<QuickReply> => {
  const replies = await loadQuickReplies(userId);
  const newReply: QuickReply = {
    ...reply,
    id: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  };
  replies.push(newReply);
  await saveQuickReplies(userId, replies);
  return newReply;
};

// Actualizar plantilla
export const updateQuickReply = async (userId: string, id: string, updates: Partial<QuickReply>): Promise<boolean> => {
  const replies = await loadQuickReplies(userId);
  const index = replies.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  replies[index] = {
    ...replies[index],
    ...updates,
    updatedAt: new Date()
  };
  await saveQuickReplies(userId, replies);
  return true;
};

// Eliminar plantilla
export const deleteQuickReply = async (userId: string, id: string): Promise<boolean> => {
  const replies = await loadQuickReplies(userId);
  const filtered = replies.filter(r => r.id !== id);
  if (filtered.length === replies.length) return false;
  
  await saveQuickReplies(userId, filtered);
  return true;
};

// Obtener plantillas por categoría
export const getQuickRepliesByCategory = async (userId: string, category: QuickReply['category']): Promise<QuickReply[]> => {
  const replies = await loadQuickReplies(userId);
  return replies.filter(r => r.category === category && r.active);
};

// Obtener todas las plantillas activas
export const getActiveQuickReplies = async (userId: string): Promise<QuickReply[]> => {
  const replies = await loadQuickReplies(userId);
  return replies.filter(r => r.active);
};

