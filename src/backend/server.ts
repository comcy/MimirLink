import express from 'express';
import cors from 'cors';
import { AppConfig } from './config/index'; // Import the new unified config
import { createFilesRouter } from './api/files';

async function main() {
  try {
    const config = AppConfig; // Use the globally loaded AppConfig
    console.log(`Workspace found at: ${config.workspace}`);
    console.log(`Notes directory: ${config.notesDirectory}`);

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
