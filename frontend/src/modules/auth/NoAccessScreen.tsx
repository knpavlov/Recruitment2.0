import styles from '../../styles/NoAccessScreen.module.css';

export const NoAccessScreen = () => (
  <section className={styles.wrapper}>
    <div className={styles.card}>
      <h1>No sections available yet</h1>
      <p className={styles.description}>
        Your account is active, but no workspace sections are assigned to your role. Contact the
        system administrator to gain access or invite new members from the Account Management page.
      </p>
    </div>
  </section>
);
