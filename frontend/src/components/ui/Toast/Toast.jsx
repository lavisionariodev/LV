'use client';

import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { PiWarningCircle, PiCheckCircle } from 'react-icons/pi';
import styles from './Toast.module.css';

const VARIANTS = {
  success: {
    title: 'Success',
    iconLabel: 'Success',
  },
  error: {
    title: 'Uh oh! Something went wrong',
    iconLabel: 'Error',
  },
  info: {
    title: 'Info',
    iconLabel: 'Info',
  },
};

export default function Toast({ message, variant = 'info', duration = 4000, onClose }) {
  useEffect(() => {
    if (!duration) return;
    const id = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(id);
  }, [duration, onClose]);

  if (!message) return null;

  const config = VARIANTS[variant] || VARIANTS.info;
  const iconClass =
    variant === 'error'
      ? styles.iconError
      : variant === 'success'
      ? styles.iconSuccess
      : styles.iconInfo;

  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.card}>
        <div className={`${styles.icon} ${iconClass}`} aria-hidden>
          {variant === 'error' ? (
            <PiWarningCircle size={22} className={styles.warnIcon} />
          ) : variant === 'success' ? (
            <PiCheckCircle size={22} className={styles.successIcon} />
          ) : (
            'i'
          )}
        </div>
        <div className={styles.content}>
          <div className={styles.title}>{config.title}</div>
          <div className={styles.message}>{message}</div>
        </div>
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
      </div>
    </div>
  );
}
