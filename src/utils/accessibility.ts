// Utilidades de accesibilidad

/**
 * Verifica contraste de color según WCAG
 * @param foreground - Color de texto (hex)
 * @param background - Color de fondo (hex)
 * @returns Ratio de contraste
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  };

  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Verifica si el contraste cumple con WCAG AA (4.5:1)
 */
export const meetsWCAGAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 4.5;
};

/**
 * Verifica si el contraste cumple con WCAG AAA (7:1)
 */
export const meetsWCAGAAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 7;
};

/**
 * Genera atributos ARIA para modales
 */
export const getModalAriaProps = (isOpen: boolean, title: string) => {
  return {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': title ? `${title.toLowerCase().replace(/\s+/g, '-')}-title` : undefined,
    'aria-hidden': !isOpen
  };
};

/**
 * Genera atributos ARIA para botones de toggle
 */
export const getToggleAriaProps = (isExpanded: boolean, controlsId: string) => {
  return {
    'aria-expanded': isExpanded,
    'aria-controls': controlsId
  };
};

