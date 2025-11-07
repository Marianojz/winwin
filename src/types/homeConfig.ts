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

export interface LogoSticker {
  id: string;
  type: 'christmas' | 'newyear' | 'cybermonday' | 'blackfriday' | 'valentine' | 'easter' | 'halloween' | 'independence' | 'mothersday' | 'fathersday' | 'childrensday' | 'summer' | 'winter' | 'spring' | 'autumn' | 'custom';
  emoji: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size: 'small' | 'medium' | 'large';
  active: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  logoUrl: string; // Logo único (legacy - para compatibilidad)
  logoUrls: { // Logos por tema
    light: string;
    dark: string;
    experimental: string;
  };
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
  themeColorSets: ThemeColorSets;
  
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

// URLs de los logos desde Firebase Storage
const LOGO_URLS = {
  light: 'https://storage.googleapis.com/clikio-773fa.firebasestorage.app/Imagenes%20a%20utilizar/1762515543119.png',
  dark: 'https://storage.googleapis.com/clikio-773fa.firebasestorage.app/Imagenes%20a%20utilizar/1762515543111.jpg',
  experimental: 'https://storage.googleapis.com/clikio-773fa.firebasestorage.app/Imagenes%20a%20utilizar/1762515543119.png'
};

export const defaultSiteSettings: SiteSettings = {
  siteName: 'Clikio',
  siteTagline: 'Un click, infinitas ofertas',
  logoUrl: LOGO_URLS.light, // Logo por defecto (modo claro)
  logoUrls: LOGO_URLS, // Todos los logos por tema
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

// Función auxiliar para obtener el logo según el tema actual
export function getLogoForTheme(theme: keyof ThemeColorSets): string {
  return defaultSiteSettings.logoUrls[theme];
}

// Función para actualizar dinámicamente el logo en el frontend
export function updateLogoBasedOnTheme(theme: keyof ThemeColorSets): string {
  const logoUrl = getLogoForTheme(theme);
  
  // Actualizar el logo en el DOM (si estás en un entorno de frontend)
  if (typeof document !== 'undefined') {
    const logoElements = document.querySelectorAll('[data-logo]');
    logoElements.forEach(element => {
      if (element instanceof HTMLImageElement) {
        element.src = logoUrl;
      } else if (element instanceof HTMLElement) {
        element.style.backgroundImage = `url(${logoUrl})`;
      }
    });
  }
  
  return logoUrl;
}

// Función para detectar el tema del sistema y aplicar el logo correspondiente
export function initializeThemeLogo(): void {
  if (typeof window === 'undefined') return;

  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Detectar tema inicial
  const initialTheme = prefersDarkScheme.matches ? 'dark' : 'light';
  updateLogoBasedOnTheme(initialTheme);
  
  // Escuchar cambios en el tema del sistema
  prefersDarkScheme.addEventListener('change', (e) => {
    const theme = e.matches ? 'dark' : 'light';
    updateLogoBasedOnTheme(theme);
  });
}

// Función para cambiar a modo experimental
export function setExperimentalTheme(): void {
  updateLogoBasedOnTheme('experimental');
  
  // También puedes agregar una clase al body para CSS
  if (typeof document !== 'undefined') {
    document.body.classList.add('theme-experimental');
    document.body.classList.remove('theme-light', 'theme-dark');
  }
}

// Función para cambiar a modo claro
export function setLightTheme(): void {
  updateLogoBasedOnTheme('light');
  
  if (typeof document !== 'undefined') {
    document.body.classList.add('theme-light');
    document.body.classList.remove('theme-dark', 'theme-experimental');
  }
}

// Función para cambiar a modo oscuro
export function setDarkTheme(): void {
  updateLogoBasedOnTheme('dark');
  
  if (typeof document !== 'undefined') {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-light', 'theme-experimental');
  }
}

// Función para verificar si las URLs de los logos son accesibles
export async function verifyLogoUrls(): Promise<{ [key: string]: boolean }> {
  const results: { [key: string]: boolean } = {};
  
  for (const [theme, url] of Object.entries(LOGO_URLS)) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      results[theme] = response.ok;
    } catch (error) {
      results[theme] = false;
    }
  }
  
  return results;
}

// CSS recomendado para usar con estos logos
export const logoStyles = `
  .app-logo {
    width: 150px;
    height: 50px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition: background-image 0.3s ease;
  }

  .theme-light .app-logo {
    background-image: url('${LOGO_URLS.light}');
  }

  .theme-dark .app-logo {
    background-image: url('${LOGO_URLS.dark}');
  }

  .theme-experimental .app-logo {
    background-image: url('${LOGO_URLS.experimental}');
  }

  /* Fallback para cuando CSS no puede detectar el tema del sistema */
  @media (prefers-color-scheme: light) {
    .app-logo:not(.theme-manual) {
      background-image: url('${LOGO_URLS.light}');
    }
  }

  @media (prefers-color-scheme: dark) {
    .app-logo:not(.theme-manual) {
      background-image: url('${LOGO_URLS.dark}');
    }
  }
`;