/**
 * Utilidades para optimizar imágenes manteniendo alta calidad
 * 
 * Este módulo proporciona funciones para optimizar imágenes y generar favicons
 * usando Canvas API del navegador.
 * 
 * @module imageOptimizer
 */

// Verificar que estamos en un entorno con DOM (navegador)
if (typeof window === 'undefined' || typeof document === 'undefined') {
  console.warn('imageOptimizer: Este módulo requiere un entorno de navegador');
}

/**
 * Optimiza una imagen usando Canvas manteniendo alta calidad
 * @param file - Archivo de imagen original
 * @param maxWidth - Ancho máximo (opcional, por defecto mantiene el original)
 * @param maxHeight - Alto máximo (opcional, por defecto mantiene el original)
 * @param quality - Calidad de compresión (0-1, por defecto 0.95 para alta calidad)
 * @returns Blob optimizado
 */
export const optimizeImage = async (
  file: File,
  maxWidth?: number,
  maxHeight?: number,
  quality: number = 0.95
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('No se pudo crear contexto de canvas'));
      return;
    }

    img.onload = () => {
      try {
        // Calcular dimensiones manteniendo proporción
        let width = img.width;
        let height = img.height;

        if (maxWidth && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (maxHeight && height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Configurar canvas con alta calidad
        canvas.width = width;
        canvas.height = height;

        // Configurar contexto para alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dibujar imagen en canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a blob con alta calidad
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al convertir imagen a blob'));
            }
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };

    // Cargar imagen
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Genera un favicon desde una imagen
 * @param imageUrl - URL de la imagen original
 * @param size - Tamaño del favicon (por defecto 32x32)
 * @returns Blob del favicon generado
 */
export const generateFavicon = async (
  imageUrl: string,
  size: number = 32
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Verificar si la URL es una data URL (base64) o una URL externa
    const isDataUrl = imageUrl.startsWith('data:');
    const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com');
    
    // Si es Firebase Storage y no es data URL, rechazar inmediatamente por CORS
    if (isFirebaseStorage && !isDataUrl) {
      reject(new Error('CORS: No se puede acceder a la imagen desde Firebase Storage. El favicon se generará automáticamente cuando subas un nuevo logo.'));
      return;
    }

    const img = new Image();
    
    // Solo establecer crossOrigin si no es una data URL
    if (!isDataUrl) {
      img.crossOrigin = 'anonymous';
    }

    // Timeout para evitar que se quede colgado
    const timeout = setTimeout(() => {
      reject(new Error('Timeout al cargar la imagen'));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('No se pudo crear contexto de canvas'));
          return;
        }

        canvas.width = size;
        canvas.height = size;

        // Configurar alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dibujar imagen centrada y escalada
        ctx.drawImage(img, 0, 0, size, size);

        // Convertir a blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al generar favicon'));
            }
          },
          'image/png',
          1.0 // Máxima calidad para favicon
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      // Error más descriptivo
      if (isFirebaseStorage) {
        reject(new Error('CORS: No se puede cargar la imagen desde Firebase Storage. El favicon se generará cuando subas un nuevo logo.'));
      } else {
        reject(new Error('Error al cargar la imagen para favicon'));
      }
    };

    img.src = imageUrl;
  });
};

/**
 * Actualiza el favicon en el DOM
 * @param faviconUrl - URL del nuevo favicon
 */
export const updateFavicon = (faviconUrl: string): void => {
  // Eliminar favicons existentes
  const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
  existingFavicons.forEach((link) => {
    link.remove();
  });

  // Crear nuevo favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = faviconUrl;
  document.head.appendChild(link);

  // También actualizar apple-touch-icon si existe
  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    (appleIcon as HTMLLinkElement).href = faviconUrl;
  }
};

/**
 * Genera múltiples tamaños de favicon desde una imagen
 * @param imageUrl - URL de la imagen original
 * @param sizes - Array de tamaños a generar (por defecto [16, 32, 180])
 * @returns Objeto con URLs de los favicons generados
 */
export const generateMultipleFavicons = async (
  imageUrl: string,
  sizes: number[] = [16, 32, 180]
): Promise<{ [size: number]: string }> => {
  const favicons: { [size: number]: string } = {};
  
  // Verificar si es Firebase Storage (no funcionará por CORS)
  const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com') && !imageUrl.startsWith('data:');
  
  if (isFirebaseStorage) {
    // No intentar generar favicons desde Firebase Storage
    if (import.meta.env.DEV) {
      console.warn('⚠️ No se pueden generar favicons desde Firebase Storage por CORS. Se generarán automáticamente al subir un nuevo logo.');
    }
    return favicons;
  }

  for (const size of sizes) {
    try {
      const blob = await generateFavicon(imageUrl, size);
      // Convertir blob a data URL para usar directamente
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      favicons[size] = dataUrl;
    } catch (error: any) {
      // Solo mostrar warning en desarrollo y si no es un error de CORS esperado
      if (import.meta.env.DEV && !error.message?.includes('CORS')) {
        console.warn(`Error generando favicon de ${size}x${size}:`, error);
      }
    }
  }

  return favicons;
};

/**
 * Actualiza todos los favicons en el DOM
 * @param faviconUrls - Objeto con URLs de favicons por tamaño
 */
export const updateAllFavicons = (faviconUrls: { [size: number]: string }): void => {
  // Eliminar favicons existentes
  const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
  existingFavicons.forEach((link) => {
    link.remove();
  });

  // Crear nuevos favicons para cada tamaño
  Object.entries(faviconUrls).forEach(([size, url]) => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = url;
    if (size !== '180') {
      link.setAttribute('sizes', `${size}x${size}`);
    }
    document.head.appendChild(link);
  });

  // Actualizar apple-touch-icon (180x180)
  if (faviconUrls[180]) {
    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.sizes = '180x180';
    appleIcon.href = faviconUrls[180];
    document.head.appendChild(appleIcon);
  }
};

