'use client';

import { useState } from 'react';
import styles from './need_help.module.css';

export default function NeedHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      id: 'packages',
      icon: '📦',
      title: 'Service Packages',
      subtitle: 'Basic, Standard & Complete Plans'
    },
    {
      id: 'insurance',
      icon: '🛡️',
      title: 'Insurance & Protection',
      subtitle: 'Service Guarantee & Coverage'
    },
    {
      id: 'cremation',
      icon: '🕯️',
      title: 'Cremation Services',
      subtitle: 'Direct & Traditional Options'
    },
    {
      id: 'burial',
      icon: '⚱️',
      title: 'Burial Services',
      subtitle: 'Cemetery & Burial Arrangements'
    },
    {
      id: 'streaming',
      icon: '📹',
      title: 'Live Streaming',
      subtitle: 'Services for Relatives Abroad'
    },
    {
      id: 'memorial',
      icon: '🌸',
      title: 'Memorial Services',
      subtitle: 'Wake & Memorial Arrangements'
    },
    {
      id: 'alacarte',
      icon: '🎨',
      title: 'À La Carte Services',
      subtitle: 'Individual Service Options'
    },
    {
      id: 'payment',
      icon: '💳',
      title: 'Payment & Benefits',
      subtitle: 'SSS/GSIS & Payment Options'
    },
    {
      id: 'planning',
      icon: '📋',
      title: 'Pre-Planning',
      subtitle: 'Plan Ahead Services'
    },
    {
      id: 'support',
      icon: '💬',
      title: 'Customer Support',
      subtitle: 'Help & Grief Counseling'
    }
  ];

  const popularQuestions = [
    'What is included in the Basic Package?',
    'How does the automatic insurance policy work?',
    'Can I live stream the funeral service for relatives abroad?',
    'How do I claim SSS or GSIS funeral benefits?',
    'What is the difference between Standard and Complete packages?',
    'How to purchase a memorial lot through the app?',
    'What cremation options are available?',
    'Can I customize my funeral service package?'
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  const handleCategoryClick = (categoryId) => {
    console.log('Category clicked:', categoryId);
  };

  const handleQuestionClick = (question) => {
    console.log('Question clicked:', question);
  };

  return (
    <div className={styles.container}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🕊️</span>
            <span className={styles.logoText}>Gelai</span>
          </div>
          <div className={styles.navLinks}>
            <a href="/">Home</a>
            <a href="/services">Services</a>
            <a href="/about">About</a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Gelai Help Centre</h1>
          <p className={styles.heroSubtitle}>Hi, how can we help?</p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchWrapper}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="What can we help you with?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </form>
        </section>

        {/* Categories Grid */}
        <section className={styles.categoriesSection}>
          <div className={styles.categoriesGrid}>
            {categories.map((category) => (
              <div
                key={category.id}
                className={styles.categoryCard}
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className={styles.categoryIcon}>{category.icon}</div>
                <div className={styles.categoryContent}>
                  <h3 className={styles.categoryTitle}>{category.title}</h3>
                  <p className={styles.categorySubtitle}>{category.subtitle}</p>
                </div>
                <svg className={styles.categoryArrow} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Questions */}
        <section className={styles.popularSection}>
          <h2 className={styles.sectionTitle}>Popular Questions</h2>
          <div className={styles.questionsList}>
            {popularQuestions.map((question, index) => (
              <div
                key={index}
                className={styles.questionItem}
                onClick={() => handleQuestionClick(question)}
              >
                <span className={styles.questionText}>{question}</span>
                <svg className={styles.questionArrow} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Support */}
        <section className={styles.contactSection}>
          <h2 className={styles.sectionTitle}>Contact Support</h2>
          <div className={styles.contactGrid}>
            <div className={styles.contactCard}>
              <div className={styles.contactIconWrapper}>
                <span className={styles.contactIcon}>📱</span>
              </div>
              <h3 className={styles.contactTitle}>24/7 Hotline</h3>
              <p className={styles.contactText}>Call us anytime</p>
            </div>
            <div className={styles.contactCard}>
              <div className={styles.contactIconWrapper}>
                <span className={styles.contactIcon}>💬</span>
              </div>
              <h3 className={styles.contactTitle}>Live Chat</h3>
              <p className={styles.contactText}>Chat with support</p>
            </div>
            <div className={styles.contactCard}>
              <div className={styles.contactIconWrapper}>
                <span className={styles.contactIcon}>✉️</span>
              </div>
              <h3 className={styles.contactTitle}>Email</h3>
              <p className={styles.contactText}>Send us a message</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2026 Gelai Funeral Services</p>
        </div>
      </footer>
    </div>
  );
}