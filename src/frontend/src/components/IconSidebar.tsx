import { useTheme } from './ThemeContext';

interface IconSidebarProps {
  onFileIconClick: () => void;
}

export function IconSidebar(props: IconSidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div class="w-16 h-full bg-gray-100 dark:bg-gray-800 p-2 flex flex-col justify-between items-center">
      <div class="space-y-4">
        {/* File Icon */}
        <button
          onClick={props.onFileIconClick}
          class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
          title="Toggle File Explorer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* Search Icon */}
        <button
          class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
          title="Search (not implemented)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Theme Toggle Button */}
      <button onClick={toggleTheme} class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="white" stroke="currentColor" stroke-width="2" />
          {theme() === 'light' ? (
            <path d="M12 2A10 10 0 0012 22Z" fill={theme() === 'light' ? 'black' : 'white'} />
          ) : (
            <path d="M12 2A10 10 0 0112 22Z" fill="black" />
          )}
        </svg>
      </button>
    </div>
  );
}
