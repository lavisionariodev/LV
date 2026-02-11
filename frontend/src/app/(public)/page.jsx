'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import styles from './homepage.module.css'

export default function PublicHomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ServiceSection />
      <PartnershipSection />
      <FAQSection />
    </>
  )
}

/* ---------------- HERO ---------------- */
function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay}></div>

      <div className={styles.inner}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            Let Us Lend<br />A Helping Hand
          </h1>

          <p className={styles.subheading}>
            Helping families and friends honor their loved one
          </p>

          <div className={styles.ctaGroup}>
            <button className={styles.ctaPrimary}>Learn More</button>
            <button className={styles.ctaSecondary}>Our Services</button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- ABOUT ---------------- */
function AboutSection() {
  return (
    <section className={styles.aboutSection}>
      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div className={styles.imageWrapper}>
            <Image
            src="https://i.pinimg.com/1200x/6e/8b/75/6e8b7560bc2e8538768dcf04b39f76df.jpg"
            alt="La Visionario funeral planning"
            fill
            className={styles.image}
            />
          </div>

          <div className={styles.textWrapper}>
            <p className={styles.subtitle}>Learn something about</p>
            <h2 className={styles.heading}>WHY LA VISIONARIO?</h2>

            <p className={styles.description}>
              La Visionario makes funeral planning in the Philippines simple,
              transparent, and stress-free. We offer clearly priced packages
              and customizable services, so you always know what you&apos;re getting—no
              hidden costs, no surprises. Every service is protected by an
              automatic insurance guarantee, ensuring your plan is honored
              exactly as agreed.
            </p>

            <p className={styles.description}>
              With La Visionario, everything you need is in one place: from
              service selection and memorial lot purchases to live streaming
              for loved ones abroad. It&apos;s convenience, clarity, and peace of
              mind—when it matters most.
            </p>

            <Link href="/about" className={styles.readMoreButton}>
              READ MORE
            </Link>

            <div className={styles.decorativeElement}></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- SERVICES ---------------- */
function ServiceSection() {
  const services = [
    {
      title: 'Basic Package',
      subtitle: '',
      desc: 'Direct cremation or burial.',
      image: 'https://i.pinimg.com/736x/ec/fb/27/ecfb278d5b75bf40ca4e468f309847af.jpg',
      link: '#basic',
    },
    {
      title: 'Standard Package',
      subtitle: '',
      desc: 'Traditional wake and ceremony.',
      image: 'https://i.pinimg.com/736x/a9/b5/61/a9b561ff0fafb2f6851ba19e4706d745.jpg',
      link: '#standard',
    },
    {
      title: 'Complete Package',
      subtitle: '',
      desc: 'All-inclusive life celebration.',
      image: 'https://i.pinimg.com/1200x/c5/00/d6/c500d69074bfb9a8fa7e92d10f9b72c4.jpg',
      link: '#complete',
    },
  ]

  return (
    <section className={styles.services}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.title}>OUR SERVICES</h2>

          <p className={styles.description}>
            La Visionario brings all essential funeral services into one secure,
            easy-to-use platform. From cremation and burial to memorial
            arrangements and legal support, we ensure every family receives
            professional and compassionate care.
          </p>
        </div>

        <div className={styles.grid}>
          {services.map((item, index) => (
            <a key={index} href={item.link} className={styles.card}>
              <div className={styles.imageWrapper}>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className={styles.image}
                />

                <div className={styles.defaultOverlay}>
                  {item.subtitle ? (
                    <span className={styles.imageSubtitle}>{item.subtitle}</span>
                  ) : null}

                  <span className={styles.imageTitle}>{item.title}</span>
                  <p className={styles.imageDesc}>{item.desc}</p>
                </div>

                <div className={styles.hoverOverlay}>
                  <span>View Package</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- PARTNERSHIP ---------------- */
function PartnershipSection() {
  return (
    <section className={styles.partnershipSection}>
      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div className={styles.textWrapper}>
            <p className={styles.subtitle}>Grow with us</p>
            <h2 className={styles.heading}>PARTNER WITH LA VISIONARIO</h2>

            <p className={styles.description}>
              Join our network of trusted funeral service providers and resellers.
              Together, we are making dignified funeral services more accessible
              across the Philippines while building sustainable partnerships that
              benefit families and communities.
            </p>

            <Link href="/partnership" className={styles.partnerButton}>
              BECOME A PARTNER
            </Link>

            <div className={styles.decorativeElement}></div>
          </div>

          <div className={styles.imageWrapper}>
            <Image
              src="https://i.pinimg.com/1200x/84/d5/60/84d56082a8cf35ffd66ed28d57357894.jpg"
              alt="Partnership with La Visionario"
              fill
              className={styles.image}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- FAQ ---------------- */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: "How does La Visionario's pricing work?",
      answer:
        'We offer transparent, clearly priced packages with no hidden costs. Each package includes a detailed breakdown of services, and you can customize options based on your needs. All prices are protected by our automatic insurance guarantee, ensuring no surprise charges later.',
    },
    {
      question: 'What is the insurance guarantee?',
      answer:
        'Every service you book with La Visionario is automatically protected by an insurance guarantee. This ensures that the funeral plan you arrange will be honored exactly as agreed, with all services delivered at the prices quoted—providing complete peace of mind for you and your family.',
    },
    {
      question: 'Can I purchase a memorial lot through La Visionario?',
      answer:
        'Yes, we partner with reputable memorial parks across the Philippines. You can browse available lots, compare locations and pricing, and complete your purchase directly through our platform—all in one convenient place.',
    },
    {
      question: 'Do you offer live streaming services?',
      answer:
        'Absolutely. We understand that loved ones abroad or those unable to attend in person still want to pay their respects. Our live streaming service allows family and friends from anywhere in the world to participate in memorial services remotely.',
    },
    {
      question: 'How far in advance should I plan?',
      answer:
        'You can plan at any time that feels right for you. Many families choose to pre-plan to lock in current prices and reduce stress during difficult times. We also accommodate immediate needs with dedicated support available 24/7.',
    },
    {
      question: 'What areas does La Visionario serve?',
      answer:
        'We currently serve families throughout the Philippines through our network of trusted funeral service providers and partners. Our platform is accessible nationwide, making it easy to arrange services regardless of your location.',
    },
    {
      question: 'Can I modify my funeral plan after booking?',
      answer:
        'Yes, you can make changes to your plan at any time before the services are rendered. Our team will work with you to adjust your arrangements and update pricing accordingly, always maintaining full transparency.',
    },
    {
      question: 'Is my personal information secure?',
      answer:
        'We take data security seriously. All personal and payment information is encrypted and stored securely. We comply with data protection standards and never share your information with third parties without your explicit consent.',
    },
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className={styles.faqSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>FREQUENTLY ASKED QUESTIONS</h2>
          <p className={styles.headerDescription}>
            Find answers to common questions about our services, pricing, and platform.
          </p>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${openIndex === index ? styles.open : ''}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
              >
                <span>{faq.question}</span>
                <span className={styles.icon}>{openIndex === index ? '−' : '+'}</span>
              </button>

              <div className={styles.faqAnswer}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.decorativeElement}></div>
      </div>
    </section>
  )
}