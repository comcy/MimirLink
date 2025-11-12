import { store } from '../store';
import styles from './ApplicationMenuBar.module.scss';

export function ApplicationMenuBar() {
  return (
    <div class={styles.applicationMenuBar}>
      <button onClick={() => store.createNewNote()}>New Note</button>
      <button onClick={() => store.saveCurrentNote()}>Save</button>
    </div>
  );
}
