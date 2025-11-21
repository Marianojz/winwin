// Sistema de templates de mensajes automáticos editables
export interface MessageTemplate {
  id: string;
  type: 'auction_won' | 'purchase' | 'payment_reminder' | 'order_shipped' | 'order_delivered' | 'auction_outbid';
  title: string;
  template: string;
  variables: string[]; // Variables disponibles para usar en el template
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MessageTemplateConfig {
  templates: MessageTemplate[];
  updatedAt: Date;
}

// TODO: Guardado en Firebase userPreferences/{userId}/messageTemplates

// Variables disponibles para cada tipo de mensaje
const TEMPLATE_VARIABLES: Record<MessageTemplate['type'], string[]> = {
  auction_won: ['{username}', '{auctionTitle}', '{amount}', '{orderId}', '{auctionId}', '{paymentDeadline}'],
  purchase: ['{username}', '{productName}', '{orderId}', '{amount}'],
  payment_reminder: ['{username}', '{orderId}', '{amount}', '{deadline}', '{auctionTitle}'],
  order_shipped: ['{username}', '{orderId}', '{trackingNumber}'],
  order_delivered: ['{username}', '{orderId}'],
  auction_outbid: ['{username}', '{auctionTitle}', '{currentBid}', '{minBid}']
};

// Templates por defecto
const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'template-auction-won',
    type: 'auction_won',
    title: 'Ganador de Subasta',
    template: `¡Felicitaciones {username}! 🎉

Has ganado la subasta "{auctionTitle}" por $${'{amount}'}.

Detalles del pedido:
• ID de Pedido: {orderId}
• Monto: $${'{amount}'}
• Tiempo para pagar: 48 horas

Para completar tu compra, contactanos o realiza el pago dentro del plazo establecido.`,
    variables: TEMPLATE_VARIABLES.auction_won,
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template-purchase',
    type: 'purchase',
    title: 'Compra Confirmada',
    template: `Hola {username}, 👋

Tu compra de "{productName}" ha sido confirmada exitosamente.

Detalles:
• Pedido: {orderId}
• Monto: $${'{amount}'}

Te contactaremos pronto para coordinar el envío.`,
    variables: TEMPLATE_VARIABLES.purchase,
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template-payment-reminder',
    type: 'payment_reminder',
    title: 'Recordatorio de Pago',
    template: `Hola {username}, ⏰

Te recordamos que tenés un pago pendiente:

• Pedido: {orderId}
• Monto: $${'{amount}'}
• Vence: {deadline}

Por favor, realiza el pago antes de la fecha límite para no perder tu compra.`,
    variables: TEMPLATE_VARIABLES.payment_reminder,
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template-order-shipped',
    type: 'order_shipped',
    title: 'Pedido Enviado',
    template: `¡Buenas noticias {username}! 📦

Tu pedido {orderId} ha sido enviado.

Información de seguimiento:
• Código de seguimiento: {trackingNumber}

Podrás rastrear tu pedido en cualquier momento.`,
    variables: TEMPLATE_VARIABLES.order_shipped,
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template-order-delivered',
    type: 'order_delivered',
    title: 'Pedido Entregado',
    template: `¡Tu pedido llegó! {username} 🎁

Tu pedido {orderId} ha sido entregado exitosamente.

¡Esperamos que disfrutes tu compra! Si tenés alguna consulta, no dudes en contactarnos.`,
    variables: TEMPLATE_VARIABLES.order_delivered,
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template-auction-outbid',
    type: 'auction_outbid',
    title: 'Superado en Subasta',
    template: `Hola {username}, 📈

Has sido superado en la subasta "{auctionTitle}".

• Oferta actual: $${'{currentBid}'}
• Oferta mínima sugerida: $${'{minBid}'}

¿Querés hacer una nueva oferta?`,
    variables: TEMPLATE_VARIABLES.auction_outbid,
    active: true,
    createdAt: new Date()
  }
];


// Cargar templates desde Firebase
export const loadMessageTemplates = async (userId: string): Promise<MessageTemplate[]> => {
  try {
    const { loadUserPreferences } = await import('./userPreferences');
    const preferences = await loadUserPreferences(userId);
    
    if (preferences.messageTemplates && Array.isArray(preferences.messageTemplates) && preferences.messageTemplates.length > 0) {
      return preferences.messageTemplates.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined
      }));
    }
    
    // Si no hay templates guardados, usar los por defecto y guardarlos
    await saveMessageTemplates(userId, DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  } catch (error) {
    console.error('❌ Error cargando templates:', error);
    return DEFAULT_TEMPLATES;
  }
};

// Guardar templates en Firebase
export const saveMessageTemplates = async (userId: string, templates: MessageTemplate[]): Promise<void> => {
  try {
    const { updateUserPreference } = await import('./userPreferences');
    await updateUserPreference(userId, 'messageTemplates', templates);
  } catch (error) {
    console.error('❌ Error guardando templates:', error);
    throw error;
  }
};

// Obtener template por tipo
export const getTemplateByType = async (userId: string, type: MessageTemplate['type']): Promise<MessageTemplate | undefined> => {
  const templates = await loadMessageTemplates(userId);
  return templates.find(t => t.type === type && t.active);
};

// Renderizar template con variables
export const renderTemplate = (
  template: MessageTemplate,
  variables: Record<string, string | number>
): string => {
  let rendered = template.template;
  
  // Reemplazar todas las variables
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
    rendered = rendered.replace(regex, String(value));
  });
  
  // Reemplazar formatCurrency en el template
  rendered = rendered.replace(/\$\{formatCurrency\((\d+)\)\}/g, (match, amount) => {
    return `$${Number(amount).toLocaleString('es-AR')}`;
  });
  
  return rendered;
};

// Actualizar template
export const updateMessageTemplate = async (userId: string, templateId: string, updates: Partial<MessageTemplate>): Promise<boolean> => {
  try {
    const templates = await loadMessageTemplates(userId);
    const updated = templates.map(t => 
      t.id === templateId 
        ? { ...t, ...updates, updatedAt: new Date() }
        : t
    );
    await saveMessageTemplates(userId, updated);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando template:', error);
    return false;
  }
};

// Obtener variables disponibles para un tipo
export const getVariablesForType = (type: MessageTemplate['type']): string[] => {
  return TEMPLATE_VARIABLES[type] || [];
};

