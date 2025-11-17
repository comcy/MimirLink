import styles from './TagsDisplay.module.scss';

export function TagsDisplay() {
  // For now, we will just display a placeholder.
  // In the future, we will fetch and display the actual tags.
  return (
    <div class={styles.container}>
      <h2>Tags</h2>
      <p>Tag display is not yet implemented.</p>
    </div>
  );
}
