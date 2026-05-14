'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useAuthToast } from '@/contexts/ToastContext';
import styles from '../qrFlow.module.css';

function isSameOriginSellerConfirmUrl(value) {
  if (!value || typeof window === 'undefined') return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    if (parsed.pathname !== '/seller/login/qr/confirm') return null;
    const challenge = parsed.searchParams.get('challenge');
    const token = parsed.searchParams.get('token');
    if (!challenge || !token) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export default function SellerQrScanPage() {
  const router = useRouter();
  const toast = useAuthToast();
  const videoRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!window.isSecureContext) {
      setError('Camera access requires HTTPS or localhost.');
      return undefined;
    }

    const reader = new BrowserQRCodeReader();
    let active = true;
    let controls = null;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, decodeError) => {
        if (!active || decodeError || !result) return;

        const confirmPath = isSameOriginSellerConfirmUrl(result.getText());
        if (!confirmPath) {
          toast.error('Scan the seller login QR code shown on your computer.');
          return;
        }

        controls?.stop();
        router.replace(confirmPath);
      })
      .then((scannerControls) => {
        controls = scannerControls;
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access to scan the login QR code.'
            : 'Unable to access the camera on this device.';
        setError(message);
      });

    return () => {
      active = false;
      controls?.stop();
      reader.reset();
    };
  }, [router, toast]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Scan login QR</h1>
        <p className={styles.subtitle}>
          Point your camera at the QR code on the Seller Centre login screen.
        </p>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.scannerWrap}>
          <video ref={videoRef} className={styles.video} muted playsInline />
        </div>

        <Link href="/seller/login" className={styles.backLink}>
          Back to seller login
        </Link>
      </div>
    </div>
  );
}
