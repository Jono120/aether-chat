import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
  confirm: AlertTriangle,
};

export default function Toast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="region" aria-label="Notifications">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] ?? Info;
        return (
          <div
            key={t.id}
            className={`toast toast--${t.type} toast-enter`}
            role={t.type === 'confirm' ? 'alertdialog' : 'status'}
            aria-live="polite"
          >
            <Icon className="icon-md toast-icon" aria-hidden="true" />
            <p className="toast-message">{t.message}</p>
            {t.action ? (
              <div className="toast-actions">
                <button
                  type="button"
                  className="btn btn-secondary toast-btn"
                  onClick={t.action.onCancel}
                >
                  {t.action.cancelLabel}
                </button>
                <button
                  type="button"
                  className={`btn ${t.type === 'confirm' ? 'btn-danger' : 'btn-primary'} toast-btn`}
                  onClick={t.action.onConfirm}
                >
                  {t.action.confirmLabel}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="toast-dismiss"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <X className="icon-sm" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
