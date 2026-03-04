import Head from "next/head";
import styles from "./about.module.css";

/* ── static data ──────────────────────────────────────────────────────────── */

const STRIP_ITEMS = [
  { icon: "fa-church",        label: "Chapel"    },
  { icon: "fa-coffin-cross",  label: "Casket"    },
  { icon: "fa-file-contract", label: "Documents" },
  { icon: "fa-truck-moving",  label: "Transport" },
  { icon: "fa-dove",          label: "Memorial"  },
];

const BLOB_ICONS = [
  "fa-dove",         "fa-hands-praying", "fa-feather",
  "fa-cross",        "fa-star-of-david", "fa-leaf",
  "fa-heart",        "fa-moon",          "fa-dove",
];

const WHY_CARDS = [
  {
    icon:  "fa-shield-halved",
    title: "Why La Visionario",
    body:  "We offer verified providers, clear pricing, and compassionate support so you can focus on honoring your loved one. From packages to documentation, we guide you every step of the way.",
  },
  {
    icon:  "fa-handshake",
    title: "Our Partners",
    body:  "We work with trusted funeral homes and service providers across the Philippines. Our partners share our commitment to dignity, quality, and fair dealing with families.",
  },
  {
    icon:  "fa-heart",
    title: "Our Commitment",
    body:  "We are committed to treating every family with respect and empathy. From your first inquiry to the final arrangements, we prioritize clarity, fairness, and support so you can focus on what matters most.",
  },
];

const TESTIMONIALS = [
  {
    text:   "La Visionario made an incredibly difficult time much easier to bear. The transparent pricing meant we could focus on our loved one instead of worrying about costs.",
    name:   "Maria Santos",
    label:  "Quezon City",
  },
  {
    text:   "The ease of comparing packages and the support we received was exceptional. We felt guided and respected throughout the entire process.",
    name:   "Jose Reyes",
    label:  "Cebu City",
  },
  {
    text:   "Finding a trusted provider felt impossible until we found La Visionario. Their verified partners gave us complete peace of mind during our grief.",
    name:   "Ana Dela Cruz",
    label:  "Davao City",
  },
];

/* ── component ────────────────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About Us – La Visionario</title>
        <meta
          name="description"
          content="La Visionario helps Filipino families plan funeral services in a simple, respectful, and transparent way."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Nunito:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          crossOrigin="anonymous"
        />
      </Head>

      <div className={styles.page}>
        {/* SVG clipPaths: torn top/bottom variants so adjacent edges never align */}
        <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            {/* Torn BOTTOM edges (jagged at bottom, straight top) — irregular, paper-like */}
            <clipPath id="tornBottom1" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L1,0 L1,1 L0.97,0.94 L0.94,1 L0.89,0.96 L0.85,1 L0.79,0.945 L0.73,1 L0.68,0.96 L0.62,1 L0.56,0.95 L0.51,1 L0.45,0.97 L0.39,1 L0.33,0.94 L0.27,1 L0.21,0.96 L0.15,1 L0.08,0.955 L0,1 Z" />
            </clipPath>
            <clipPath id="tornBottom2" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L1,0 L1,1 L0.98,0.96 L0.95,1 L0.91,0.94 L0.86,1 L0.81,0.97 L0.76,1 L0.70,0.95 L0.64,1 L0.58,0.96 L0.52,1 L0.46,0.94 L0.40,1 L0.34,0.97 L0.28,1 L0.22,0.95 L0.16,1 L0.10,0.96 L0.04,1 L0,0.97 Z" />
            </clipPath>
            <clipPath id="tornBottom3" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L1,0 L1,1 L0.96,0.955 L0.92,1 L0.88,0.965 L0.83,1 L0.77,0.95 L0.71,1 L0.65,0.96 L0.59,1 L0.53,0.945 L0.47,1 L0.41,0.96 L0.35,1 L0.29,0.95 L0.23,1 L0.17,0.965 L0.11,1 L0.05,0.955 L0,1 Z" />
            </clipPath>
            {/* Torn TOP edges (jagged at top, straight bottom) — different patterns so they don't match bottoms */}
            <clipPath id="tornTop1" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L0.04,0.04 L0.08,0 L0.14,0.05 L0.20,0 L0.26,0.035 L0.32,0 L0.38,0.045 L0.44,0 L0.50,0.04 L0.56,0 L0.62,0.035 L0.68,0 L0.74,0.05 L0.80,0 L0.86,0.04 L0.92,0 L0.97,0.045 L1,0 L1,1 L0,1 Z" />
            </clipPath>
            <clipPath id="tornTop2" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L0.06,0.045 L0.12,0 L0.18,0.04 L0.24,0 L0.30,0.05 L0.36,0 L0.42,0.035 L0.48,0 L0.54,0.045 L0.60,0 L0.66,0.04 L0.72,0 L0.78,0.05 L0.84,0 L0.90,0.035 L0.96,0 L1,0.04 L1,1 L0,1 Z" />
            </clipPath>
            <clipPath id="tornTop3" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L0.03,0.05 L0.09,0 L0.15,0.04 L0.21,0 L0.27,0.045 L0.33,0 L0.39,0.04 L0.45,0 L0.51,0.05 L0.57,0 L0.63,0.035 L0.69,0 L0.75,0.045 L0.81,0 L0.87,0.04 L0.93,0 L0.99,0.05 L1,0 L1,1 L0,1 Z" />
            </clipPath>
            <clipPath id="tornTop4" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L0.05,0.035 L0.11,0 L0.17,0.05 L0.23,0 L0.29,0.04 L0.35,0 L0.41,0.045 L0.47,0 L0.53,0.035 L0.59,0 L0.65,0.05 L0.71,0 L0.77,0.04 L0.83,0 L0.89,0.045 L0.95,0 L1,0.04 L1,1 L0,1 Z" />
            </clipPath>
            {/* Single smooth wave for mobile — one gentle curve, reads clean on small screens */}
            <clipPath id="waveBottom" clipPathUnits="objectBoundingBox">
              <path d="M0,0 L1,0 L1,1 Q0.5,0.91 0,1 Z" />
            </clipPath>
            <clipPath id="waveTop" clipPathUnits="objectBoundingBox">
              <path d="M0,0 Q0.5,0.09 1,0 L1,1 L0,1 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* ══════════════════════════════════════
            1. HERO
            Cream gradient · eyebrow · title ·
            tagline · icon cluster panel
        ══════════════════════════════════════ */}
        <section className={`${styles.hero} ${styles.tornBottom1}`}>
          <i className={`fa-solid fa-dove          ${styles.deco}`} />
          <i className={`fa-solid fa-feather       ${styles.deco}`} />
          <i className={`fa-solid fa-cross         ${styles.deco}`} />
          <i className={`fa-solid fa-star-of-david ${styles.deco}`} />
          <i className={`fa-solid fa-moon          ${styles.deco}`} />
          <i className={`fa-solid fa-leaf          ${styles.deco}`} />

          <div className={styles.heroHeading}>
            <p className={styles.heroEyebrow}>Welcome To</p>
            <h1 className={styles.heroTitle}>La Visionario</h1>
          </div>
          <p className={styles.heroSub}>
            Helping Filipino families plan funeral services in a simple, respectful,
            and transparent way — because saying goodbye should never be stressful.
          </p>

          <div className={styles.heroDivider}>
            <span className={styles.heroDividerLine} />
            <span className={styles.heroDividerIcon}>
              <i className="fa-solid fa-dove" />
            </span>
            <span className={styles.heroDividerLine} />
          </div>
        </section>

        {/* ══════════════════════════════════════
            2. MISSION & VISION
            White bg · dark card left · text right
        ══════════════════════════════════════ */}
        <div className={`${styles.tornSectionWrap} ${styles.tornTop1}`}>
        <div className={styles.missionWrap}>
          <div className={styles.missionInner}>

            <div className={styles.missionLeft}>
              <div className={styles.missionCard}>
                <div className={styles.missionCardImageWrap}>
                  <img
                    src="/mission-compassion-card.png"
                    alt="Dove symbol representing compassion"
                    className={styles.missionCardImage}
                  />
                </div>
                <div className={styles.missionBadge}>
                  <i className="fa-solid fa-dove" />
                </div>
              </div>
            </div>

            <div className={styles.missionRight}>
              <p className={styles.eyebrow}>Mission &amp; Vision</p>
              <h2 className={styles.sectionTitle}>Planning &amp; Support</h2>
              <span className={styles.sectionAccent}>Dignified Farewell Services</span>
              <p className={styles.sectionBody}>
                Our mission is to make funeral planning dignified, transparent, and accessible
                for every Filipino family. We envision a future where saying farewell is
                supported by clarity, care, and trusted partners.
              </p>
            </div>

          </div>
        </div>
        </div>

        {/* ══════════════════════════════════════
            3. OUR STORY
            White bg · text left · blob right
        ══════════════════════════════════════ */}
        <div className={`${styles.aboutWrap} ${styles.tornBottom3}`}>
          <div className={styles.aboutInner}>

            <div>
              <h2 className={styles.aboutTitle}>
                <span className={styles.aboutTitleBold}>About </span>
                <span className={styles.aboutTitleLight}>Us</span>
              </h2>
              <p className={styles.aboutPara}>
                La Visionario was created to help families plan funeral services in a simple,
                respectful, and transparent way. We believe that saying goodbye should not be
                stressful or confusing.
              </p>
              <p className={styles.aboutPara}>
                Our goal is to combine tradition and technology—offering clear packages, trusted
                services, and peace of mind during difficult moments.
              </p>
              <p className={styles.aboutPara}>
                We offer verified providers, clear pricing, and compassionate support so you can
                focus on honoring your loved one. From packages to documentation, we guide you
                through each step with respect and transparency.
              </p>
            </div>

            <div className={styles.blobWrap}>
              <div className={styles.blob}>
                <div className={styles.blobImageWrap}>
                  <img
                    src="/about-us-blob.png"
                    alt="La Visionario — dignified farewell care"
                    className={styles.blobImage}
                  />
                </div>
                <div className={styles.blobGrid}>
                  {BLOB_ICONS.map((icon, i) => (
                    <div key={i} className={styles.blobIcon}>
                      <i className={`fa-solid ${icon}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════
            5. WHY CHOOSE US
            Cream-mid bg · 3 feature cards
        ══════════════════════════════════════ */}
        <div className={`${styles.tornSectionWrap} ${styles.tornTop3}`}>
        <div className={styles.whyWrap}>
          <div className={styles.whyInner}>

            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>Why Choose Us</p>
              <h2 className={styles.sectionTitle}>
                Serving Families with{" "}
                <span style={{ fontStyle: "italic", color: "#102820" }}>Dignity</span>
              </h2>
            </div>

            <div className={styles.grid3}>
              {WHY_CARDS.map((c) => (
                <div key={c.title} className={styles.card}>
                  <div className={styles.cardIconRing}>
                    <i className={`fa-solid ${c.icon}`} />
                  </div>
                  <p className={styles.cardTitle}>{c.title}</p>
                  <p className={styles.cardBody}>{c.body}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
        </div>

        {/* ══════════════════════════════════════
            6. TESTIMONIALS — own dark section
            Deep gradient bg · 3 quote cards
            + 1 wide featured quote at the bottom
        ══════════════════════════════════════ */}
        <div className={styles.testimonialsWrap}>
          <div className={styles.testimonialsInner}>

            <div className={styles.testimonialsHeader}>
              <p className={styles.testimonialsEyebrow}>Testimonials</p>
              <h2 className={styles.testimonialsTitle}>
                Families We Have{" "}
                <span className={styles.testimonialsTitleAccent}>Honored</span>
              </h2>
            </div>

            {/* 3 quote cards */}
            <div className={styles.testimonialsGrid}>
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className={styles.testimonialCard}>
                  <i className={`fa-solid fa-quote-left ${styles.testimonialQuoteIcon}`} />
                  <p className={styles.testimonialText}>{t.text}</p>
                  <div className={styles.testimonialAuthorRow}>
                    <div className={styles.testimonialAvatar}>
                      <i className="fa-solid fa-user" />
                    </div>
                    <div>
                      <p className={styles.testimonialAuthorName}>{t.name}</p>
                      <p className={styles.testimonialAuthorLabel}>{t.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* featured wide quote */}
            <div className={styles.testimonialFeatured}>
              <div className={styles.testimonialFeaturedIcon}>
                <i className="fa-solid fa-heart" />
              </div>
              <div className={styles.testimonialFeaturedBody}>
                <p>
                  Families who have used La Visionario appreciate the ease of comparison,
                  transparent pricing, and the support they received during a difficult time.
                  We are honored to help every family navigate this journey with dignity and care.
                </p>
                <div className={styles.testimonialStars}>
                  {[1,2,3,4,5].map((s) => (
                    <i key={s} className="fa-solid fa-star" />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}