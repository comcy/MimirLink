import { createSignal, onMount, type Component } from 'solid-js';
import styles from './NewPageDialog.module.scss';

interface NewPageDialogProps {
  onClose: () => void;
  onCreate: (title: string) => void;
}

export const NewPageDialog: Component<NewPageDialogProps> = (props) => {
  const [title, setTitle] = createSignal('');
  let inputRef: HTMLInputElement | undefined;

  const handleCreate = () => {
    if (title().trim()) {
      props.onCreate(title().trim());
      props.onClose();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleCreate();
    }
    if (event.key === 'Escape') {
      props.onClose();
    }
  };

  onMount(() => {
    inputRef?.focus();
  });

  return (
    <div class={styles.overlay} onClick={props.onClose}>
      <div class={styles.dialog} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h2 class={styles.title}>Create New Page</h2>
        <input
          ref={inputRef}
          type="text"
          class={styles.input}
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          placeholder="Enter page title..."
        />
        <div class={styles.actions}>
          <button class={`${styles.button} ${styles.cancelButton}`} onClick={props.onClose}>
            Cancel
          </button>
          <button class={`${styles.button} ${styles.createButton}`} onClick={handleCreate}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
