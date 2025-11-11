import express from 'express';
import cors from 'cors';
import { findAndLoadConfig } from './config';
import { createFilesRouter } from './api/files';

async function main() {
  try {
    const config = findAndLoadConfig();
    console.log(`Workspace found at: ${config.workspace}`);

    const app = express();
    const port = config.port || 3001;

    app.use(cors()); // Enable CORS for all routes
    app.use(express.json());

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', workspace: config.workspace });
    });

    // Mount the files router
    app.use('/api/files', createFilesRouter(config.workspace));

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
