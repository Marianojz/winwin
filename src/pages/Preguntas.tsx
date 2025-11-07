import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const Preguntas = () => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  const faqs: FAQItem[] = [
    // Categoría: General
    {
      id: 1,
      question: '¿Qué es Clikio?',
      answer: 'Clikio es la plataforma líder de subastas y ventas online en Argentina. Ofrecemos dos modalidades: subastas en tiempo real donde podés ofertar por productos únicos, y una tienda tradicional con compra directa. Todas las transacciones son seguras y están protegidas.',
      category: 'general'
    },
    {
      id: 2,
      question: '¿Cómo me registro en la plataforma?',
      answer: 'Para registrarte, hacé clic en "Registrarse" en la esquina superior derecha. Completá el formulario con tu nombre, email, DNI y dirección. Luego deberás marcar tu ubicación en el mapa para calcular costos de envío. Una vez completado el registro, recibirás un email de verificación. Una vez registrado, podrás ofertar en subastas y comprar en la tienda.',
      category: 'general'
    },
    {
      id: 3,
      question: '¿Puedo publicar productos o crear subastas?',
      answer: 'No, solo los administradores de la plataforma pueden publicar productos y crear subastas. Los usuarios regulares pueden participar ofertando en subastas existentes y realizar compras en la tienda. Esta política asegura que todos los productos sean verificados y cumplan con nuestros estándares de calidad.',
      category: 'general'
    },
    {
      id: 4,
      question: '¿Es seguro comprar en Clikio?',
      answer: 'Sí, es completamente seguro. Todos los pagos se procesan a través de MercadoPago, una plataforma líder en seguridad de pagos. Además, verificamos la identidad de todos los usuarios mediante DNI y protegemos tus datos según la Ley 25.326 de Protección de Datos Personales de Argentina.',
      category: 'general'
    },
    {
      id: 5,
      question: '¿Necesito validar mi identidad?',
      answer: 'Sí, para garantizar la seguridad de todos los usuarios, requerimos que valides tu identidad con tu DNI al momento del registro. Esto nos ayuda a prevenir fraudes y crear un ambiente de confianza.',
      category: 'general'
    },

    // Categoría: Subastas
    {
      id: 6,
      question: '¿Cómo funcionan las subastas?',
      answer: 'Las subastas son competencias en tiempo real donde múltiples usuarios ofertan por un producto. Cada oferta debe ser múltiplo de $500. La subasta tiene un tiempo límite, y el usuario que tenga la oferta más alta cuando termine el tiempo, gana el producto. Las ofertas son vinculantes y no pueden retractarse.',
      category: 'subastas'
    },
    {
      id: 7,
      question: '¿Cuál es el monto mínimo para ofertar?',
      answer: 'Todas las ofertas deben ser múltiplos de $500. Por ejemplo, podés ofertar $500, $1000, $1500, pero no $750 o $1200. Esto facilita el proceso de ofertas y hace que sea más justo para todos los participantes.',
      category: 'subastas'
    },
    {
      id: 8,
      question: '¿Puedo cancelar mi oferta?',
      answer: 'No, todas las ofertas son vinculantes y no pueden cancelarse. Antes de ofertar, asegurate de estar seguro de tu decisión y de que tenés los fondos disponibles para completar la compra si ganás.',
      category: 'subastas'
    },
    {
      id: 9,
      question: '¿Qué pasa si gano una subasta?',
      answer: 'Si ganás una subasta, recibirás una notificación por email y en la plataforma. Tenés 48 horas para completar el pago a través de MercadoPago. Una vez confirmado el pago, coordinaremos el envío o retiro del producto.',
      category: 'subastas'
    },
    {
      id: 10,
      question: '¿Qué sucede si no pago dentro de las 48 horas?',
      answer: 'Si no completás el pago dentro de las 48 horas, la subasta se republica automáticamente y tu cuenta puede recibir una advertencia. El incumplimiento reiterado puede resultar en la suspensión de tu cuenta.',
      category: 'subastas'
    },
    {
      id: 11,
      question: '¿Qué es el precio de "Compra Ya"?',
      answer: 'Es una opción que algunos productos tienen para comprar inmediatamente sin participar en la subasta. Si alguien usa la opción "Compra Ya", la subasta finaliza automáticamente y ese usuario se lleva el producto al precio establecido.',
      category: 'subastas'
    },
    {
      id: 12,
      question: '¿Se extiende el tiempo de la subasta?',
      answer: 'Sí, si se realizan ofertas en los últimos minutos de la subasta, el tiempo puede extenderse automáticamente para dar oportunidad a otros usuarios de contra-ofertar. Esto evita las ofertas de último segundo.',
      category: 'subastas'
    },

    // Categoría: Tienda
    {
      id: 13,
      question: '¿Cómo compro en la tienda?',
      answer: 'En la tienda podés comprar productos de forma tradicional. Simplemente agregá los productos que te interesen al carrito, revisá tu orden y procedé al pago con MercadoPago. Es importante saber que el carrito no asegura el stock.',
      category: 'tienda'
    },
    {
      id: 13,
      question: '¿El carrito asegura el stock?',
      answer: 'No, el carrito no asegura el stock. El stock se descuenta únicamente cuando confirmás y pagás la compra. Si otro usuario compra el producto antes que vos, ya no estará disponible. Recomendamos finalizar la compra lo antes posible.',
      category: 'tienda'
    },
    {
      id: 14,
      question: '¿El stock es en tiempo real?',
      answer: 'Sí, el stock que ves en la plataforma es en tiempo real. Sin embargo, como el carrito no asegura el stock, puede que un producto se agote mientras estás en el proceso de compra.',
      category: 'tienda'
    },
    {
      id: 15,
      question: '¿Puedo devolver un producto de la tienda?',
      answer: 'Sí, según la Ley de Defensa del Consumidor (Ley 24.240), tenés 10 días corridos desde la recepción del producto para ejercer tu derecho de arrepentimiento. El producto debe estar sin usar y en su empaque original. Los gastos de devolución corren por tu cuenta.',
      category: 'tienda'
    },

    // Categoría: Pagos
    {
      id: 19,
      question: '¿Qué métodos de pago aceptan?',
      answer: 'Todos los pagos se procesan a través de MercadoPago, donde podés usar tarjetas de crédito, débito, dinero en cuenta de MercadoPago, Rapipago, Pago Fácil y otros medios de pago disponibles en la plataforma.',
      category: 'pagos'
    },
    {
      id: 20,
      question: '¿Los precios incluyen IVA?',
      answer: 'Sí, todos los precios mostrados en la plataforma incluyen IVA cuando corresponda. No hay cargos ocultos, excepto los costos de envío que se calculan según tu ubicación.',
      category: 'pagos'
    },
    {
      id: 21,
      question: '¿Cuándo se me cobra?',
      answer: 'El cobro se realiza inmediatamente cuando confirmás la compra en la tienda, o cuando ganás una subasta y completás el pago dentro de las 48 horas establecidas.',
      category: 'pagos'
    },
    {
      id: 22,
      question: '¿Puedo obtener un reembolso?',
      answer: 'Sí, podés obtener un reembolso en los siguientes casos: (1) Si ejercés tu derecho de arrepentimiento dentro de los 10 días en compras de tienda, (2) Si el producto tiene defectos de fabricación, (3) Si el producto no coincide con la descripción. Los productos ganados en subastas no son reembolsables excepto por defectos.',
      category: 'pagos'
    },

    // Categoría: Envíos
    {
      id: 23,
      question: '¿Cómo se calculan los costos de envío?',
      answer: 'Los costos de envío se calculan automáticamente según la ubicación que marcaste en el mapa durante el registro. El cálculo se basa en la distancia entre nuestro depósito y tu domicilio, más el peso del producto.',
      category: 'envios'
    },
    {
      id: 21,
      question: '¿Cuánto tarda el envío?',
      answer: 'Los tiempos de entrega varían según tu ubicación. En general: (1) Capital Federal y GBA: 2-5 días hábiles, (2) Interior del país: 5-10 días hábiles. Te enviaremos un código de seguimiento para que puedas rastrear tu pedido.',
      category: 'envios'
    },
    {
      id: 22,
      question: '¿Puedo retirar personalmente?',
      answer: 'Sí, podés coordinar el retiro personal de tu compra en nuestro depósito en Buenos Aires. Esta opción está disponible al momento de finalizar la compra y no tiene costo adicional.',
      category: 'envios'
    },
    {
      id: 23,
      question: '¿Qué hago si mi producto llega dañado?',
      answer: 'Si tu producto llega dañado, debés notificarnos dentro de las 48 horas de recibido. Enviá fotos del daño a través del Centro de Ayuda. Evaluaremos el caso y procederemos con el reembolso o reemplazo según corresponda.',
      category: 'envios'
    },
    {
      id: 24,
      question: '¿Puedo cambiar la dirección de envío?',
      answer: 'Podés cambiar la dirección de envío solo antes de que confirmemos el despacho del producto. Una vez que el paquete está en camino, ya no es posible modificar la dirección. Contactá al Centro de Ayuda lo antes posible si necesitás hacer un cambio.',
      category: 'envios'
    },

    // Categoría: Cuenta
    {
      id: 30,
      question: '¿Cómo cambio mi contraseña?',
      answer: 'Podés cambiar tu contraseña desde tu Perfil. Hacé clic en tu avatar en la esquina superior derecha, seleccioná "Perfil" y luego "Cambiar Contraseña". Necesitarás tu contraseña actual para confirmar el cambio.',
      category: 'cuenta'
    },
    {
      id: 31,
      question: '¿Puedo modificar mi información de registro?',
      answer: 'Sí, podés actualizar tu información personal desde tu Perfil, excepto el DNI que queda fijo una vez verificado. Si necesitás cambiar tu DNI, contactá a nuestro Centro de Ayuda.',
      category: 'cuenta'
    },
    {
      id: 32,
      question: '¿Cómo elimino mi cuenta?',
      answer: 'Si deseás eliminar tu cuenta, contactá a nuestro Centro de Ayuda. Ten en cuenta que no podrás eliminar tu cuenta si tenés subastas activas, compras pendientes o pagos sin resolver.',
      category: 'cuenta'
    },
    {
      id: 33,
      question: '¿Por qué fue suspendida mi cuenta?',
      answer: 'Las cuentas pueden ser suspendidas por: (1) Incumplimiento reiterado de pagos, (2) Violación de términos y condiciones, (3) Conducta fraudulenta, (4) Uso indebido de la plataforma. Si tu cuenta fue suspendida, recibirás un email con los detalles.',
      category: 'cuenta'
    },

    // Categoría: Problemas Técnicos
    {
      id: 34,
      question: 'No puedo iniciar sesión, ¿qué hago?',
      answer: 'Si no podés iniciar sesión, probá: (1) Verificar que tu email y contraseña sean correctos, (2) Usar la opción "Olvidé mi contraseña" para restablecerla, (3) Verificar que tu cuenta no esté suspendida, (4) Limpiar la caché de tu navegador. Si el problema persiste, contactá al Centro de Ayuda.',
      category: 'problemas'
    },
    {
      id: 35,
      question: 'Mi oferta no se registró, ¿por qué?',
      answer: 'Las ofertas pueden no registrarse por: (1) No es múltiplo de $500, (2) La subasta ya finalizó, (3) Tu oferta es menor o igual a la oferta actual, (4) Problemas de conexión a internet. Verificá estos puntos y volvé a intentar.',
      category: 'problemas'
    },
    {
      id: 36,
      question: '¿Qué hago si encuentro un error en la plataforma?',
      answer: 'Si encontrás un error, por favor reportalo a través del Centro de Ayuda incluyendo: (1) Descripción detallada del error, (2) Pasos para reproducirlo, (3) Capturas de pantalla si es posible, (4) Navegador y dispositivo que estás usando. Trabajaremos para solucionarlo lo antes posible.',
      category: 'problemas'
    }
  ];

  const categories = [
    { id: 'todas', label: 'Todas las Preguntas' },
    { id: 'general', label: 'General' },
    { id: 'subastas', label: 'Subastas' },
    { id: 'tienda', label: 'Tienda' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'envios', label: 'Envíos' },
    { id: 'cuenta', label: 'Cuenta' },
    { id: 'problemas', label: 'Problemas Técnicos' }
  ];

  const filteredFaqs = selectedCategory === 'todas' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  const toggleFaq = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Encabezado */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '3rem',
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '1rem',
            color: 'var(--primary)' 
          }}>
            <HelpCircle size={48} />
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Preguntas Frecuentes
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            Encontrá respuestas a las dudas más comunes sobre Clikio
          </p>
        </div>

        {/* Filtros de Categorías */}
        <div style={{ 
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '2rem',
                border: 'none',
                background: selectedCategory === cat.id ? 'var(--primary)' : 'var(--bg-secondary)',
                color: selectedCategory === cat.id ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.9375rem',
                fontWeight: 500,
                transition: 'all 0.3s ease',
                fontFamily: 'Poppins, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== cat.id) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== cat.id) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lista de Preguntas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredFaqs.map(faq => (
            <div 
              key={faq.id}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '2px solid transparent',
                transition: 'all 0.3s ease'
              }}
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: '1rem'
                }}
              >
                <span style={{ 
                  fontSize: '1.0625rem', 
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  {faq.question}
                </span>
                <span style={{ 
                  color: 'var(--primary)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {openId === faq.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </span>
              </button>

              {openId === faq.id && (
                <div style={{
                  padding: '0 1.5rem 1.25rem 1.5rem',
                  color: 'var(--text-secondary)',
                  fontSize: '1rem',
                  lineHeight: '1.7',
                  borderTop: '1px solid var(--bg-tertiary)'
                }}>
                  <div style={{ paddingTop: '1rem' }}>
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sección de Contacto */}
        <div style={{ 
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--bg-secondary)',
          borderRadius: '1rem',
          textAlign: 'center'
        }}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1rem',
            color: 'var(--text-primary)'
          }}>
            ¿No encontraste lo que buscabas?
          </h3>
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: '1.5rem',
            fontSize: '1rem'
          }}>
            Nuestro equipo de soporte está disponible para ayudarte con cualquier consulta
          </p>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <a 
              href="/contacto" 
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Contactar Soporte
            </a>
            <a 
              href="/ayuda" 
              className="btn btn-outline"
              style={{ textDecoration: 'none' }}
            >
              Centro de Ayuda
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preguntas;
