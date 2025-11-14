import { store } from '../store';
import { DropdownMenu } from './DropdownMenu';
import styles from './ApplicationMenuBar.module.scss';
import menuItemStyles from './DropdownMenu.module.scss';
import logo from '/logo.png';
import type { Setter } from 'solid-js';

interface ApplicationMenuBarProps {
  setSidebarOpen: Setter<boolean>;
}

export function ApplicationMenuBar(props: ApplicationMenuBarProps) {
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
        trigger={(dropdownProps) => (
          <button {...dropdownProps} class={styles.menuButton}>
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              clearTimeout(searchTimeout); // Clear debounce
              store.performSearch((e.currentTarget as HTMLInputElement).value);
              store.setActiveSidebarView('search'); // Ensure search view is active
              props.setSidebarOpen(true); // Open sidebar to show results
            }
          }}
        />
      </div>
    </div>
  );
}
