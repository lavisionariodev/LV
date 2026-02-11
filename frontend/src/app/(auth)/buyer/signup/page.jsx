// signup.jsx
'use client';
import { useState } from 'react';
import AuthLayout from '../AuthLayout';
import styles from './signup.module.css';

export default function SignUpPage() {
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSignUpChange = (e) => {
    setSignUpData({
      ...signUpData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async () => {
    if (!signUpData.name || !signUpData.email || !signUpData.password) {
      alert('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (signUpData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signUpData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Sign up successful! Please login.');
        setSignUpData({ name: '', email: '', password: '' });
        window.location.href = '/buyer/login';
      } else {
        alert(data.message || 'Sign up failed. Please try again.');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  const handleSocialAuth = (provider) => {
    alert(`${provider} authentication would be implemented here`);
  };

  return (
    <AuthLayout type="signup" showPanel={true}>
      <h1>Create Account</h1>
      
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

      <span>Register with E-mail</span>

      <input
        type="text"
        name="name"
        placeholder="Name"
        value={signUpData.name}
        onChange={handleSignUpChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Enter E-mail"
        value={signUpData.email}
        onChange={handleSignUpChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Enter Password"
        value={signUpData.password}
        onChange={handleSignUpChange}
      />

      <button onClick={handleSignUp}>Sign Up</button>

      <div className={styles.authFooter}>
        Already have an account? <a href="/buyer/login">Sign In</a>
      </div>
    </AuthLayout>
  );
}