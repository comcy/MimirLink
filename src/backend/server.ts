import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './config/index'; // Import the new unified config
import { createFilesRouter } from './api/files';

async function main() {
  try {
    const config = AppConfig; // Use the globally loaded AppConfig
    console.log(`Workspace found at: ${config.workspace}`);
    console.log(`Notes directory: ${config.notesDirectory}`);

    // Ensure subdirectories for pages, journals, and metadata exist
    const pagesDir = path.join(config.notesDirectory, 'pages');
    const journalsDir = path.join(config.notesDirectory, 'journals');
    const metaDir = path.join(config.notesDirectory, '.mimirlink');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(journalsDir, { recursive: true });
    fs.mkdirSync(metaDir, { recursive: true });
    console.log(`Ensured 'pages', 'journals', and '.mimirlink' subdirectories exist.`);

    const app = express();
    const port = config.port; // Use port from AppConfig

    app.use(cors()); // Enable CORS for all routes
    app.use(express.json());

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', workspace: config.workspace, notesDirectory: config.notesDirectory, port: config.port });
    });

    // Mount the files router, passing the notesDirectory
    app.use('/api/files', createFilesRouter(config.notesDirectory));

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
