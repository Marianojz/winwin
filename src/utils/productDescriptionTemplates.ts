/**
 * Templates de descripciones de productos escalables
 * Estos templates pueden ser usados para generar descripciones únicas y SEO-optimizadas
 */

export interface ProductDescriptionTemplate {
  id: string;
  name: string;
  template: (productName: string, category: string, price: number, features?: string[]) => string;
  keywords: string[];
}

export const productDescriptionTemplates: ProductDescriptionTemplate[] = [
  {
    id: '1',
    name: 'Template Premium con Características',
    keywords: ['premium', 'calidad', 'características'],
    template: (productName, category, price, features = []) => {
      const featuresList = features.length > 0 
        ? features.map(f => `• ${f}`).join('\n')
        : `• Diseño moderno y elegante\n• Materiales de primera calidad\n• Garantía de satisfacción`;
      
      return `Descubre ${productName}, un producto de ${category} que combina calidad superior con diseño innovador. 

${featuresList}

Este artículo ha sido cuidadosamente seleccionado para ofrecerte la mejor experiencia. Con un precio de $${price.toLocaleString('es-AR')}, representa una excelente inversión en calidad y durabilidad.

Ideal para quienes buscan lo mejor en ${category}, este producto destaca por su atención al detalle y su compromiso con la excelencia. No pierdas la oportunidad de adquirir un artículo que marcará la diferencia.

✓ Envío rápido y seguro
✓ Garantía de calidad
✓ Atención al cliente personalizada`;
    }
  },
  {
    id: '2',
    name: 'Template Beneficios y Uso',
    keywords: ['beneficios', 'uso práctico', 'versatilidad'],
    template: (productName, category, price) => {
      return `${productName} es la solución perfecta para tus necesidades en ${category}. Este producto versátil te ofrece múltiples beneficios que mejorarán tu día a día.

CARACTERÍSTICAS PRINCIPALES:
• Funcionalidad excepcional que se adapta a diferentes situaciones
• Diseño pensado para la comodidad y practicidad
• Materiales resistentes que garantizan larga durabilidad
• Fácil de usar, ideal para usuarios de todos los niveles

¿PARA QUÉ LO PUEDES USAR?
Este artículo es perfecto para uso doméstico, profesional o como regalo. Su versatilidad lo convierte en una excelente opción para cualquier ocasión.

INVERSIÓN INTELIGENTE:
Por solo $${price.toLocaleString('es-AR')}, obtienes un producto de calidad que te acompañará por mucho tiempo. Una inversión que vale la pena.

Compra con confianza y disfruta de la calidad que solo Clikio puede ofrecerte.`;
    }
  },
  {
    id: '3',
    name: 'Template Comparativo',
    keywords: ['comparación', 'ventajas', 'diferenciación'],
    template: (productName, category, price) => {
      return `¿Buscas lo mejor en ${category}? ${productName} es la elección inteligente que estabas esperando.

¿QUÉ LO HACE ESPECIAL?
A diferencia de otros productos similares, ${productName} ofrece:
• Calidad superior comprobada
• Precio justo: $${price.toLocaleString('es-AR')}
• Diseño actualizado y funcional
• Soporte y garantía incluidos

COMPARACIÓN:
Mientras otros productos en ${category} pueden decepcionar, ${productName} cumple y supera las expectativas. Nuestros clientes confían en nosotros porque sabemos que la calidad no se negocia.

VENTAJAS EXCLUSIVAS:
✓ Stock limitado - no te quedes sin el tuyo
✓ Envío express disponible
✓ Garantía de satisfacción o devolución
✓ Atención personalizada post-venta

Elige ${productName} y descubre por qué somos la opción preferida de miles de clientes satisfechos.`;
    }
  },
  {
    id: '4',
    name: 'Template Emocional y Aspiracional',
    keywords: ['emocional', 'estilo de vida', 'aspiracional'],
    template: (productName, category, price) => {
      return `Imagina tener ${productName} en tu vida. Este producto de ${category} no es solo un artículo, es una experiencia que transformará tu rutina.

EL ESTILO QUE BUSCAS:
${productName} representa más que un simple producto: es una declaración de estilo, una elección consciente hacia la calidad y el buen gusto. Cada detalle ha sido pensado para quienes valoran lo mejor.

EXPERIENCIA PREMIUM:
Desde el momento en que lo recibas, notarás la diferencia. La calidad se siente, se ve y se disfruta. Por $${price.toLocaleString('es-AR')}, estás invirtiendo en una experiencia superior.

PARA QUIÉN ES IDEAL:
• Personas que buscan calidad sin compromisos
• Quienes valoran el diseño y la funcionalidad
• Aquellos que quieren lo mejor para sí mismos o como regalo especial

Únete a quienes ya eligieron ${productName} y experimenta la diferencia. Tu futuro yo te lo agradecerá.`;
    }
  },
  {
    id: '5',
    name: 'Template Técnico Detallado',
    keywords: ['técnico', 'especificaciones', 'detalles'],
    template: (productName, category, price) => {
      return `${productName} - Especificaciones Técnicas y Detalles

INFORMACIÓN DEL PRODUCTO:
Categoría: ${category}
Precio: $${price.toLocaleString('es-AR')}

ESPECIFICACIONES:
• Construcción robusta y duradera
• Cumple con estándares de calidad internacionales
• Diseño ergonómico y funcional
• Materiales seleccionados cuidadosamente

CARACTERÍSTICAS TÉCNICAS:
Este producto ha sido diseñado pensando en la durabilidad y el rendimiento. Cada componente ha sido seleccionado para ofrecer la mejor relación calidad-precio del mercado.

GARANTÍA Y SOPORTE:
Incluye garantía del fabricante y soporte técnico. Nuestro equipo está disponible para resolver cualquier consulta sobre el producto.

INFORMACIÓN DE ENVÍO:
• Envío seguro a todo el país
• Empaque protegido para garantizar que llegue en perfectas condiciones
• Seguimiento en tiempo real de tu pedido

${productName} es la elección técnica y práctica que estabas buscando en ${category}.`;
    }
  },
  {
    id: '6',
    name: 'Template Storytelling',
    keywords: ['historia', 'origen', 'narrativa'],
    template: (productName, category, price) => {
      return `La historia detrás de ${productName}

Todo comenzó con una simple pregunta: ¿Cómo podemos ofrecer el mejor producto en ${category}? La respuesta es ${productName}.

NUESTRA FILOSOFÍA:
En Clikio, creemos que cada producto cuenta una historia. ${productName} no es la excepción. Ha sido creado pensando en personas reales, con necesidades reales, que buscan soluciones reales.

EL PROCESO:
Cada ${productName} pasa por un riguroso proceso de selección. No vendemos cualquier producto de ${category} - solo aquellos que cumplen nuestros estándares de excelencia.

POR QUÉ ELEGIR ${productName.toUpperCase()}:
• Historia de calidad comprobada
• Precio justo: $${price.toLocaleString('es-AR')}
• Compromiso con la satisfacción del cliente
• Comunidad de usuarios satisfechos

Únete a nuestra historia. Elige ${productName} y sé parte de una comunidad que valora la calidad y la honestidad en cada compra.`;
    }
  },
  {
    id: '7',
    name: 'Template Problema-Solución',
    keywords: ['problema', 'solución', 'necesidad'],
    template: (productName, category, price) => {
      return `¿Tienes problemas encontrando el producto perfecto en ${category}?

LA SOLUCIÓN: ${productName}

PROBLEMA COMÚN:
Muchas personas buscan productos en ${category} pero terminan decepcionadas con la calidad, el precio o el servicio. Nosotros entendemos esa frustración.

NUESTRA SOLUCIÓN:
${productName} resuelve todos esos problemas:
✓ Calidad garantizada - no más decepciones
✓ Precio justo: $${price.toLocaleString('es-AR')} - sin sorpresas
✓ Envío rápido y seguro - recibes lo que esperas
✓ Atención al cliente - estamos aquí para ayudarte

RESULTADO:
Clientes satisfechos que vuelven a confiar en nosotros. ${productName} no es solo un producto, es una solución a tus necesidades en ${category}.

NO MÁS COMPROMISOS:
Deja de conformarte con productos mediocres. ${productName} es la solución que estabas buscando. Compra con confianza y experimenta la diferencia.`;
    }
  },
  {
    id: '8',
    name: 'Template Social Proof',
    keywords: ['testimonios', 'confianza', 'recomendaciones'],
    template: (productName, category, price) => {
      return `${productName} - La elección de miles de clientes satisfechos

POR QUÉ CONFÍAN EN NOSOTROS:
Miles de clientes han elegido ${productName} en ${category} y han quedado completamente satisfechos. No somos los únicos que creemos en la calidad de este producto.

LO QUE DICEN NUESTROS CLIENTES:
"Excelente producto, superó mis expectativas" - Cliente verificado
"La mejor compra que hice en ${category}" - Cliente satisfecho
"Calidad premium a un precio justo" - Cliente frecuente

ESTADÍSTICAS QUE HABLAN:
• 98% de satisfacción del cliente
• Miles de productos vendidos
• Calificación promedio: 4.8/5 estrellas
• Clientes que vuelven a comprar: 85%

INVIERTE EN CALIDAD:
Por $${price.toLocaleString('es-AR')}, te unes a una comunidad de clientes satisfechos que saben reconocer la calidad cuando la ven.

${productName} no es solo un producto, es una elección respaldada por la confianza de miles. Únete a ellos hoy.`;
    }
  },
  {
    id: '9',
    name: 'Template Urgencia y Escasez',
    keywords: ['urgencia', 'stock limitado', 'oportunidad'],
    template: (productName, category, price) => {
      return `⚠️ OPORTUNIDAD LIMITADA: ${productName}

STOCK DISPONIBLE:
Solo quedan unidades limitadas de ${productName} en ${category}. Este producto de alta demanda se agota rápidamente.

¿POR QUÉ ACTUAR AHORA?
• Stock limitado - no sabemos cuándo volverá a estar disponible
• Precio especial: $${price.toLocaleString('es-AR')}
• Envío inmediato mientras dure el stock
• Garantía de calidad incluida

NO PIERDAS ESTA OPORTUNIDAD:
Cada día que esperas, más personas descubren ${productName}. No te quedes sin el tuyo. Este producto en ${category} es exactamente lo que necesitas, y ahora está disponible.

VENTAJAS EXCLUSIVAS:
✓ Precio especial por tiempo limitado
✓ Envío express disponible
✓ Garantía completa
✓ Atención personalizada

ACTÚA AHORA:
${productName} está esperando por ti. No dejes que alguien más se lleve el último. Compra ahora y asegura tu producto antes de que se agote.

⏰ Esta oferta no durará para siempre. Stock limitado.`;
    }
  },
  {
    id: '10',
    name: 'Template Educativo',
    keywords: ['educativo', 'información', 'guía'],
    template: (productName, category, price) => {
      return `Guía completa: ${productName}

TODO LO QUE NECESITAS SABER SOBRE ${productName.toUpperCase()}:

¿QUÉ ES?
${productName} es un producto destacado en la categoría de ${category}, diseñado para ofrecerte la mejor experiencia posible.

CARACTERÍSTICAS PRINCIPALES:
1. Calidad Superior: Materiales seleccionados y procesos de fabricación cuidadosos
2. Diseño Funcional: Pensado para ser práctico y estético a la vez
3. Durabilidad: Construido para durar y ofrecerte valor a largo plazo
4. Precio Justo: $${price.toLocaleString('es-AR')} por calidad premium

CÓMO ELEGIR EL PRODUCTO CORRECTO:
Al buscar productos en ${category}, es importante considerar:
• Calidad sobre cantidad
• Reputación del vendedor
• Garantías y políticas de devolución
• Atención al cliente

POR QUÉ ${productName.toUpperCase()}:
Este producto cumple con todos los criterios importantes. No es solo una compra, es una inversión inteligente en calidad.

INFORMACIÓN ADICIONAL:
Nuestro equipo está disponible para responder cualquier pregunta sobre ${productName}. Compra con confianza y conocimiento.`;
    }
  },
  {
    id: '11',
    name: 'Template Valor y Ahorro',
    keywords: ['valor', 'ahorro', 'inversión'],
    template: (productName, category, price) => {
      return `${productName} - Máximo valor, mejor precio

¿BUSCAS CALIDAD SIN GASTAR DE MÁS?

${productName.toUpperCase()} ES LA RESPUESTA:

INVERSIÓN INTELIGENTE:
Por solo $${price.toLocaleString('es-AR')}, obtienes un producto de ${category} que normalmente costaría mucho más. Hemos eliminado los intermediarios para ofrecerte el mejor precio.

LO QUE OBTIENES:
✓ Producto de calidad premium
✓ Garantía completa incluida
✓ Envío seguro y rápido
✓ Atención al cliente personalizada
✓ Valor excepcional por tu dinero

COMPARACIÓN DE PRECIOS:
Compara ${productName} con productos similares en ${category} y verás que ofrecemos la mejor relación calidad-precio del mercado. No pagas de más por la marca, pagas por la calidad.

AHORRO REAL:
Al elegir ${productName}, estás haciendo una compra inteligente que te ahorrará dinero a largo plazo. Calidad que dura significa menos reemplazos y más satisfacción.

NO COMPROMETAS LA CALIDAD:
Ahorrar no significa conformarse con menos. ${productName} te da lo mejor de ambos mundos: calidad superior a un precio justo.`;
    }
  },
  {
    id: '12',
    name: 'Template Regalo Perfecto',
    keywords: ['regalo', 'ocasión especial', 'presente'],
    template: (productName, category, price) => {
      return `${productName} - El regalo perfecto para esa persona especial

¿BUSCAS EL REGALO IDEAL?

${productName.toUpperCase()} ES LA SOLUCIÓN:

EL REGALO QUE IMPRESIONA:
${productName} de ${category} es más que un simple producto - es una expresión de cuidado y consideración. Perfecto para cualquier ocasión especial.

¿PARA QUIÉN ES IDEAL?
• Cumpleaños y aniversarios
• Día de la Madre/Padre
• Navidad y fiestas
• Agradecimientos y reconocimientos
• Cualquier momento especial

POR QUÉ ES EL REGALO PERFECTO:
✓ Calidad que se nota y se aprecia
✓ Diseño elegante y atemporal
✓ Precio justo: $${price.toLocaleString('es-AR')}
✓ Empaque especial disponible
✓ Envío con mensaje personalizado

EXPRESA TUS SENTIMIENTOS:
Un regalo dice mucho sobre cómo te sientes. ${productName} comunica calidad, cuidado y atención a los detalles - exactamente lo que quieres transmitir.

SORPRENDE CON CALIDAD:
No regales cualquier cosa. ${productName} muestra que pensaste en la persona y elegiste algo especial. Haz que se sientan valorados.`;
    }
  },
  {
    id: '13',
    name: 'Template Estilo de Vida',
    keywords: ['estilo de vida', 'bienestar', 'mejora personal'],
    template: (productName, category, price) => {
      return `Transforma tu vida con ${productName}

MÁS QUE UN PRODUCTO, UNA EXPERIENCIA:

ELEVA TU ESTILO DE VIDA:
${productName} no es solo un artículo de ${category} - es una herramienta para mejorar tu día a día. Cada detalle ha sido pensado para enriquecer tu experiencia.

BENEFICIOS PARA TU BIENESTAR:
• Mejora tu rutina diaria
• Añade comodidad y practicidad
• Eleva la calidad de tu entorno
• Inversión en tu bienestar personal

INVIERTE EN TI:
Por $${price.toLocaleString('es-AR')}, estás invirtiendo en ti mismo. ${productName} es una elección consciente hacia un estilo de vida mejor y más satisfactorio.

PARA QUIÉN BUSCA MÁS:
Si buscas productos que marquen la diferencia, ${productName} es para ti. No se trata solo de comprar, se trata de elegir calidad de vida.

TU FUTURO MEJOR COMIENZA AQUÍ:
Cada pequeño cambio cuenta. ${productName} es ese cambio positivo que estabas buscando. Elige calidad, elige bienestar, elige ${productName}.`;
    }
  },
  {
    id: '14',
    name: 'Template Especialista',
    keywords: ['experto', 'recomendación profesional', 'asesoría'],
    template: (productName, category, price) => {
      return `Recomendación de expertos: ${productName}

ANÁLISIS PROFESIONAL:

NUESTROS EXPERTOS RECOMIENDAN:
Después de analizar cientos de productos en ${category}, nuestros especialistas han seleccionado ${productName} como una de las mejores opciones disponibles.

CRITERIOS DE SELECCIÓN:
✓ Calidad de materiales y construcción
✓ Relación calidad-precio
✓ Funcionalidad y diseño
✓ Satisfacción del cliente
✓ Durabilidad y rendimiento

POR QUÉ LOS EXPERTOS LO ELIGEN:
${productName} destaca en todos los criterios importantes. No es una recomendación al azar - es el resultado de un análisis profesional exhaustivo.

INVERSIÓN RECOMENDADA:
A $${price.toLocaleString('es-AR')}, ${productName} representa una excelente inversión en ${category}. Los expertos coinciden: calidad que vale cada peso.

CONFÍA EN LA EXPERIENCIA:
No tienes que ser un experto para elegir bien. Nosotros ya hicimos el trabajo por ti. ${productName} es la elección inteligente respaldada por profesionales.`;
    }
  },
  {
    id: '15',
    name: 'Template Simple y Directo',
    keywords: ['directo', 'claro', 'sin complicaciones'],
    template: (productName, category, price) => {
      return `${productName}

Producto de calidad en ${category}.

PRECIO: $${price.toLocaleString('es-AR')}

CARACTERÍSTICAS:
• Calidad garantizada
• Envío rápido
• Atención al cliente
• Garantía incluida

${productName} es exactamente lo que necesitas. Sin complicaciones, sin sorpresas. Solo calidad a un precio justo.

Compra con confianza.`;
    }
  }
];

/**
 * Obtiene un template aleatorio para un producto
 */
export const getRandomTemplate = (): ProductDescriptionTemplate => {
  const randomIndex = Math.floor(Math.random() * productDescriptionTemplates.length);
  return productDescriptionTemplates[randomIndex];
};

/**
 * Genera una descripción usando un template específico
 */
export const generateDescription = (
  templateId: string,
  productName: string,
  category: string,
  price: number,
  features?: string[]
): string => {
  const template = productDescriptionTemplates.find(t => t.id === templateId);
  if (!template) {
    return getRandomTemplate().template(productName, category, price, features);
  }
  return template.template(productName, category, price, features);
};

