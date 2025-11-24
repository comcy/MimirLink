import { createMemo, Show } from 'solid-js';
import { store } from '../store';
import { TagsDisplay } from './TagsDisplay';
import { NotesByTagView } from './NotesByTagView';
import styles from './AllTagsView.module.scss';

export function AllTagsView() {
  const selectedTag = createMemo(() => store.selectedTag());

  const allTags = createMemo(() => {
    const files = store.files();
    if (!files) {
      return [];
    }

    const allNotes = [...files.journals, ...files.pages];
    const allTagsSet = new Set<string>();

    for (const note of allNotes) {
      if (note.tags) {
        for (const tag of note.tags) {
          allTagsSet.add(tag);
        }
      }
    }

    return Array.from(allTagsSet).sort();
  });

  const handleTagClick = (tag: string) => {
    store.setSelectedTag(tag);
  };

  return (
    <div class={styles.container}>
      <div class={styles.headerContainer}>
        <h1>
          All Tags
          <Show when={selectedTag()}>
            <span class={styles.breadcrumbSeparator}>&gt;</span>
            <span class={styles.breadcrumbActive}>#{selectedTag()}</span>
          </Show>
        </h1>
      </div>

      <Show
        when={selectedTag()}
        fallback={
          <TagsDisplay tags={allTags()} onTagClick={handleTagClick} />
        }
      >
        <NotesByTagView />
      </Show>
    </div>
  );
}
