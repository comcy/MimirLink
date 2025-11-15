import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { NoteMetadata } from '../api/files'; // Assuming NoteMetadata is exported from files.ts

export type TagsData = {
  [tagName: string]: string[]; // tagName -> list of file paths
};

const TAG_REGEX = /#([a-zA-Z0-9_-]+)/g;

/**
 * Extracts all tags from both the frontmatter and the markdown content.
 * @param fileContent The entire markdown file content.
 * @returns A unique array of tag names (without the #).
 */
export function extractTagsFromContent(fileContent: string): string[] {
  const { data: frontmatter, content: bodyContent } = matter(fileContent);

  // 1. Get tags from frontmatter
  const frontmatterTags = frontmatter.tags || [];
  if (!Array.isArray(frontmatterTags)) {
    console.warn('Frontmatter "tags" is not an array, skipping.');
    frontmatterTags.length = 0; // Treat as empty
  }

  // 2. Get tags from body content
  const bodyTags = [];
  const matches = bodyContent.match(TAG_REGEX);
  if (matches) {
    bodyTags.push(...matches.map(tag => tag.substring(1)));
  }

  // 3. Combine and return unique tags
  return [...new Set([...frontmatterTags, ...bodyTags])];
}

function getTagsDbPath(notesDirectory: string): string {
  return path.join(notesDirectory, '.mimirlink', 'tags.json');
}

/**
 * Writes the tags data to the tags.json file.
 * @param notesDirectory The root directory for notes.
 * @param data The tags data to write.
 */
export function writeTags(notesDirectory: string, data: TagsData): void {
  const dbPath = getTagsDbPath(notesDirectory);
  try {
    // Sort tags alphabetically for consistency
    const sortedData = Object.keys(data).sort().reduce((acc, key) => {
      // Sort file paths for each tag
      acc[key] = [...new Set(data[key])].sort();
      return acc;
    }, {} as TagsData);
    fs.writeFileSync(dbPath, JSON.stringify(sortedData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing tags.json:', error);
  }
}

/**
 * Rebuilds the entire tags.json from all markdown files.
 * @param notesDirectory The root directory for notes.
 * @param allNotes An array of all note metadata.
 * @returns The newly built tags data.
 */
export function rebuildTagsFromMarkdown(notesDirectory: string, allNotes: NoteMetadata[]): TagsData {
  console.log('Rebuilding tags.json from all markdown files...');
  const newTagsData: TagsData = {};

  for (const note of allNotes) {
    const absolutePath = path.join(notesDirectory, note.path);
    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const tags = extractTagsFromContent(content);
      for (const tag of tags) {
        if (!newTagsData[tag]) {
          newTagsData[tag] = [];
        }
        newTagsData[tag].push(note.path);
      }
    } catch (e) {
      console.warn(`Could not read or parse ${absolutePath} during tags rebuild.`, e);
    }
  }

  writeTags(notesDirectory, newTagsData);
  console.log(`Tags rebuild complete. Found ${Object.keys(newTagsData).length} unique tags.`);
  return newTagsData;
}

/**
 * Reads the tags.json file.
 * If the file doesn't exist, it triggers a rebuild.
 * @param notesDirectory The root directory for notes.
 * @param allNotes All note metadata, required for a potential rebuild.
 * @returns The tags data.
 */
export function readTags(notesDirectory: string, allNotes: NoteMetadata[]): TagsData {
  const dbPath = getTagsDbPath(notesDirectory);
  if (!fs.existsSync(dbPath)) {
    return rebuildTagsFromMarkdown(notesDirectory, allNotes);
  }
  try {
    const content = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading tags.json, attempting rebuild:', error);
    return rebuildTagsFromMarkdown(notesDirectory, allNotes);
  }
}

/**
 * Updates the tags database for a single file.
 * @param notesDirectory The root directory for notes.
 * @param filePath The relative path of the file that was changed.
 * @param newTags The new list of tags for that file.
 * @param allNotes All note metadata, required for a potential rebuild.
 */
export function updateTagsForFile(notesDirectory: string, filePath: string, newTags: string[], allNotes: NoteMetadata[]): void {
  const tagsData = readTags(notesDirectory, allNotes);

  // Step 1: Remove all old references to this file path
  for (const tagName in tagsData) {
    tagsData[tagName] = tagsData[tagName].filter(p => p !== filePath);
    // Clean up tags that no longer have any files
    if (tagsData[tagName].length === 0) {
      delete tagsData[tagName];
    }
  }

  // Step 2: Add the new references
  for (const tag of newTags) {
    if (!tagsData[tag]) {
      tagsData[tag] = [];
    }
    tagsData[tag].push(filePath);
  }

  writeTags(notesDirectory, tagsData);
}
