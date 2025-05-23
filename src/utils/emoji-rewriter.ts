import fs from "fs";
import path from "path";
import { loadConfig } from "../configuration/config";

const config = loadConfig();
const workspace = config.workspace;

function getAllMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getAllMarkdownFiles(fullPath);
    } else if (entry.isFile() && fullPath.endsWith(".md")) {
      return [fullPath];
    }
    return [];
  });
}

function replaceSymbolsWithEmojis(filePath: string) {
  let content = fs.readFileSync(filePath, "utf-8");
  const replacedContent = content
    .replace(/(?<!\\)\(!\)/g, "⚠️")
    .replace(/(?<!\\)\(\?\)/g, "❓");

  if (replacedContent !== content) {
    fs.writeFileSync(filePath, replacedContent, "utf-8");
  }
}

export function replaceEmojisInAllMarkdownFiles() {
  const allFiles = getAllMarkdownFiles(workspace);
  allFiles.forEach(replaceSymbolsWithEmojis);
}
