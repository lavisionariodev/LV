'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './auth-layout.module.css';
import { useSiteContent } from '@/lib/siteContent/client';

const BUYER_AUTH_SWITCH_KEY = 'buyer-auth-switch';

export function setBuyerAuthSwitch() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(BUYER_AUTH_SWITCH_KEY, '1');
  }
}

export default function AuthLayout({ 
  children, 
  type = 'default', // 'signin', 'signup', or 'default'
  showPanel = false 
}) {
  const [isSwitch, setIsSwitch] = useState(false);
  const { data: siteContent } = useSiteContent();
  const systemName = (siteContent?.systemName && String(siteContent.systemName).trim()) || 'La Visionario';

  useEffect(() => {
    if (!showPanel) return;
    const flag = typeof window !== 'undefined' && window.sessionStorage.getItem(BUYER_AUTH_SWITCH_KEY);
    if (flag === '1') {
      window.sessionStorage.removeItem(BUYER_AUTH_SWITCH_KEY);
      setIsSwitch(true);
    }
  }, [showPanel]);

  return (
    <>
      <link 
        href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' 
        rel='stylesheet'
      />
      
      <div className={`${styles.authContainer} ${styles[type]} ${showPanel && isSwitch ? styles.switch : ''}`}>
        {showPanel ? (
          <>
            {/* Left Side - Auth Form */}
            <div className={styles.formSection}>
              <Link
                href="/"
                className={styles.formHomeLinkMobile}
                aria-label={`Go to ${systemName}`}
              >
                <i className="bx bx-home" aria-hidden />
                <span>{systemName}</span>
              </Link>
              <div className={styles.formMain}>
                <div className={styles.authForm}>
                  {children}
                </div>
              </div>
            </div>

            {/* Right Side - Welcome Panel */}
            <div className={styles.panelSection}>
              <div className={styles.panelMain}>
                <div className={styles.panelContent}>
                  <Link
                    href="/"
                    className={styles.panelHomeLink}
                    aria-label={`Go to ${systemName}`}
                  >
                    <i className="bx bx-home" aria-hidden />
                    <span>{systemName}</span>
                  </Link>
                  <h1>H E L L O !</h1>
                  <p>
                    {type === 'signin' 
                      ? 'Sign up now and enjoy our site' 
                      : 'Already have an account?'}
                  </p>
                  <Link
                    href={type === 'signin' ? '/buyer/signup' : '/buyer/login'}
                    className={styles.panelButton}
                    onClick={setBuyerAuthSwitch}
                  >
                    {type === 'signin' ? 'Sign Up' : 'Log In'}
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.authForm}>
            {children}
          </div>
        )}
      </div>
    </>
  );
}