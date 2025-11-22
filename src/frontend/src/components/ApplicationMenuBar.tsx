import { store } from '../store';
import { DropdownMenu } from './DropdownMenu';
import { CommandPalette } from './CommandPalette';
import styles from './ApplicationMenuBar.module.scss';
import menuItemStyles from './DropdownMenu.module.scss';
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (store.isCommandPaletteOpen()) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        store.setSelectedCommandIndex(
          (store.selectedCommandIndex() + 1) % store.filteredCommands().length
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        store.setSelectedCommandIndex(
          (store.selectedCommandIndex() - 1 + store.filteredCommands().length) % store.filteredCommands().length
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        store.executeSelectedCommand();
      } else if (e.key === 'Escape') {
        store.setIsCommandPaletteOpen(false);
      }
    } else {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout); // Clear debounce
        const query = (e.currentTarget as HTMLInputElement).value;
        store.performSearch(query);
        if (!query.startsWith('>')) {
          store.setActiveSidebarView('search'); // Ensure search view is active
          props.setSidebarOpen(true); // Open sidebar to show results
        }
      }
    }
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
          placeholder="Search notes or type > for commands..."
          class={styles.searchInput}
          value={store.searchQuery()}
          onInput={handleSearchInput}
          onKeyDown={handleKeyDown}
          onFocus={(e) => store.performSearch(e.currentTarget.value)}
          onBlur={() => store.setIsCommandPaletteOpen(false)}
        />
        <CommandPalette />
      </div>
    </div>
  );
}
