import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

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
