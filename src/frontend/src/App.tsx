
import { createEffect, createSignal, Show } from 'solid-js';
import { Calendar } from './components/Calendar';
import { DatePicker } from './components/DatePicker';
import { FileList } from './components/FileList';
import { HybridEditor } from './components/HybridEditor';
import { IconSidebar } from './components/IconSidebar';
import { MenuBar } from './components/MenuBar';
import { useTheme } from './components/ThemeContext';

const initialMarkdown = `---
title: 
date: 2025-11-09
tags: 
---

# Welcome to your new editor!

This is a hybrid preview editor.
- Start typing markdown.
- When you move your cursor away, it will be rendered.

*Enjoy!*

:smile:
(/)
**(!) Nicht gut!**

\`\`\`typescript
export interface Test { }
\`\`\`

>sadasdasdasd
>asdas
>asdasdasdasd


`;

function App() {
  const [markdown, setMarkdown] = createSignal(initialMarkdown);
  const { theme } = useTheme();

  const [isDatePickerVisible, setDatePickerVisible] = createSignal(false);
  const [datePickerPosition, setDatePickerPosition] = createSignal({ top: 0, left: 0 });
  const [datePickerCallback, setDatePickerCallback] = createSignal<(date: string) => void>(() => {});
  const [isSidebarOpen, setSidebarOpen] = createSignal(true);

  createEffect(() => {
    document.body.className = theme();
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

  return (
    <main class="h-screen w-screen flex" style={{ "background-color": "var(--bg-color)", color: "var(--text-color)" }}>
      <IconSidebar onFileIconClick={toggleSidebar} />
      <div
        class="border-r flex flex-col"
        classList={{ 'w-80': isSidebarOpen(), 'w-0 overflow-hidden': !isSidebarOpen() }}
      >
        <Calendar />
        <FileList />
      </div>
      <div class="flex flex-col flex-grow">
        <MenuBar />
        <div class="flex-grow h-full relative">
          <HybridEditor value={markdown} setValue={setMarkdown} onShowDatePicker={showDatePicker} />
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
  );
}

export default App;


