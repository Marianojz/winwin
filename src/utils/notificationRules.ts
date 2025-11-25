import { ref, onValue, set as firebaseSet, remove, get as firebaseGet } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { NotificationRule } from '../types';

// Reglas por defecto del sistema (acciones automáticas que ya existen en el código)
export const getSystemNotificationRules = (): NotificationRule[] => {
  const now = new Date();
  return [
    {
      id: 'system_auction_won',
      name: 'Subasta Ganada',
      eventType: 'auction_won',
      title: '🎉 ¡Ganaste la subasta!',
      message: 'Ganaste "{auctionTitle}" por ${amount}. Tenés 48hs para pagar. Se envió un mensaje automático a tu bandeja de entrada.',
      link: '/notificaciones',
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    },
    {
      id: 'system_auction_outbid',
      name: 'Oferta Superada',
      eventType: 'auction_outbid',
      title: 'Oferta realizada',
      message: 'Ofertaste ${amount} en "{auctionTitle}". Sos el mejor postor actual.',
      link: undefined,
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    },
    {
      id: 'system_purchase',
      name: 'Compra Directa Confirmada',
      eventType: 'purchase',
      title: 'Pedido confirmado',
      message: 'Tu pedido de {productName} está siendo preparado. Total a pagar al recibir: ${amount}. Se envió un mensaje de preparación a tu bandeja de entrada.',
      link: '/notificaciones',
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    },
    {
      id: 'system_new_message',
      name: 'Nuevo Mensaje del Administrador',
      eventType: 'new_message',
      title: '💬 Nuevo mensaje del administrador',
      message: 'Tienes un nuevo mensaje: {messagePreview}. Revisalo en tu bandeja de entrada.',
      link: '/perfil?tab=messages',
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    },
    {
      id: 'system_payment_reminder',
      name: 'Recordatorio de Pago',
      eventType: 'payment_reminder',
      title: '⏰ Recordatorio de pago',
      message: 'Tenés un pago pendiente para el pedido {orderId} por ${amount}. Por favor, realizá el pago antes de la fecha límite.',
      link: '/perfil?tab=orders',
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    },
    {
      id: 'system_order_shipped',
      name: 'Pedido Enviado',
      eventType: 'order_shipped',
      title: '🚚 ¡Tu pedido fue enviado!',
      message: '¡Buenas noticias! Tu pedido {orderId} ha sido enviado.{trackingNumber ? ` Código de seguimiento: {trackingNumber}` : ""}',
      link: '/perfil?tab=orders',
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    },
    {
      id: 'system_order_delivered',
      name: 'Pedido Entregado',
      eventType: 'order_delivered',
      title: '✅ ¡Tu pedido llegó!',
      message: '¡Tu pedido llegó! Tu pedido {orderId} ha sido entregado exitosamente. ¡Esperamos que disfrutes tu compra!',
      link: '/perfil?tab=orders',
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    },
    {
      id: 'system_order_expired',
      name: 'Pedido Expirado',
      eventType: 'order_expired',
      title: '⏱️ Pedido expirado',
      message: 'Tu pedido {orderId} ha expirado. Por favor, contactanos para reactivarlo.',
      link: '/perfil?tab=orders',
      active: true,
      isSystemRule: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    }
  ];
};

// Obtener todas las reglas de notificaciones (sistema + personalizadas)
export const getAllNotificationRules = (
  callback: (rules: NotificationRule[]) => void
): (() => void) => {
  const rulesRef = ref(realtimeDb, 'notificationRules');
  
  const unsubscribe = onValue(rulesRef, (snapshot) => {
    try {
      const data = snapshot.val();
      const customRules: NotificationRule[] = data ? Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
        createdAt: data[key].createdAt ? new Date(data[key].createdAt) : new Date(),
        updatedAt: data[key].updatedAt ? new Date(data[key].updatedAt) : new Date(),
        isSystemRule: false
      })) : [];
      
      // Combinar reglas del sistema con las personalizadas
      const systemRules = getSystemNotificationRules();
      const allRules = [...systemRules, ...customRules].sort((a, b) => {
        // Primero las del sistema, luego las personalizadas
        if (a.isSystemRule && !b.isSystemRule) return -1;
        if (!a.isSystemRule && b.isSystemRule) return 1;
        // Dentro de cada grupo, ordenar por fecha de actualización
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      
      callback(allRules);
    } catch (error) {
      console.error('Error procesando reglas de notificaciones:', error);
      // En caso de error, devolver solo las reglas del sistema
      callback(getSystemNotificationRules());
    }
  }, (error) => {
    console.warn('⚠️ No se pudieron cargar reglas personalizadas desde Firebase (solo se mostrarán las del sistema):', error.message || error);
    // En caso de error de permisos o conexión, devolver solo las reglas del sistema
    // Esto permite que el sistema funcione aunque no se puedan cargar las reglas personalizadas
    callback(getSystemNotificationRules());
  });
  
  return unsubscribe;
};

// Crear una nueva regla
export const createNotificationRule = async (rule: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const rulesRef = ref(realtimeDb, 'notificationRules');
  const newRuleRef = ref(realtimeDb, `notificationRules/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const ruleData = {
    ...rule,
    id: newRuleRef.key,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await firebaseSet(newRuleRef, ruleData);
  return newRuleRef.key!;
};

// Actualizar una regla existente
export const updateNotificationRule = async (ruleId: string, updates: Partial<Omit<NotificationRule, 'id' | 'createdAt' | 'createdBy' | 'isSystemRule'>>): Promise<void> => {
  // Las reglas del sistema no se guardan en Firebase, solo se pueden editar visualmente
  if (ruleId.startsWith('system_')) {
    // Para reglas del sistema, no hacemos nada (son solo informativas)
    // El usuario puede crear una regla personalizada basada en la del sistema
    throw new Error('Las reglas del sistema no se pueden editar directamente. Creá una regla personalizada basada en esta.');
  }
  
  const ruleRef = ref(realtimeDb, `notificationRules/${ruleId}`);
  
  const currentData = await firebaseGet(ruleRef);
  if (!currentData.exists()) {
    throw new Error('Regla no encontrada');
  }
  
  await firebaseSet(ruleRef, {
    ...currentData.val(),
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

// Eliminar una regla
export const deleteNotificationRule = async (ruleId: string): Promise<void> => {
  // No permitir eliminar reglas del sistema
  if (ruleId.startsWith('system_')) {
    throw new Error('No se pueden eliminar las reglas del sistema');
  }
  const ruleRef = ref(realtimeDb, `notificationRules/${ruleId}`);
  await remove(ruleRef);
};

// Obtener regla activa por tipo de evento
export const getActiveRuleByEventType = async (eventType: NotificationRule['eventType']): Promise<NotificationRule | null> => {
  // Primero buscar en reglas personalizadas de Firebase
  const rulesRef = ref(realtimeDb, 'notificationRules');
  const snapshot = await firebaseGet(rulesRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    const customRules: NotificationRule[] = Object.keys(data)
      .map((key) => ({
        ...data[key],
        id: key,
        createdAt: data[key].createdAt ? new Date(data[key].createdAt) : new Date(),
        updatedAt: data[key].updatedAt ? new Date(data[key].updatedAt) : new Date(),
        isSystemRule: false
      }))
      .filter((rule: NotificationRule) => rule.eventType === eventType && rule.active);
    
    // Si hay una regla personalizada activa, devolverla (tiene prioridad)
    if (customRules.length > 0) {
      return customRules[0];
    }
  }
  
  // Si no hay regla personalizada, buscar en las reglas del sistema
  const systemRules = getSystemNotificationRules();
  const systemRule = systemRules.find(rule => rule.eventType === eventType && rule.active);
  
  return systemRule || null;
};

