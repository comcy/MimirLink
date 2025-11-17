import fs from "fs";
import path from "path";
import { AppConfig } from "../config";

const YOUTUBE_URL_REGEX = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/g;
const config = AppConfig;
const workspace = config.workspace; 

export function youtubeLinkRewriter() {

  const files = getMarkdownFiles(workspace);

  for (const file of files) {
    let content = fs.readFileSync(file, "utf-8");
    let modified = false;

    content = content.replace(YOUTUBE_URL_REGEX, (match, _, __, videoId) => {
      modified = true;
      return `[![YouTube Video](https://img.youtube.com/vi/${videoId}/0.jpg)](${match})`;
    });

    if (modified) {
      fs.writeFileSync(file, content, "utf-8");
      console.log(`✅ Rewrote YouTube links in ${file}`);
    }
  }
}

function getMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getMarkdownFiles(fullPath);
    } else if (entry.isFile() && fullPath.endsWith(".md")) {
      return [fullPath];
    }
    return [];
  });
}
