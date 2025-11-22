import { For, onMount, Show } from 'solid-js';
import { store } from '../store';
import styles from './MenuBar.module.scss';

export function MenuBar() {
  let menuBarRef: HTMLDivElement | undefined;

  onMount(() => {
    const handleWheel = (event: WheelEvent) => {
      if (menuBarRef) {
        // If there is horizontal overflow
        if (menuBarRef.scrollWidth > menuBarRef.clientWidth) {
          event.preventDefault();
          menuBarRef.scrollLeft += event.deltaY;
        }
      }
    };

    menuBarRef?.addEventListener('wheel', handleWheel);
  });

  const handleTabClick = async (path: string) => {
    await store.saveCurrentNote();
    store.setActiveNotePath(path);
  };

  const handleCloseClick = (e: MouseEvent, path: string) => {
    e.stopPropagation(); // Prevent tab click when closing
    store.closeNote(path);
  };

  return (
    <div class={styles.menuBar} ref={menuBarRef}>
      <For each={store.openNotes()}>
        {(note) => {
          return (
            <div
              class={styles.tab}
              classList={{ [styles.activeTab]: store.activeNotePath() === note.path }}
              onClick={() => handleTabClick(note.path)}
            >
              <span class={styles.tabName}>{note.path.split('/').pop()?.replace('.md', '')}</span>
              <div class={styles.closeButtonContainer}>
                <Show when={note.hasUnsavedChanges}>
                  <span class={styles.unsavedIndicator}>•</span>
                </Show>
                <button
                  class={styles.closeButton}
                  onClick={(e) => handleCloseClick(e, note.path)}
                >
                  ×
                </button>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}

