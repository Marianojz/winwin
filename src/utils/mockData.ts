import { Category } from '../types';

// Categorías comunes en webs de subastas y e-commerce
export const mockCategories: Category[] = [
  { id: '1', name: 'Electrónica', description: 'Dispositivos electrónicos', icon: '📱' },
  { id: '2', name: 'Moda', description: 'Ropa y accesorios', icon: '👕' },
  { id: '3', name: 'Hogar', description: 'Artículos para el hogar', icon: '🏠' },
  { id: '4', name: 'Deportes', description: 'Equipamiento deportivo', icon: '⚽' },
  { id: '5', name: 'Juguetes y Juegos', description: 'Juguetes y videojuegos', icon: '🎮' },
  { id: '6', name: 'Libros', description: 'Libros y revistas', icon: '📚' },
  { id: '7', name: 'Automotriz', description: 'Accesorios y repuestos para autos', icon: '🚗' },
  { id: '8', name: 'Belleza y Cuidado Personal', description: 'Cosméticos y productos de belleza', icon: '💄' },
  { id: '9', name: 'Herramientas', description: 'Herramientas y maquinaria', icon: '🔧' },
  { id: '10', name: 'Música e Instrumentos', description: 'Instrumentos musicales y audio', icon: '🎵' },
  { id: '11', name: 'Arte y Coleccionables', description: 'Arte, antigüedades y objetos coleccionables', icon: '🎨' },
  { id: '12', name: 'Jardín y Exterior', description: 'Productos para jardín y exterior', icon: '🌱' },
  { id: '13', name: 'Mascotas', description: 'Alimentos y accesorios para mascotas', icon: '🐾' },
  { id: '14', name: 'Salud y Fitness', description: 'Equipamiento de salud y fitness', icon: '💪' },
  { id: '15', name: 'Viajes y Turismo', description: 'Equipaje y accesorios de viaje', icon: '✈️' }
];

// Ya NO exportamos datos de ejemplo (auctions, products, users)
// Todo viene de Firebase ahora
