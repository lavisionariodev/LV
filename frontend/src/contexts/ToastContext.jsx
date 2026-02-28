'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/feedback/Toast/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toastState, setToastState] = useState(null);

  const show = useCallback((variant, message, duration) => {
    if (!message) return;
    setToastState({
      message,
      variant,
      duration: duration ?? 4000,
    });
  }, []);

  const api = {
    success: (message, duration) => show('success', message, duration),
    error: (message, duration) => show('error', message, duration),
    info: (message, duration) => show('info', message, duration),
  };

  const handleClose = useCallback(() => {
    setToastState(null);
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toastState && (
        <Toast
          message={toastState.message}
          variant={toastState.variant}
          duration={toastState.duration}
          onClose={handleClose}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

