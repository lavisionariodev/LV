"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
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
      appearance: o.appearance ?? "default",
    };
  }
  return {
    duration: arg2,
    actionLabel: arg3?.actionLabel ?? null,
    onAction: arg3?.onAction ?? null,
    appearance: arg3?.appearance ?? "default",
  };
}

/** Merge login/signup pages into a single options object with auth toast styling. */
function mergeAuthToastArgs(arg2, arg3) {
  if (
    arg2 !== undefined &&
    arg2 !== null &&
    typeof arg2 === "object" &&
    !Array.isArray(arg2)
  ) {
    return { ...arg2, appearance: "auth" };
  }
  const fromArg3 =
    arg3 && typeof arg3 === "object" && !Array.isArray(arg3) ? { ...arg3 } : {};
  if (typeof arg2 === "number") {
    return { appearance: "auth", duration: arg2, ...fromArg3 };
  }
  return Object.keys(fromArg3).length
    ? { appearance: "auth", ...fromArg3 }
    : { appearance: "auth" };
}

export function ToastProvider({ children }) {
  const [toastState, setToastState] = useState(null);

  const show = useCallback((variant, message, duration, options = {}) => {
    if (!message) return;
    const { actionLabel, onAction, appearance = "default" } = options;
    setToastState({
      message,
      variant,
      duration: duration ?? 4000,
      actionLabel: actionLabel ?? null,
      onAction: onAction ?? null,
      appearance,
    });
  }, []);

  const api = {
    success: (message, arg2, arg3) => {
      const { duration, actionLabel, onAction, appearance } =
        parseToastExtraArgs(arg2, arg3);
      show("success", message, duration, {
        actionLabel,
        onAction,
        appearance,
      });
    },
    error: (message, arg2, arg3) => {
      const { duration, actionLabel, onAction, appearance } =
        parseToastExtraArgs(arg2, arg3);
      show("error", message, duration, {
        actionLabel,
        onAction,
        appearance,
      });
    },
    info: (message, arg2, arg3) => {
      const { duration, actionLabel, onAction, appearance } =
        parseToastExtraArgs(arg2, arg3);
      show("info", message, duration, {
        actionLabel,
        onAction,
        appearance,
      });
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
          appearance={toastState.appearance}
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

/** Same API as useToast; every notification uses the auth (login/signup) container style. */
export function useAuthToast() {
  const t = useToast();
  return useMemo(
    () => ({
      success: (message, arg2, arg3) =>
        t.success(message, mergeAuthToastArgs(arg2, arg3)),
      error: (message, arg2, arg3) =>
        t.error(message, mergeAuthToastArgs(arg2, arg3)),
      info: (message, arg2, arg3) =>
        t.info(message, mergeAuthToastArgs(arg2, arg3)),
    }),
    [t]
  );
}

