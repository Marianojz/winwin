// Sistema de plantillas de respuestas rápidas para chat
export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: 'greeting' | 'support' | 'closing' | 'custom';
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const QUICK_REPLIES_STORAGE_KEY = 'quick_replies';

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

// Cargar plantillas desde localStorage
export const loadQuickReplies = (): QuickReply[] => {
  try {
    const stored = localStorage.getItem(QUICK_REPLIES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((qr: any) => ({
        ...qr,
        createdAt: new Date(qr.createdAt),
        updatedAt: qr.updatedAt ? new Date(qr.updatedAt) : undefined
      }));
    }
  } catch (error) {
    console.error('Error cargando quick replies:', error);
  }
  
  // Si no hay datos guardados, usar defaults y guardarlos
  saveQuickReplies(DEFAULT_QUICK_REPLIES);
  return DEFAULT_QUICK_REPLIES;
};

// Guardar plantillas en localStorage
export const saveQuickReplies = (replies: QuickReply[]): void => {
  try {
    localStorage.setItem(QUICK_REPLIES_STORAGE_KEY, JSON.stringify(replies));
  } catch (error) {
    console.error('Error guardando quick replies:', error);
  }
};

// Agregar nueva plantilla
export const addQuickReply = (reply: Omit<QuickReply, 'id' | 'createdAt'>): QuickReply => {
  const replies = loadQuickReplies();
  const newReply: QuickReply = {
    ...reply,
    id: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  };
  replies.push(newReply);
  saveQuickReplies(replies);
  return newReply;
};

// Actualizar plantilla
export const updateQuickReply = (id: string, updates: Partial<QuickReply>): boolean => {
  const replies = loadQuickReplies();
  const index = replies.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  replies[index] = {
    ...replies[index],
    ...updates,
    updatedAt: new Date()
  };
  saveQuickReplies(replies);
  return true;
};

// Eliminar plantilla
export const deleteQuickReply = (id: string): boolean => {
  const replies = loadQuickReplies();
  const filtered = replies.filter(r => r.id !== id);
  if (filtered.length === replies.length) return false;
  
  saveQuickReplies(filtered);
  return true;
};

// Obtener plantillas por categoría
export const getQuickRepliesByCategory = (category: QuickReply['category']): QuickReply[] => {
  return loadQuickReplies().filter(r => r.category === category && r.active);
};

// Obtener todas las plantillas activas
export const getActiveQuickReplies = (): QuickReply[] => {
  return loadQuickReplies().filter(r => r.active);
};

