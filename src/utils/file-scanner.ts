import fs from "fs";
import path from "path";

export function findMarkdownFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== ".ygg") {
            return findMarkdownFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            return [fullPath];
        } else {
            return [];
        }
    });
}

export function findImageFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".ygg" && entry.name !== "assets") {
      return findImageFiles(fullPath);
    } else if (entry.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
      return [fullPath];
    } else {
      return [];
    }
  });
}
