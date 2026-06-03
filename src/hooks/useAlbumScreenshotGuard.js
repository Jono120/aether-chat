import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Blurs the private album and notifies when a screenshot or capture is suspected.
 * Web browsers cannot block OS screenshots; this reacts to common capture signals.
 */
export function useAlbumScreenshotGuard({ enabled, active, onCaptureAttempt }) {
  const [forceShield, setForceShield] = useState(false);
  const lastWarnRef = useRef(0);

  const triggerShield = useCallback(
    (reason) => {
      setForceShield(true);
      const now = Date.now();
      if (now - lastWarnRef.current > 2800) {
        lastWarnRef.current = now;
        onCaptureAttempt?.(reason);
      }
    },
    [onCaptureAttempt],
  );

  useEffect(() => {
    if (!enabled || !active) {
      setForceShield(false);
      return undefined;
    }

    const onKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        triggerShield('printscreen');
        return;
      }
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        triggerShield('shortcut');
      }
    };

    const onVisibility = () => {
      if (document.hidden) triggerShield('visibility');
    };

    const onCopy = (e) => {
      const inAlbum = e.target?.closest?.('.album-viewport');
      if (inAlbum) {
        e.preventDefault();
        triggerShield('copy');
      }
    };

    const onContextMenu = (e) => {
      if (e.target?.closest?.('.album-viewport')) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('contextmenu', onContextMenu, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [enabled, active, triggerShield]);

  return { forceShield, resetForceShield: () => setForceShield(false) };
}
