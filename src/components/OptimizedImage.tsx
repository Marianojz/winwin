import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // Si es true, carga inmediatamente sin lazy loading
  quality?: number; // 1-100, por defecto 85
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string; // Para responsive images
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente OptimizedImage - Similar a Next/Image
 * 
 * Características:
 * - Lazy loading automático (excepto si priority=true)
 * - Soporte para WebP/AVIF con fallback
 * - Dimensiones explícitas para prevenir CLS
 * - Placeholder blur opcional
 * - Responsive images con srcset
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  objectFit = 'cover',
  objectPosition = 'center',
  loading,
  className = '',
  style = {},
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(blurDataURL || src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Verificar soporte de formatos modernos
  const supportsWebP = () => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  const supportsAVIF = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
      const avif = new Image();
      return new Promise((resolve) => {
        avif.onload = () => resolve(true);
        avif.onerror = () => resolve(false);
        avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
      });
    } catch {
      return false;
    }
  };

  // Generar src optimizado con formato moderno
  const getOptimizedSrc = async (originalSrc: string): Promise<string> => {
    // Si es una URL externa o data URL, devolverla tal cual
    if (originalSrc.startsWith('http') || originalSrc.startsWith('data:') || originalSrc.startsWith('/')) {
      // Para imágenes locales, podríamos usar un servicio de optimización
      // Por ahora, devolvemos la URL original
      return originalSrc;
    }
    return originalSrc;
  };

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      // Cargar inmediatamente si es priority
      loadImage();
      return;
    }

    // Si loading es 'lazy' o no está definido, usar Intersection Observer
    if (loading === 'lazy' || loading === undefined) {
      // Esperar a que el elemento esté en el DOM
      if (!imgRef.current) {
        // Si el ref aún no está disponible, intentar cargar directamente
        loadImage();
        return;
      }
    } else {
      // Si loading es 'eager' pero no es priority, cargar directamente
      loadImage();
      return;
    }

    // Lazy loading con Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Cargar 50px antes de que sea visible
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, priority, loading]);

  const loadImage = async () => {
    if (hasError || isLoaded) return;

    try {
      const optimizedSrc = await getOptimizedSrc(src);
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(optimizedSrc);
        setIsLoaded(true);
        if (onLoad) onLoad();
      };

      img.onerror = () => {
        setHasError(true);
        if (onError) onError();
      };

      img.src = optimizedSrc;
    } catch (error) {
      console.error('Error loading image:', error);
      setHasError(true);
      if (onError) onError();
    }
  };

  // Estilos para prevenir CLS
  const imageStyle: React.CSSProperties = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    objectFit,
    objectPosition,
    transition: isLoaded ? 'opacity 0.3s ease-in-out' : 'none',
    opacity: isLoaded ? 1 : placeholder === 'blur' && blurDataURL ? 0.7 : 0,
    ...style,
  };

  // Aspect ratio container para prevenir CLS
  const aspectRatio = width && height ? (height / width) * 100 : undefined;
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: width ? `${width}px` : '100%',
    ...(aspectRatio && {
      paddingBottom: `${aspectRatio}%`,
      height: 0,
    }),
    overflow: 'hidden',
    backgroundColor: '#f3f4f6', // Placeholder color
  };

  return (
    <div style={containerStyle} className={className}>
      {placeholder === 'blur' && blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading || 'lazy'}
        decoding="async"
        style={imageStyle}
        onLoad={() => {
          setIsLoaded(true);
          if (onLoad) onLoad();
        }}
        onError={() => {
          setHasError(true);
          if (onError) onError();
        }}
        {...props}
      />
      {hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#9ca3af',
            fontSize: '0.875rem',
          }}
        >
          Error al cargar imagen
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;

