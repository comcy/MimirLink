import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface FileMetadata {
  path: string;
  mtime: Date;
  pageType: 'journal' | 'page';
}

function findMarkdownFiles(dir: string, rootDir: string, fileList: FileMetadata[] = []): FileMetadata[] {
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return fileList; // Return current list if directory can't be read
  }

  files.forEach(file => {
    const filePath = path.join(dir, file);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch (error) {
      console.warn(`Could not stat file ${filePath}:`, error);
      return; // Skip this file if stat fails
    }

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.mimirlink') {
        findMarkdownFiles(filePath, rootDir, fileList);
      }
    } else if (path.extname(file) === '.md') {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(content);
        
        fileList.push({
          path: path.relative(rootDir, filePath), // Return relative path
          mtime: stat.mtime,
          pageType: data.pageType === 'journal' ? 'journal' : 'page',
        });
      } catch (e) {
        // Ignore files that can't be read or parsed
        console.warn(`Could not process file: ${filePath}`, e);
      }
    }
  });

  return fileList;
}

export function createFilesRouter(notesDirectory: string): Router { // Changed parameter name
  const router = Router();

  router.get('/', (req, res) => {
    try {
      console.log(`Attempting to list files in: ${notesDirectory}`);
      const allFiles = findMarkdownFiles(notesDirectory, notesDirectory); // Use notesDirectory

      // Sort by modification time (newest first)
      allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      const categorizedFiles = {
        journals: allFiles.filter(file => file.pageType === 'journal'),
        pages: allFiles.filter(file => file.pageType === 'page'),
      };

      res.json(categorizedFiles);
    } catch (error) {
      console.error('Failed to get files from notesDirectory:', notesDirectory, error);
      res.status(500).json({ error: 'Failed to get files' });
    }
  });

  router.get('/content', (req, res) => {
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const absolutePath = path.join(notesDirectory, filePath); // Use notesDirectory

    // Security check: ensure the path is within the notesDirectory
    if (!absolutePath.startsWith(notesDirectory)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      res.send(content);
    } catch (error) {
      console.error(`Failed to read file: ${absolutePath}`, error);
      res.status(404).json({ error: 'File not found' });
    }
  });

  router.post('/create', (req, res) => {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    const absolutePath = path.join(notesDirectory, filePath); // Use notesDirectory

    if (!absolutePath.startsWith(notesDirectory)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      fs.writeFileSync(absolutePath, content, 'utf-8');
      res.status(201).json({ message: 'File created successfully' });
    } catch (error) {
      console.error(`Failed to create file: ${absolutePath}`, error);
      res.status(500).json({ error: 'Failed to create file' });
    }
  });

  router.post('/update', (req, res) => {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    const absolutePath = path.join(notesDirectory, filePath); // Use notesDirectory

    if (!absolutePath.startsWith(notesDirectory)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      fs.writeFileSync(absolutePath, content, 'utf-8');
      res.status(200).json({ message: 'File updated successfully' });
    } catch (error) {
      console.error(`Failed to update file: ${absolutePath}`, error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  });

  return router;
}
