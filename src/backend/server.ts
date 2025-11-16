import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './config/index';
import { createFilesRouter } from './api/files';
import { createReferencesRouter } from './api/references';
import { createTodosRouter } from './api/todos';
import { initializeWatcher } from './watcher/watch';
import { buildReferenceIndex, writeReferenceIndex } from './synchronisation/references';
import { synchronizeTasks } from './synchronisation/tasks';

async function main() {
  try {
    const config = AppConfig;
    console.log(`Workspace found at: ${config.workspace}`);
    console.log(`Notes directory: ${config.notesDirectory}`);

    const pagesDir = path.join(config.notesDirectory, 'pages');
    const journalsDir = path.join(config.notesDirectory, 'journals');
    const metaDir = path.join(config.notesDirectory, '.mimirlink');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(journalsDir, { recursive: true });
    fs.mkdirSync(metaDir, { recursive: true });
    console.log(`Ensured 'pages', 'journals', and '.mimirlink' subdirectories exist.`);

    // Perform initial indexing on startup before starting the server
    try {
      console.log('Performing initial reference indexing...');
      const index = buildReferenceIndex(config.notesDirectory);
      writeReferenceIndex(config.notesDirectory, index);
      console.log('Reference indexing complete.');

      console.log('Performing initial task synchronization...');
      synchronizeTasks(config.notesDirectory);
      console.log('Task synchronization complete.');
    } catch (error) {
      console.error('Failed to perform initial indexing or synchronization:', error);
    }

    const app = express();
    const port = config.port;

    app.use(cors());
    app.use(express.json());

    // Serve static files from the notes directory (including assets)
    app.use(express.static(config.notesDirectory));

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', workspace: config.workspace, notesDirectory: config.notesDirectory, port: config.port });
    });

    app.use('/api/files', (req, res, next) => {
      if (req.path === '/upload') {
        console.log('Raw headers for /api/files/upload:', req.headers);
      }
      next();
    }, createFilesRouter(config.notesDirectory));
    app.use('/api/backlinks', createReferencesRouter(config.notesDirectory));
    app.use('/api/todos', createTodosRouter(config.notesDirectory));

    app.listen(port, () => {
      console.log(`Mimirlink server listening on http://localhost:${port}`);
    });

  } catch (error) {
    console.error('Failed to start Mimirlink server:');
    console.error(error);
    process.exit(1);
  }
}

main();
