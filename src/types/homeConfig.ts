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

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  logoUrl: string;
  faviconUrl?: string;
  footerText?: string;
}

export interface SectionTitles {
  auctions: string;
  store: string;
  featured: string;
  categories: string;
  promotions: string;
  about?: string;
  contact?: string;
}

export interface HomeConfig {
  // Configuración del sitio
  siteSettings: SiteSettings;
  
  // Colores del tema
  themeColors: ThemeColors;
  
  // Títulos de secciones
  sectionTitles: SectionTitles;
  
  // Sección Hero
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  
  // Banners y promociones
  banners: HomeBanner[];
  promotions: HomePromotion[];
  
  // Secciones personalizadas
  customSections?: Array<{
    id: string;
    title: string;
    content: string;
    active: boolean;
    order: number;
    backgroundColor?: string;
    textColor?: string;
  }>;
  
  // Secciones adicionales
  aboutSection?: {
    title: string;
    content: string;
    active: boolean;
    imageUrl?: string;
  };
  
  contactSection?: {
    title: string;
    email: string;
    phone?: string;
    address?: string;
    active: boolean;
  };
  
  updatedAt: Date;
}

export const defaultThemeColors: ThemeColors = {
  primary: '#D65A00',
  primaryHover: '#B84800',
  secondary: '#6B7280',
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundTertiary: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6'
};

export const defaultSiteSettings: SiteSettings = {
  siteName: 'Subasta Argenta',
  siteTagline: 'La plataforma líder de subastas y ventas online',
  logoUrl: 'https://firebasestorage.googleapis.com/v0/b/subasta-argenta-474019.firebasestorage.app/o/imagenes%20utiles%2Flogo3.png?alt=media&token=bc5bab5c-0ccd-49e0-932b-2cee25a93b7d',
  footerText: '© 2024 Subasta Argenta. Todos los derechos reservados.'
};

export const defaultSectionTitles: SectionTitles = {
  auctions: 'Subastas Activas',
  store: 'Nuestra Tienda',
  featured: 'Productos Destacados',
  categories: 'Categorías',
  promotions: 'Promociones Especiales'
};

export const defaultHomeConfig: HomeConfig = {
  siteSettings: defaultSiteSettings,
  themeColors: defaultThemeColors,
  sectionTitles: defaultSectionTitles,
  heroTitle: 'Bienvenido a Subasta Argenta',
  heroSubtitle: 'La plataforma líder de subastas y ventas online en Argentina. Descubrí productos únicos y conseguí las mejores ofertas.',
  heroImageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
  banners: [],
  promotions: [],
  aboutSection: {
    title: 'Sobre Nosotros',
    content: 'Somos una plataforma dedicada a ofrecerte las mejores oportunidades en subastas y compras online.',
    active: false
  },
  contactSection: {
    title: 'Contacto',
    email: 'contacto@subastaargenta.com',
    active: false
  },
  updatedAt: new Date()
};

