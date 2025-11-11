import { useTheme } from './ThemeContext';
import styles from './IconSidebar.module.scss';

interface IconSidebarProps {
  onFileIconClick: () => void;
}

export function IconSidebar(props: IconSidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div class={styles.sidebar}>
      <div class={styles.topIcons}>
        {/* File Icon */}
        <button
          onClick={props.onFileIconClick}
          class={styles.iconButton}
          title="Toggle File Explorer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* Search Icon */}
        <button
          class={styles.iconButton}
          title="Search (not implemented)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Theme Toggle Button */}
      <button onClick={toggleTheme} class={`${styles.iconButton} ${styles.themeSwitcherButton}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path
            d="M12 2A10 10 0 0012 22Z"
            class={theme() === 'light' ? styles.leftSemicircleLight : styles.leftSemicircleDark}
          />
          <path
            d="M12 2A10 10 0 0112 22Z"
            class={theme() === 'light' ? styles.rightSemicircleLight : styles.rightSemicircleDark}
          />
        </svg>
      </button>
    </div>
  );
}
