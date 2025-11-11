
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
    <main style={{ display: 'flex', height: '100vh', "background-color": "var(--bg-color)", color: "var(--text-color)" }}>
      <IconSidebar onFileIconClick={toggleSidebar} />
      <div
        style={{
          "border-right": "1px solid var(--border-color)",
          display: 'flex',
          "flex-direction": 'column',
          width: isSidebarOpen() ? '20rem' : '0',
          overflow: 'hidden',
          transition: 'width 0.2s ease-in-out',
        }}
      >
        <Calendar />
        <FileList />
      </div>
      <div style={{ display: 'flex', "flex-direction": 'column', "flex-grow": 1, "overflow-y": "hidden" }}>
        <MenuBar />
        <div style={{ "flex-grow": 1, "overflow-y": "auto", height: '100%', position: 'relative' }}>
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


