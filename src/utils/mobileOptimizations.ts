// Optimizaciones para móviles

/**
 * Configura viewport para prevenir zoom en campos de formulario
 */
export const preventZoomOnInput = (): void => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
  }
};

/**
 * Restaura viewport normal
 */
export const restoreViewport = (): void => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0'
    );
  }
};

/**
 * Verifica si es dispositivo táctil
 */
export const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Hook para aplicar estilos de touch target mínimo (44px)
 */
export const getTouchTargetStyle = (minSize: number = 44): React.CSSProperties => {
  return {
    minWidth: `${minSize}px`,
    minHeight: `${minSize}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
};

