import styles from "./contact.module.css";

export default function ContactPage() {
  return (
    <section className={styles.contactPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>Contact Us</h1>

        <p className={styles.subtitle}>
          We’re here to help. Reach out anytime and we’ll guide you with care.
        </p>

        <div className={styles.content}>
          <p>
            If you have questions about our services, packages, or the funeral
            planning process, feel free to contact us. Our team is ready to
            assist you with clarity and respect.
          </p>

          <p>
            You may send us a message using the form below or contact us directly
            through our provided details.
          </p>
        </div>

        <div className={styles.info}>
          <div className={styles.infoItem}>
            <h3 className={styles.infoTitle}>Email</h3>
            <p className={styles.infoText}>support@lavisionario.ph</p>
          </div>

          <div className={styles.infoItem}>
            <h3 className={styles.infoTitle}>Phone</h3>
            <p className={styles.infoText}>+63 9XX XXX XXXX</p>
          </div>

          <div className={styles.infoItem}>
            <h3 className={styles.infoTitle}>Location</h3>
            <p className={styles.infoText}>
              Philippines
            </p>
          </div>
        </div>

        <div className={styles.note}>
          <p>
            This page will later support a contact form and messaging system
            connected to the admin portal.
          </p>
        </div>
      </div>
    </section>
  );
}