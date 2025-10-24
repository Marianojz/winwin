import { Category } from '../types';

// Categorías reales del sitio (estas SI las mantenemos)
export const mockCategories: Category[] = [
  { id: '1', name: 'Electrónica', description: 'Dispositivos electrónicos', icon: '📱' },
  { id: '2', name: 'Moda', description: 'Ropa y accesorios', icon: '👕' },
  { id: '3', name: 'Hogar', description: 'Artículos para el hogar', icon: '🏠' },
  { id: '4', name: 'Deportes', description: 'Equipamiento deportivo', icon: '⚽' },
  { id: '5', name: 'Juguetes', description: 'Juguetes y juegos', icon: '🎮' },
  { id: '6', name: 'Libros', description: 'Libros y revistas', icon: '📚' }
];

// Ya NO exportamos datos de ejemplo (auctions, products, users)
// Todo viene de Firebase ahora
