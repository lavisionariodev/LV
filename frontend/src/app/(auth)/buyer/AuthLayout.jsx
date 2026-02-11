// AuthLayout.jsx
'use client';
import styles from './auth-layout.module.css';

export default function AuthLayout({ 
  children, 
  type = 'default', // 'signin', 'signup', or 'default'
  showPanel = false 
}) {
  return (
    <>
      <link 
        href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' 
        rel='stylesheet'
      />
      
      <div className={`${styles.authContainer} ${styles[type]}`}>
        {showPanel ? (
          <>
            {/* Left Side - Auth Form */}
            <div className={styles.formSection}>
              <div className={styles.authForm}>
                {children}
              </div>
            </div>

            {/* Right Side - Welcome Panel */}
            <div className={styles.panelSection}>
              <div className={styles.panelContent}>
                <h1>H E L L O !</h1>
                <p>
                  {type === 'signin' 
                    ? 'Sign up now and enjoy our site' 
                    : 'Already have an account?'}
                </p>
                <a 
                  href={type === 'signin' ? '/buyer/signup' : '/buyer/login'}
                  className={styles.panelButton}
                >
                  {type === 'signin' ? 'Sign Up' : 'Sign In'}
                </a>
              </div>
            </div>
          </>
        ) : (
          // Single centered form (for forgot password, reset password)
          <div className={styles.authForm}>
            {children}
          </div>
        )}
      </div>
    </>
  );
}