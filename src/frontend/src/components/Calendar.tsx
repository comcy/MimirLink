import dayjs from 'dayjs';
import { createSignal, For, createMemo, Show } from 'solid-js';
import styles from './Calendar.module.scss';
import { store, type Task } from '../store';
import { getNextOccurrence } from '../date-utils';
import { parseISO, format } from 'date-fns';

interface DayObject {
  day: number | null;
  dateStr: string;
  tasks: Task[];
  isToday: boolean;
}

export function Calendar() {
  const [currentDate, setCurrentDate] = createSignal(dayjs());
  const [popoverTasks, setPopoverTasks] = createSignal<Task[] | null>(null);
  const [popoverPosition, setPopoverPosition] = createSignal({ top: 0, left: 0 });

  const calendarData = createMemo(() => {
    const cd = currentDate();
    const openTasks = store.tasks()?.open ?? [];
    const endOfVisibleMonth = cd.endOf('month').toDate();

    // 1. Create a map and populate it with all tasks from the store
    const tasksByDueDate = new Map<string, Task[]>();
    for (const task of openTasks) {
      if (task.dueDate) {
        if (!tasksByDueDate.has(task.dueDate)) {
          tasksByDueDate.set(task.dueDate, []);
        }
        tasksByDueDate.get(task.dueDate)!.push(task);
      }
    }

    // 2. Project future occurrences of recurring tasks for the visible month
    const recurringTasks = openTasks.filter(t => t.recurrence);
    for (const task of recurringTasks) {
      if (!task.dueDate) continue;

      let nextDate = parseISO(task.dueDate);
      
      // Project occurrences until we are past the visible month
      while (nextDate <= endOfVisibleMonth) {
        nextDate = getNextOccurrence(task.recurrence!, nextDate);

        // Stop projecting if the next date is after the task's specific end date
        if (task.endDate && nextDate > parseISO(task.endDate)) {
          break;
        }
        
        if (nextDate > endOfVisibleMonth) break;

        const nextDateStr = format(nextDate, 'yyyy-MM-dd');
        if (!tasksByDueDate.has(nextDateStr)) {
          tasksByDueDate.set(nextDateStr, []);
        }
        // Add the base task definition to that date's list
        tasksByDueDate.get(nextDateStr)!.push(task);
      }
    }

    // 3. Generate the calendar grid data structure
    const days: DayObject[] = [];
    const startDay = cd.startOf('month').day();
    const endDay = cd.endOf('month').date();

    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, dateStr: '', tasks: [], isToday: false });
    }

    for (let i = 1; i <= endDay; i++) {
      const dayDate = cd.date(i);
      const dateStr = dayDate.format('YYYY-MM-DD');
      const tasksForDay = tasksByDueDate.get(dateStr) || [];
      days.push({
        day: i,
        dateStr: dateStr,
        tasks: tasksForDay,
        isToday: dayjs().isSame(dayDate, 'day'),
      });
    }
    return days;
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleMouseEnter = (e: MouseEvent, tasks: Task[]) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverPosition({ top: rect.bottom + 5, left: rect.left });
    setPopoverTasks(tasks);
  };

  const handleMouseLeave = () => {
    setPopoverTasks(null);
  };

  return (
    <div class={styles.container}>
      <div class={styles.calendar}>
        <div class={styles.header}>
          <button onClick={() => setCurrentDate(currentDate().subtract(1, 'month'))}>&lt;</button>
          <h2>{currentDate().format('MMMM YYYY')}</h2>
          <button onClick={() => setCurrentDate(currentDate().add(1, 'month'))}>&gt;</button>
        </div>
        <div class={styles.weekDays}>
          <For each={weekDays}>{(day) => <div>{day}</div>}</For>
        </div>
        <div class={styles.days}>
          <For each={calendarData()}>
            {(dayObj) => {
              if (dayObj.day === null) {
                return <div class={`${styles.day} ${styles.empty}`} />;
              }
              const hasTasks = dayObj.tasks.length > 0;
              return (
                <div
                  class={styles.day}
                  classList={{
                    [styles.today]: dayObj.isToday,
                    [styles.hasTasks]: hasTasks,
                  }}
                  onMouseEnter={hasTasks ? (e) => handleMouseEnter(e, dayObj.tasks) : undefined}
                  onMouseLeave={hasTasks ? handleMouseLeave : undefined}
                >
                  {dayObj.day}
                </div>
              );
            }}
          </For>
        </div>
      </div>
      <Show when={popoverTasks()}>
        <div 
          class={styles.popover} 
          style={{ top: `${popoverPosition().top}px`, left: `${popoverPosition().left}px` }}
        >
          <For each={popoverTasks()}>
            {(task) => <div class={styles.popoverTask}>{task.description}</div>}
          </For>
        </div>
      </Show>
    </div>
  );
}