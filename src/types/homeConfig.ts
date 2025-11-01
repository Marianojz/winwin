// Configuración del inicio (Home) - banners, publicidades, imágenes
export interface HomeBanner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link?: string;
  linkText?: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface HomePromotion {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  order: number;
  createdAt: Date;
}

export interface HomeConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  banners: HomeBanner[];
  promotions: HomePromotion[];
  customSections?: Array<{
    id: string;
    title: string;
    content: string;
    active: boolean;
    order: number;
  }>;
  updatedAt: Date;
}

export const defaultHomeConfig: HomeConfig = {
  heroTitle: 'Bienvenido a Subasta Argenta',
  heroSubtitle: 'La plataforma líder de subastas y ventas online en Argentina. Descubrí productos únicos y conseguí las mejores ofertas.',
  heroImageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
  banners: [],
  promotions: [],
  updatedAt: new Date()
};

