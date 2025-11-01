// Lista de stickers disponibles para productos y subastas
export const availableStickers = [
  { id: 'new', label: '🆕 Nuevo', icon: '🆕' },
  { id: 'hot', label: '🔥 Hot', icon: '🔥' },
  { id: 'sale', label: '🏷️ En Oferta', icon: '🏷️' },
  { id: 'flash', label: '⚡ Flash', icon: '⚡' },
  { id: 'featured', label: '⭐ Destacado', icon: '⭐' },
  { id: 'limited', label: '⏰ Limitado', icon: '⏰' },
  { id: 'exclusive', label: '👑 Exclusivo', icon: '👑' },
  { id: 'trending', label: '📈 Trending', icon: '📈' },
  { id: 'best-seller', label: '🏆 Más Vendido', icon: '🏆' },
  { id: 'popular', label: '❤️ Popular', icon: '❤️' },
  { id: 'free-shipping', label: '🚚 Envío Gratis', icon: '🚚' },
  { id: 'gift', label: '🎁 Regalo', icon: '🎁' },
  { id: 'verified', label: '✅ Verificado', icon: '✅' },
  { id: 'quality', label: '💎 Calidad', icon: '💎' },
  { id: 'eco', label: '🌱 Eco', icon: '🌱' }
];

export const getStickerById = (id: string) => {
  return availableStickers.find(s => s.id === id);
};

export const getStickerLabel = (id: string) => {
  const sticker = getStickerById(id);
  return sticker ? sticker.label : id;
};

