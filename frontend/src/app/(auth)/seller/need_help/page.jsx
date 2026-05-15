'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaCircleInfo,
  FaMagnifyingGlassPlus,
  FaCreditCard,
  FaCalendarCheck,
  FaRotateLeft,
  FaCircleQuestion,
  FaFileContract,
  FaMagnifyingGlass,
  FaChevronRight,
  FaChevronDown,
  FaPhone,
  FaEnvelope,
} from 'react-icons/fa6';
import styles from './need_help.module.css';
import { useSiteContent } from '@/lib/siteContent/client';

const categoryIcons = {
  'getting-started': FaCircleInfo,
  browse: FaMagnifyingGlassPlus,
  payments: FaCreditCard,
  bookings: FaCalendarCheck,
  refunds: FaRotateLeft,
  account: FaCircleQuestion,
  policies: FaFileContract,
};

/* Help articles — short, plain language for funeral service providers (pre-login). */
const categoriesWithArticles = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    subCategories: [
      { id: 'what-is-lavisionario', title: 'What is Lavisionario?', article: { title: 'What is Lavisionario?', content: 'Lavisionario is a funeral and memorial services marketplace in the Philippines. Families browse verified providers, compare packages, and book online. As a seller, you list your services, manage bookings in Seller Centre, and receive payouts after services are fulfilled.', note: null } },
      { id: 'become-provider', title: 'Become a provider', article: { title: 'How do I sign up as a service provider?', content: 'From the seller login page, choose Sign Up and register with your email. Verify your email with the code we send, create a password, then complete onboarding—business details, compliance documents, and shop information. We review each application before your account becomes active and families can book.', note: 'Reviews usually take a few working days. We will email you when there is an update.' } },
      { id: 'login-issues', title: 'Login issues', article: { title: 'I can’t log in', content: 'Use the same email and password you used at signup. If you forgot your password, use Forgot password on the seller login page and follow the reset link in your inbox. If your application is still pending or you have not finished onboarding, you may be redirected there until your account is approved.', note: 'Need more help? Use the phone or email at the bottom of this page.' } },
    ],
  },
  {
    id: 'browse',
    title: 'Onboarding & Listings',
    subCategories: [
      { id: 'onboarding-steps', title: 'Onboarding steps', article: { title: 'What do I submit during onboarding?', content: 'After signup you complete shop information (business name, shop username, business type, contact details), business details (address, specialties, tagline), and upload compliance documents. Submit the form for admin review. You can resubmit if your application is rejected.', note: null } },
      { id: 'listing-approval', title: 'Listing approval', article: { title: 'When can families book my services?', content: 'After your seller account is active, create service or package listings in Seller Centre. New and edited listings may need admin approval before they appear on the public shop. Draft, pending, or rejected listings are not bookable.', note: null } },
      { id: 'edit-listings', title: 'Edit listings', article: { title: 'Can I edit an approved listing?', content: 'Yes. Changes to approved listings may go back to pending review. Keep descriptions, inclusions, images, and prices accurate before submitting so families know exactly what they are booking.', note: null } },
    ],
  },
  {
    id: 'payments',
    title: 'Payouts & Escrow',
    subCategories: [
      { id: 'escrow-hold', title: 'Escrow holds', article: { title: 'Why are paid bookings held in escrow?', content: 'When a family pays through Lavisionario, funds are held while the booking is pending, in progress, disputed, or refunding. After the service is completed and any platform commission is applied, eligible amounts can move toward your payout.', note: null } },
      { id: 'payout-details', title: 'Payout details', article: { title: 'Where do I set up payouts?', content: 'After you are approved, open Seller Settings, then Payouts, and keep your bank or payment account details current. Incorrect details may delay release of eligible escrow funds. Payouts are processed through our payment partner (PayMongo).', note: null } },
      { id: 'payout-timing', title: 'Payout timing', article: { title: 'When do I receive my earnings?', content: 'After admin releases eligible completed bookings, funds appear in your seller wallet. Withdraw to your bank or GCash from Payout settings or Revenue reports. Processing times depend on your bank or e-wallet.', note: null } },
    ],
  },
  {
    id: 'bookings',
    title: 'Bookings & Orders',
    subCategories: [
      { id: 'booking-statuses', title: 'Booking statuses', article: { title: 'How do booking statuses work?', content: 'New paid bookings start as pending. Confirm when you can serve the requested date, move to in progress when preparation or service work begins, and mark completed only after the service is fulfilled. Manage everything from Orders in Seller Centre.', note: null } },
      { id: 'before-confirm', title: 'Before you confirm', article: { title: 'What should I check before confirming?', content: 'Review the requested service date, location, deceased details if provided, family contact information, add-ons, and special notes. If you cannot fulfill the booking, decline it so the family refund process can start.', note: null } },
      { id: 'decline-booking', title: 'Decline a booking', article: { title: 'What happens if I decline a paid booking?', content: 'Declining a non-completed paid booking cancels it and starts a refund to the family’s original payment method. The order is held out of your payout while the payment provider processes the refund.', note: 'If you need help with a difficult case, contact support or use Help in Seller Centre after you sign in.' } },
    ],
  },
  {
    id: 'refunds',
    title: 'Refunds & Disputes',
    subCategories: [
      { id: 'buyer-refunds', title: 'Buyer refund requests', article: { title: 'How should I handle buyer refund requests?', content: 'Open the order from Orders, review the family’s reason and any attachments, and mark the request under review while you investigate. Platform admins may close cases and process refunds according to policy.', note: null } },
      { id: 'supporting-docs', title: 'What to document', article: { title: 'What should I keep for disputes?', content: 'Keep your booking reference, messages with the family, photos or records of service delivery, and any agreements about dates or scope. That helps our team resolve questions fairly.', note: null } },
    ],
  },
  {
    id: 'account',
    title: 'Account & help',
    subCategories: [
      { id: 'account-security', title: 'Your account', article: { title: 'How do I change my password or shop details?', content: 'Sign in to Seller Centre and open Settings for profile, shop information, password, and notifications. To reset a forgotten password, use Forgot password on the seller login page. Never share your password or verification codes.', note: 'If you lost access to your email, contact support so we can help you safely.' } },
      { id: 'contact-support', title: 'Talk to us', article: { title: 'How do I reach support?', content: 'Use the phone number or email at the bottom of this page before you sign in. After you sign in, open Help in Seller Centre to browse FAQs or submit a support request by email.', note: null } },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    subCategories: [
      { id: 'privacy', title: 'Privacy', article: { title: 'Privacy', content: 'We use your information to run Lavisionario—for your seller account, listings, bookings, payouts, and compliance. The full privacy notice is on the main website; open Policies from the link above or the site footer.', note: null } },
      { id: 'terms', title: 'Terms of use', article: { title: 'Terms of use', content: 'By using Lavisionario as a provider you agree to our terms. They cover your account, listings, bookings, payouts, refunds, and how questions between families and providers are handled. The full text is linked from Policies on this site.', note: null } },
    ],
  },
];

const categories = [
  { id: 'getting-started', title: 'Getting Started', iconColor: 'blue' },
  { id: 'browse', title: 'Onboarding & Listings', iconColor: 'teal' },
  { id: 'payments', title: 'Payouts & Escrow', iconColor: 'orange' },
  { id: 'bookings', title: 'Bookings & Orders', iconColor: 'teal' },
  { id: 'refunds', title: 'Refunds & Disputes', iconColor: 'orange' },
  { id: 'account', title: 'Account & help', iconColor: 'blue' },
  { id: 'policies', title: 'Policies', iconColor: 'orange' },
];

export default function NeedHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [articleView, setArticleView] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const { data: siteContent } = useSiteContent();
  const systemName = siteContent?.systemName || 'La Visionario';
  const supportEmail = siteContent?.footer?.supportEmail || '';
  const supportPhone = siteContent?.footer?.supportPhone || '';

  const replaceBrand = (value) =>
    typeof value === 'string' ? value.replaceAll('Lavisionario', systemName) : value;

  const popularQuestions = [
    { question: 'How do I sign up as a funeral service provider?', categoryId: 'getting-started', subId: 'become-provider' },
    { question: 'I can’t log in—what should I try?', categoryId: 'getting-started', subId: 'login-issues' },
    { question: 'What do I submit during onboarding?', categoryId: 'browse', subId: 'onboarding-steps' },
    { question: 'When can families book my services?', categoryId: 'browse', subId: 'listing-approval' },
    { question: 'Why are paid bookings held in escrow?', categoryId: 'payments', subId: 'escrow-hold' },
    { question: 'How do booking statuses work?', categoryId: 'bookings', subId: 'booking-statuses' },
    { question: 'How do I reach seller support?', categoryId: 'account', subId: 'contact-support' },
  ];

  const popularQuestionsBranded = useMemo(
    () =>
      popularQuestions.map((q) => ({
        ...q,
        question: replaceBrand(q.question),
      })),
    [systemName],
  );

  const categoriesWithArticlesBranded = useMemo(
    () =>
      categoriesWithArticles.map((cat) => ({
        ...cat,
        title: replaceBrand(cat.title),
        subCategories: cat.subCategories.map((sub) => ({
          ...sub,
          title: replaceBrand(sub.title),
          article: sub.article
            ? {
                ...sub.article,
                title: replaceBrand(sub.article.title),
                content: replaceBrand(sub.article.content),
                note: sub.article.note ? replaceBrand(sub.article.note) : null,
              }
            : sub.article,
        })),
      })),
    [systemName],
  );

  const categoriesBranded = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        title: replaceBrand(c.title),
      })),
    [systemName],
  );

  const [advisoryDismissed, setAdvisoryDismissed] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    for (const cat of categoriesWithArticlesBranded) {
      const sub = cat.subCategories.find(
        (s) =>
          s.article.title.toLowerCase().includes(q) ||
          s.article.content.toLowerCase().includes(q)
      );
      if (sub) {
        setExpandedCategoryId(cat.id);
        setSelectedArticle({ categoryId: cat.id, subId: sub.id });
        setArticleView(true);
        return;
      }
    }
  };

  const handleCategoryClick = (categoryId) => {
    const cat = categoriesWithArticlesBranded.find((c) => c.id === categoryId);
    if (cat?.subCategories?.length) {
      setExpandedCategoryId(categoryId);
      setSelectedArticle({ categoryId, subId: cat.subCategories[0].id });
      setArticleView(true);
    }
  };

  const toggleCategoryExpand = (categoryId) => {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const selectSubArticle = (categoryId, subId) => {
    setSelectedArticle({ categoryId, subId });
  };

  const currentArticleData = selectedArticle && (() => {
    const cat = categoriesWithArticlesBranded.find((c) => c.id === selectedArticle.categoryId);
    const sub = cat?.subCategories.find((s) => s.id === selectedArticle.subId);
    return sub?.article ?? null;
  })();

  const handleQuestionClick = (categoryId, subId) => {
    setExpandedCategoryId(categoryId);
    setSelectedArticle({ categoryId, subId });
    setArticleView(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrap}>
        {/* Top Navigation – white bar like Shopee */}
        <nav className={styles.topNav}>
          <div className={styles.navContent}>
            {articleView ? (
              <button
                type="button"
                className={styles.logoGroup}
                onClick={() => setArticleView(false)}
              >
                <span className={styles.logoIcon} aria-hidden><span className={styles.logoLetter}>L</span></span>
                <span className={styles.logoText}>{systemName}</span>
                <span className={styles.helpCenterText}>Help Center</span>
              </button>
            ) : (
              <Link href="/" className={styles.logoGroup}>
                <span className={styles.logoIcon} aria-hidden><span className={styles.logoLetter}>L</span></span>
                <span className={styles.logoText}>{systemName}</span>
                <span className={styles.helpCenterText}>Help Center</span>
              </Link>
            )}
            <Link href="/policies" className={styles.policiesLink}>Policies</Link>
          </div>
        </nav>

        {/* Hero – green band, title + search only */}
        <div className={styles.heroWrap}>
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>Hi, how can we help?</h1>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.searchWrapper}>
                <div className={styles.searchInputWrap}>
                  <input
                    type="text"
                    placeholder="Search help topics…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <button type="submit" className={styles.searchBtn} aria-label="Search">
                  <FaMagnifyingGlass className={styles.searchIcon} aria-hidden />
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Advisory banner – dismissible */}
        {!advisoryDismissed && (
          <div className={styles.advisoryBanner}>
            <p className={styles.advisoryText}>
              Stay safe: never tell anyone your password or the codes we text or email you. Real {systemName} staff will not ask for those over the phone or on social media.
            </p>
            <button
              type="button"
              className={styles.advisoryClose}
              onClick={() => setAdvisoryDismissed(true)}
              aria-label="Close advisory"
            >
              ×
            </button>
          </div>
        )}

        {articleView ? (
          /* Article view: sidebar (dropdown categories) + article content */
          <div className={styles.articleLayout}>
            <aside className={styles.sidebar}>
              {categoriesWithArticlesBranded.map((cat) => {
                const isExpanded = expandedCategoryId === cat.id;
                return (
                  <div key={cat.id} className={styles.sidebarCategory}>
                    <button
                      type="button"
                      className={styles.sidebarCategoryBtn}
                      onClick={() => toggleCategoryExpand(cat.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <FaChevronDown className={styles.sidebarCaret} aria-hidden />
                      ) : (
                        <FaChevronRight className={styles.sidebarCaret} aria-hidden />
                      )}
                      <span>{cat.title}</span>
                    </button>
                    {isExpanded && (
                      <ul className={styles.sidebarSubList}>
                        {cat.subCategories.map((sub) => {
                          const isSelected =
                            selectedArticle?.categoryId === cat.id && selectedArticle?.subId === sub.id;
                          return (
                            <li key={sub.id}>
                              <button
                                type="button"
                                className={`${styles.sidebarSubItem} ${isSelected ? styles.sidebarSubItemActive : ''}`}
                                onClick={() => selectSubArticle(cat.id, sub.id)}
                              >
                                {sub.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </aside>
            <div className={styles.articlePanel}>
              {currentArticleData ? (
                <>
                  <h1 className={styles.articleTitle}>{currentArticleData.title}</h1>
                  <p className={styles.articleContent}>{currentArticleData.content}</p>
                  {currentArticleData.note && (
                    <div className={styles.articleNote}>
                      <p>{currentArticleData.note}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className={styles.articlePlaceholder}>Pick a topic on the left to read more.</p>
              )}
            </div>
          </div>
        ) : (
        <main className={styles.main}>
          {/* Categories – icon above title, card layout like Shopee */}
          <section className={styles.categoriesSection}>
            <h2 className={styles.sectionTitle}>Categories</h2>
            <div className={styles.categoriesGrid}>
              {categoriesBranded.map((category) => {
                const IconComponent = categoryIcons[category.id];
                const iconCircleClass = styles[`categoryIconCircle_${category.iconColor}`];
                return (
                  <div
                    key={category.id}
                    className={styles.categoryCard}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className={`${styles.categoryIconCircle} ${iconCircleClass}`}>
                      {IconComponent && <IconComponent className={styles.categoryIconSvg} aria-hidden />}
                    </div>
                    <h3 className={styles.categoryTitle}>{category.title}</h3>
                  </div>
                );
              })}
            </div>
          </section>

        {/* Popular questions – tap goes to categorized article (no dropdown) */}
        <section className={styles.popularSection}>
          <h2 className={styles.sectionTitle}>Popular questions</h2>
          <div className={styles.questionsList}>
            {popularQuestionsBranded.map((item, index) => (
              <div
                key={index}
                className={styles.questionItem}
                onClick={() => handleQuestionClick(item.categoryId, item.subId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleQuestionClick(item.categoryId, item.subId)}
              >
                <span className={styles.questionText}>{item.question}</span>
                <FaChevronRight className={styles.questionArrow} aria-hidden />
              </div>
            ))}
          </div>
        </section>

        {/* Still need help? Contact strip */}
        <section className={styles.contactStrip}>
          <div className={styles.contactStripContent}>
            <h2 className={styles.contactStripTitle}>Still need help?</h2>
            <p className={styles.contactStripText}>We’re here if you need a person, not just an article.</p>
            <div className={styles.contactGrid}>
              {supportPhone ? (
                <a href={`tel:${supportPhone}`} className={styles.contactCard}>
                  <FaPhone className={styles.contactIcon} aria-hidden />
                  <h3 className={styles.contactTitle}>Call Support</h3>
                  <p className={styles.contactText}>{supportPhone}</p>
                </a>
              ) : null}
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} className={styles.contactCard}>
                  <FaEnvelope className={styles.contactIcon} aria-hidden />
                  <h3 className={styles.contactTitle}>Email Support</h3>
                  <p className={styles.contactText}>{supportEmail}</p>
                </a>
              ) : null}
            </div>
          </div>
        </section>
        </main>
        )}

        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <p>© 2026 {systemName}. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}