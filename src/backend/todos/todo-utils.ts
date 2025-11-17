import fs from 'fs';
import path from 'path';
import { Task } from './todo';

const TASKS_JSON = 'tasks.json';
const DONE_TASKS_JSON = 'done_tasks.json';

function getTasksFilePath(notesDirectory: string): string {
  return path.join(notesDirectory, '.mimirlink', TASKS_JSON);
}

function getDoneTasksFilePath(notesDirectory: string): string {
  return path.join(notesDirectory, '.mimirlink', DONE_TASKS_JSON);
}

export function readTasks(notesDirectory: string): Task[] {
  const filePath = getTasksFilePath(notesDirectory);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

export function writeTasks(notesDirectory: string, tasks: Task[]): void {
  const filePath = getTasksFilePath(notesDirectory);
  fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
}

export function readDoneTasks(notesDirectory: string): Task[] {
  const filePath = getDoneTasksFilePath(notesDirectory);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

export function writeDoneTasks(notesDirectory: string, tasks: Task[]): void {
  const filePath = getDoneTasksFilePath(notesDirectory);
  fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
}

export function addDoneTask(notesDirectory: string, task: Task): void {
  let doneTasks = readDoneTasks(notesDirectory);

  // If the completed task is a recurring one, remove any previous instances of it from the done list.
  if (task.recurrence) {
    doneTasks = doneTasks.filter(doneTask => doneTask.id !== task.id);
  }

  doneTasks.push(task);
  writeDoneTasks(notesDirectory, doneTasks);
}
