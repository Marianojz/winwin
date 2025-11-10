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

export interface ThemeColorSets {
  light: ThemeColors;
  dark: ThemeColors;
  experimental: ThemeColors;
}

export type StickerEffect = 'floating' | 'pulse' | 'fadeInOut' | 'bounce' | 'slideIn' | 'none';
export type StickerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export type StickerSize = 'small' | 'medium' | 'large';

export interface LogoSticker {
  id: string;
  type: 'christmas' | 'newyear' | 'cybermonday' | 'blackfriday' | 'valentine' | 'easter' | 'halloween' | 'independence' | 'mothersday' | 'fathersday' | 'childrensday' | 'summer' | 'winter' | 'spring' | 'autumn' | 'custom';
  emoji: string;
  position: StickerPosition;
  size: StickerSize;
  active: boolean;
  startDate?: string;
  endDate?: string;
  effect?: StickerEffect; // Nuevo: efecto de animación
  tags?: string[]; // Nuevo: tags para búsqueda
  customImageUrl?: string; // Nuevo: URL para stickers personalizados (SVG, PNG)
  sticky?: boolean; // Nuevo: comportamiento sticky en scroll
}

export interface LogoConfig {
  size?: 'small' | 'medium' | 'large';
  position?: 'left' | 'center' | 'right';
  opacity?: number;
  hoverEffect?: boolean;
  faviconUrl?: string; // URL del favicon generado desde el logo
}

export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  logoUrl: string; // Logo único (legacy - para compatibilidad)
  logoUrls?: { // Logos por tema
    light?: string;
    dark?: string;
    experimental?: string;
  };
  logoConfig?: LogoConfig; // Configuración del logo (tamaño, posición, opacidad, hover)
  faviconUrl?: string;
  footerText?: string;
  logoStickers?: LogoSticker[];
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
  
  // Colores del tema (legacy - mantener para compatibilidad)
  themeColors: ThemeColors;
  
  // Colores por modo (light, dark, experimental)
  themeColorSets?: ThemeColorSets;
  
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

export const defaultDarkThemeColors: ThemeColors = {
  primary: '#FF8533',
  primaryHover: '#FF6B00',
  secondary: '#3366CC',
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  backgroundTertiary: '#2D2D2D',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  border: '#3D3D3D',
  success: '#03DAC6',
  warning: '#FFD700',
  error: '#CF6679',
  info: '#3B82F6'
};

export const defaultExperimentalThemeColors: ThemeColors = {
  primary: '#9D4EDD',
  primaryHover: '#7B2CBF',
  secondary: '#FF006E',
  background: '#0A0E27',
  backgroundSecondary: '#1A1F3A',
  backgroundTertiary: '#2A2F4A',
  textPrimary: '#E0E0FF',
  textSecondary: '#B0B0FF',
  border: '#4A4F6A',
  success: '#00F5A0',
  warning: '#FFD93D',
  error: '#FF6B9D',
  info: '#00D4FF'
};

export const defaultThemeColorSets: ThemeColorSets = {
  light: defaultThemeColors,
  dark: defaultDarkThemeColors,
  experimental: defaultExperimentalThemeColors
};

export const defaultSiteSettings: SiteSettings = {
  siteName: 'Clikio',
  siteTagline: 'Un click, infinitas ofertas',
  logoUrl: '', // Se actualizará cuando se suba el logo a Firebase Storage
  footerText: '© 2024 Clikio. Todos los derechos reservados.',
  logoStickers: []
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
  themeColorSets: defaultThemeColorSets,
  sectionTitles: defaultSectionTitles,
  heroTitle: 'Bienvenido a Clikio',
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