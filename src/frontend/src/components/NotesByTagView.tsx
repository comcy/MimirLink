import { createMemo, For } from 'solid-js';
import { store } from '../store';
import styles from './NotesByTagView.module.scss';
import type { NoteMetadata } from '../store';

export function NotesByTagView() {
  const notesWithTag = createMemo(() => {
    const tag = store.selectedTag();
    if (!tag) return [];

    const allNotes = [...store.files().journals, ...store.files().pages];
    return allNotes.filter(note => note.tags?.includes(tag));
  });

  const handleNoteClick = (path: string) => {
    store.openNote(path);
  };

  const handleBackClick = () => {
    store.setSelectedTag(null);
  };

  return (
    <div class={styles.container}>
      <div onClick={handleBackClick} class={styles.backLink} role="button" tabindex={0} onKeyPress={(e) => e.key === 'Enter' && handleBackClick()}>
        &larr; back
      </div>
      <ul class={styles.noteList}>
        <For each={notesWithTag()}>
          {(note: NoteMetadata) => (
            <li
              class={styles.noteItem}
              onClick={() => handleNoteClick(note.path)}
              onKeyPress={(e) => e.key === 'Enter' && handleNoteClick(note.path)}
              tabindex={0}
            >
              <span class={styles.noteIcon}>📑</span> {/* Added icon directly */}
              {note.title}
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
