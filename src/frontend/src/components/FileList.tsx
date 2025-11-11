import { createSignal, onMount, For, Show } from 'solid-js';
import styles from './FileList.module.scss';

interface FileMetadata {
  path: string;
  mtime: string; // ISO date string
  pageType: 'journal' | 'page';
}

interface CategorizedFiles {
  journals: FileMetadata[];
  pages: FileMetadata[];
}

const INITIAL_VISIBLE_FILES = 5;

function FileSection(props: { title: string; files: FileMetadata[] }) {
  const [isExpanded, setExpanded] = createSignal(true);
  const [showAll, setShowAll] = createSignal(false);

  const visibleFiles = () => 
    showAll() ? props.files : props.files.slice(0, INITIAL_VISIBLE_FILES);

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
          <For each={visibleFiles()}>
            {(file) => (
              <li class={styles.fileListItem}>
                {file.path}
              </li>
            )}
          </For>
          {props.files.length > INITIAL_VISIBLE_FILES && !showAll() && (
            <li
              class={`${styles.fileListItem} ${styles.more}`}
              onClick={() => setShowAll(true)}
            >
              ... more
            </li>
          )}
        </ul>
      </Show>
    </div>
  );
}

export function FileList() {
  const [files, setFiles] = createSignal<CategorizedFiles>({ journals: [], pages: [] });
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/files');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CategorizedFiles = await response.json();
      setFiles(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class={`${styles.fileListContainer} ${styles.spaceY4}`}>
      <h2 class={styles.fileListTitle}>Files</h2>
      {loading() && <div class={styles.loading}>Loading files...</div>}
      {error() && <div class={styles.error}>Error: {error()}</div>}
      {!loading() && !error() && (
        <>
          <FileSection title="Journals" files={files().journals} />
          <FileSection title="Pages" files={files().pages} />
        </>
      )}
    </div>
  );
}
