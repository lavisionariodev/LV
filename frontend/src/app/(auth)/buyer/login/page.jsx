// login.jsx
'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import AuthLayout from '../AuthLayout';
import styles from './login.module.css';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const [resetData, setResetData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  const handleSignInChange = (e) => {
    setSignInData({
      ...signInData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignIn = async () => {
    if (!signInData.email || !signInData.password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        alert(error.message || 'Login failed. Please check your credentials.');
        return;
      }

      alert('Login successful!');
      window.location.href = redirect || '/';
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  const handleSocialAuth = (provider) => {
    alert(`${provider} authentication would be implemented here`);
  };

  // Forgot Password Handlers
  const handleForgotPasswordSubmit = async () => {
    if (!forgotPasswordEmail) {
      alert('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordSubmitted(true);
      } else {
        alert(data.message || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail('');
    setForgotPasswordSubmitted(false);
  };

  // Reset Password Handlers
  const handleResetPasswordChange = (e) => {
    setResetData({
      ...resetData,
      [e.target.name]: e.target.value
    });
  };

  const handleResetPassword = async () => {
    if (!resetData.password || !resetData.confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (resetData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (resetData.password !== resetData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const resetToken = urlParams.get('token');

      if (!resetToken) {
        alert('Invalid reset link');
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password: resetData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Password reset successful! Please login with your new password.');
        setShowResetPasswordModal(false);
        setResetData({ password: '', confirmPassword: '' });
      } else {
        alert(data.message || 'Password reset failed. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetData({ password: '', confirmPassword: '' });
  };

  return (
    <>
      <AuthLayout type="signin" showPanel={true}>
        <h1>Sign In</h1>
        
        <div className={styles.socialIcons}>
          <a onClick={() => handleSocialAuth('google')}>
            <i className='bx bxl-google'></i>
          </a>
          <a onClick={() => handleSocialAuth('facebook')}>
            <i className='bx bxl-facebook'></i>
          </a>
          <a onClick={() => handleSocialAuth('github')}>
            <i className='bx bxl-github'></i>
          </a>
          <a onClick={() => handleSocialAuth('linkedin')}>
            <i className='bx bxl-linkedin'></i>
          </a>
        </div>

        <span>Sign in With Email & Password</span>

        <input
          type="email"
          name="email"
          placeholder="Enter E-mail"
          value={signInData.email}
          onChange={handleSignInChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          value={signInData.password}
          onChange={handleSignInChange}
        />

        <a 
          onClick={() => setShowForgotPasswordModal(true)}
          style={{ cursor: 'pointer' }}
        >
          Forgot Password?
        </a>

        <button onClick={handleSignIn}>Sign In</button>

        <div className={styles.authFooter}>
          Don't have an account? <a href="/buyer/signup">Sign Up</a>
        </div>
      </AuthLayout>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            {!forgotPasswordSubmitted ? (
              <>
                <button 
                  className={styles.closeButton}
                  onClick={closeForgotPasswordModal}
                >
                  ×
                </button>
                <div className={styles.iconContainer}>
                  <i className='bx bx-envelope'></i>
                </div>
                <h2>Forgot Password?</h2>
                <p>No worries! Enter your email address below and we'll send you a link to reset your password.</p>
                
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                />
                
                <button onClick={handleForgotPasswordSubmit} className={styles.submitButton}>
                  Send Reset Link
                </button>
              </>
            ) : (
              <>
                <button 
                  className={styles.closeButton}
                  onClick={closeForgotPasswordModal}
                >
                  ×
                </button>
                <div className={styles.successIcon}>
                  <i className='bx bx-check'></i>
                </div>
                <h2>Check Your Email</h2>
                <p>
                  We've sent a password reset link to <strong>{forgotPasswordEmail}</strong>. 
                  Please check your inbox and click the link to reset your password.
                </p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  Didn't receive the email? Check your spam folder or{' '}
                  <a 
                    onClick={() => {
                      setForgotPasswordSubmitted(false);
                      setForgotPasswordEmail('');
                    }}
                    style={{ cursor: 'pointer', color: '#204F38' }}
                  >
                    try again
                  </a>
                </p>
                <button 
                  onClick={closeForgotPasswordModal}
                  className={styles.submitButton}
                >
                  Back to Sign In
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button 
              className={styles.closeButton}
              onClick={closeResetPasswordModal}
            >
              ×
            </button>
            <div className={styles.iconContainer}>
              <i className='bx bx-lock-alt'></i>
            </div>
            <h2>Reset Password</h2>
            <p>Enter your new password below. Make sure it's at least 6 characters long.</p>
            
            <input
              type="password"
              name="password"
              placeholder="New Password"
              value={resetData.password}
              onChange={handleResetPasswordChange}
            />
            <div className={styles.passwordRequirements}>
              • Minimum 6 characters
            </div>
            
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={resetData.confirmPassword}
              onChange={handleResetPasswordChange}
            />
            
            <button onClick={handleResetPassword} className={styles.submitButton}>
              Reset Password
            </button>
          </div>
        </div>
      )}
    </>
  );
}