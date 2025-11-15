import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './config/index';
import { createFilesRouter } from './api/files';
import { createReferencesRouter } from './api/references';
import { initializeWatcher } from './watcher/watch';
import { buildReferenceIndex, writeReferenceIndex } from './synchronisation/references';

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
    } catch (error) {
      console.error('Failed to perform initial reference indexing:', error);
    }

    const app = express();
    const port = config.port;

    app.use(cors());
    app.use(express.json());

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', workspace: config.workspace, notesDirectory: config.notesDirectory, port: config.port });
    });

    app.use('/api/files', createFilesRouter(config.notesDirectory));
    app.use('/api/backlinks', createReferencesRouter(config.notesDirectory));

    app.listen(port, () => {
      console.log(`Mimirlink server listening on http://localhost:${port}`);
    });

    // Initialize the watcher if enabled in config
    if (config.watcher?.enabled) {
      console.log('Watcher is enabled, initializing...');
      initializeWatcher(config.notesDirectory);
    } else {
      console.log('Watcher is disabled in config.');
    }

  } catch (error) {
    console.error('Failed to start Mimirlink server:');
    console.error(error);
    process.exit(1);
  }
}

main();
