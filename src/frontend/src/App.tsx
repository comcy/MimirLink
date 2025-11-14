import { createEffect, createSignal, Show } from 'solid-js';
import { Calendar } from './components/Calendar';
import { DatePicker } from './components/DatePicker';
import { FileList } from './components/FileList';
import { HybridEditor } from './components/HybridEditor';
import { IconSidebar } from './components/IconSidebar';
import { MenuBar } from './components/MenuBar';
import { ApplicationMenuBar } from './components/ApplicationMenuBar';
import { SearchResults } from './components/SearchResults';
import { WelcomePage } from './components/WelcomePage';
import { NewPageDialog } from './components/NewPageDialog'; // Import the new dialog
import { useTheme } from './components/ThemeContext';
import { store } from './store';
import styles from './App.module.scss';

function App() {
  const { theme } = useTheme();
  const [isDatePickerVisible, setDatePickerVisible] = createSignal(false);
  const [datePickerPosition, setDatePickerPosition] = createSignal({ top: 0, left: 0 });
  const [datePickerCallback, setDatePickerCallback] = createSignal<(date: string) => void>(() => { });
  const [isSidebarOpen, setSidebarOpen] = createSignal(true);

  createEffect(() => {
    document.body.className = theme();

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        store.saveCurrentNote();
      }
    };

    const handleBlur = () => {
      store.saveCurrentNote();
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    });
  });

  const showDatePicker = (pos: { top: number, left: number }, callback: (date: string) => void) => {
    setDatePickerPosition(pos);
    setDatePickerCallback(() => callback);
    setDatePickerVisible(true);
  };

  const onDateSelect = (date: string) => {
    datePickerCallback()(date);
    setDatePickerVisible(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen());
  };

  const handleFileIconClick = () => {
    if (!isSidebarOpen()) {
      store.setActiveSidebarView('files');
      setSidebarOpen(true);
    } else {
      if (store.activeSidebarView() === 'files') {
        setSidebarOpen(false);
      } else {
        store.setActiveSidebarView('files');
      }
    }
  };

  const handleSearchIconClick = () => {
    if (!isSidebarOpen()) {
      store.setActiveSidebarView('search');
      setSidebarOpen(true);
    } else {
      if (store.activeSidebarView() === 'search') {
        setSidebarOpen(false);
      } else {
        store.setActiveSidebarView('search');
      }
    }
  };

  return (
    <div class={styles.appContainer}>
      <ApplicationMenuBar setSidebarOpen={setSidebarOpen} />
      <main class={styles.main}>
        <Show when={isSidebarOpen()}>
          <div class={styles.backdrop} onClick={() => setSidebarOpen(false)} />
        </Show>
        <IconSidebar onFileIconClick={handleFileIconClick} onSearchIconClick={handleSearchIconClick} />
        <div class={styles.sidebarContainer} classList={{ [styles.closed]: !isSidebarOpen() }}>
          <button class={styles.sidebarCloseButton} onClick={() => setSidebarOpen(false)}>
            &times;
          </button>
          <Show when={store.activeSidebarView() === 'files'} fallback={<SearchResults />}>
            <Calendar />
            <FileList />
          </Show>
        </div>
        <div class={styles.contentContainer}>
          <Show when={store.openNotes().length > 0}>
            <MenuBar />
          </Show>
          <div class={styles.editorWrapper}>
            <Show when={store.openNotes().length > 0} fallback={<WelcomePage />}>
              <HybridEditor
                value={store.activeContent}
                setValue={store.updateActiveContent}
                onShowDatePicker={showDatePicker}
              />
            </Show>
            <Show when={isDatePickerVisible()}>
              <DatePicker
                position={datePickerPosition()}
                onSelect={onDateSelect}
                onClose={() => setDatePickerVisible(false)}
              />
            </Show>
          </div>
        </div>
      </main>
      <Show when={store.isNewPageDialogOpen()}>
        <NewPageDialog
          onClose={() => store.setIsNewPageDialogOpen(false)}
          onCreate={(title) => store.confirmCreateNewPage(title)}
        />
      </Show>
    </div>
  );
}
export default App;
