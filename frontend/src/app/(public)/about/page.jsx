import styles from "./about.module.css";

export default function AboutPage() {
  return (
    <section className={styles.aboutPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>About LaVisionario</h1>

        <p className={styles.subtitle}>
          A modern platform for funeral services in the Philippines.
        </p>

        <div className={styles.content}>
          <p>
            LaVisionario was created to help families plan funeral services in a
            simple, respectful, and transparent way. We believe that saying
            goodbye should not be stressful or confusing.
          </p>

          <p>
            Our goal is to combine tradition and technology—offering clear
            packages, trusted services, and peace of mind during difficult
            moments.
          </p>
        </div>
      </div>
    </section>
  );
}
