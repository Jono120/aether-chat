import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap keyboard focus inside `active` container; restore focus on deactivate.
 */
export default function useFocusTrap(active) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    previousFocusRef.current = document.activeElement;
    const container = containerRef.current;
    if (!container) return undefined;

    const focusables = () => [...container.querySelectorAll(FOCUSABLE)];
    const first = focusables()[0];
    first?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') return;
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;

      const firstEl = items[0];
      const lastEl = items[items.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [active]);

  return containerRef;
}
