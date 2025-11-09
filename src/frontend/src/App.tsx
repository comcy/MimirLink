import { createSignal } from 'solid-js';
import { HybridEditor } from './components/HybridEditor';

const initialMarkdown = `# Welcome to your new editor!

This is a hybrid preview editor.
- Start typing markdown.
- When you move your cursor away, it will be rendered.

*Enjoy!*
`;

function App() {
  const [markdown, setMarkdown] = createSignal(initialMarkdown);

  return (
    <main class="h-screen w-screen bg-white text-gray-900 p-4">
      <HybridEditor value={markdown} setValue={setMarkdown} />
    </main>
  );
}

export default App;

