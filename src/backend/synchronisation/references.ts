import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { NoteMetadata } from '../api/files';

const WIKILINK_REGEX = /\[\[(.*?)\]\]/g;

interface ReferenceIndex {
  [targetPath: string]: string[]; // Key: target file path, Value: array of source file paths
}

/**
 * Reads all markdown files and builds a complete index of which file links to which.
 * @param notesDirectory The root directory where notes are stored.
 * @returns The complete reference index.
 */
export function buildReferenceIndex(notesDirectory: string): ReferenceIndex {
  const backlinkIndex: ReferenceIndex = {};
  const allNotes: NoteMetadata[] = [];
  const titleToPathMap: { [title: string]: string } = {};

  // 1. Read all pages and journals metadata to build a title-to-path map
  const pageFiles = JSON.parse(fs.readFileSync(path.join(notesDirectory, '.mimirlink', 'pages.json'), 'utf-8')) as NoteMetadata[];
  const journalFiles = JSON.parse(fs.readFileSync(path.join(notesDirectory, '.mimirlink', 'journals.json'), 'utf-8')) as NoteMetadata[];
  allNotes.push(...pageFiles, ...journalFiles);

  for (const note of allNotes) {
    // Normalize title for consistent lookup
    titleToPathMap[note.title.toLowerCase()] = note.path;
    // Also map date-based journal titles
    if (note.type === 'journal') {
      const dateMatch = note.title.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        titleToPathMap[dateMatch[0]] = note.path;
      }
    }
  }

  // 2. Iterate through all files to find outgoing links
  for (const sourceNote of allNotes) {
    try {
      const sourceContent = fs.readFileSync(path.join(notesDirectory, sourceNote.path), 'utf-8');
      const { content } = matter(sourceContent);
      const matches = content.matchAll(WIKILINK_REGEX);

      for (const match of matches) {
        const linkText = match[1].trim();
        const targetPath = titleToPathMap[linkText.toLowerCase()];

        if (targetPath) {
          // We found a valid link, so add it to the backlink index
          if (!backlinkIndex[targetPath]) {
            backlinkIndex[targetPath] = [];
          }
          // Add source path to the target's backlink list
          if (!backlinkIndex[targetPath].includes(sourceNote.path)) {
            backlinkIndex[targetPath].push(sourceNote.path);
          }
        }
      }
    } catch (e) {
      console.warn(`Could not process file ${sourceNote.path} for reference indexing.`, e);
    }
  }

  return backlinkIndex;
}

/**
 * Writes the reference index to a JSON file.
 * @param notesDirectory The root directory where notes are stored.
 * @param index The reference index to write.
 */
export function writeReferenceIndex(notesDirectory: string, index: ReferenceIndex): void {
  const indexPath = path.join(notesDirectory, '.mimirlink', 'references.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * Reads the reference index from the JSON file.
 * @param notesDirectory The root directory where notes are stored.
 * @returns The reference index.
 */
export function readReferenceIndex(notesDirectory: string): ReferenceIndex {
  const indexPath = path.join(notesDirectory, '.mimirlink', 'references.json');
  if (!fs.existsSync(indexPath)) {
    // If index doesn't exist, build it for the first time.
    const index = buildReferenceIndex(notesDirectory);
    writeReferenceIndex(notesDirectory, index);
    return index;
  }
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}
