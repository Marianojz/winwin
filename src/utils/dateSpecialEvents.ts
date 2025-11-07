// Utilidad para detectar fechas especiales y stickers automáticos

export interface SpecialEvent {
  type: 'christmas' | 'newyear' | 'cybermonday' | 'blackfriday' | 'valentine' | 'easter' | 'halloween' | 'independence' | 'mothersday' | 'fathersday' | 'childrensday' | 'summer' | 'winter' | 'spring' | 'autumn' | 'custom';
  name: string;
  emoji: string;
  startDate: Date;
  endDate: Date;
}

export const specialEvents: SpecialEvent[] = [
  {
    type: 'christmas',
    name: 'Navidad',
    emoji: '🎄',
    startDate: new Date(new Date().getFullYear(), 11, 1), // 1 de diciembre
    endDate: new Date(new Date().getFullYear(), 11, 31) // 31 de diciembre
  },
  {
    type: 'newyear',
    name: 'Año Nuevo',
    emoji: '🎉',
    startDate: new Date(new Date().getFullYear(), 11, 30), // 30 de diciembre
    endDate: new Date(new Date().getFullYear() + 1, 0, 7) // 7 de enero
  },
  {
    type: 'cybermonday',
    name: 'Cyber Monday',
    emoji: '💻',
    startDate: new Date(new Date().getFullYear(), 10, 27), // Último lunes de noviembre
    endDate: new Date(new Date().getFullYear(), 10, 30) // 30 de noviembre
  },
  {
    type: 'blackfriday',
    name: 'Black Friday',
    emoji: '🛍️',
    startDate: new Date(new Date().getFullYear(), 10, 24), // Viernes después de Thanksgiving
    endDate: new Date(new Date().getFullYear(), 10, 27) // 27 de noviembre
  },
  {
    type: 'valentine',
    name: 'San Valentín',
    emoji: '❤️',
    startDate: new Date(new Date().getFullYear(), 1, 10), // 10 de febrero
    endDate: new Date(new Date().getFullYear(), 1, 16) // 16 de febrero
  },
  {
    type: 'easter',
    name: 'Pascua',
    emoji: '🐰',
    startDate: new Date(new Date().getFullYear(), 2, 20), // Aproximado
    endDate: new Date(new Date().getFullYear(), 3, 10) // Aproximado
  },
  {
    type: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    startDate: new Date(new Date().getFullYear(), 9, 25), // 25 de octubre
    endDate: new Date(new Date().getFullYear(), 10, 2) // 2 de noviembre
  },
  {
    type: 'independence',
    name: 'Día de la Independencia',
    emoji: '🇦🇷',
    startDate: new Date(new Date().getFullYear(), 6, 7), // 9 de julio (Argentina)
    endDate: new Date(new Date().getFullYear(), 6, 11) // 11 de julio
  },
  {
    type: 'mothersday',
    name: 'Día de la Madre',
    emoji: '🌺',
    startDate: new Date(new Date().getFullYear(), 9, 15), // Tercer domingo de octubre (Argentina)
    endDate: new Date(new Date().getFullYear(), 9, 21) // 21 de octubre
  },
  {
    type: 'fathersday',
    name: 'Día del Padre',
    emoji: '👔',
    startDate: new Date(new Date().getFullYear(), 5, 15), // Tercer domingo de junio (Argentina)
    endDate: new Date(new Date().getFullYear(), 5, 21) // 21 de junio
  },
  {
    type: 'childrensday',
    name: 'Día del Niño',
    emoji: '🎈',
    startDate: new Date(new Date().getFullYear(), 7, 15), // Tercer domingo de agosto (Argentina)
    endDate: new Date(new Date().getFullYear(), 7, 21) // 21 de agosto
  },
  {
    type: 'summer',
    name: 'Verano',
    emoji: '☀️',
    startDate: new Date(new Date().getFullYear(), 11, 21), // 21 de diciembre
    endDate: new Date(new Date().getFullYear() + 1, 2, 20) // 20 de marzo
  },
  {
    type: 'winter',
    name: 'Invierno',
    emoji: '❄️',
    startDate: new Date(new Date().getFullYear(), 5, 21), // 21 de junio
    endDate: new Date(new Date().getFullYear(), 8, 20) // 20 de septiembre
  },
  {
    type: 'spring',
    name: 'Primavera',
    emoji: '🌸',
    startDate: new Date(new Date().getFullYear(), 8, 21), // 21 de septiembre
    endDate: new Date(new Date().getFullYear(), 11, 20) // 20 de diciembre
  },
  {
    type: 'autumn',
    name: 'Otoño',
    emoji: '🍂',
    startDate: new Date(new Date().getFullYear(), 2, 21), // 21 de marzo
    endDate: new Date(new Date().getFullYear(), 5, 20) // 20 de junio
  }
];

export function getCurrentSpecialEvents(): SpecialEvent[] {
  const now = new Date();
  return specialEvents.filter(event => {
    return now >= event.startDate && now <= event.endDate;
  });
}

export function getStickerForEvent(type: string): string {
  const event = specialEvents.find(e => e.type === type);
  return event?.emoji || '✨';
}

export function isSpecialEventActive(type: string): boolean {
  const now = new Date();
  const event = specialEvents.find(e => e.type === type);
  if (!event) return false;
  return now >= event.startDate && now <= event.endDate;
}

