'use client';

import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { PiCheckCircleFill, PiCheckCircle, PiInfo, PiWarningCircle } from 'react-icons/pi';
import styles from './Toast.module.css';

const AUTH_VARIANTS = {
  success: {
    title: 'Success',
  },
  error: {
    title: 'Uh oh! Something went wrong',
  },
  info: {
    title: 'Info',
  },
};

export default function Toast({
  message,
  variant = 'info',
  duration = 4000,
  actionLabel,
  onAction,
  onClose,
  appearance = 'default',
}) {
  useEffect(() => {
    if (!duration) return;
    const id = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(id);
  }, [duration, onClose]);

  if (!message) return null;

  const isAuth = appearance === 'auth';

  if (isAuth) {
    const config = AUTH_VARIANTS[variant] || AUTH_VARIANTS.info;
    const iconWrapClass =
      variant === 'error'
        ? `${styles.iconAuth} ${styles.iconAuthError}`
        : variant === 'success'
          ? `${styles.iconAuth} ${styles.iconAuthSuccess}`
          : `${styles.iconAuth} ${styles.iconAuthInfo}`;

    return (
      <div className={styles.wrapperAuth} role="alert">
        <div className={styles.cardAuth}>
          <div className={iconWrapClass} aria-hidden>
            {variant === 'error' ? (
              <PiWarningCircle size={22} className={styles.warnIconAuth} />
            ) : variant === 'success' ? (
              <PiCheckCircle size={22} className={styles.successIconAuth} />
            ) : (
              <PiInfo size={22} className={styles.infoIconAuth} />
            )}
          </div>
          <div className={styles.contentAuth}>
            <div className={styles.authTitle}>{config.title}</div>
            <div className={styles.authMessage}>{message}</div>
            {actionLabel && typeof onAction === 'function' ? (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnAuth}`}
                onClick={() => {
                  onAction();
                  onClose?.();
                }}
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close notification"
            className={styles.closeBtnAuth}
          >
            <span className={styles.closeBtnIconAuth} aria-hidden>
              <FiX size={18} />
            </span>
          </button>
        </div>
      </div>
    );
  }

  const cardClass =
    variant === 'error'
      ? `${styles.card} ${styles.cardError}`
      : variant === 'success'
        ? `${styles.card} ${styles.cardSuccess}`
        : `${styles.card} ${styles.cardInfo}`;

  return (
    <div className={styles.wrapper} role="alert">
      <div className={cardClass}>
        <div className={styles.content}>
          <div className={styles.message}>{message}</div>
          {actionLabel && typeof onAction === 'function' ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => {
                onAction();
                onClose?.();
              }}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
        {variant === 'success' ? (
          <span className={styles.checkBadge} aria-hidden>
            <PiCheckCircleFill size={20} className={styles.checkIcon} />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close notification"
            className={styles.closeBtn}
          >
            <span className={styles.closeBtnIcon} aria-hidden>
              <FiX size={18} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
