import { store } from '../store';
import { DropdownMenu } from './DropdownMenu';
import styles from './ApplicationMenuBar.module.scss';
import menuItemStyles from './DropdownMenu.module.scss';

export function ApplicationMenuBar() {
  let searchTimeout: number;

  const handleSearchInput = (e: Event) => {
    const query = (e.currentTarget as HTMLInputElement).value;
    clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(() => {
      store.performSearch(query);
    }, 300); // 300ms debounce
  };

  return (
    <div class={styles.applicationMenuBar}>
      <DropdownMenu
        trigger={(props) => (
          <button {...props} class={styles.menuButton}>
            File
          </button>
        )}
      >
        <button class={menuItemStyles.menuItem} onClick={() => store.createNewPage()}>
          New Page
        </button>
        <button class={menuItemStyles.menuItem} onClick={() => store.openOrCreateJournalForToday()}>
          Today's Journal
        </button>
        <hr />
        <button
          class={menuItemStyles.menuItem}
          onClick={() => store.saveCurrentNote()}
          disabled={!store.activeNote()}
        >
          Save
        </button>
      </DropdownMenu>
      <div class={styles.searchContainer}>
        <input
          type="search"
          placeholder="Search notes..."
          class={styles.searchInput}
          value={store.searchQuery()}
          onInput={handleSearchInput}
        />
      </div>
    </div>
  );
}
