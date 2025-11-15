import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { NoteMetadata, NoteType } from '../api/files';

const WIKILINK_REGEX = /\[\[(.*?)\]\]/g;

export function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function extractWikiLinks(content: string): string[] {
  const matches = content.matchAll(WIKILINK_REGEX);
  const links = Array.from(matches, m => m[1]);
  return [...new Set(links)];
}

export function extractMetadataFromContent(relativePath: string, content: string): NoteMetadata {
  const { data: frontmatter } = matter(content);
  return {
    path: relativePath.replace(/\\/g, '/'),
    title: frontmatter.title || 'Untitled',
    date: frontmatter.date || new Date().toISOString(),
    type: frontmatter.pageType || 'page',
    tags: frontmatter.tags || [],
  };
}

export function getMetadataDbPath(notesDirectory: string, type: NoteType): string {
  return path.join(notesDirectory, '.mimirlink', `${type}s.json`);
}

export function writeMetadata(notesDirectory: string, type: NoteType, data: NoteMetadata[]): void {
  const dbPath = getMetadataDbPath(notesDirectory, type);
  try {
    data.sort((a, b) => a.path.localeCompare(b.path));
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing metadata for ${type}:`, error);
  }
}

export function rebuildMetadataFromMarkdown(notesDirectory: string, type: NoteType): NoteMetadata[] {
  const metadata: NoteMetadata[] = [];
  const targetDir = path.join(notesDirectory, `${type}s`);
  if (!fs.existsSync(targetDir)) return [];
  const files = fs.readdirSync(targetDir);
  for (const file of files) {
    if (path.extname(file) === '.md') {
      const absolutePath = path.join(targetDir, file);
      const relativePath = path.join(`${type}s`, file);
      try {
        const content = fs.readFileSync(absolutePath, 'utf-8');
        metadata.push(extractMetadataFromContent(relativePath, content));
      } catch (e) {
        console.warn(`Could not read or parse ${absolutePath} during rebuild.`, e);
      }
    }
  }
  writeMetadata(notesDirectory, type, metadata);
  return metadata;
}

export function readMetadata(notesDirectory: string, type: NoteType): NoteMetadata[] {
  const dbPath = getMetadataDbPath(notesDirectory, type);
  if (!fs.existsSync(dbPath)) {
    return rebuildMetadataFromMarkdown(notesDirectory, type);
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  } catch (error) {
    console.error(`Error reading metadata for ${type}, attempting rebuild:`, error);
    return rebuildMetadataFromMarkdown(notesDirectory, type);
  }
}
