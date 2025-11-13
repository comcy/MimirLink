import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { format } from 'date-fns';

// --- Types ---
type NoteType = 'journal' | 'page';

interface NoteMetadata {
  path: string; // Relative path to the markdown file from notesDirectory
  title: string;
  date: string;
  type: NoteType;
  tags: string[];
}

// --- Utility Functions ---

function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function extractMetadataFromContent(relativePath: string, content: string): NoteMetadata {
  const { data: frontmatter } = matter(content);
  return {
    path: relativePath.replace(/\\/g, '/'),
    title: frontmatter.title || 'Untitled',
    date: frontmatter.date || new Date().toISOString(),
    type: frontmatter.pageType || 'page',
    tags: frontmatter.tags || [],
  };
}

// --- Core Metadata Logic ---

function getMetadataDbPath(notesDirectory: string, type: NoteType): string {
  return path.join(notesDirectory, '.mimirlink', `${type}s.json`);
}

function writeMetadata(notesDirectory: string, type: NoteType, data: NoteMetadata[]): void {
  const dbPath = getMetadataDbPath(notesDirectory, type);
  try {
    data.sort((a, b) => a.path.localeCompare(b.path));
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing metadata for ${type}:`, error);
  }
}

/**
 * Scans the markdown files in a directory and rebuilds the metadata for them.
 */
function rebuildMetadataFromMarkdown(notesDirectory: string, type: NoteType): NoteMetadata[] {
  console.log(`Rebuilding metadata for type: ${type}`);
  const metadata: NoteMetadata[] = [];
  const targetDir = path.join(notesDirectory, `${type}s`);

  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const files = fs.readdirSync(targetDir);
  for (const file of files) {
    if (path.extname(file) === '.md') {
      const absolutePath = path.join(targetDir, file);
      const relativePath = path.join(`${type}s`, file);
      try {
        const content = fs.readFileSync(absolutePath, 'utf-8');
        const noteMetadata = extractMetadataFromContent(relativePath, content);
        metadata.push(noteMetadata);
      } catch (e) {
        console.warn(`Could not read or parse ${absolutePath} during rebuild.`, e);
      }
    }
  }

  writeMetadata(notesDirectory, type, metadata);
  console.log(`Rebuild complete for ${type}. Found ${metadata.length} notes.`);
  return metadata;
}

function readMetadata(notesDirectory: string, type: NoteType): NoteMetadata[] {
  const dbPath = getMetadataDbPath(notesDirectory, type);
  if (!fs.existsSync(dbPath)) {
    // If DB file doesn't exist, rebuild it from the markdown files
    return rebuildMetadataFromMarkdown(notesDirectory, type);
  }
  try {
    const content = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading metadata for ${type}, attempting rebuild:`, error);
    // If parsing fails, it might be corrupt, so rebuild
    return rebuildMetadataFromMarkdown(notesDirectory, type);
  }
}

// --- Router ---

export function createFilesRouter(notesDirectory: string): Router {
  const router = Router();

  // GET /api/files - List all notes
  router.get('/', (req, res) => {
    try {
      const journals = readMetadata(notesDirectory, 'journal');
      const pages = readMetadata(notesDirectory, 'page');

      const allNotes = [...journals, ...pages];
      allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        journals: allNotes.filter(n => n.type === 'journal'),
        pages: allNotes.filter(n => n.type === 'page'),
      });
    } catch (error) {
      console.error('Failed to get files:', error);
      res.status(500).json({ error: 'Failed to get files' });
    }
  });

  // GET /api/files/content - Get content of a file
  router.get('/content', (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });

    const absolutePath = path.join(notesDirectory, filePath);
    if (!absolutePath.startsWith(notesDirectory)) return res.status(403).json({ error: 'Forbidden' });

    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      res.send(content);
    } catch (error) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // POST /api/files/create - Create a new note
  router.post('/create', (req, res) => {
    const { title, type } = req.body as { title: string; type: NoteType };
    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    let relativePath: string;
    let content: string;

    if (type === 'journal') {
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      relativePath = path.join('journals', `${dateStr}.md`).replace(/\\/g, '/');
      content = `---
title: Journal ${dateStr}
date: ${dateStr}
pageType: journal
tags: []
---

# Journal - ${dateStr}

`;
    } else { // type === 'page'
      const slug = slugify(title);
      relativePath = path.join('pages', `${slug}.md`).replace(/\\/g, '/');
      content = `---
title: ${title}
date: ${format(new Date(), 'yyyy-MM-dd')}
pageType: page
tags: []
---

# ${title}

`;
    }

    const absolutePath = path.join(notesDirectory, relativePath);
    if (fs.existsSync(absolutePath)) {
      return res.status(409).json({ error: 'File already exists', path: relativePath });
    }

    try {
      fs.writeFileSync(absolutePath, content, 'utf-8');

      const newMetadata = extractMetadataFromContent(relativePath, content);
      const allMetadata = readMetadata(notesDirectory, type);
      allMetadata.push(newMetadata);
      writeMetadata(notesDirectory, type, allMetadata);

      res.status(201).json({ message: 'File created successfully', path: relativePath });
    } catch (error) {
      console.error(`Failed to create file: ${absolutePath}`, error);
      res.status(500).json({ error: 'Failed to create file' });
    }
  });

  // POST /api/files/update - Update an existing note
  router.post('/update', (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    const absolutePath = path.join(notesDirectory, filePath);
    if (!absolutePath.startsWith(notesDirectory)) return res.status(403).json({ error: 'Forbidden' });

    try {
      fs.writeFileSync(absolutePath, content, 'utf-8');

      const updatedMetadata = extractMetadataFromContent(filePath, content);
      const type = updatedMetadata.type;
      const allMetadata = readMetadata(notesDirectory, type);
      const noteIndex = allMetadata.findIndex(note => note.path === filePath);

      if (noteIndex !== -1) {
        allMetadata[noteIndex] = updatedMetadata;
      } else {
        allMetadata.push(updatedMetadata);
      }

      writeMetadata(notesDirectory, type, allMetadata);

      res.status(200).json({ message: 'File updated successfully' });
    } catch (error) {
      console.error(`Failed to update file: ${absolutePath}`, error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  });

  // GET /api/files/search - Search all notes
  router.get('/search', (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      const journals = readMetadata(notesDirectory, 'journal');
      const pages = readMetadata(notesDirectory, 'page');
      const allNotes = [...journals, ...pages];

      const searchResults = [];
      const lowerCaseQuery = query.toLowerCase();

      for (const note of allNotes) {
        const absolutePath = path.join(notesDirectory, note.path);
        try {
          const content = fs.readFileSync(absolutePath, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes(lowerCaseQuery)) {
              searchResults.push({
                path: note.path,
                title: note.title,
                context: line.trim(),
              });
              // Take only the first match per file to keep results concise
              break;
            }
          }
        } catch (e) {
          // Ignore files that can't be read
          console.warn(`Could not read file ${note.path} during search.`, e);
        }
      }

      res.json(searchResults);
    } catch (error) {
      console.error('Failed to perform search:', error);
      res.status(500).json({ error: 'Failed to perform search' });
    }
  });

  // DELETE /api/files - Delete a note
  router.delete('/', (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const absolutePath = path.join(notesDirectory, filePath);
    if (!absolutePath.startsWith(notesDirectory)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      // 1. Delete the markdown file
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }

      // 2. Delete the old sidecar .json file if it exists (cleanup)
      const sidecarJsonPath = absolutePath.replace(/\.md$/, '.json');
      if (fs.existsSync(sidecarJsonPath)) {
        fs.unlinkSync(sidecarJsonPath);
      }

      // 3. Remove the entry from the central metadata file
      const type = filePath.startsWith('journals') ? 'journal' : 'page';
      const allMetadata = readMetadata(notesDirectory, type);
      const updatedMetadata = allMetadata.filter(note => note.path !== filePath);

      // Write back only if changes were made
      if (updatedMetadata.length < allMetadata.length) {
        writeMetadata(notesDirectory, type, updatedMetadata);
      }

      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error(`Failed to delete file: ${absolutePath}`, error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  return router;
}
