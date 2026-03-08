'use client';

import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';
import { loginWithEmailPassword, signInWithOAuth } from '@/lib/auth/client';
import { validateNewPassword } from '@/lib/validators/authSchemas';
import { supabase } from '@/lib/supabase/client';
import { isAdmin } from '@/lib/auth/admin';
import { getUser } from '@/lib/auth/session';
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles';
import { useToast } from '@/contexts/ToastContext';

function SellerLoginPageInner() {
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'qr'
  const [showPassword, setShowPassword] = useState(false);
  const [showHowToScan, setShowHowToScan] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const [resetData, setResetData] = useState({ password: '', confirmPassword: '' });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [recoveryFromHash, setRecoveryFromHash] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/seller';
  const toast = useToast();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      toast.error(decodeURIComponent(errorParam));
    }
  }, [searchParams, toast]);

  useLayoutEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash && hash.includes('type=recovery')) {
      setRecoveryFromHash(true);
      setShowResetPasswordModal(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getUser().then(async (currentUser) => {
      if (!mounted || !currentUser) return;
      const role = await getUserRole(currentUser.id);
      if (role === ROLE_SELLER) {
        const target = !redirect || redirect === '/' ? '/seller' : redirect;
        router.replace(target);
      }
    });
    return () => {
      mounted = false;
    };
  }, [redirect, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await loginWithEmailPassword({ email, password });
      if (error) {
        toast.error(error);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Unable to load your account. Please try again.');
        return;
      }

      const admin = await isAdmin(supabase, user.id);
      if (admin) {
        await supabase.auth.signOut();
        toast.error('Please use the admin portal to sign in.');
        return;
      }

      const role = await getUserRole(user.id);
      if (!role) {
        toast.error('Your account is not configured for this portal.');
        await supabase.auth.signOut();
        return;
      }

      if (role !== ROLE_SELLER) {
        toast.error('Please use the correct portal for your account.');
        await supabase.auth.signOut();
        return;
      }

      toast.success('Welcome back to Seller Centre!');
      const target = !redirect || redirect === '/' ? '/seller' : redirect;
      router.replace(target);
    } catch (err) {
      console.error('Seller login error:', err);
      toast.error('An error occurred. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseRedirect =
      redirect && redirect !== '/'
        ? `${origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
        : `${origin}/auth/callback`;

    const redirectTo =
      baseRedirect.includes('?')
        ? `${baseRedirect}&portal=seller`
        : `${baseRedirect}?portal=seller`;

    if (provider === 'Google') {
      const { error } = await signInWithOAuth({ provider: 'google', redirectTo });
      if (error) toast.error(error);
      return;
    }

    if (provider === 'Facebook') {
      const { error } = await signInWithOAuth({ provider: 'facebook', redirectTo });
      if (error) toast.error(error);
      return;
    }

    toast.info(`${provider} authentication would be implemented here`);
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotPasswordEmail?.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/seller/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo,
      });
      if (error) {
        toast.error(error.message || 'Failed to send reset email. Please try again.');
        return;
      }
      setForgotPasswordSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail('');
    setForgotPasswordSubmitted(false);
  };

  const handleResetPasswordChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };

  const handleResetPassword = async () => {
    const validation = validateNewPassword(resetData.password, resetData.confirmPassword);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    try {
      if (recoveryFromHash) {
        const { error } = await supabase.auth.updateUser({ password: resetData.password });
        if (error) {
          toast.error(error.message || 'Password reset failed. Please try again.');
          return;
        }
        await supabase.auth.signOut();
        toast.success('Password reset successful! Please sign in with your new password.');
      } else {
        toast.error('Invalid reset link. Please use the link from your email or request a new one.');
        return;
      }
      setShowResetPasswordModal(false);
      setResetData({ password: '', confirmPassword: '' });
      setRecoveryFromHash(false);
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetData({ password: '', confirmPassword: '' });
    setRecoveryFromHash(false);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo} aria-label="Lavisionario home">
            <div className={styles.logoIcon}>
              <span className={styles.logoLetter}>L</span>
            </div>
            <span className={styles.logoText}>Lavisionario</span>
            <span className={styles.sellerBadge}>Seller Centre</span>
          </Link>
          <a href="#" className={styles.needHelp}>Need help?</a>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Left Side - Illustration */}
          <div className={styles.leftSection}>
            <h1 className={styles.mainTitle}>Be a Power Seller</h1>
            <p className={styles.mainSubtitle}>
              Manage your shop efficiently on Lavisionario with our<br />
              Lavisionario Seller Centre
            </p>
            <div className={styles.illustration}>
              <svg viewBox="0 0 500 400" className={styles.illustrationSvg}>
                {/* Cloud */}
                <ellipse cx="80" cy="140" rx="35" ry="20" fill="#c5e5f2" opacity="0.6"/>
                <ellipse cx="100" cy="135" rx="40" ry="25" fill="#c5e5f2" opacity="0.6"/>
                
                {/* Delivery Truck */}
                <rect x="80" y="220" width="100" height="60" fill="#4db8ac" rx="5"/>
                <rect x="80" y="200" width="50" height="20" fill="#4db8ac" rx="3"/>
                <rect x="90" y="210" width="30" height="25" fill="#75d4c8" rx="2"/>
                
                {/* Wheels */}
                <circle cx="105" cy="290" r="18" fill="#2c3e50"/>
                <circle cx="105" cy="290" r="12" fill="#ecf0f1"/>
                <circle cx="155" cy="290" r="18" fill="#2c3e50"/>
                <circle cx="155" cy="290" r="12" fill="#ecf0f1"/>
                
                {/* Store Front */}
                <rect x="200" y="180" width="120" height="130" fill="#f5f5f5" rx="5"/>
                
                {/* Awning */}
                <path d="M 190 180 Q 260 150 330 180" fill="#ee4d2d"/>
                <path d="M 200 180 Q 260 165 320 180" fill="#ff6347"/>
                <rect x="205" y="175" width="20" height="5" fill="#ffd700"/>
                <rect x="230" y="175" width="20" height="5" fill="#ee4d2d"/>
                <rect x="255" y="175" width="20" height="5" fill="#ffd700"/>
                <rect x="280" y="175" width="20" height="5" fill="#ee4d2d"/>
                <rect x="305" y="175" width="20" height="5" fill="#ffd700"/>
                
                {/* Windows/Products */}
                <rect x="215" y="200" width="25" height="35" fill="white" stroke="#ddd" strokeWidth="2" rx="2"/>
                <rect x="250" y="200" width="25" height="35" fill="white" stroke="#ddd" strokeWidth="2" rx="2"/>
                <rect x="285" y="200" width="25" height="35" fill="white" stroke="#ddd" strokeWidth="2" rx="2"/>
                
                {/* Door */}
                <rect x="240" y="250" width="40" height="60" fill="white" stroke="#ddd" strokeWidth="2" rx="2"/>
                <circle cx="265" cy="280" r="2" fill="#ee4d2d"/>
                
                {/* Open Sign */}
                <rect x="248" y="260" width="24" height="15" fill="#ee4d2d" rx="2"/>
                <text x="260" y="271" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">OPEN</text>
                
                {/* Products in windows */}
                <rect x="218" y="210" width="8" height="12" fill="#ee4d2d" rx="1"/>
                <rect x="228" y="205" width="10" height="15" fill="#ff6347" rx="1"/>
                <rect x="253" y="208" width="12" height="18" fill="#ffd700" rx="1"/>
                <rect x="288" y="212" width="10" height="15" fill="#ee4d2d" rx="1"/>
                
                {/* Computer/Monitor */}
                <rect x="200" y="305" width="120" height="5" fill="#34495e" rx="2"/>
                <rect x="250" y="310" width="20" height="8" fill="#34495e"/>
                
                {/* Trees */}
                <rect x="350" y="265" width="10" height="45" fill="#8b4513"/>
                <circle cx="355" cy="250" r="25" fill="#52b788"/>
                <circle cx="345" cy="245" r="18" fill="#52b788"/>
                <circle cx="365" cy="245" r="18" fill="#52b788"/>
                
                <rect x="385" y="275" width="8" height="35" fill="#8b4513"/>
                <circle cx="389" cy="265" r="18" fill="#74c69d"/>
                <circle cx="382" cy="262" r="13" fill="#74c69d"/>
                <circle cx="396" cy="262" r="13" fill="#74c69d"/>
              </svg>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className={styles.rightSection}>
            <div className={styles.loginCard}>
              <div className={styles.loginHeader}>
                <h2 className={styles.loginTitle}>
                  {loginMode === 'password' ? 'Log In' : 'Log in with QR'}
                </h2>
                <button 
                  className={styles.toggleMode}
                  onClick={() => setLoginMode(loginMode === 'password' ? 'qr' : 'password')}
                >
                  {loginMode === 'password' ? (
                    <>
                      <span>Log in with QR</span>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#204F38">
                        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v3h-3v-3zm-3 0h2v2h-2v-2zm5 3h3v3h-3v-3zm-2 2h2v2h-2v-2zm-3 0h2v2h-2v-2z"/>
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Log in with password</span>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#204F38">
                        <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {loginMode === 'password' ? (
                <form onSubmit={handleSubmit} className={styles.loginForm}>
                  <div className={styles.formGroup}>
                    <input 
                      type="email" 
                      placeholder="Email"
                      className={styles.input}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.passwordWrapper}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className={styles.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={styles.eyeIcon}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className={styles.forgotPasswordRow}>
                      <button
                        type="button"
                        className={styles.forgotPassword}
                        onClick={() => setShowForgotPasswordModal(true)}
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <button type="submit" className={styles.loginButton} disabled={submitting}>
                    {submitting ? 'Logging in...' : 'LOG IN'}
                  </button>

                  <div className={styles.divider}>
                    <span>OR</span>
                  </div>

                  <div className={styles.socialButtons}>
                    <button 
                      type="button"
                      className={styles.socialButton}
                      onClick={() => handleSocialLogin('Facebook')}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </button>
                    <button 
                      type="button"
                      className={styles.socialButton}
                      onClick={() => handleSocialLogin('Google')}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </button>
                  </div>
                </form>
              ) : (
                <div className={styles.qrSection}>
                  <div className={styles.qrCodeWrapper}>
                    <div className={styles.qrCode}>
                      <svg viewBox="0 0 200 200" className={styles.qrSvg}>
                        {/* QR Code Pattern */}
                        <rect width="200" height="200" fill="white"/>
                        {/* Pattern simulation */}
                        {Array.from({length: 10}).map((_, i) => 
                          Array.from({length: 10}).map((_, j) => 
                            Math.random() > 0.5 && (
                              <rect 
                                key={`${i}-${j}`}
                                x={10 + j * 18} 
                                y={10 + i * 18} 
                                width="16" 
                                height="16" 
                                fill="black"
                              />
                            )
                          )
                        )}
                        {/* Corner markers */}
                        <rect x="10" y="10" width="50" height="50" fill="none" stroke="black" strokeWidth="8"/>
                        <rect x="25" y="25" width="20" height="20" fill="black"/>
                        <rect x="140" y="10" width="50" height="50" fill="none" stroke="black" strokeWidth="8"/>
                        <rect x="155" y="25" width="20" height="20" fill="black"/>
                        <rect x="10" y="140" width="50" height="50" fill="none" stroke="black" strokeWidth="8"/>
                        <rect x="25" y="155" width="20" height="20" fill="black"/>
                        {/* Lavisionario logo in center */}
                        <circle cx="100" cy="100" r="20" fill="#204F38"/>
                        <text x="100" y="108" fontSize="24" fill="white" textAnchor="middle" fontWeight="bold">L</text>
                      </svg>
                    </div>
                  </div>

                  <p className={styles.qrText}>Scan QR code with Lavisionario App</p>
                  
                  <button 
                    className={styles.howToScanBtn}
                    onClick={() => setShowHowToScan(!showHowToScan)}
                  >
                    How To Scan
                  </button>
                </div>
              )}

              <p className={styles.signupText}>
                New to Lavisionario? <Link href="/seller/signup">Sign Up</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 Lavisionario. All Rights Reserved.</p>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className={styles.modal} onClick={closeForgotPasswordModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{!forgotPasswordSubmitted ? 'Forgot Password?' : 'Check Your Email'}</h3>
              <button type="button" className={styles.closeModal} onClick={closeForgotPasswordModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              {!forgotPasswordSubmitted ? (
                <>
                  <p className={styles.modalText} style={{ marginBottom: 16 }}>
                    Enter your email and we&apos;ll send you a link to reset your password.
                  </p>
                  <div className={styles.formGroup}>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className={styles.input}
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    />
                  </div>
                  <button type="button" className={styles.loginButton} onClick={handleForgotPasswordSubmit}>
                    Send Reset Link
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.modalText}>
                    We&apos;ve sent a password reset link to <strong>{forgotPasswordEmail}</strong>. Check your inbox and click the link to set a new password.
                  </p>
                  <p className={styles.modalText} style={{ fontSize: 12, marginTop: 12 }}>
                    Didn&apos;t receive it? Check spam or{' '}
                    <button type="button" className={styles.forgotPassword} onClick={() => { setForgotPasswordSubmitted(false); setForgotPasswordEmail(''); }}>try again</button>
                  </p>
                  <button type="button" className={styles.loginButton} onClick={closeForgotPasswordModal} style={{ marginTop: 16 }}>
                    Back to Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className={styles.modal} onClick={closeResetPasswordModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Reset Password</h3>
              <button type="button" className={styles.closeModal} onClick={closeResetPasswordModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalText} style={{ marginBottom: 16 }}>
                Enter your new password. Use at least 8 characters with lowercase, uppercase, and digits.
              </p>
              <div className={styles.formGroup}>
                <input
                  type="password"
                  name="password"
                  placeholder="New Password"
                  className={styles.input}
                  value={resetData.password}
                  onChange={handleResetPasswordChange}
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  className={styles.input}
                  value={resetData.confirmPassword}
                  onChange={handleResetPasswordChange}
                />
              </div>
              <button type="button" className={styles.loginButton} onClick={handleResetPassword}>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How To Scan Modal */}
      {showHowToScan && (
        <div className={styles.modal} onClick={() => setShowHowToScan(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>How To Scan</h3>
              <button 
                className={styles.closeModal}
                onClick={() => setShowHowToScan(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.phonePreview}>
                <div className={styles.phoneScreen}>
                  <div className={styles.shopeeAppHeader}>
                    <input placeholder="🔍 Lavisionario" readOnly />
                    <div className={styles.appIcons}>🛒 💬</div>
                  </div>
                  <div className={styles.scanIconArea}>
                    <div className={styles.scanIcon}>📱</div>
                  </div>
                </div>
              </div>
              <p className={styles.modalText}>
                Press the scan icon on the Lavisionario app to open the QR code scanner
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense fallback={null}>
      <SellerLoginPageInner />
    </Suspense>
  );
}