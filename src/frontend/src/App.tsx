import { createSignal } from 'solid-js';
import { HybridEditor } from './components/HybridEditor';
import { Calendar } from './components/Calendar';
import { FileList } from './components/FileList';

const initialMarkdown = `# Welcome to your new editor!

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

  return (
    <main class="h-screen w-screen bg-white text-gray-900 flex">
      <div class="w-80 border-r border-gray-200 flex flex-col">
        <Calendar />
        <FileList />
      </div>
      <div class="flex-grow h-full">
        <HybridEditor value={markdown} setValue={setMarkdown} />
      </div>
    </main>
  );
}

export default App;

