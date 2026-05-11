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

/* Help articles — short, plain language for families and providers. */
const categoriesWithArticles = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    subCategories: [
      { id: 'what-is-lavisionario', title: 'What is Lavisionario?', article: { title: 'What is Lavisionario?', content: 'Lavisionario helps Filipino families plan a respectful farewell in one place. You can look for trusted funeral and memorial services—chapel, casket, transport, cremation, burial, memorial lots, and more—with clear prices and people who understand this is a difficult time.', note: null } },
      { id: 'become-provider', title: 'Become a provider', article: { title: 'How do I sign up as a service provider?', content: 'From the provider login page, choose Sign Up and register with your email. Confirm your email, set a password, then tell us about your business and upload what we ask for. We review each application before your shop can go live.', note: 'Reviews usually take a few working days. We will email you when there is an update.' } },
      { id: 'login-issues', title: 'Login issues', article: { title: 'I can’t log in', content: 'Check that you are using the same email and password you signed up with. If you forgot your password, use Forgot password on the login page and check your inbox for a reset link. If you recently applied as a provider, you may need to finish your application before full access opens.', note: 'Need more help? Use the phone or email at the bottom of this page.' } },
    ],
  },
  {
    id: 'browse',
    title: 'Browse & Book',
    subCategories: [
      { id: 'find-services', title: 'Find services', article: { title: 'How do I find a service?', content: 'Go to Shop from the menu, or use the search on the home page. You can look by type of service—chapel, casket, packages for cremation or burial, memorial lots, transport, and others—and read what is included and how much it costs before you book.', note: null } },
      { id: 'compare', title: 'Compare packages', article: { title: 'Can I compare packages?', content: 'Yes. On the Shop page, use Compare to put two or more packages next to each other so you can see what each one includes, the price, and who provides it—then choose what feels right for your family.', note: null } },
      { id: 'favorites', title: 'Save favorites', article: { title: 'How do I save something for later?', content: 'On a service page, click the heart to save it to Favorites. You can open Favorites from your profile when you want to come back to it or share options with relatives.', note: null } },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    subCategories: [
      { id: 'payment-methods', title: 'How to pay', article: { title: 'How do I pay?', content: 'When you check out, you will be taken to a safe payment page. There you can pick from the payment options shown (for example card or e-wallet, depending on what is offered). After your payment goes through, your chosen provider is notified so they can confirm your booking.', note: 'Please stay on the page until you return to Lavisionario after paying, so your booking shows up correctly.' } },
      { id: 'receipts', title: 'Receipts', article: { title: 'Where is my receipt?', content: 'Sign in, open your Profile, then Purchases. Open the booking you paid for and you can get your receipt there. You should also get a confirmation by email when payment succeeds.', note: null } },
      { id: 'payment-failed', title: 'Payment didn’t work', article: { title: 'My payment didn’t go through', content: 'Your items should still be in your cart. Try checkout again and complete payment on the secure page before it times out. If it keeps failing, reach out to support and tell us what you were trying to book.', note: null } },
    ],
  },
  {
    id: 'bookings',
    title: 'Your booking',
    subCategories: [
      { id: 'booking-details', title: 'What we ask for', article: { title: 'What details do I need when I book?', content: 'We ask for a way to reach you, when you hope the service can happen, where it should take place, and—if you wish—the name of your loved one. Your provider uses this to plan with you.', note: null } },
      { id: 'provider-coordination', title: 'Working with your provider', article: { title: 'What happens after I pay?', content: 'Your provider sees your booking and will confirm next steps. They may call the number you gave to agree on time, place, and any special wishes. To see where things stand, open your Profile and go to Purchases.', note: null } },
      { id: 'cancel-booking', title: 'Cancel a booking', article: { title: 'Can I cancel?', content: 'You can usually cancel while the booking is still waiting to start or has just been confirmed—open Profile, then Purchases, pick your booking, and look for cancel. If preparations have already begun, what is possible depends on the provider’s rules and how far things have gone.', note: 'If it is urgent, call the provider using the number on your booking as well.' } },
    ],
  },
  {
    id: 'refunds',
    title: 'Refunds',
    subCategories: [
      { id: 'request-refund', title: 'Ask for a refund', article: { title: 'How do I ask for a refund?', content: 'If your situation allows a refund—for example a cancelled booking that qualifies, or a service that could not happen—go to Profile, then Purchases, open the booking, and send a refund request with a few words about why. Your provider and our team will look at it.', note: 'If a refund is approved, the money goes back the same way you paid. Banks and e-wallets can take a few days to show it.' } },
      { id: 'supporting-docs', title: 'What to include', article: { title: 'What should I send with a refund request?', content: 'Your booking reference, a short explanation of what happened, and anything that helps us understand—photos, screenshots, or other papers if you have them. That usually speeds things up.', note: null } },
    ],
  },
  {
    id: 'account',
    title: 'Account & help',
    subCategories: [
      { id: 'account-security', title: 'Your account', article: { title: 'How do I change my details or password?', content: 'After you sign in, go to Profile and Account to update your name, phone, or other details. To change your password, use Forgot password on the login screen and follow the email we send you. Do not share your password with anyone.', note: 'If you lost access to your email, contact support so we can help you safely.' } },
      { id: 'contact-support', title: 'Talk to us', article: { title: 'How do I reach support?', content: 'Use the phone number or email at the bottom of this page. Tell us the email on your account and, if you have one, your booking number—that helps us find you quickly. If you are already signed in as a provider, you can also send a message from Help in your account.', note: null } },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    subCategories: [
      { id: 'privacy', title: 'Privacy', article: { title: 'Privacy', content: 'We use your information to run Lavisionario—for your account, your bookings, and coordinating with your provider. The full privacy notice is on the main website; scroll to the bottom and open Privacy.', note: null } },
      { id: 'terms', title: 'Terms of use', article: { title: 'Terms of use', content: 'By using Lavisionario you agree to our terms. They cover everyday things like your account, paying for services, refunds, and how questions between families and providers are handled. The full text is linked from the bottom of the main website.', note: null } },
    ],
  },
];

const categories = [
  { id: 'getting-started', title: 'Getting Started', iconColor: 'blue' },
  { id: 'browse', title: 'Browse & Book', iconColor: 'teal' },
  { id: 'payments', title: 'Payments', iconColor: 'orange' },
  { id: 'bookings', title: 'Your booking', iconColor: 'teal' },
  { id: 'refunds', title: 'Refunds', iconColor: 'orange' },
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
    { question: 'How do I pay for a service?', categoryId: 'payments', subId: 'payment-methods' },
    { question: 'What details do you need when I book?', categoryId: 'bookings', subId: 'booking-details' },
    { question: 'Can I cancel after I’ve paid?', categoryId: 'bookings', subId: 'cancel-booking' },
    { question: 'How do I ask for my money back?', categoryId: 'refunds', subId: 'request-refund' },
    { question: 'How do I change my phone number or password?', categoryId: 'account', subId: 'account-security' },
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