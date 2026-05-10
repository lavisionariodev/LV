'use client';

import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { PiCheckCircleFill } from 'react-icons/pi';
import styles from './Toast.module.css';

export default function Toast({
  message,
  variant = 'info',
  duration = 4000,
  actionLabel,
  onAction,
  onClose,
}) {
  useEffect(() => {
    if (!duration) return;
    const id = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(id);
  }, [duration, onClose]);

  if (!message) return null;

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
