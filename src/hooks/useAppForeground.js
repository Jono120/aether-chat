import { useState, useEffect } from 'react';
import { isNativeApp } from '../utils/platform';

/**
 * Tracks whether the app is in the foreground.
 * Uses Capacitor App on native; window focus/blur on web.
 */
export default function useAppForeground({ onForeground, onBackground } = {}) {
  const [isForeground, setIsForeground] = useState(true);

  useEffect(() => {
    if (isNativeApp()) {
      let listener;
      let cancelled = false;

      import('@capacitor/app')
        .then(({ App }) => {
          if (cancelled) return undefined;
          return App.addListener('appStateChange', ({ isActive }) => {
            setIsForeground(isActive);
            if (isActive) onForeground?.();
            else onBackground?.();
          });
        })
        .then((handle) => {
          if (handle) listener = handle;
        })
        .catch((err) => {
          console.warn('Capacitor App listener failed', err);
        });

      return () => {
        cancelled = true;
        listener?.remove();
      };
    }

    const handleFocus = () => {
      setIsForeground(true);
      onForeground?.();
    };
    const handleBlur = () => {
      setIsForeground(false);
      onBackground?.();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onForeground, onBackground]);

  return isForeground;
}
