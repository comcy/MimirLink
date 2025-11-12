import { For } from 'solid-js';
import { store } from '../store';
import styles from './MenuBar.module.scss';

export function MenuBar() {
  const handleTabClick = (path: string) => {
    store.setActiveNotePath(path);
  };

  const handleCloseClick = (e: MouseEvent, path: string) => {
    e.stopPropagation(); // Prevent tab click when closing
    store.closeNote(path);
  };

  return (
    <div class={styles.menuBar}>
      <For each={store.openNotes()}>
        {(note) => (
          <div
            class={styles.tab}
            classList={{ [styles.activeTab]: store.activeNotePath() === note.path }}
            onClick={() => handleTabClick(note.path)}
          >
            <span class={styles.tabName}>{note.path.replace('.md', '')}</span>
            <button
              class={styles.closeButton}
              onClick={(e) => handleCloseClick(e, note.path)}
            >
              &times;
            </button>
          </div>
        )}
      </For>
    </div>
  );
}

