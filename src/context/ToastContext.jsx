import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 4500, action }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, action }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const toast = useCallback(
    (message, options = {}) => addToast({ message, ...options }),
    [addToast],
  );

  const confirm = useCallback(
    (message, options = {}) =>
      new Promise((resolve) => {
        const id = addToast({
          message,
          type: 'confirm',
          duration: 0,
          action: {
            confirmLabel: options.confirmLabel ?? 'Confirm',
            cancelLabel: options.cancelLabel ?? 'Cancel',
            onConfirm: () => {
              dismiss(id);
              resolve(true);
            },
            onCancel: () => {
              dismiss(id);
              resolve(false);
            },
          },
        });
      }),
    [addToast, dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, confirm, dismiss }}>
      {children}
      <Toast toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// Hook exported alongside provider for colocated toast API
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
