'use client';

import Link from 'next/link';
import SellerQrLoginScanner from '@/features/seller/auth/SellerQrLoginScanner';
import styles from '../qrFlow.module.css';

export default function SellerQrScanPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <SellerQrLoginScanner context="login" />
        <Link href="/seller/login" className={styles.ghostBtn}>
          Back to seller login
        </Link>
      </div>
    </div>
  );
}
