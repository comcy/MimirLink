import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { format } from 'date-fns';
import multer from 'multer';
import { extractTagsFromContent, readTags, updateTagsForFile } from '../synchronisation/tags.js';
import { buildReferenceIndex, writeReferenceIndex } from '../synchronisation/references.js';
import { extractMetadataFromContent, readMetadata, writeMetadata, NoteType, slugify, extractWikiLinks } from '../synchronisation/metadata.js';
import { readImageMetadata, writeImageMetadata } from '../synchronisation/images.js';

// --- Types ---
export interface NoteMetadata {
  path: string;
  title: string;
  date: string;
  type: NoteType;
  tags: string[];
}

// --- Utility Functions ---

// --- Helper for Indexing ---
function updateReferenceIndex(notesDirectory: string) {
  try {
    const index = buildReferenceIndex(notesDirectory);
    writeReferenceIndex(notesDirectory, index);
  } catch (error) {
    console.error('Failed to update reference index:', error);
  }
}

// --- Router ---

export function createFilesRouter(notesDirectory: string): Router {
  const router = Router();

  console.log('Creating files router with notesDirectory:', notesDirectory);
  const assetsDirectory = path.join(notesDirectory, 'assets');
  console.log('Assets directory:', assetsDirectory);

  if (!fs.existsSync(assetsDirectory)) {
    fs.mkdirSync(assetsDirectory, { recursive: true });
  }

  const upload = multer({ storage: multer.memoryStorage() });

  const findOrCreateNote = (linkContent: string, typeOverride?: NoteType): NoteMetadata | null => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const isDateLink = dateRegex.test(linkContent);
    const type: NoteType = typeOverride || (isDateLink ? 'journal' : 'page');

    let relativePath: string;
    let title: string;
    let existingNote: NoteMetadata | undefined;

    if (type === 'journal') {
      title = `Journal ${linkContent}`;
      relativePath = path.join('journals', `${linkContent}.md`).replace(/\\/g, '/');
      existingNote = readMetadata(notesDirectory, 'journal').find(j => j.path === relativePath);
    } else {
      title = linkContent;
      existingNote = readMetadata(notesDirectory, 'page').find(p => p.title.toLowerCase() === title.toLowerCase());
      if (existingNote) {
        relativePath = existingNote.path;
      } else {
        const slug = slugify(linkContent);
        relativePath = path.join('pages', `${slug}.md`).replace(/\\/g, '/');
      }
    }

    const absolutePath = path.join(notesDirectory, relativePath);
    if (fs.existsSync(absolutePath)) {
      return existingNote || extractMetadataFromContent(relativePath, fs.readFileSync(absolutePath, 'utf-8'));
    }

    const date = isDateLink ? linkContent : format(new Date(), 'yyyy-MM-dd');
    const content = `---
title: ${title}
date: ${date}
pageType: ${type}
tags: []
---

# ${title}

`;

    try {
      fs.writeFileSync(absolutePath, content, 'utf-8');
      const newMetadata = extractMetadataFromContent(relativePath, content);
      const allMetadata = readMetadata(notesDirectory, type);
      allMetadata.push(newMetadata);
      writeMetadata(notesDirectory, type, allMetadata);
      const tags = extractTagsFromContent(content);
      const allNotesForTags = [...readMetadata(notesDirectory, 'journal'), ...readMetadata(notesDirectory, 'page')];
      updateTagsForFile(notesDirectory, relativePath, tags, allNotesForTags);
      console.log(`Auto-created note: ${relativePath}`);
      return newMetadata;
    } catch (error) {
      console.error(`Failed to auto-create file: ${absolutePath}`, error);
      return null;
    }
  };

  router.get('/', (req, res) => {
    try {
      const journals = readMetadata(notesDirectory, 'journal');
      const pages = readMetadata(notesDirectory, 'page');
      res.json({
        journals: journals.sort((a, b) => b.date.localeCompare(a.date)),
        pages: pages.sort((a, b) => a.title.localeCompare(b.title)),
      });
    } catch (error) {
      console.error('Failed to get files:', error);
      res.status(500).json({ error: 'Failed to get files' });
    }
  });

  router.post('/upload', upload.single('image'), (req, res) => {
    console.log('Upload endpoint hit.');
    console.log('Request file object:', req.file);
    console.log('Request body:', req.body);

    if (!req.file || !req.file.buffer) {
      console.error('Multer did not process the file into a buffer.');
      return res.status(400).json({ error: 'No file uploaded or multer processing failed.' });
    }

    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);
      const absolutePath = path.join(assetsDirectory, filename);
      
      fs.writeFileSync(absolutePath, req.file.buffer);

      const imagePath = path.join('assets', filename).replace(/\\/g, '/');
      console.log(`File saved successfully. Path: ${imagePath}, Size: ${req.file.size}`);

      const metadata = readImageMetadata(notesDirectory);
      metadata.push({
        path: imagePath,
        filename: filename,
        createdAt: new Date().toISOString(),
      });
      writeImageMetadata(notesDirectory, metadata);

      res.status(200).json({ path: imagePath });
    } catch (error) {
      console.error('Error saving file to disk:', error);
      res.status(500).json({ error: 'Failed to save file.' });
    }
  });

  router.get('/tags', (req, res) => {
    try {
      const journals = readMetadata(notesDirectory, 'journal');
      const pages = readMetadata(notesDirectory, 'page');
      const allNotes = [...journals, ...pages];
      const tagsData = readTags(notesDirectory, allNotes);
      res.json(tagsData);
    } catch (error) {
      console.error('Failed to get tags:', error);
      res.status(500).json({ error: 'Failed to get tags' });
    }
  });

  router.get('/content', (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    const absolutePath = path.join(notesDirectory, filePath);
    if (!absolutePath.startsWith(notesDirectory)) return res.status(403).json({ error: 'Forbidden' });
    try {
      res.send(fs.readFileSync(absolutePath, 'utf-8'));
    } catch (error) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  router.post('/create', (req, res) => {
    const { title, type } = req.body as { title: string; type: NoteType };
    if (!title || !type) return res.status(400).json({ error: 'Title and type are required' });
    const linkContent = type === 'journal' ? format(new Date(), 'yyyy-MM-dd') : title;
    const note = findOrCreateNote(linkContent, type);
    if (note) {
      updateReferenceIndex(notesDirectory); // Update index on create
      res.status(201).json({ message: 'File created successfully', path: note.path });
    } else {
      res.status(409).json({ error: 'File already exists', path: '' });
    }
  });

  router.post('/update', (req, res) => {
    const { path: filePath, content: originalContent } = req.body;
    if (!filePath || originalContent === undefined) return res.status(400).json({ error: 'File path and content are required' });
    const absolutePath = path.join(notesDirectory, filePath);
    if (!absolutePath.startsWith(notesDirectory)) return res.status(403).json({ error: 'Forbidden' });
    try {
      const allTags = extractTagsFromContent(originalContent);
      const { data: frontmatter, content: bodyContent } = matter(originalContent);
      frontmatter.tags = allTags.sort();
      const newContent = matter.stringify(bodyContent, frontmatter);
      fs.writeFileSync(absolutePath, newContent, 'utf-8');
      const updatedMetadata = extractMetadataFromContent(filePath, newContent);
      const type = updatedMetadata.type;
      const allMetadata = readMetadata(notesDirectory, type);
      const noteIndex = allMetadata.findIndex(note => note.path === filePath);
      if (noteIndex !== -1) allMetadata[noteIndex] = updatedMetadata;
      else allMetadata.push(updatedMetadata);
      writeMetadata(notesDirectory, type, allMetadata);
            const allNotesForTags = [...readMetadata(notesDirectory, 'journal'), ...readMetadata(notesDirectory, 'page')];
            updateTagsForFile(notesDirectory, filePath, allTags, allNotesForTags);
            const linkedPages = extractWikiLinks(newContent);
            const createdNotes: NoteMetadata[] = [];
            for (const link of linkedPages) {
              const note = findOrCreateNote(link);
              if (note) {
                createdNotes.push(note);
              }
            }
            
            // After all file operations, update the reference index
            updateReferenceIndex(notesDirectory);
      
            res.status(200).json({ message: 'File updated successfully', createdNotes });
          } catch (error) {
            console.error(`Failed to update file: ${absolutePath}`, error);
            res.status(500).json({ error: 'Failed to update file' });
          }
  });

  router.get('/search', (req, res) => {
    const query = req.query.q as string;
    try {
      const journals = readMetadata(notesDirectory, 'journal');
      const pages = readMetadata(notesDirectory, 'page');
      const allNotes = [...journals, ...pages];
      let searchResults = [];
      if (query) {
        const lowerCaseQuery = query.toLowerCase();
        for (const note of allNotes) {
          const absolutePath = path.join(notesDirectory, note.path);
          try {
            const content = fs.readFileSync(absolutePath, 'utf-8');
            if (content.toLowerCase().includes(lowerCaseQuery)) {
              searchResults.push({ path: note.path, title: note.title, context: content.substring(0, 200) });
            }
          } catch (e) { console.warn(`Could not read file ${note.path} during search.`, e); }
        }
      } else {
        searchResults = allNotes.map(note => ({
          path: note.path,
          title: note.title,
          context: "No search query - showing all notes",
        })).sort((a, b) => new Date(b.path).getTime() - new Date(a.path).getTime());
      }
      res.json(searchResults);
    } catch (error) {
      console.error('Failed to perform search:', error);
      res.status(500).json({ error: 'Failed to perform search' });
    }
  });

  router.delete('/', (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    const absolutePath = path.join(notesDirectory, filePath);
    if (!absolutePath.startsWith(notesDirectory)) return res.status(403).json({ error: 'Forbidden' });
    try {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      const sidecarJsonPath = absolutePath.replace(/\.md$/, '.json');
      if (fs.existsSync(sidecarJsonPath)) fs.unlinkSync(sidecarJsonPath);
      const type = filePath.startsWith('journals') ? 'journal' : 'page';
      const allMetadata = readMetadata(notesDirectory, type);
      const updatedMetadata = allMetadata.filter(note => note.path !== filePath);
      if (updatedMetadata.length < allMetadata.length) writeMetadata(notesDirectory, type, updatedMetadata);
      const allNotes = [...readMetadata(notesDirectory, 'journal'), ...readMetadata(notesDirectory, 'page')];
      updateTagsForFile(notesDirectory, filePath, [], allNotes);
      updateReferenceIndex(notesDirectory); // Update index on delete
      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error(`Failed to delete file: ${absolutePath}`, error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  return router;
}
