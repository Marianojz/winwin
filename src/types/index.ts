// Types for Subasta Argenta

export interface Address {
  street: string;
  locality: string;
  province: string;
  location: { lat: number; lng: number };
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  isAdmin: boolean;
  address?: Address;
  dni: string;
  createdAt: Date;
}

export interface Auction {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  images: string[];
  // Compatibilidad: algunas partes antiguas usan startPrice.
  // Las reglas de Firebase requieren startingPrice. Soportamos ambos.
  startPrice: number;
  startingPrice?: number;
  currentPrice: number;
  buyNowPrice?: number;
  endTime: Date;
  status: 'active' | 'ended' | 'sold';
  categoryId: string;
  bids: Bid[];
  winnerId?: string;
  featured?: boolean;
  isFlash?: boolean;
  condition?: 'new' | 'like-new' | 'excellent' | 'good' | 'fair';
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  username: string;
  amount: number;
  createdAt: Date;
  isBot?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  stock: number;
  categoryId: string;
  ratings: Rating[];
  averageRating: number;
  badges?: string[];
  active?: boolean;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rating {
  userId: string;
  username: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'auction_won' | 'auction_outbid' | 'purchase' | 'payment_reminder';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
}

export interface Bot {
  id: string;
  name: string;
  balance: number;
  intervalMin: number;
  intervalMax: number;
  maxBidAmount: number;
  isActive: boolean;
  targetAuctions: string[];
}

export type Theme = 'light' | 'dark';

// ========== SISTEMA DE PEDIDOS (ACTUALIZADO) ==========

export type OrderStatus = 
  | 'pending_payment'      // Esperando pago (48hs para subastas)
  | 'payment_expired'      // Expiró el plazo de pago
  | 'payment_confirmed'    // Pago confirmado
  | 'processing'           // Procesando pedido (AGREGADO)
  | 'preparing'            // Preparando envío
  | 'shipped'              // Enviado (AGREGADO)
  | 'in_transit'           // En camino
  | 'delivered'            // Entregado
  | 'cancelled'            // Cancelado
  | 'expired';             // Expiró el plazo de pago (alternativo)

export type ProductType = 'store' | 'auction';

export type DeliveryMethod = 'shipping' | 'pickup' | 'email';

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  productName: string;
  productImage: string;
  productType: ProductType;
  type: ProductType;              // Alias para compatibilidad
  amount: number;
  status: OrderStatus;
  paymentMethod?: string;
  deliveryMethod: DeliveryMethod;  // AGREGADO
  createdAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  expiresAt?: Date;               // Para subastas: fecha límite de pago (48hs)
  trackingNumber?: string;
  notes?: string;
  address: Address;
  shippingAddress?: ShippingAddress; // AGREGADO para compatibilidad con AdminPanel
}

export interface Report {
  totalSales: number;
  totalRevenue: number;
  pendingPayments: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  avgDeliveryTime: number;
  topSellingProducts: { id: string; name: string; sales: number }[];
}
