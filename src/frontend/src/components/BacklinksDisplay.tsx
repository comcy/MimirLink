import { For, Show } from 'solid-js';
import type { Resource } from 'solid-js';
import { store } from '../store';
import type { NoteMetadata } from '../store';
import styles from './BacklinksDisplay.module.scss';

interface BacklinksDisplayProps {
  backlinks: Resource<NoteMetadata[]>;
}

export function BacklinksDisplay(props: BacklinksDisplayProps) {
  const handleLinkClick = (path: string, e: MouseEvent) => {
    e.preventDefault();
    store.openNote(path);
  };

  return (
    <div class={styles.backlinksContainer}>
      <h3>Backlinks</h3>
      <Show when={!props.backlinks.loading} fallback={<p>Loading backlinks...</p>}>
        <Show when={props.backlinks() && props.backlinks()!.length > 0} fallback={<p>No backlinks found.</p>}>
          <ul>
            <For each={props.backlinks()}>
              {(note) => (
                <li>
                  <a href="#" onClick={[handleLinkClick, note.path]}>
                    {note.title}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
