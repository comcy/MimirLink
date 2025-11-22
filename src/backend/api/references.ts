import { Router } from 'express';
import { readReferenceIndex } from '../synchronisation/references';
import { NoteMetadata } from './files';
import fs from 'fs';
import path from 'path';

export function createReferencesRouter(notesDirectory: string): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const targetPath = req.query.path as string;
    if (!targetPath) {
      return res.status(400).json({ error: 'Path query parameter is required' });
    }

    try {
      const referenceIndex = readReferenceIndex(notesDirectory);
      const backlinkPaths = referenceIndex[targetPath] || [];

      // To provide richer data to the frontend, we'll return the full metadata for each backlinking note.
      const pageFiles = JSON.parse(fs.readFileSync(path.join(notesDirectory, '.mimirlink', 'pages.json'), 'utf-8')) as NoteMetadata[];
      const journalFiles = JSON.parse(fs.readFileSync(path.join(notesDirectory, '.mimirlink', 'journals.json'), 'utf-8')) as NoteMetadata[];
      const allNotes = [...pageFiles, ...journalFiles];
      
      const backlinkNotes = backlinkPaths.map(p => allNotes.find(n => n.path === p)).filter((n): n is NoteMetadata => n !== undefined);

      res.json(backlinkNotes);
    } catch (error) {
      console.error(`Failed to get backlinks for ${targetPath}:`, error);
      res.status(500).json({ error: 'Failed to get backlinks' });
    }
  });

  return router;
}
