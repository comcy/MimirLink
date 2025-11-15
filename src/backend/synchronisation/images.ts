import fs from 'fs';
import path from 'path';

export interface ImageMetadata {
  path: string;
  filename: string;
  createdAt: string;
}

export function readImageMetadata(notesDirectory: string): ImageMetadata[] {
  const imagesJsonPath = path.join(notesDirectory, 'images.json');
  if (!fs.existsSync(imagesJsonPath)) {
    return [];
  }
  const content = fs.readFileSync(imagesJsonPath, 'utf-8');
  return JSON.parse(content);
}

export function writeImageMetadata(notesDirectory: string, metadata: ImageMetadata[]): void {
  const imagesJsonPath = path.join(notesDirectory, 'images.json');
  fs.writeFileSync(imagesJsonPath, JSON.stringify(metadata, null, 2), 'utf-8');
}
