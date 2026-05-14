'use client';

import Link from 'next/link';
import SellerQrLoginScanner from '@/features/seller/auth/SellerQrLoginScanner';
import styles from '../qrFlow.module.css';

export default function SellerQrScanPage() {
  return (
    <div className={styles.page}>
      <SellerQrLoginScanner context="login" />
      <Link href="/seller/login" className={styles.backLink}>
        Back to seller login
      </Link>
    </div>
  );
}
