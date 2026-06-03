import { Link } from 'react-router-dom';
import styles from './Privacy.module.scss';

export default function Privacy() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Privacy & Data Policy</h1>
      <p className={styles.updated}>Last updated: June 2026</p>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>What data we store</h2>
        <p>Staged stores publicly available GitHub profile data (username, display name, repository metadata) alongside recruiter-entered notes such as graduation date, location, and work type preference. Analysis reports derived from that GitHub data are also stored.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Why we store it</h2>
        <p>Data is stored solely to support candidate screening for open roles. Staged is a non-commercial tool. No data is sold, shared with third parties, or used for advertising.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>How long we keep it</h2>
        <p>Candidate data and associated reports are retained for as long as the screening process requires. You can request deletion at any time (see below) and we will remove your data within 30 days.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Your rights</h2>
        <p>Under GDPR you have the right to access, correct, and erase data we hold about you. To exercise any of these rights, use the removal request form.</p>
        <Link to="/data-removal" className={styles.ctaLink}>Request data removal →</Link>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Contact</h2>
        <p>For any privacy-related questions you can reach us at <a href="mailto:wikingfredrik@gmail.com" className={styles.link}>wikingfredrik@gmail.com</a>.</p>
      </section>
    </div>
  );
}
