import { For, Show } from 'solid-js';
import { store, type Command } from '../store';
import styles from './CommandPalette.module.scss';

export function CommandPalette() {
  const executeCommand = (command: Command) => {
    command.action();
    store.setIsCommandPaletteOpen(false);
  };

  return (
    <Show when={store.isCommandPaletteOpen() && store.filteredCommands().length > 0}>
      <div class={styles.palette}>
        <ul class={styles.list}>
          <For each={store.filteredCommands()}>
            {(command, index) => (
              <li
                class={styles.item}
                classList={{ [styles.selected]: index() === store.selectedCommandIndex() }}
                onClick={() => executeCommand(command)}
              >
                {command.name}
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  );
}
