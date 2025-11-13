import { For, Show, createSignal } from 'solid-js';
import { store, type NoteMetadata } from '../store';
import { DropdownMenu } from './DropdownMenu';
import menuItemStyles from './DropdownMenu.module.scss';
import styles from './FileList.module.scss';

function FileSection(props: {
  title: string;
  files: NoteMetadata[];
  onFileClick: (path: string) => void;
}) {
  const [isExpanded, setExpanded] = createSignal(true);

  const handleDelete = (e: MouseEvent, path: string) => {
    e.stopPropagation();
    store.deleteNote(path);
  };

  return (
    <div>
      <h3
        class={styles.fileSectionTitle}
        classList={{ [styles.expanded]: isExpanded() }}
        onClick={() => setExpanded(!isExpanded())}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-chevron-right"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span class="ml-2">{props.title}</span>
      </h3>
      <Show when={isExpanded()}>
        <ul class={styles.fileSectionList}>
          <For each={props.files}>
            {(file) => (
              <li class={styles.fileListItem} onClick={() => props.onFileClick(file.path)}>
                <span class={styles.itemTitle}>{file.title}</span>
                <div class={styles.itemActions}>
                  <DropdownMenu
                    trigger={(props) => (
                      <button {...props} class={styles.moreButton}>
                        ...
                      </button>
                    )}
                  >
                    <button class={menuItemStyles.menuItem} onClick={(e) => handleDelete(e, file.path)}>
                      Delete
                    </button>
                  </DropdownMenu>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

export function FileList() {
  const handleFileClick = (path: string) => {
    store.openNote(path);
  };

  return (
    <div class={`${styles.fileListContainer} ${styles.spaceY4}`}>
      <h2 class={styles.fileListTitle}>Files</h2>
      <Show
        when={!store.isLoading}
        fallback={<div class={styles.loading}>Loading files...</div>}
      >
        <Show
          when={!store.files.error}
          fallback={<div className={styles.error}>Error: {store.files.error.message}</div>}
        >
          <FileSection
            title="Journals"
            files={store.files()?.journals ?? []}
            onFileClick={handleFileClick}
          />
          <FileSection
            title="Pages"
            files={store.files()?.pages ?? []}
            onFileClick={handleFileClick}
          />
        </Show>
      </Show>
    </div>
  );
}
