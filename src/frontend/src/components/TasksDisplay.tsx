import { For, Show, createSignal, createMemo } from 'solid-js';
import { store } from '../store';
import styles from './TasksDisplay.module.scss';

// Define Task interface directly to avoid import issues
export interface Task {
  id: string;
  instanceId?: string;
  description: string;
  completed: boolean;
  filePath: string;
  lineNumber: number;
  dueDate?: string;
  plannedDate?: string;
  recurrence?: string;
  endDate?: string;
  createdAt: string;
  completedAt?: string;
}

type SortMethod = 'default' | 'dueDateAsc' | 'dueDateDesc' | 'plannedDateAsc' | 'plannedDateDesc';

export function TasksDisplay() {
  const [filterQuery, setFilterQuery] = createSignal('');
  const [sortMethod, setSortMethod] = createSignal<SortMethod>('default');
  const [showAllDone, setShowAllDone] = createSignal(false);

  const processedTasks = createMemo(() => {
    const allTasks = store.tasks();
    if (!allTasks) return { open: [], recurring: [], done: [] };

    const query = filterQuery().toLowerCase();

    // 1. Filter tasks
    const filterTask = (task: Task) => task.description.toLowerCase().includes(query);
    let openTasks = allTasks.open.filter(filterTask);
    let doneTasks = allTasks.done.filter(filterTask);

    // 2. Partition open tasks into recurring and non-recurring
    const recurringTasks = openTasks.filter(task => task.recurrence);
    const nonRecurringTasks = openTasks.filter(task => !task.recurrence);

    // 3. Sort tasks
    const sortFn = (a: Task, b: Task) => {
      const method = sortMethod();
      if (method === 'default') return 0;

      const key = method.includes('dueDate') ? 'dueDate' : 'plannedDate';
      const aDate = a[key];
      const bDate = b[key];

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;

      if (method.endsWith('Asc')) {
        return aDate.localeCompare(bDate);
      } else {
        return bDate.localeCompare(aDate);
      }
    };
    const sortedNonRecurring = nonRecurringTasks.slice().sort(sortFn);
    const sortedRecurring = recurringTasks.slice().sort(sortFn);

    // 4. Sort done tasks by completion date, newest first
    doneTasks = doneTasks.slice().sort((a, b) => {
      if (!a.completedAt && !b.completedAt) return 0;
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return b.completedAt.localeCompare(a.completedAt);
    });

    return { open: sortedNonRecurring, recurring: sortedRecurring, done: doneTasks };
  });

  const displayedDoneTasks = createMemo(() => {
    const allDone = processedTasks().done;
    if (showAllDone() || allDone.length <= 5) {
      return allDone;
    }
    return allDone.slice(0, 5);
  });

  return (
    <div class={styles.container}>
      <h2>Tasks</h2>
      <div class={styles.controls}>
        <input
          type="text"
          placeholder="Filter tasks..."
          class={styles.filterInput}
          value={filterQuery()}
          onInput={(e) => setFilterQuery(e.currentTarget.value)}
        />
        <select
          class={styles.sortSelect}
          value={sortMethod()}
          onChange={(e) => setSortMethod(e.currentTarget.value as SortMethod)}
        >
          <option value="default">Default Sort</option>
          <option value="dueDateAsc">Due Date (Asc)</option>
          <option value="dueDateDesc">Due Date (Desc)</option>
          <option value="plannedDateAsc">Planned Date (Asc)</option>
          <option value="plannedDateDesc">Planned Date (Desc)</option>
        </select>
      </div>
      <div class={styles.taskList}>
        <h3>Open</h3>
        <For each={processedTasks().open} fallback={<p>No matching open tasks.</p>}>
          {(task) => (
            <div class={styles.taskItem}>
              <input 
                type="checkbox" 
                checked={task.completed} 
                onChange={() => store.toggleTaskCompletion(task)}
              />
              <div class={styles.taskDetails}>
                <span class={styles.taskDescription}>{task.description}</span>
                <div class={styles.taskMetadata}>
                  <Show when={task.dueDate}>
                    <span class={styles.dueDate}>📅 {task.dueDate}</span>
                  </Show>
                  <Show when={task.plannedDate}>
                    <span class={styles.plannedDate}>🗓️ {task.plannedDate}</span>
                  </Show>
                  <Show when={task.recurrence}>
                    <span class={styles.recurrence}>🔁 {task.recurrence}</span>
                  </Show>
                  <Show when={task.endDate}>
                    <span class={styles.endDate}>🏁 {task.endDate}</span>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
      <div class={styles.taskList}>
        <h3>Recurring</h3>
        <For each={processedTasks().recurring} fallback={<p>No recurring tasks.</p>}>
          {(task) => (
            <div class={styles.taskItem}>
              <input 
                type="checkbox" 
                checked={task.completed} 
                onChange={() => store.toggleTaskCompletion(task)}
              />
              <div class={styles.taskDetails}>
                <span class={styles.taskDescription}>{task.description}</span>
                <div class={styles.taskMetadata}>
                  <Show when={task.dueDate}>
                    <span class={styles.dueDate}>📅 {task.dueDate}</span>
                  </Show>
                  <Show when={task.plannedDate}>
                    <span class={styles.plannedDate}>🗓️ {task.plannedDate}</span>
                  </Show>
                  <Show when={task.recurrence}>
                    <span class={styles.recurrence}>🔁 {task.recurrence}</span>
                  </Show>
                  <Show when={task.endDate}>
                    <span class={styles.endDate}>🏁 {task.endDate}</span>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
      <div class={styles.taskList}>
        <h3>Done</h3>
        <For each={displayedDoneTasks()} fallback={<p>No matching completed tasks.</p>}>
          {(task) => (
            <div class={styles.taskItem}>
              <input 
                type="checkbox" 
                checked={task.completed} 
                onChange={() => store.toggleTaskCompletion(task)}
              />
              <div class={styles.taskDetails}>
                <span class={styles.taskDescription}>{task.description}</span>
                <div class={styles.taskMetadata}>
                  <Show when={task.dueDate}>
                    <span class={styles.dueDate}>📅 {task.dueDate}</span>
                  </Show>
                  <Show when={task.plannedDate}>
                    <span class={styles.plannedDate}>🗓️ {task.plannedDate}</span>
                  </Show>
                  <Show when={task.recurrence}>
                    <span class={styles.recurrence}>🔁 {task.recurrence}</span>
                  </Show>
                  <Show when={task.endDate}>
                    <span class={styles.endDate}>🏁 {task.endDate}</span>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
        <Show when={processedTasks().done.length > 5 && !showAllDone()}>
          <button class={styles.showMoreButton} onClick={() => setShowAllDone(true)}>
            ... (show {processedTasks().done.length - 5} more)
          </button>
        </Show>
      </div>
    </div>
  );
}
