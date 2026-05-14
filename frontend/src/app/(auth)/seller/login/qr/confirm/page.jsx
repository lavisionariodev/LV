'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { approveSellerQrChallenge, denySellerQrChallenge } from '@/lib/auth/qrLoginClient';
import { useAuthToast } from '@/contexts/ToastContext';
import styles from '../qrFlow.module.css';

function SellerQrConfirmPageInner() {
  const searchParams = useSearchParams();
  const toast = useAuthToast();
  const challengeId = searchParams.get('challenge') || '';
  const approveToken = searchParams.get('token') || '';
  const confirmPath = challengeId && approveToken
    ? `/seller/login/qr/confirm?challenge=${encodeURIComponent(challengeId)}&token=${encodeURIComponent(approveToken)}`
    : '/seller/login/qr/confirm';

  const [loadingSession, setLoadingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email || '');
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!challengeId || !approveToken) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Invalid QR request</h1>
          <p className={styles.status}>This login link is missing required details.</p>
          <Link href="/seller/login" className={styles.backLink}>
            Back to seller login
          </Link>
        </div>
      </div>
    );
  }

  const loginHref = `/seller/login?redirect=${encodeURIComponent(confirmPath)}`;

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await approveSellerQrChallenge({ challengeId, approveToken });
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    setCompleted('approved');
  };

  const handleDeny = async () => {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await denySellerQrChallenge({ challengeId, approveToken });
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    setCompleted('denied');
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Approve desktop login</h1>

        {completed === 'approved' ? (
          <>
            <p className={styles.status}>
              Login approved. You can return to your computer to continue in Seller Centre.
            </p>
            <Link href="/seller" className={styles.linkBtn}>
              Open Seller Centre
            </Link>
          </>
        ) : completed === 'denied' ? (
          <>
            <p className={styles.status}>Login request denied. The desktop QR code will need a new scan.</p>
            <Link href="/seller/login" className={styles.backLink}>
              Back to seller login
            </Link>
          </>
        ) : loadingSession ? (
          <p className={styles.status}>Checking your session...</p>
        ) : !email ? (
          <>
            <p className={styles.subtitle}>
              Sign in with your seller account on this device before approving the desktop login.
            </p>
            <Link href={loginHref} className={styles.linkBtn}>
              Sign in to approve
            </Link>
          </>
        ) : (
          <>
            <p className={styles.subtitle}>
              Confirm that you want to sign in to Seller Centre on your computer as:
            </p>
            <p className={styles.account}>{email}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleDeny}
                disabled={submitting}
              >
                Deny
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </>
        )}

        {!completed && (
          <Link href="/seller/login" className={styles.backLink}>
            Back to seller login
          </Link>
        )}
      </div>
    </div>
  );
}

export default function SellerQrConfirmPage() {
  return (
    <Suspense fallback={null}>
      <SellerQrConfirmPageInner />
    </Suspense>
  );
}
