import { For, Show } from 'solid-js';
import { store } from '../store';
import styles from './SearchResults.module.scss';

export function SearchResults() {
  const handleResultClick = (path: string) => {
    store.openNote(path);
    // The line below was removed to keep the search query
    // store.performSearch('');
  };

  return (
    <div class={styles.container}>
      <h2 class={styles.title}>Search Results</h2>
      <Show
        when={!store.searchResults.loading}
        fallback={<div class={styles.loading}>Searching...</div>}
      >
        <Show
          when={!store.searchResults.error}
          fallback={<div class={styles.error}>Error: {store.searchResults.error.message}</div>}
        >
          <Show
            when={store.searchResults() && store.searchResults()!.length > 0}
            fallback={<div class={styles.noResults}>No results found for "{store.searchQuery()}".</div>}
          >
            <ul class={styles.resultsList}>
              <For each={store.searchResults()}>
                {(result) => (
                  <li class={styles.resultItem} onClick={() => handleResultClick(result.path)}>
                    <div class={styles.itemTitle}>{result.title}</div>
                    <div class={styles.itemContext}>{result.context}</div>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
