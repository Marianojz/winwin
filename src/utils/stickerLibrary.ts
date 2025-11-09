// Librería de Stickers - Mínimo 50 stickers variados
import { LogoSticker } from '../types/homeConfig';

export interface StickerItem {
  id: string;
  emoji: string;
  tags: string[];
  keywords: string[];
  category?: string;
}

// Librería base de stickers (50+ stickers)
export const STICKER_LIBRARY: StickerItem[] = [
  // Festivos
  { id: 'fest-1', emoji: '🎉', tags: ['festivo', 'celebración', 'novedad'], keywords: ['fiesta', 'celebrar', 'alegría'] },
  { id: 'fest-2', emoji: '🎊', tags: ['festivo', 'celebración'], keywords: ['confeti', 'fiesta'] },
  { id: 'fest-3', emoji: '🎈', tags: ['festivo', 'celebración'], keywords: ['globos', 'fiesta'] },
  { id: 'fest-4', emoji: '🎁', tags: ['festivo', 'regalo'], keywords: ['regalo', 'sorpresa'] },
  { id: 'fest-5', emoji: '🎂', tags: ['festivo', 'cumpleaños'], keywords: ['cumpleaños', 'torta'] },
  
  // Urgentes
  { id: 'urg-1', emoji: '⚡', tags: ['urgente', 'novedad'], keywords: ['rápido', 'flash', 'velocidad'] },
  { id: 'urg-2', emoji: '🔥', tags: ['urgente', 'hot'], keywords: ['caliente', 'tendencia', 'popular'] },
  { id: 'urg-3', emoji: '🚨', tags: ['urgente', 'advertencia'], keywords: ['alerta', 'importante'] },
  { id: 'urg-4', emoji: '⏰', tags: ['urgente', 'tiempo'], keywords: ['tiempo', 'limitado', 'oferta'] },
  { id: 'urg-5', emoji: '💥', tags: ['urgente', 'impacto'], keywords: ['explosivo', 'impacto'] },
  
  // Celebración
  { id: 'cel-1', emoji: '🎊', tags: ['celebración', 'festivo'], keywords: ['celebrar', 'fiesta'] },
  { id: 'cel-2', emoji: '🥳', tags: ['celebración', 'alegría'], keywords: ['fiesta', 'alegría'] },
  { id: 'cel-3', emoji: '🎪', tags: ['celebración', 'especial'], keywords: ['especial', 'evento'] },
  { id: 'cel-4', emoji: '🎭', tags: ['celebración', 'arte'], keywords: ['arte', 'cultura'] },
  { id: 'cel-5', emoji: '🎨', tags: ['celebración', 'creativo'], keywords: ['creativo', 'arte'] },
  
  // Advertencia
  { id: 'adv-1', emoji: '⚠️', tags: ['advertencia', 'importante'], keywords: ['advertencia', 'cuidado'] },
  { id: 'adv-2', emoji: '🚧', tags: ['advertencia', 'construcción'], keywords: ['en construcción', 'trabajo'] },
  { id: 'adv-3', emoji: '⛔', tags: ['advertencia', 'prohibido'], keywords: ['prohibido', 'no'] },
  { id: 'adv-4', emoji: '🛑', tags: ['advertencia', 'stop'], keywords: ['detener', 'parar'] },
  { id: 'adv-5', emoji: '🔴', tags: ['advertencia', 'rojo'], keywords: ['rojo', 'alerta'] },
  
  // Novedad
  { id: 'nov-1', emoji: '✨', tags: ['novedad', 'brillante'], keywords: ['nuevo', 'brillante', 'especial'] },
  { id: 'nov-2', emoji: '⭐', tags: ['novedad', 'destacado'], keywords: ['estrella', 'destacado'] },
  { id: 'nov-3', emoji: '🌟', tags: ['novedad', 'brillante'], keywords: ['brillante', 'especial'] },
  { id: 'nov-4', emoji: '💫', tags: ['novedad', 'mágico'], keywords: ['mágico', 'especial'] },
  { id: 'nov-5', emoji: '🆕', tags: ['novedad', 'nuevo'], keywords: ['nuevo', 'reciente'] },
  
  // Navidad
  { id: 'nav-1', emoji: '🎄', tags: ['navidad', 'festivo'], keywords: ['árbol', 'navidad'] },
  { id: 'nav-2', emoji: '🎅', tags: ['navidad', 'festivo'], keywords: ['santa', 'navidad'] },
  { id: 'nav-3', emoji: '❄️', tags: ['navidad', 'invierno'], keywords: ['nieve', 'frío'] },
  { id: 'nav-4', emoji: '⛄', tags: ['navidad', 'invierno'], keywords: ['muñeco', 'nieve'] },
  { id: 'nav-5', emoji: '🎁', tags: ['navidad', 'regalo'], keywords: ['regalo', 'navidad'] },
  
  // Año Nuevo
  { id: 'año-1', emoji: '🎆', tags: ['año nuevo', 'festivo'], keywords: ['fuegos', 'año nuevo'] },
  { id: 'año-2', emoji: '🎇', tags: ['año nuevo', 'festivo'], keywords: ['fuegos', 'celebración'] },
  { id: 'año-3', emoji: '🥂', tags: ['año nuevo', 'celebración'], keywords: ['brindis', 'celebrar'] },
  { id: 'año-4', emoji: '🍾', tags: ['año nuevo', 'celebración'], keywords: ['champagne', 'celebrar'] },
  { id: 'año-5', emoji: '⏰', tags: ['año nuevo', 'tiempo'], keywords: ['reloj', 'tiempo'] },
  
  // San Valentín
  { id: 'val-1', emoji: '❤️', tags: ['amor', 'san valentín'], keywords: ['amor', 'corazón'] },
  { id: 'val-2', emoji: '💕', tags: ['amor', 'san valentín'], keywords: ['amor', 'corazones'] },
  { id: 'val-3', emoji: '💖', tags: ['amor', 'san valentín'], keywords: ['amor', 'brillante'] },
  { id: 'val-4', emoji: '🌹', tags: ['amor', 'san valentín'], keywords: ['rosa', 'romántico'] },
  { id: 'val-5', emoji: '💌', tags: ['amor', 'san valentín'], keywords: ['carta', 'amor'] },
  
  // Halloween
  { id: 'hal-1', emoji: '🎃', tags: ['halloween', 'festivo'], keywords: ['calabaza', 'halloween'] },
  { id: 'hal-2', emoji: '👻', tags: ['halloween', 'miedo'], keywords: ['fantasma', 'miedo'] },
  { id: 'hal-3', emoji: '🦇', tags: ['halloween', 'miedo'], keywords: ['murciélago', 'noche'] },
  { id: 'hal-4', emoji: '🕷️', tags: ['halloween', 'miedo'], keywords: ['araña', 'miedo'] },
  { id: 'hal-5', emoji: '💀', tags: ['halloween', 'miedo'], keywords: ['calavera', 'muerte'] },
  
  // Verano
  { id: 'ver-1', emoji: '☀️', tags: ['verano', 'sol'], keywords: ['sol', 'calor'] },
  { id: 'ver-2', emoji: '🏖️', tags: ['verano', 'playa'], keywords: ['playa', 'vacaciones'] },
  { id: 'ver-3', emoji: '🌊', tags: ['verano', 'playa'], keywords: ['ola', 'mar'] },
  { id: 'ver-4', emoji: '🍦', tags: ['verano', 'comida'], keywords: ['helado', 'fresco'] },
  { id: 'ver-5', emoji: '🌴', tags: ['verano', 'tropical'], keywords: ['palmera', 'tropical'] },
  
  // Invierno
  { id: 'inv-1', emoji: '❄️', tags: ['invierno', 'frío'], keywords: ['nieve', 'frío'] },
  { id: 'inv-2', emoji: '⛄', tags: ['invierno', 'frío'], keywords: ['muñeco', 'nieve'] },
  { id: 'inv-3', emoji: '🧣', tags: ['invierno', 'ropa'], keywords: ['bufanda', 'abrigo'] },
  { id: 'inv-4', emoji: '☕', tags: ['invierno', 'bebida'], keywords: ['café', 'caliente'] },
  { id: 'inv-5', emoji: '🔥', tags: ['invierno', 'calor'], keywords: ['fuego', 'calor'] },
  
  // Ofertas
  { id: 'ofe-1', emoji: '💰', tags: ['oferta', 'dinero'], keywords: ['dinero', 'ahorro'] },
  { id: 'ofe-2', emoji: '💸', tags: ['oferta', 'dinero'], keywords: ['dinero', 'gasto'] },
  { id: 'ofe-3', emoji: '💳', tags: ['oferta', 'pago'], keywords: ['tarjeta', 'pago'] },
  { id: 'ofe-4', emoji: '🎯', tags: ['oferta', 'objetivo'], keywords: ['objetivo', 'meta'] },
  { id: 'ofe-5', emoji: '🏆', tags: ['oferta', 'premio'], keywords: ['trofeo', 'ganador'] },
  
  // Emociones
  { id: 'emo-1', emoji: '😊', tags: ['feliz', 'emoción'], keywords: ['feliz', 'sonrisa'] },
  { id: 'emo-2', emoji: '😍', tags: ['amor', 'emoción'], keywords: ['enamorado', 'amor'] },
  { id: 'emo-3', emoji: '🤩', tags: ['impresionado', 'emoción'], keywords: ['impresionado', 'wow'] },
  { id: 'emo-4', emoji: '🎉', tags: ['celebración', 'emoción'], keywords: ['celebrar', 'fiesta'] },
  { id: 'emo-5', emoji: '🥰', tags: ['amor', 'emoción'], keywords: ['amor', 'cariño'] },
  
  // Acción
  { id: 'acc-1', emoji: '🚀', tags: ['acción', 'velocidad'], keywords: ['cohete', 'rápido'] },
  { id: 'acc-2', emoji: '⚡', tags: ['acción', 'velocidad'], keywords: ['rayo', 'rápido'] },
  { id: 'acc-3', emoji: '💨', tags: ['acción', 'velocidad'], keywords: ['viento', 'rápido'] },
  { id: 'acc-4', emoji: '🏃', tags: ['acción', 'movimiento'], keywords: ['correr', 'movimiento'] },
  { id: 'acc-5', emoji: '🎬', tags: ['acción', 'entretenimiento'], keywords: ['película', 'acción'] },
  
  // Tecnología
  { id: 'tec-1', emoji: '💻', tags: ['tecnología', 'digital'], keywords: ['computadora', 'digital'] },
  { id: 'tec-2', emoji: '📱', tags: ['tecnología', 'móvil'], keywords: ['teléfono', 'móvil'] },
  { id: 'tec-3', emoji: '🎮', tags: ['tecnología', 'juego'], keywords: ['juego', 'entretenimiento'] },
  { id: 'tec-4', emoji: '⌚', tags: ['tecnología', 'smart'], keywords: ['reloj', 'smart'] },
  { id: 'tec-5', emoji: '🔋', tags: ['tecnología', 'energía'], keywords: ['batería', 'energía'] },
  
  // Comida
  { id: 'com-1', emoji: '🍕', tags: ['comida', 'pizza'], keywords: ['pizza', 'comida'] },
  { id: 'com-2', emoji: '🍔', tags: ['comida', 'hamburguesa'], keywords: ['hamburguesa', 'comida'] },
  { id: 'com-3', emoji: '🍰', tags: ['comida', 'postre'], keywords: ['torta', 'dulce'] },
  { id: 'com-4', emoji: '☕', tags: ['comida', 'bebida'], keywords: ['café', 'bebida'] },
  { id: 'com-5', emoji: '🍎', tags: ['comida', 'fruta'], keywords: ['manzana', 'saludable'] },
  
  // Deportes
  { id: 'dep-1', emoji: '⚽', tags: ['deporte', 'fútbol'], keywords: ['fútbol', 'deporte'] },
  { id: 'dep-2', emoji: '🏀', tags: ['deporte', 'básquet'], keywords: ['básquet', 'deporte'] },
  { id: 'dep-3', emoji: '🎾', tags: ['deporte', 'tenis'], keywords: ['tenis', 'deporte'] },
  { id: 'dep-4', emoji: '🏐', tags: ['deporte', 'vóley'], keywords: ['vóley', 'deporte'] },
  { id: 'dep-5', emoji: '🏈', tags: ['deporte', 'fútbol americano'], keywords: ['fútbol americano', 'deporte'] },
  
  // Música
  { id: 'mus-1', emoji: '🎵', tags: ['música', 'arte'], keywords: ['música', 'sonido'] },
  { id: 'mus-2', emoji: '🎶', tags: ['música', 'arte'], keywords: ['música', 'notas'] },
  { id: 'mus-3', emoji: '🎸', tags: ['música', 'instrumento'], keywords: ['guitarra', 'música'] },
  { id: 'mus-4', emoji: '🎹', tags: ['música', 'instrumento'], keywords: ['piano', 'música'] },
  { id: 'mus-5', emoji: '🥁', tags: ['música', 'instrumento'], keywords: ['batería', 'música'] },
  
  // Animales
  { id: 'ani-1', emoji: '🐶', tags: ['animal', 'mascota'], keywords: ['perro', 'mascota'] },
  { id: 'ani-2', emoji: '🐱', tags: ['animal', 'mascota'], keywords: ['gato', 'mascota'] },
  { id: 'ani-3', emoji: '🐰', tags: ['animal', 'mascota'], keywords: ['conejo', 'mascota'] },
  { id: 'ani-4', emoji: '🐻', tags: ['animal', 'oso'], keywords: ['oso', 'animal'] },
  { id: 'ani-5', emoji: '🦁', tags: ['animal', 'salvaje'], keywords: ['león', 'salvaje'] },
  
  // Naturaleza
  { id: 'nat-1', emoji: '🌳', tags: ['naturaleza', 'árbol'], keywords: ['árbol', 'naturaleza'] },
  { id: 'nat-2', emoji: '🌺', tags: ['naturaleza', 'flor'], keywords: ['flor', 'naturaleza'] },
  { id: 'nat-3', emoji: '🦋', tags: ['naturaleza', 'insecto'], keywords: ['mariposa', 'naturaleza'] },
  { id: 'nat-4', emoji: '🌈', tags: ['naturaleza', 'arcoíris'], keywords: ['arcoíris', 'color'] },
  { id: 'nat-5', emoji: '🌙', tags: ['naturaleza', 'luna'], keywords: ['luna', 'noche'] },
  
  // Viajes
  { id: 'via-1', emoji: '✈️', tags: ['viaje', 'transporte'], keywords: ['avión', 'viaje'] },
  { id: 'via-2', emoji: '🚗', tags: ['viaje', 'transporte'], keywords: ['auto', 'viaje'] },
  { id: 'via-3', emoji: '🚢', tags: ['viaje', 'transporte'], keywords: ['barco', 'viaje'] },
  { id: 'via-4', emoji: '🗺️', tags: ['viaje', 'mapa'], keywords: ['mapa', 'viaje'] },
  { id: 'via-5', emoji: '🧳', tags: ['viaje', 'equipaje'], keywords: ['maleta', 'viaje'] },
  
  // Trabajo
  { id: 'tra-1', emoji: '💼', tags: ['trabajo', 'oficina'], keywords: ['maletín', 'trabajo'] },
  { id: 'tra-2', emoji: '📊', tags: ['trabajo', 'datos'], keywords: ['gráfico', 'datos'] },
  { id: 'tra-3', emoji: '📈', tags: ['trabajo', 'crecimiento'], keywords: ['crecimiento', 'negocio'] },
  { id: 'tra-4', emoji: '💡', tags: ['trabajo', 'idea'], keywords: ['idea', 'innovación'] },
  { id: 'tra-5', emoji: '🎯', tags: ['trabajo', 'objetivo'], keywords: ['objetivo', 'meta'] },
  
  // Salud
  { id: 'sal-1', emoji: '💊', tags: ['salud', 'medicina'], keywords: ['medicina', 'salud'] },
  { id: 'sal-2', emoji: '🏥', tags: ['salud', 'hospital'], keywords: ['hospital', 'salud'] },
  { id: 'sal-3', emoji: '❤️', tags: ['salud', 'corazón'], keywords: ['corazón', 'salud'] },
  { id: 'sal-4', emoji: '🏃', tags: ['salud', 'ejercicio'], keywords: ['ejercicio', 'salud'] },
  { id: 'sal-5', emoji: '🧘', tags: ['salud', 'bienestar'], keywords: ['yoga', 'bienestar'] },
  
  // Educación
  { id: 'edu-1', emoji: '📚', tags: ['educación', 'libros'], keywords: ['libros', 'estudio'] },
  { id: 'edu-2', emoji: '✏️', tags: ['educación', 'escritura'], keywords: ['lápiz', 'escribir'] },
  { id: 'edu-3', emoji: '🎓', tags: ['educación', 'graduación'], keywords: ['graduación', 'estudio'] },
  { id: 'edu-4', emoji: '📝', tags: ['educación', 'notas'], keywords: ['notas', 'estudio'] },
  { id: 'edu-5', emoji: '🔬', tags: ['educación', 'ciencia'], keywords: ['ciencia', 'experimento'] },
  
  // Moda
  { id: 'mod-1', emoji: '👗', tags: ['moda', 'ropa'], keywords: ['vestido', 'moda'] },
  { id: 'mod-2', emoji: '👠', tags: ['moda', 'zapatos'], keywords: ['zapatos', 'moda'] },
  { id: 'mod-3', emoji: '👜', tags: ['moda', 'accesorio'], keywords: ['bolso', 'moda'] },
  { id: 'mod-4', emoji: '💍', tags: ['moda', 'joyería'], keywords: ['anillo', 'joyería'] },
  { id: 'mod-5', emoji: '👒', tags: ['moda', 'accesorio'], keywords: ['sombrero', 'moda'] },
  
  // Hogar
  { id: 'hog-1', emoji: '🏠', tags: ['hogar', 'casa'], keywords: ['casa', 'hogar'] },
  { id: 'hog-2', emoji: '🛋️', tags: ['hogar', 'mueble'], keywords: ['sofá', 'mueble'] },
  { id: 'hog-3', emoji: '🛏️', tags: ['hogar', 'mueble'], keywords: ['cama', 'dormir'] },
  { id: 'hog-4', emoji: '🍳', tags: ['hogar', 'cocina'], keywords: ['cocina', 'comida'] },
  { id: 'hog-5', emoji: '🛁', tags: ['hogar', 'baño'], keywords: ['baño', 'higiene'] },
  
  // Especiales
  { id: 'esp-1', emoji: '🎪', tags: ['especial', 'circo'], keywords: ['circo', 'especial'] },
  { id: 'esp-2', emoji: '🎭', tags: ['especial', 'teatro'], keywords: ['teatro', 'arte'] },
  { id: 'esp-3', emoji: '🎨', tags: ['especial', 'arte'], keywords: ['arte', 'creativo'] },
  { id: 'esp-4', emoji: '🎬', tags: ['especial', 'cine'], keywords: ['cine', 'película'] },
  { id: 'esp-5', emoji: '🎤', tags: ['especial', 'música'], keywords: ['microfono', 'música'] },
];

// Función para buscar stickers por tags o keywords
export const searchStickers = (query: string): StickerItem[] => {
  if (!query.trim()) return STICKER_LIBRARY;
  
  const lowerQuery = query.toLowerCase();
  return STICKER_LIBRARY.filter(sticker => 
    sticker.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    sticker.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery)) ||
    sticker.emoji.includes(query)
  );
};

// Función para obtener stickers por tag
export const getStickersByTag = (tag: string): StickerItem[] => {
  return STICKER_LIBRARY.filter(sticker => 
    sticker.tags.includes(tag.toLowerCase())
  );
};

// Función para obtener todos los tags únicos
export const getAllTags = (): string[] => {
  const allTags = new Set<string>();
  STICKER_LIBRARY.forEach(sticker => {
    sticker.tags.forEach(tag => allTags.add(tag));
  });
  return Array.from(allTags).sort();
};

