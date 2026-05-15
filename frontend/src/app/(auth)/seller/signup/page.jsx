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
import { useAuthToast } from '@/contexts/ToastContext';
import { useSiteContent } from '@/lib/siteContent/client';

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

const Step1EmailInput = ({ systemName, email, setEmail, onNext, currentStep, onSocialAuth }) => (
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
        By signing up, you agree to {systemName}&apos;s <a href="/policies">Terms of Service</a> & <a href="/policies">Privacy Policy</a>
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
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const eyeOpen = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const eyeClosed = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
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
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters; lowercase, uppercase, digit"
            className={styles.formControl}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eyeIcon}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? eyeClosed : eyeOpen}
          </button>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Confirm Password</label>
        <div className={styles.passwordWrapper}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Re-enter your password"
            className={styles.formControl}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eyeIcon}
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirmPassword ? eyeClosed : eyeOpen}
          </button>
        </div>
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
};

const Page = () => {
  const { data: siteContent } = useSiteContent();
  const systemName = siteContent?.systemName || 'La Visionario';

  const [step, setStep] = useState(1);
  const [signupEmail, setSignupEmail] = useState('');
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const router = useRouter();
  const toast = useAuthToast();
  
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

      const { error: pendingMetaErr } = await supabase.auth.updateUser({
        data: { seller_password_pending: true },
      });
      if (pendingMetaErr) {
        console.error('seller_password_pending metadata:', pendingMetaErr);
        toast.error('Could not continue signup. Please try verifying your code again.');
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

      const res = await fetch('/api/auth/seller/complete-signup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          password,
          confirmPassword,
          fullName: trimmedName,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Failed to finalize your account. Please try again.');
        return;
      }

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
          <Link href="/" className={styles.logoWrapper} aria-label={`${systemName} home`}>
            <div className={styles.shopeeIcon}>
              <span className={styles.logoPlaceholder}>L</span>
            </div>
            <div className={styles.logoText}>
              <span className={styles.shopeeName}>{systemName}</span>
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
            <p className={styles.marketplaceLabel}>{systemName} for Providers</p>
            <h1 className={styles.heroTitle}>Reach families who need compassionate care</h1>
            
            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><FaStore /></div>
                <p>Funeral and memorial services marketplace built for Filipino families</p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><FaGift /></div>
                <p>List chapel, cremation, burial, transport, and memorial packages in one place</p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><FaHandshake /></div>
                <p>Secure bookings and escrow-protected payouts through PayMongo</p>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            {step === 1 && (
              <Step1EmailInput
                systemName={systemName}
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
            <p>Apply as a verified funeral service provider on {systemName} at no signup cost.</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.megaphoneIcon}><FaBullhorn /></div>
            </div>
            <h3>Reach families online</h3>
            <p>Appear on our shop, partners directory, and public provider profiles when families search for services.</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.truckIcon}><FaTruck /></div>
              <span className={styles.freeBadge}>Free</span>
            </div>
            <h3>Manage bookings in one place</h3>
            <p>Confirm service dates, track order status, and coordinate with families from Seller Centre.</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.basketIcon}><FaShoppingBasket /></div>
              <span className={styles.badge99}>9.9</span>
            </div>
            <h3>List services & packages</h3>
            <p>Publish chapel, cremation, burial, transport, and memorial offerings—with clear inclusions and admin-reviewed listings.</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.chartIcon}><FaChartLine /></div>
            </div>
            <h3>Escrow-protected payouts</h3>
            <p>Family payments are held securely until services are fulfilled, then released toward your payout account via PayMongo.</p>
          </div>

          <div className={styles.benefitCard}>
            <div className={styles.benefitIconLarge}>
              <div className={styles.storeIcon}><FaWarehouse /></div>
            </div>
            <h3>Seller help & onboarding</h3>
            <p>Use Help in Seller Centre for FAQs and support requests, plus guided onboarding until your shop is approved.</p>
          </div>
        </div>
      </section>

      <section className={styles.howToStartSection}>
        <h2 className={styles.sectionTitleWhite}>HOW TO START SELLING</h2>
        <div className={styles.stepsContainer}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3>Create your seller account</h3>
            <p>Sign up with your email on this page, verify the code we send, then create your password.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3>Complete onboarding</h3>
            <p>Submit your business profile, shop details, specialties, address, and required compliance documents for admin review.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3>Add service listings</h3>
            <p>After approval, create services and packages in Seller Centre. Listings are reviewed before families can book them.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>04</div>
            <h3>Receive bookings & payouts</h3>
            <p>Families book and pay through Lavisionario. Manage orders in Seller Centre and set payout details under Settings → Payouts.</p>
          </div>
        </div>
      </section>

      <section className={styles.sellerProgramsSection}>
        <h2 className={styles.sectionTitle}>OUR SELLER PROGRAMS</h2>
        <div className={styles.programsGrid}>
          <div className={styles.programCard}>
            <div className={`${styles.programHeader} ${styles.premiumHeader}`}>
              <div className={styles.shopeeMallLogo}>Verified Partner</div>
            </div>
            <div className={styles.programContent}>
              <h3>Verified Partner</h3>
              <p className={styles.programDesc}>For established funeral homes, memorial parks, and service providers who meet our verification standards.</p>
              <ul className={styles.programFeatures}>
                <li>Featured on the Partners directory and spotlight when selected by admin</li>
                <li>Public provider profile families can view before booking</li>
                <li>Priority consideration for directory placement and trust badges</li>
              </ul>
              <p className={styles.feeNote}>* Platform commission and payout terms apply to completed bookings.</p>
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
              <h3>Service Provider</h3>
              <p className={styles.programDesc}>Open to funeral homes, chapels, crematoriums, transport providers, and memorial suppliers operating in the Philippines.</p>
              <ul className={styles.programFeatures}>
                <li>No registration fees to apply</li>
                <li>List services and packages with admin approval</li>
                <li>Manage bookings, customers, and reviews in Seller Centre</li>
                <li>Analytics, escrow summary, and payout settings after account activation</li>
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
            <h3>Seller Help Centre</h3>
            <p>Browse FAQs on bookings, listings, payouts, and compliance—or submit a support request after you sign in.</p>
          </div>

          <div className={styles.supportCard}>
            <div className={styles.supportIconWrapper}>
              <div className={styles.supportIcon}><FaFacebook /></div>
            </div>
            <h3>Pre-signup help</h3>
            <p>Questions before you apply? Use Need help? at the top of this page for guides on signup and onboarding.</p>
          </div>

          <div className={styles.supportCard}>
            <div className={styles.supportIconWrapper}>
              <div className={styles.supportIcon}><FaYoutube /></div>
            </div>
            <h3>How it works for families</h3>
            <p>See how families browse, compare, and book on {systemName} so you know what to expect when orders arrive.</p>
          </div>

          <div className={styles.supportCard}>
            <div className={styles.supportIconWrapper}>
              <div className={styles.supportIcon}><FaViber /></div>
            </div>
            <h3>Partner with us</h3>
            <p>Learn about our trusted provider network on the Partners page before you complete your application.</p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Page;