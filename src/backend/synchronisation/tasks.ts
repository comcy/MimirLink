import fs from 'fs';
import path from 'path';
import { formatISO, isBefore, startOfYesterday, parseISO, isAfter } from 'date-fns';
import { extractTasksFromContent, Task } from '../todos/todo';
import { readDoneTasks, writeTasks } from '../todos/todo-utils';
import { getNextOccurrence, RecurrenceRule } from '../todos/date-utils';

export function synchronizeTasks(notesDirectory: string): void {
  const finalOpenTasks: Task[] = [];
  const historicalDoneTasks = readDoneTasks(notesDirectory);

  // 1. Read all raw task definitions from markdown files
  const allRawTasks: Task[] = [];
  const markdownFiles = findMarkdownFiles(notesDirectory);
  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(notesDirectory, file);
    allRawTasks.push(...extractTasksFromContent(content, relativePath));
  }

  // 2. Create a map of all completed instance IDs for quick lookup
  const doneInstanceIds = new Set<string>();
  historicalDoneTasks.forEach(task => {
    if (task.instanceId) {
      doneInstanceIds.add(task.instanceId);
    }
  });
  
  // 3. Create a set of completed non-recurring task IDs
  const doneNonRecurringIds = new Set<string>();
  historicalDoneTasks.forEach(task => {
    if (!task.recurrence) {
      doneNonRecurringIds.add(task.id);
    }
  });

  // 4. Process all raw tasks to generate the final open list
  for (const task of allRawTasks) {
    if (!task.recurrence) {
      // --- Handle Non-Recurring Tasks ---
      if (!doneNonRecurringIds.has(task.id)) {
        finalOpenTasks.push(task);
      }
    } else {
      // --- Handle Recurring Tasks ---
      // Find the most recent completion for this recurring task ID
      const lastCompleted = historicalDoneTasks
        .filter(t => t.id === task.id)
        .sort((a, b) => parseISO(b.completedAt!).getTime() - parseISO(a.completedAt!).getTime())[0];

      const fromDate = lastCompleted ? parseISO(lastCompleted.dueDate!) : startOfYesterday();
      const nextDueDate = getNextOccurrence(task.recurrence as RecurrenceRule, fromDate);

      // If there's an end date, don't create tasks past that date.
      if (task.endDate && isAfter(nextDueDate, parseISO(task.endDate))) {
        continue; // Stop generating occurrences for this task
      }

      const nextInstanceId = `${task.id}-${formatISO(nextDueDate, { representation: 'date' })}`;

      // Only create a new open task if an instance for this next due date hasn't already been completed.
      if (!doneInstanceIds.has(nextInstanceId)) {
        finalOpenTasks.push({
          ...task,
          completed: false,
          completedAt: undefined,
          dueDate: formatISO(nextDueDate, { representation: 'date' }),
          instanceId: nextInstanceId,
        });
      }
    }
  }

  // 5. Write the final open tasks list
  writeTasks(notesDirectory, finalOpenTasks);

  console.log(`Synchronized ${finalOpenTasks.length} open tasks.`);
}

function findMarkdownFiles(dir: string): string[] {
  let files: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== '.mimirlink' && item.name !== 'assets') {
        files = files.concat(findMarkdownFiles(fullPath));
      }
    } else if (item.isFile() && item.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}
