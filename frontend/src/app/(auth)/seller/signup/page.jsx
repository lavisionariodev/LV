'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './signup.module.css';
import { FaStore, FaGift, FaHandshake, FaBullhorn, FaTruck,
         FaShoppingBasket, FaChartLine, FaWarehouse, FaGraduationCap,
         FaFacebook, FaYoutube, FaViber, FaShoppingBag } from 'react-icons/fa';
import { TbMessage2Question } from 'react-icons/tb';
import PublicFooter from '@/components/layout/PublicFooter/PublicFooter';
import { validateNewPassword } from '@/lib/validators/authSchemas';
import { sendEmailOtpForSignup, verifyEmailOtpForSignup, signInWithOAuth, getOAuthRedirectUrl } from '@/lib/auth/client';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

const StepIndicator = ({ currentStep }) => (
  <div className={styles.stepIndicator}>
    <div className={styles.stepItem}>
      <div className={`${styles.stepCircle} ${currentStep >= 1 ? styles.active : ''}`}>1</div>
      <span className={`${styles.stepLabel} ${currentStep >= 1 ? styles.active : ''}`}>Verify email</span>
    </div>
    <div className={`${styles.stepLine} ${currentStep >= 2 ? styles.active : ''}`}></div>
    <div className={styles.stepItem}>
      <div className={`${styles.stepCircle} ${currentStep >= 2 ? styles.active : ''}`}>2</div>
      <span className={`${styles.stepLabel} ${currentStep >= 2 ? styles.active : ''}`}>Create password</span>
    </div>
    <div className={`${styles.stepLine} ${currentStep >= 3 ? styles.active : ''}`}></div>
    <div className={styles.stepItem}>
      <div className={`${styles.stepCircle} ${currentStep >= 3 ? styles.active : ''}`}>
        {currentStep >= 3 ? '✓' : ''}
      </div>
      <span className={`${styles.stepLabel} ${currentStep >= 3 ? styles.active : ''}`}>Done</span>
    </div>
  </div>
);

const Step1EmailInput = ({ email, setEmail, onNext, currentStep, onSocialAuth }) => (
  <div className={styles.signupCard}>
    {currentStep > 1 && <StepIndicator currentStep={currentStep} />}
    <h2 className={styles.signupTitle}>Sign Up</h2>
    <div className={styles.signupForm}>
      <input
        type="email"
        placeholder="Email Address"
        className={styles.emailInput}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onNext(); }}
      />
      <button 
        type="button" 
        className={styles.nextButton}
        onClick={onNext}
      >
        NEXT
      </button>
      
      <div className={styles.divider}>
        <span>OR</span>
      </div>

      <div className={styles.socialButtons}>
        <button
          type="button"
          className={styles.facebookBtn}
          onClick={() => onSocialAuth && onSocialAuth('Facebook')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877f2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook
        </button>
        <button
          type="button"
          className={styles.googleBtn}
          onClick={() => onSocialAuth && onSocialAuth('Google')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
      </div>

      <p className={styles.terms}>
        By signing up, you agree to Lavisionario&apos;s <a href="#">Terms of Service</a> & <a href="#">Privacy Policy</a>
      </p>

      <p className={styles.loginLink}>
        Have an account? <Link href="/seller/login">Log In</Link>
      </p>
    </div>
  </div>
);

const Step2VerificationMethod = ({ email, onSelectMethod, onBack, currentStep, isSending }) => {
  return (
    <div className={`${styles.signupCard} ${styles.verificationCard}`}>
      <StepIndicator currentStep={currentStep} />
      <button className={styles.backButton} onClick={onBack}>←</button>
      <h2 className={styles.signupTitle}>Verify your email</h2>
      <p className={styles.verificationSubtitle}>
        We will send a verification code to:
      </p>
      <p className={styles.emailDisplay}>{email}</p>

      <button
        type="button"
        className={`${styles.nextButton} ${styles.fullWidth}`}
        onClick={() => onSelectMethod('email')}
        disabled={isSending}
      >
        {isSending ? 'Sending...' : 'Send verification code'}
      </button>
    </div>
  );
};

const Step3OTPInput = ({
  email,
  countdown,
  onResend,
  otpValue,
  setOtpValue,
  onNext,
  onBack,
  currentStep,
  isVerifying,
}) => {
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otpValue];
    newOtp[index] = value;
    setOtpValue(newOtp);
    
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  return (
    <div className={`${styles.signupCard} ${styles.otpCard}`}>
      <StepIndicator currentStep={currentStep} />
      <button className={styles.backButton} onClick={onBack}>←</button>
      <h2 className={styles.signupTitle}>Enter Verification Code</h2>
      <p className={styles.verificationSubtitle}>
        We have sent a 6-digit verification code to your email address:
      </p>
      <p className={styles.emailDisplay}>{email}</p>
      
      <div className={styles.otpInputs}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            id={`otp-${index}`}
            type="text"
            maxLength="1"
            className={styles.otpInput}
            value={otpValue[index]}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
          />
        ))}
      </div>
      
      <p className={styles.resendText}>
        {countdown > 0 ? (
          `Please wait ${countdown} seconds to resend.`
        ) : (
          <a href="#" onClick={(e) => { e.preventDefault(); onResend(); }}>Resend Code</a>
        )}
      </p>
      
      <button 
        className={`${styles.nextButton} ${styles.fullWidth}`}
        onClick={onNext}
        disabled={otpValue.some(digit => !digit) || isVerifying}
      >
        {isVerifying ? 'Verifying...' : 'NEXT'}
      </button>
    </div>
  );
};

const StepPhoneReclaim = ({ phoneNumber, existingAccount, onProceed, onBack, currentStep }) => {
  const formattedPhone = `(+63) ${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6)}`;
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    reason: '',
    additionalInfo: '',
    confirmOwnership: false,
    agreeTerms: false
  });
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.fullName.trim() && 
           formData.email.trim() && 
           formData.reason.trim() &&
           formData.confirmOwnership && 
           formData.agreeTerms;
  };
  
  return (
    <div className={`${styles.signupCard} ${styles.reclaimCard}`}>
      <StepIndicator currentStep={currentStep} />
      <button className={styles.backButton} onClick={onBack}>←</button>
      <h2 className={styles.signupTitle}>Phone Number Reclaim Request</h2>
      
      <div className={styles.reclaimInfo}>
        <div className={styles.warningIcon}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="#ff6b00">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        
        <p className={styles.reclaimMessage}>
          The phone number <strong>{formattedPhone}</strong> is already linked to an existing Lavisionario account. Please fill out this form to reclaim your number for Seller Centre.
        </p>
        
        <div className={styles.existingAccountInfo}>
          <div className={styles.accountAvatar}>
            {existingAccount.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.accountDetails}>
            <h3 className={styles.accountUsername}>{existingAccount.name}</h3>
            <p className={styles.accountType}>Current Account</p>
          </div>
        </div>

        {/* Reclaim Form */}
        <div className={styles.reclaimForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Full Name <span className={styles.required}>*</span>
            </label>
            <input 
              type="text"
              placeholder="Enter your full name"
              className={styles.formControl}
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Email Address <span className={styles.required}>*</span>
            </label>
            <input 
              type="email"
              placeholder="Enter your email address"
              className={styles.formControl}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Phone Number to Reclaim <span className={styles.required}>*</span>
            </label>
            <input 
              type="text"
              className={styles.formControl}
              value={formattedPhone}
              disabled
              style={{ background: '#f5f5f5', color: '#666' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Reason for Reclaiming <span className={styles.required}>*</span>
            </label>
            <select 
              className={styles.formControl}
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
            >
              <option value="">Please select a reason</option>
              <option value="create_seller">I want to create a Seller Centre account</option>
              <option value="lost_access">I lost access to my buyer account</option>
              <option value="security">Security concerns</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Additional Information
            </label>
            <textarea 
              placeholder="Provide any additional details that may help us process your request..."
              className={styles.formTextarea}
              rows="4"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
            />
          </div>

          <div className={styles.reclaimNotice}>
            <h4>⚠️ Important Information:</h4>
            <ul>
              <li>By reclaiming this phone number, it will be <strong>removed from your existing Lavisionario account</strong></li>
              <li>You will need to <strong>add a new phone number</strong> to your buyer account to continue using it</li>
              <li>This process may take <strong>24-48 hours</strong> to complete</li>
              <li>You will receive email confirmation once the reclaim is processed</li>
            </ul>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                className={styles.checkbox}
                checked={formData.confirmOwnership}
                onChange={(e) => handleInputChange('confirmOwnership', e.target.checked)}
              />
              <span>I confirm that I own this phone number and have access to it <span className={styles.required}>*</span></span>
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                className={styles.checkbox}
                checked={formData.agreeTerms}
                onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
              />
              <span>I understand that this will remove the phone number from my existing account <span className={styles.required}>*</span></span>
            </label>
          </div>
        </div>
      </div>
      
      <button 
        className={`${styles.reclaimButton} ${styles.fullWidth}`}
        onClick={onProceed}
        disabled={!isFormValid()}
      >
        SUBMIT RECLAIM REQUEST
      </button>
      
      <button 
        className={`${styles.cancelButton} ${styles.fullWidth}`}
        onClick={onBack}
      >
        Cancel
      </button>
    </div>
  );
};

const Step4AccountCheck = ({ phoneNumber, existingAccount, onLogin, onCreateNew, currentStep }) => {
  const formattedPhone = `(+63) ${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6)}`;
  
  if (!existingAccount) return null;
  
  return (
    <div className={`${styles.signupCard} ${styles.accountCheckCard}`}>
      <StepIndicator currentStep={currentStep} />
      <button className={styles.backButton} onClick={onCreateNew}>←</button>
      <h2 className={styles.signupTitle}>Is This Your Account?</h2>
      
      <div className={styles.accountInfo}>
        <div className={styles.accountAvatar}>{existingAccount.name.charAt(0).toUpperCase()}</div>
        <h3 className={styles.accountName}>{existingAccount.name}</h3>
        <p className={styles.accountPhone}>{formattedPhone}</p>
        <p className={styles.accountMessage}>
          This phone number is already registered with Lavisionario. 
          Please proceed to login if this account belongs to you.
        </p>
      </div>
      
      <button className={styles.loginButton} onClick={onLogin}>
        Yes, Login
      </button>
      <button className={styles.createNewButton} onClick={onCreateNew}>
        No, Create A New Account
      </button>
    </div>
  );
};

const Step5CreatePassword = ({
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onComplete,
  onBack,
  currentStep,
  isSubmitting,
}) => (
  <div className={`${styles.signupCard} ${styles.passwordCard}`}>
    <StepIndicator currentStep={currentStep} />
    <button className={styles.backButton} onClick={onBack}>←</button>
    <h2 className={styles.signupTitle}>Create Password</h2>
    <p className={styles.verificationSubtitle}>Enter your seller account details and secure password.</p>

    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Full Name</label>
      <input
        type="text"
        placeholder="Your full name"
        className={styles.formControl}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Email</label>
      <input
        type="email"
        placeholder="you@example.com"
        className={styles.formControl}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Password</label>
      <input
        type="password"
        placeholder="At least 8 characters; lowercase, uppercase, digit"
        className={styles.formControl}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Confirm Password</label>
      <input
        type="password"
        placeholder="Re-enter your password"
        className={styles.formControl}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
    </div>

    <button
      className={`${styles.nextButton} ${styles.fullWidth}`}
      onClick={onComplete}
      disabled={
        !fullName.trim() ||
        !email.trim() ||
        !password ||
        !confirmPassword ||
        password !== confirmPassword ||
        password.length < 8 ||
        isSubmitting
      }
    >
      {isSubmitting ? 'Creating account...' : 'CREATE ACCOUNT'}
    </button>
  </div>
);

const Page = () => {
  const [step, setStep] = useState(1);
  const [signupEmail, setSignupEmail] = useState('');
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [existingAccount, setExistingAccount] = useState(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const router = useRouter();
  const toast = useToast();
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSocialSignup = async (provider) => {
    const redirectTo = getOAuthRedirectUrl({
      redirectPath: '/seller/onboarding',
      portal: 'seller',
    });

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

  const handleEmailNext = () => {
    const trimmedEmail = signupEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSignupEmail(trimmedEmail);
    setEmail(trimmedEmail);
    setStep(2);
  };

  const sendVerificationCode = async (isResend = false) => {
    const trimmedEmail = signupEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return false;
    }

    setIsSendingCode(true);
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (existingProfile) {
        toast.error('This email is already registered. Please log in instead of signing up again.');
        router.push('/seller/login');
        return false;
      }

      const { error } = await sendEmailOtpForSignup({
        email: trimmedEmail,
        role: 'seller',
      });

      if (error) {
        toast.error(error);
        return false;
      }

      setCountdown(60);
      toast.success(isResend ? 'Verification code resent to your email.' : 'Verification code sent to your email.');
      return true;
    } catch (err) {
      console.error('Error sending email OTP:', err);
      toast.error(isResend ? 'Failed to resend verification code. Please try again.' : 'Failed to send verification code. Please try again.');
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleMethodSelect = async (method) => {
    if (method !== 'email') return;
    const success = await sendVerificationCode(false);
    if (success) setStep(3);
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await sendVerificationCode(true);
  };

  const handleOTPNext = async () => {
    const code = otpValue.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const { error } = await verifyEmailOtpForSignup({
        email: signupEmail,
        token: code,
      });

      if (error) {
        toast.error(error);
        return;
      }

      setIsEmailVerified(true);
      toast.success('Email verified. Now create your password.');
      setStep(5);
    } catch (err) {
      console.error('Error verifying email OTP:', err);
      toast.error('Failed to verify code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleReclaimProceed = () => {
    toast.success('Reclaim request submitted. Our team will review within 24-48 hours and email you once approved.');
    setStep(5);
  };

  const handleReclaimBack = () => {
    setStep(1);
    setSignupEmail('');
    setOtpValue(['', '', '', '', '', '']);
    setExistingAccount(null);
  };

  const handleLogin = () => {
    router.push('/seller/login');
  };

  const handleCreateNew = () => {
    setExistingAccount(null);
    setStep(5);
  };

  const handleComplete = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      toast.error('Please provide your full name and email address.');
      return;
    }

    const validation = validateNewPassword(password, confirmPassword);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    if (!isEmailVerified) {
      toast.error('Please verify your email before creating your account.');
      return;
    }

    setIsCompleting(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error('Your session has expired. Please restart the signup process.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: trimmedName,
          role: 'seller',
        },
      });

      if (updateError) {
        toast.error(updateError.message || 'Failed to finalize your account. Please try again.');
        return;
      }

      await supabase
        .from('profiles')
        .update({ full_name: trimmedName })
        .eq('id', user.id);

      toast.success('Seller Centre account created! Please complete your shop onboarding.');
      router.replace('/seller/onboarding');
    } catch (err) {
      console.error('Seller signup error:', err);
      toast.error('An error occurred while creating your account. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const heroSectionStyle = {
    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), url(/backgrounds/green-skyline-ng.png)',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logoWrapper} aria-label="Lavisionario home">
            <div className={styles.shopeeIcon}>
              <span className={styles.logoPlaceholder}>L</span>
            </div>
            <div className={styles.logoText}>
              <span className={styles.shopeeName}>Lavisionario</span>
            </div>
          </Link>
          <Link href="/seller/need_help" className={styles.needHelp} aria-label="Need help?">
            <span className={styles.needHelpText}>Need help?</span>
            <span className={styles.needHelpIcon} aria-hidden="true">
              <TbMessage2Question />
            </span>
          </Link>
        </div>
      </header>

      <section className={styles.heroSection} style={heroSectionStyle}>
        <div className={styles.heroContainer}>
          <div className={styles.heroLeft}>
            <p className={styles.marketplaceLabel}>Lavisionario Marketplace</p>
            <h1 className={styles.heroTitle}>Grow your business and Sell more</h1>
            
            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><FaStore /></div>
                <p>Leading e-commerce platform in Southeast Asia and Taiwan</p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><FaGift /></div>
                <p>Growing global presence</p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><FaHandshake /></div>
                <p>#1 shopping app for both iOS and Android in the Philippines</p>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            {step === 1 && (
              <Step1EmailInput
                email={signupEmail}
                setEmail={setSignupEmail}
                onNext={handleEmailNext}
                currentStep={1}
                onSocialAuth={handleSocialSignup}
              />
            )}
            {step === 2 && (
              <Step2VerificationMethod
                email={signupEmail}
                onSelectMethod={handleMethodSelect}
                onBack={() => setStep(1)}
                currentStep={2}
                isSending={isSendingCode}
              />
            )}
            {step === 3 && (
              <Step3OTPInput
                email={signupEmail}
                countdown={countdown}
                onResend={handleResendOTP}
                otpValue={otpValue}
                setOtpValue={setOtpValue}
                onNext={handleOTPNext}
                onBack={() => setStep(2)}
                currentStep={2}
                isVerifying={isVerifyingCode}
              />
            )}
            {step === 5 && (
              <Step5CreatePassword
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                onComplete={handleComplete}
                onBack={() => setStep(3)}
                currentStep={3}
                isSubmitting={isCompleting}
              />
            )}
          </div>
        </div>
      </section>

      <section className={styles.whySellSection}>
        <h2 className={styles.sectionTitle}>WHY SELL WITH US</h2>
        <div className={styles.benefitsGrid}>
          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <span className={styles.percentIcon}>0%</span>
            </div>
            <h3>No registration fees</h3>
            <p>Start selling on Lavisionario Marketplace easily!</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.megaphoneIcon}><FaBullhorn /></div>
            </div>
            <h3>In-app marketing tools</h3>
            <p>Boost traffic and sales with attractive discounts, flash deals, livestreams, and more.</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.truckIcon}><FaTruck /></div>
              <span className={styles.freeBadge}>Free</span>
            </div>
            <h3>Hassle-free shipping</h3>
            <p>Arrange, track and deliver your orders easily with Lavisionario Supported Logistics</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.basketIcon}><FaShoppingBasket /></div>
              <span className={styles.badge99}>9.9</span>
            </div>
            <h3>High-impact campaigns</h3>
            <p>Be part of Lavisionario&apos;s mega activations through monthly campaigns such as our 9.9 Super Shopping Day and 11.11 Big Sale!</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.chartIcon}><FaChartLine /></div>
            </div>
            <h3>Extensive seller support</h3>
            <p>Access tools from Lavisionario Seller Centre, our one-stop hub that helps you sell effectively, manage customers, and track your shop performance.</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.storeIcon}><FaWarehouse /></div>
            </div>
            <h3>Robust seller community</h3>
            <p>Connect and grow together with your fellow Lavisionario sellers. Gain access to webinars, courses, seller tips, campaign updates, and more!</p>
          </div>
        </div>
      </section>

      <section className={styles.howToStartSection}>
        <h2 className={styles.sectionTitleWhite}>HOW TO START SELLING</h2>
        <div className={styles.stepsContainer}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3>Create a Lavisionario account</h3>
            <p>Select Sign Up via the Me tab on Lavisionario App. Then, sign up with your email.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3>Set up shipping information</h3>
            <p>Add your address via My Addresses in Account Settings. Then, enable shipping channels via My Shipping on the My Shop page.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3>Upload product listings</h3>
            <p>Select Start Selling, followed by Add Products. Then, fill in product information and publish!</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>04</div>
            <h3>Add payment information</h3>
            <p>Set up Seller Balance via the My Shop page to receive payment from orders. Link your bank account to facilitate withdrawal of income.</p>
          </div>
        </div>
      </section>

      <section className={styles.sellerProgramsSection}>
        <h2 className={styles.sectionTitle}>OUR SELLER PROGRAMS</h2>
        <div className={styles.programsGrid}>
          <div className={styles.programCard}>
            <div className={`${styles.programHeader} ${styles.premiumHeader}`}>
              <div className={styles.shopeeMallLogo}>Lavisionario Premium</div>
            </div>
            <div className={styles.programContent}>
              <h3>Lavisionario Premium</h3>
              <p className={styles.programDesc}>A premium business-to-consumer retail space for selected brand owners and authorised distributors.</p>
              <ul className={styles.programFeatures}>
                <li>Access to premium Lavisionario Mall promotional tools and customer loyalty program</li>
                <li>Exclusive Lavisionario Mall campaigns and vouchers to boost sales</li>
                <li>3 - 5 % commission fee applies only on successful orders (excluding GST)</li>
              </ul>
              <p className={styles.feeNote}>* Standard transaction fees and Mall service fees apply.</p>
              <button className={`${styles.signUpButton} ${styles.premiumBtn}`}>Sign Up Now</button>
            </div>
          </div>

          <div className={styles.programCard}>
            <div className={`${styles.programHeader} ${styles.marketplaceHeader}`}>
              <div className={styles.shopeeIcon}>
                <FaShoppingBag size={60} color="white" />
              </div>
            </div>
            <div className={styles.programContent}>
              <h3>Lavisionario Marketplace</h3>
              <p className={styles.programDesc}>Open to all sellers who operate in the Philippines, including part-time sellers and resellers.</p>
              <ul className={styles.programFeatures}>
                <li>No registration fees</li>
                <li>Access to wide range of seller marketing tools</li>
                <li>Access to integrated logistics partners</li>
                <li>Free business tools and powerful Seller Centre with access to data of Shop&apos;s performance</li>
              </ul>
              <button className={`${styles.signUpButton} ${styles.marketplaceBtn}`}>Sign Up Now</button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.supportSection}>
        <h2 className={styles.sectionTitle}>SUPPORT WHEN YOU NEED IT</h2>
        <div className={styles.supportGrid}>
          <div className={styles.supportCard}>
            <div className={styles.supportIconWrapper}>
              <div className={styles.supportIcon}><FaGraduationCap /></div>
            </div>
            <h3>Seller Education Hub</h3>
            <p>One-stop portal with self-help guides to help you sell successfully on Lavisionario.</p>
          </div>

          <div className={styles.supportCard}>
            <div className={styles.supportIconWrapper}>
              <div className={styles.supportIcon}><FaFacebook /></div>
            </div>
            <h3>Lavisionario Uni Facebook Group</h3>
            <p>Get tips and tricks and connect with fellow sellers in the Lavisionario community.</p>
          </div>

          <div className={styles.supportCard}>
            <div className={styles.supportIconWrapper}>
              <div className={styles.supportIcon}><FaYoutube /></div>
            </div>
            <h3>Lavisionario Uni Youtube</h3>
            <p>Learn more about Lavisionario&apos;s latest programs, updates, and activities for sellers.</p>
          </div>

          <div className={styles.supportCard}>
            <div className={styles.supportIconWrapper}>
              <div className={styles.supportIcon}><FaViber /></div>
            </div>
            <h3>Lavisionario Uni Viber Group</h3>
            <p>A seller announcements group with the latest Lavisionario updates to enhance your selling experience.</p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Page;