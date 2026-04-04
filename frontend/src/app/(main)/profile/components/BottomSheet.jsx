'use client';

import { useEffect, useRef } from 'react';
import styles from './bottomSheet.module.css';

/**
 * BottomSheet
 * -----------
 * A mobile-only bottom sheet modal that sits on top of the current page.
 * On desktop (>= 768 px) it renders nothing — navigation stays as normal links.
 *
 * Props:
 *   isOpen    {boolean}   — controls visibility
 *   onClose   {function}  — called when Cancel / overlay / swipe-down triggers
 *   onSave    {function=} — if provided, shows a "Save" button in the top bar
 *   title     {string}    — centred heading in the top bar
 *   saving    {boolean=}  — disables Save while in-flight
 *   children  {ReactNode} — scrollable body content
 */
export default function BottomSheet({ isOpen, onClose, onSave, title, saving = false, children }) {
  const sheetRef  = useRef(null);
  const startYRef = useRef(null);
  const dragYRef  = useRef(0);

  /* ── Lock body scroll while open ── */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* ── Swipe-to-dismiss ── */
  const onTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    dragYRef.current  = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const onTouchMove = (e) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy < 0) return; // don't allow dragging upward
    dragYRef.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const onTouchEnd = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform  = '';
    }
    if (dragYRef.current > 90) {
      onClose();
    }
    startYRef.current = null;
    dragYRef.current  = 0;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
      {/* Sheet panel — stop click from bubbling to overlay */}
      <div
        ref={sheetRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className={styles.dragHandle} aria-hidden="true" />

        {/* Top bar */}
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancel
          </button>

          <span className={styles.sheetTitle}>{title}</span>

          {onSave ? (
            <button
              type="button"
              className={styles.saveBtn}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            /* Invisible spacer to keep title centred when there's no Save */
            <span className={styles.saveBtn} aria-hidden="true" style={{ visibility: 'hidden' }}>Save</span>
          )}
        </div>

        {/* Scrollable body */}
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}