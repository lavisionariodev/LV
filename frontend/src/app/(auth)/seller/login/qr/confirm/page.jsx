'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SellerQrConfirmPanel from '@/features/seller/auth/SellerQrConfirmPanel';
import styles from '../qrFlow.module.css';

function SellerQrConfirmPageInner() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challenge') || '';
  const approveToken = searchParams.get('token') || '';
  const fromSettings = searchParams.get('from') === 'settings';
  const backHref = fromSettings ? '/seller/settings/profile' : '/seller/login';
  const backLabel = fromSettings ? 'Back to profile settings' : 'Back to seller login';

  if (!challengeId || !approveToken) {
    return (
      <div className={styles.page}>
        <div className={styles.pageInner}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.eyebrow}>Seller Centre</p>
              <h1 className={styles.title}>Invalid QR request</h1>
              <p className={styles.subtitle}>This login link is missing required details.</p>
            </div>
            <Link href={backHref} className={styles.primaryBtn}>
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <SellerQrConfirmPanel
          challengeId={challengeId}
          approveToken={approveToken}
          fromSettings={fromSettings}
        />
      </div>
    </div>
  );
}

function SellerQrConfirmFallback() {
  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <div className={styles.card}>
          <p className={styles.status}>Loading approval request...</p>
        </div>
      </div>
    </div>
  );
}

export default function SellerQrConfirmPage() {
  return (
    <Suspense fallback={<SellerQrConfirmFallback />}>
      <SellerQrConfirmPageInner />
    </Suspense>
  );
}
