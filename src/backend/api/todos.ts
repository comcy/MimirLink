import { Router } from 'express';
import { readTasks, readDoneTasks, addDoneTask } from '../todos/todo-utils';
import { synchronizeTasks } from '../synchronisation/tasks';
import { Task } from '../todos/todo';

export function createTodosRouter(notesDirectory: string): Router {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const openTasks = readTasks(notesDirectory);
      const doneTasks = readDoneTasks(notesDirectory);
      res.json({
        open: openTasks,
        done: doneTasks,
      });
    } catch (error) {
      console.error('Failed to get tasks:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  });

  router.post('/synchronize', (req, res) => {
    try {
      synchronizeTasks(notesDirectory);
      res.status(200).json({ message: 'Task synchronization complete.' });
    } catch (error) {
      console.error('Failed to synchronize tasks:', error);
      res.status(500).json({ error: 'Failed to synchronize tasks' });
    }
  });

  router.post('/complete', (req, res) => {
    try {
      const task = req.body as Task;
      if (!task || !task.id) {
        return res.status(400).json({ error: 'Invalid task provided.' });
      }
      
      const completedInstance: Task = {
        ...task,
        completed: true,
        completedAt: new Date().toISOString(),
      };

      addDoneTask(notesDirectory, completedInstance);
      res.status(200).json({ message: 'Task instance completed.' });

    } catch (error) {
      console.error('Failed to complete task:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  return router;
}
