import { formatISO } from 'date-fns';

export type Recurrence = 'daily' | 'weekly' | 'monthly' | string;

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  filePath: string;
  lineNumber: number;
  dueDate?: string;
  plannedDate?: string;
  recurrence?: Recurrence;
  endDate?: string;
  createdAt: string;
  completedAt?: string;
  // A unique ID for a specific instance of a recurring task
  instanceId?: string; 
}

const TASK_REGEX = /-\s*\[( |x)\]\s*(.*)/;
const DUE_DATE_REGEX = /due:(?:\[\[?)?(\d{4}-\d{2}-\d{2})(?:\]\]?)?/;
const PLANNED_DATE_REGEX = /planned:(?:\[\[?)?(\d{4}-\d{2}-\d{2})(?:\]\]?)?/;
const RECURRENCE_REGEX = /recurring:(\w+|\[[\w,\s]+\])/;
const END_DATE_REGEX = /end:(?:\[\[?)?(\d{4}-\d{2}-\d{2})(?:\]\]?)?/;

/**
 * Extracts all raw task definitions from a file's content.
 * The complex logic for handling recurring tasks is now in `synchronizeTasks`.
 */
export function extractTasksFromContent(content: string, filePath: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');
  const today = formatISO(new Date(), { representation: 'date' });

  lines.forEach((line, index) => {
    const taskMatch = line.match(TASK_REGEX);
    if (!taskMatch) return;

    let description = taskMatch[2];
    let dueDate: string | undefined;
    let plannedDate: string | undefined;
    let recurrence: Recurrence | undefined;
    let endDate: string | undefined;

    const dueDateMatch = description.match(DUE_DATE_REGEX);
    if (dueDateMatch) {
      dueDate = dueDateMatch[1];
      description = description.replace(dueDateMatch[0], '').trim();
    }

    const plannedDateMatch = description.match(PLANNED_DATE_REGEX);
    if (plannedDateMatch) {
      plannedDate = plannedDateMatch[1];
      description = description.replace(plannedDateMatch[0], '').trim();
    }

    const recurrenceMatch = description.match(RECURRENCE_REGEX);
    if (recurrenceMatch) {
      recurrence = recurrenceMatch[1] as Recurrence;
      description = description.replace(recurrenceMatch[0], '').trim();
    }

    const endDateMatch = description.match(END_DATE_REGEX);
    if (endDateMatch) {
      endDate = endDateMatch[1];
      description = description.replace(endDateMatch[0], '').trim();
    }

    const task: Task = {
      id: `${filePath}-${index}`,
      description: description.trim(),
      completed: false, // This is now determined by the sync process
      filePath,
      lineNumber: index + 1,
      dueDate: dueDate || (recurrence ? undefined : today), // Default due date for non-recurring tasks
      plannedDate,
      recurrence,
      endDate,
      createdAt: new Date().toISOString(),
    };

    tasks.push(task);
  });

  return tasks;
}