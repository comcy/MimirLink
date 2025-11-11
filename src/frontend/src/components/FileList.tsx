import { createSignal, onMount, For, Show } from 'solid-js';

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
        class="text-md font-semibold mb-1 cursor-pointer flex items-center"
        onClick={() => setExpanded(!isExpanded())}
      >
        <span class="transform transition-transform" classList={{ 'rotate-90': isExpanded() }}>
          &#9656;
        </span>
        <span class="ml-2">{props.title}</span>
      </h3>
      <Show when={isExpanded()}>
        <ul class="text-sm pl-4">
          <For each={visibleFiles()}>
            {(file) => (
              <li class="py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer truncate">
                {file.path}
              </li>
            )}
          </For>
          {props.files.length > INITIAL_VISIBLE_FILES && !showAll() && (
            <li
              class="py-1 px-2 text-gray-500 cursor-pointer"
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
    <div class="p-4 border-t" style={{ "border-color": "var(--border-color)" }}>
      <h2 class="text-lg font-semibold mb-2">Files</h2>
      {loading() && <div class="text-sm text-gray-500">Loading files...</div>}
      {error() && <div class="text-sm text-red-500">Error: {error()}</div>}
      {!loading() && !error() && (
        <div class="space-y-4">
          <FileSection title="Journals" files={files().journals} />
          <FileSection title="Pages" files={files().pages} />
        </div>
      )}
    </div>
  );
}
