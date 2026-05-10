"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "@/components/ui";

const ToastContext = createContext(null);

/** Second arg may be duration (ms) or an options object; third arg is options when second is duration. */
function parseToastExtraArgs(arg2, arg3) {
  if (
    arg2 !== undefined &&
    arg2 !== null &&
    typeof arg2 === "object" &&
    !Array.isArray(arg2)
  ) {
    const o = arg2;
    return {
      duration: o.duration,
      actionLabel: o.actionLabel ?? null,
      onAction: o.onAction ?? null,
    };
  }
  return {
    duration: arg2,
    actionLabel: arg3?.actionLabel ?? null,
    onAction: arg3?.onAction ?? null,
  };
}

export function ToastProvider({ children }) {
  const [toastState, setToastState] = useState(null);

  const show = useCallback((variant, message, duration, options = {}) => {
    if (!message) return;
    const { actionLabel, onAction } = options;
    setToastState({
      message,
      variant,
      duration: duration ?? 4000,
      actionLabel: actionLabel ?? null,
      onAction: onAction ?? null,
    });
  }, []);

  const api = {
    success: (message, arg2, arg3) => {
      const { duration, actionLabel, onAction } = parseToastExtraArgs(arg2, arg3);
      show("success", message, duration, { actionLabel, onAction });
    },
    error: (message, arg2, arg3) => {
      const { duration, actionLabel, onAction } = parseToastExtraArgs(arg2, arg3);
      show("error", message, duration, { actionLabel, onAction });
    },
    info: (message, arg2, arg3) => {
      const { duration, actionLabel, onAction } = parseToastExtraArgs(arg2, arg3);
      show("info", message, duration, { actionLabel, onAction });
    },
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
          actionLabel={toastState.actionLabel}
          onAction={toastState.onAction}
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

