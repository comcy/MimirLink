import { store } from '../store';
import { useTheme } from './ThemeContext';
import styles from './IconSidebar.module.scss';

interface IconSidebarProps {
  onFileIconClick: () => void;
  onSearchIconClick: () => void;
  onTagIconClick: () => void;
  onTaskIconClick: () => void;
}

export function IconSidebar(props: IconSidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div class={styles.sidebar}>
      <div class={styles.topIcons}>
        <button
          class={styles.iconButton}
          classList={{ [styles.activeIcon]: store.activeSidebarView() === 'files' }}
          onClick={props.onFileIconClick}
          aria-label="Toggle File Browser"
        >
          {/* File Icon SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </button>
        <button
          class={styles.iconButton}
          classList={{ [styles.activeIcon]: store.activeSidebarView() === 'search' }}
          onClick={props.onSearchIconClick}
          aria-label="Search"
        >
          {/* Search Icon SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
        <button
          class={styles.iconButton}
          classList={{ [styles.activeIcon]: store.activeSidebarView() === 'tags' }}
          onClick={props.onTagIconClick}
          aria-label="Tags"
        >
          {/* Tag Icon SVG (#) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
        </button>
        <button
          class={styles.iconButton}
          classList={{ [styles.activeIcon]: store.activeSidebarView() === 'tasks' }}
          onClick={props.onTaskIconClick}
          aria-label="Tasks"
        >
          {/* Task Icon SVG (Checkbox) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        </button>
      </div>
      <div class={styles.bottomIcons}>
        <button class={styles.iconButton} onClick={toggleTheme} aria-label="Toggle Theme">
          {/* Custom Theme Toggle Icon */}
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5">
            <path
              classList={{
                [styles.leftSemicircleLight]: theme() === 'light',
                [styles.leftSemicircleDark]: theme() === 'dark',
              }}
              d="M12 2 A10 10 0 0 0 12 22 V2Z"
            />
            <path
              classList={{
                [styles.rightSemicircleLight]: theme() === 'light',
                [styles.rightSemicircleDark]: theme() === 'dark',
              }}
              d="M12 2 A10 10 0 0 1 12 22 V2Z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
