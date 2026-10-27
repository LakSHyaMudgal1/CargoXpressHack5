import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast = { id, title, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    showToast: (type, title, message, duration = 4000) => {
      const normalizedType = type === 'neutral' ? 'info' : type || 'info';
      return addToast({ title, message, type: normalizedType, duration });
    },
    success: (message, title = 'Success') => addToast({ title, message, type: 'success' }),
    error: (message, title = 'Error') => addToast({ title, message, type: 'error' }),
    info: (message, title = 'Notice') => addToast({ title, message, type: 'info' }),
    warning: (message, title = 'Warning') => addToast({ title, message, type: 'warning' }),
    dismiss: removeToast,
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-signal-coral shrink-0" />,
    info: <Info className="w-4 h-4 text-signal-aqua shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-signal-amber shrink-0" />,
    neutral: <Info className="w-4 h-4 text-ink-subtle shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30',
    error: 'border-signal-coral/30',
    info: 'border-signal-aqua/30',
    warning: 'border-signal-amber/30',
    neutral: 'border-border',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-lg bg-surface-elevated/95 backdrop-blur-md border ${borders[t.type] || 'border-border'} shadow-elevated-card flex items-start gap-3 transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in`}
          >
            {icons[t.type] || icons.info}
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="text-xs font-semibold text-ink tracking-tight mb-0.5">
                  {t.title}
                </p>
              )}
              <p className="text-xs text-ink-muted leading-relaxed break-words">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      showToast: (type, title, msg) => console.log(`[Toast ${type}]`, title, msg),
      success: (msg, title) => console.log('[Toast Success]', title, msg),
      error: (msg, title) => console.error('[Toast Error]', title, msg),
      info: (msg, title) => console.info('[Toast Info]', title, msg),
      warning: (msg, title) => console.warn('[Toast Warning]', title, msg),
      dismiss: () => {},
    };
  }
  return context;
};

export default ToastProvider;
