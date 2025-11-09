import { useEffect, useRef } from 'react';

/**
 * Hook para focus trapping en modales
 * @param isActive - Si el modal está activo
 * @param initialFocusRef - Ref del elemento que debe recibir focus inicial
 */
export const useFocusTrap = (
  isActive: boolean,
  initialFocusRef?: React.RefObject<HTMLElement>
) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Focus inicial
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else {
      // Buscar primer elemento focusable
      const firstFocusable = container.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }

    // Obtener todos los elementos focusables
    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ];
      
      return Array.from(
        container.querySelectorAll(selectors.join(', '))
      ) as HTMLElement[];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, initialFocusRef]);

  return containerRef;
};

