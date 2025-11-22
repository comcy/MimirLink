import { createSignal, createEffect, onCleanup, Show, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import styles from './DropdownMenu.module.scss';

interface DropdownMenuProps {
  trigger: (props: { onClick: (e: MouseEvent) => void }) => JSX.Element;
  children: JSX.Element;
}

export function DropdownMenu(props: DropdownMenuProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [position, setPosition] = createSignal({ top: 0, left: 0 });
  let triggerRef: HTMLDivElement | undefined;
  let contentRef: HTMLDivElement | undefined;

  const openMenu = (e: MouseEvent) => {
    e.stopPropagation();
    if (triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      setPosition({ top: rect.bottom, left: rect.left });
      setIsOpen(true);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    // Do nothing if the click is on the trigger
    if (triggerRef?.contains(event.target as Node)) {
      return;
    }
    // Do nothing if the click is inside the dropdown content
    if (contentRef?.contains(event.target as Node)) {
      return;
    }
    // Otherwise, close the menu
    closeMenu();
  };

  createEffect(() => {
    if (isOpen()) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
    });
  });

  return (
    <div ref={triggerRef}>
      {props.trigger({ onClick: openMenu })}
      <Show when={isOpen()}>
        <Portal>
          <div
            ref={contentRef}
            class={styles.dropdownContent}
            style={{
              top: `${position().top}px`,
              left: `${position().left}px`,
            }}
            onClick={closeMenu} // Close menu when an item is clicked
          >
            {props.children}
          </div>
        </Portal>
      </Show>
    </div>
  );
}
