import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface FileMetadata {
  path: string;
  mtime: Date;
  pageType: 'journal' | 'page';
}

function findMarkdownFiles(dir: string, fileList: FileMetadata[] = []): FileMetadata[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.mimirlink') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (path.extname(file) === '.md') {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(content);
        
        fileList.push({
          path: file, // Return only the filename
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

export function createFilesRouter(workspacePath: string): Router {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const allFiles = findMarkdownFiles(workspacePath);

      // Sort by modification time (newest first)
      allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      const categorizedFiles = {
        journals: allFiles.filter(file => file.pageType === 'journal'),
        pages: allFiles.filter(file => file.pageType === 'page'),
      };

      res.json(categorizedFiles);
    } catch (error) {
      console.error('Failed to get files:', error);
      res.status(500).json({ error: 'Failed to get files' });
    }
  });

  return router;
}
