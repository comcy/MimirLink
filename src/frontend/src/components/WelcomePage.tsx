import styles from './WelcomePage.module.scss';
import logo from '../../../../logo.png'; // Adjust path as necessary

export function WelcomePage() {
  return (
    <div class={styles.welcomeContainer}>
      <img src={logo} alt="Mimirlink Logo" class={styles.logo} />
      <h1 class={styles.title}>Welcome to Mimirlink!</h1>
      <p class={styles.subtitle}>
        Select a file from the list, or create a new page or journal entry to get started.
      </p>
    </div>
  );
}