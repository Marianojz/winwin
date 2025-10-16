import { Auction, Product, Category, User } from '../types';

export const mockCategories: Category[] = [
  { id: '1', name: 'Electrónica', description: 'Dispositivos electrónicos', icon: '📱' },
  { id: '2', name: 'Moda', description: 'Ropa y accesorios', icon: '👕' },
  { id: '3', name: 'Hogar', description: 'Artículos para el hogar', icon: '🏠' },
  { id: '4', name: 'Deportes', description: 'Equipamiento deportivo', icon: '⚽' },
  { id: '5', name: 'Juguetes', description: 'Juguetes y juegos', icon: '🎮' },
  { id: '6', name: 'Libros', description: 'Libros y revistas', icon: '📚' }
];

export const mockAuctions: Auction[] = [
  {
    id: '1',
    title: 'iPhone 14 Pro Max 256GB',
    description: 'iPhone 14 Pro Max en excelente estado, con caja original y todos los accesorios. Batería al 98%.',
    images: [
      'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=800',
      'https://images.unsplash.com/photo-1678685888555-39d7e8a7df9b?w=800',
      'https://images.unsplash.com/photo-1678911820864-e5839ba15d02?w=800'
    ],
    startPrice: 500000,
    currentPrice: 750000,
    buyNowPrice: 1200000,
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
    status: 'active',
    categoryId: '1',
    bids: [
      {
        id: 'b1',
        auctionId: '1',
        userId: 'u2',
        username: 'María García',
        amount: 750000,
        createdAt: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: 'b2',
        auctionId: '1',
        userId: 'u3',
        username: 'Carlos Rodríguez',
        amount: 700000,
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      }
    ]
  },
  {
    id: '2',
    title: 'Smart TV Samsung 55" 4K',
    description: 'Smart TV Samsung QLED 55 pulgadas, 4K UHD, con HDR y control remoto. Impecable estado.',
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800'
    ],
    startPrice: 300000,
    currentPrice: 450000,
    buyNowPrice: 700000,
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 horas
    status: 'active',
    categoryId: '1',
    bids: [
      {
        id: 'b3',
        auctionId: '2',
        userId: 'u4',
        username: 'Ana Martínez',
        amount: 450000,
        createdAt: new Date(Date.now() - 5 * 60 * 1000)
      }
    ]
  },
  {
    id: '3',
    title: 'PlayStation 5 + 2 Juegos',
    description: 'PS5 con lector de discos, incluye 2 juegos (God of War Ragnarök y Spider-Man 2). Como nueva.',
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800',
      'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=800'
    ],
    startPrice: 400000,
    currentPrice: 550000,
    buyNowPrice: 800000,
    endTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 horas
    status: 'active',
    categoryId: '5',
    bids: [
      {
        id: 'b4',
        auctionId: '3',
        userId: 'u5',
        username: 'Luis Fernández',
        amount: 550000,
        createdAt: new Date(Date.now() - 15 * 60 * 1000)
      }
    ]
  },
  {
    id: '4',
    title: 'Bicicleta Mountain Bike Rodado 29',
    description: 'Bicicleta MTB rodado 29, cambios Shimano, suspensión delantera. Poco uso.',
    images: [
      'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800'
    ],
    startPrice: 150000,
    currentPrice: 200000,
    buyNowPrice: 350000,
    endTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 horas
    status: 'active',
    categoryId: '4',
    bids: []
  }
];

export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Auriculares Bluetooth Sony WH-1000XM5',
    description: 'Auriculares inalámbricos con cancelación de ruido premium, batería de 30 horas.',
    images: [
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'
    ],
    price: 450000,
    stock: 5,
    categoryId: '1',
    ratings: [
      {
        userId: 'u1',
        username: 'Juan Pérez',
        rating: 5,
        comment: 'Excelente calidad de sonido',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ],
    averageRating: 5
  },
  {
    id: 'p2',
    name: 'Zapatillas Nike Air Max',
    description: 'Zapatillas deportivas Nike Air Max, disponibles en varios talles.',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'
    ],
    price: 120000,
    stock: 15,
    categoryId: '2',
    ratings: [],
    averageRating: 0
  },
  {
    id: 'p3',
    name: 'Cafetera Nespresso Essenza Mini',
    description: 'Cafetera de cápsulas compacta, ideal para espacios pequeños.',
    images: [
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800'
    ],
    price: 85000,
    stock: 8,
    categoryId: '3',
    ratings: [
      {
        userId: 'u2',
        username: 'María García',
        rating: 4,
        comment: 'Muy buena, pero algo ruidosa',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ],
    averageRating: 4
  },
  {
    id: 'p4',
    name: 'Notebook Lenovo IdeaPad 3',
    description: 'Notebook Lenovo con procesador AMD Ryzen 5, 8GB RAM, 512GB SSD.',
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800'
    ],
    price: 680000,
    stock: 3,
    categoryId: '1',
    ratings: [],
    averageRating: 0
  },
  {
    id: 'p5',
    name: 'Pelota de Fútbol Adidas',
    description: 'Pelota oficial de fútbol Adidas, tamaño 5.',
    images: [
      'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=800'
    ],
    price: 25000,
    stock: 20,
    categoryId: '4',
    ratings: [],
    averageRating: 0
  },
  {
    id: 'p6',
    name: 'Set de Libros Harry Potter Completo',
    description: 'Colección completa de Harry Potter en español, tapa dura.',
    images: [
      'https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=800'
    ],
    price: 95000,
    stock: 7,
    categoryId: '6',
    ratings: [
      {
        userId: 'u3',
        username: 'Carlos Rodríguez',
        rating: 5,
        comment: 'Edición hermosa, perfecta para coleccionar',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ],
    averageRating: 5
  }
];

export const mockUser: User = {
  id: 'u1',
  email: 'usuario@subastaargenta.com',
  username: 'Juan Pérez',
  avatar: 'https://ui-avatars.com/api/?name=Juan+Perez&background=FF6B00&color=fff',
  isAdmin: false,
  dni: '12345678',
  address: {
    street: 'Av. Corrientes 1234',
    locality: 'Buenos Aires',
    province: 'Buenos Aires',
    location: { lat: -34.6037, lng: -58.3816 }
  },
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 'admin1',
  email: 'admin@subastaargenta.com',
  username: 'Administrador',
  isAdmin: true
};
